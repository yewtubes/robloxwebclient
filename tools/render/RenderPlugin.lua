-- Local render worker plugin for Roblox Studio (tools/render/worker.js).
-- The worker writes this file into Studio's Plugins folder with the job spec in
-- JOB, then opens the job's place. The plugin acts only in that place: it builds
-- the scene the way RCC's render scripts do (a local player whose
-- CharacterAppearance is the platform's avatar-fetch, LoadCharacter), points the
-- camera at it, waits for its content to load, then shows two
-- render is captured in the engine and printed to the log as base64, as RCC's
-- ThumbnailGenerator:Click returns it (Studio has no ThumbnailGenerator). Where
-- that is unavailable it falls back to magenta markers in the viewport's corners,
-- from which the worker finds the 3D viewport and captures the display.
local JOB = [==[__JOB__]==]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ContentProvider = game:GetService("ContentProvider")
local CoreGui = game:GetService("CoreGui")

local spec = HttpService:JSONDecode(JOB)
if not string.find(game.Name, spec.file, 1, true) then
	return
end

local BACKDROP = Color3.fromRGB(0, 255, 0) -- keyed out by the worker
local HEAD_ATTACHMENTS = { HatAttachment = true, HairAttachment = true, FaceFrontAttachment = true, FaceCenterAttachment = true }

local function anchorAll(model)
	for _, p in ipairs(model:GetDescendants()) do
		if p:IsA("BasePart") then
			p.Anchored = true
		end
	end
end

local function lookAt(camera, target, size, direction, fill)
	local fov = math.rad(camera.FieldOfView)
	local radius = size.Magnitude / 2
	local distance = radius / math.tan(fov / 2) * (fill or 1)
	camera.CFrame = CFrame.lookAt(target + direction.Unit * distance, target)
	camera.Focus = CFrame.new(target)
	return distance
end

local camera = workspace.CurrentCamera
camera.CameraType = Enum.CameraType.Scriptable
camera.FieldOfView = 30

local loadTargets = {}
if spec.kind == "place" then
	-- Overview of the place: the spawn if there is one, otherwise everything.
	local model = Instance.new("Model")
	local spawn = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
	local cf, size
	if spawn then
		cf, size = spawn.CFrame, Vector3.new(60, 20, 60)
	else
		local parts = {}
		for _, p in ipairs(workspace:GetDescendants()) do
			if p:IsA("BasePart") and p.Size.Magnitude < 2000 then
				table.insert(parts, p)
			end
		end
		if #parts > 0 then
			local min, max = parts[1].Position, parts[1].Position
			for _, p in ipairs(parts) do
				min, max = min:Min(p.Position), max:Max(p.Position)
			end
			cf, size = CFrame.new((min + max) / 2), (max - min) + Vector3.new(10, 10, 10)
		else
			cf, size = CFrame.new(0, 0, 0), Vector3.new(60, 20, 60)
		end
	end
	model:Destroy()
	camera.FieldOfView = 70
	lookAt(camera, cf.Position, size, Vector3.new(1, 0.6, 1), 0.6)
	table.insert(loadTargets, workspace)
else
	-- Avatar: neutral studio lighting and a flat backdrop the worker keys out.
	local Lighting = game:GetService("Lighting")
	Lighting.ClockTime = 14
	Lighting.Brightness = 2
	Lighting.Ambient = Color3.fromRGB(140, 140, 140)
	Lighting.OutdoorAmbient = Color3.fromRGB(140, 140, 140)
	Lighting.GlobalShadows = false
	for _, e in ipairs(Lighting:GetChildren()) do
		if e:IsA("PostEffect") or e:IsA("Atmosphere") or e:IsA("Sky") then
			e:Destroy()
		end
	end
	-- As RCC's avatar render script does: a local player whose CharacterAppearance is
	-- the platform's avatar-fetch, loaded by the engine (body colors, clothing,
	-- accessories and body parts come from the backend and its asset delivery).
	-- CreateLocalPlayer needs the LocalUser capability (RCC), which plugins don't
	-- have; then the engine fetches the same avatar from the backend itself
	-- (GetHumanoidDescriptionFromUserId) and builds the character from it.
	local model
	local ok, err = pcall(function()
		local player = Players:CreateLocalPlayer(0)
		player.CharacterAppearance = spec.characterAppearance
		player:LoadCharacter(false)
		model = player.Character or player.CharacterAdded:Wait()
		local deadline = os.clock() + 30
		while not player:HasAppearanceLoaded() and os.clock() < deadline do
			task.wait(0.25)
		end
	end)
	if not ok then
		print("[LocalRender] LoadCharacter unavailable (" .. tostring(err) .. "); using GetHumanoidDescriptionFromUserId")
		local rig = (spec.input.avatar or {}).resolvedAvatarType == "R6" and Enum.HumanoidRigType.R6 or Enum.HumanoidRigType.R15
		model = Players:CreateHumanoidModelFromDescription(Players:GetHumanoidDescriptionFromUserId(spec.targetId), rig)
	end
	model.Parent = workspace
	local humanoid = model:FindFirstChildWhichIsA("Humanoid")
	if humanoid then
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end
	anchorAll(model)
	model:PivotTo(CFrame.new(0, 10, 0))
	table.insert(loadTargets, model)

	local pivot = model:GetPivot()
	local front = Vector3.new(pivot.LookVector.X, 0, pivot.LookVector.Z).Unit
	local head = model:FindFirstChild("Head")
	local target, dir, distance
	if (spec.kind == "avatar-headshot" or spec.kind == "avatar-bust") and head then
		-- Roblox's headshot framing: straight on, level, narrow lens. The head sits a
		-- little below the middle with the top of the torso along the bottom edge,
		-- and the frame grows upward to fit head accessories (hats, hair).
		local mesh = head:FindFirstChildWhichIsA("SpecialMesh")
		local headHeight = head.Size.Y * (mesh and mesh.MeshType == Enum.MeshType.Head and mesh.Scale.Y or 1)
		local headBottom = head.Position.Y - headHeight / 2
		local top = headBottom + headHeight
		for _, accessory in ipairs(model:GetChildren()) do
			local handle = accessory:IsA("Accessory") and accessory:FindFirstChild("Handle")
			local attachment = handle and handle:FindFirstChildWhichIsA("Attachment")
			if attachment and HEAD_ATTACHMENTS[attachment.Name] then
				local cf, sz = handle.CFrame, handle.Size / 2
				local halfY = math.abs(cf.RightVector.Y) * sz.X + math.abs(cf.UpVector.Y) * sz.Y + math.abs(cf.LookVector.Y) * sz.Z
				top = math.max(top, cf.Position.Y + halfY)
			end
		end
		local bust = spec.kind == "avatar-bust"
		local below = bust and 0.4 or 0.18 -- share of the frame under the head
		local frame = math.max((bust and 4.2 or 2.8) * headHeight, (top - headBottom) / (1 - below - 0.03))
		local bottom = headBottom - below * frame
		target = Vector3.new(head.Position.X, bottom + frame / 2, head.Position.Z)
		camera.FieldOfView = 20
		distance = (frame / 2) / math.tan(math.rad(camera.FieldOfView) / 2)
		dir = front
		camera.CFrame = CFrame.lookAt(target + dir * distance, target)
		camera.Focus = CFrame.new(target)
	else
		-- Full body: three-quarter view from the front left, slightly above; the
		-- worker crops the figure and centers it (Click's crop).
		local cf, size = model:GetBoundingBox()
		target = cf.Position
		dir = (front - Vector3.new(pivot.RightVector.X, 0, pivot.RightVector.Z).Unit * 0.45 + Vector3.new(0, 0.2, 0)).Unit
		distance = lookAt(camera, target, size, dir, 1.05)
	end

	local backdrop = Instance.new("Part")
	backdrop.Name = "Backdrop"
	backdrop.Anchored = true
	backdrop.Material = Enum.Material.Neon
	backdrop.Color = BACKDROP
	backdrop.CastShadow = false
	backdrop.Size = Vector3.new(2000, 2000, 1)
	backdrop.CFrame = CFrame.lookAt(target - dir * (distance + 40), target)
	backdrop.Parent = workspace
end

pcall(function()
	ContentProvider:PreloadAsync(loadTargets)
end)
task.wait(spec.settle or 10)

-- Like RCC's ThumbnailGenerator:Click, which returns the render as base64: the
-- engine captures its 3D view (CaptureService, no UI), the pixels are read back
-- (EditableImage) and printed as base64 RGBA in chunks; the worker reads them from
-- Studio's log. No screen capture, so nothing on the display can get in the way.
local B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local function base64(buf)
	local n = buffer.len(buf)
	local out = buffer.create(math.ceil(n / 3) * 4)
	local alphabet = buffer.fromstring(B64)
	local o = 0
	for i = 0, n - 1, 3 do
		local b0 = buffer.readu8(buf, i)
		local b1 = i + 1 < n and buffer.readu8(buf, i + 1) or 0
		local b2 = i + 2 < n and buffer.readu8(buf, i + 2) or 0
		local v = bit32.bor(bit32.lshift(b0, 16), bit32.lshift(b1, 8), b2)
		buffer.writeu8(out, o, buffer.readu8(alphabet, bit32.extract(v, 18, 6)))
		buffer.writeu8(out, o + 1, buffer.readu8(alphabet, bit32.extract(v, 12, 6)))
		buffer.writeu8(out, o + 2, i + 1 < n and buffer.readu8(alphabet, bit32.extract(v, 6, 6)) or 61)
		buffer.writeu8(out, o + 3, i + 2 < n and buffer.readu8(alphabet, bit32.extract(v, 0, 6)) or 61)
		o += 4
	end
	return buffer.tostring(out)
end

local function click()
	local captured = Instance.new("BindableEvent")
	game:GetService("CaptureService"):CaptureScreenshot(function(contentId)
		captured:Fire(contentId)
	end)
	local contentId = captured.Event:Wait()
	local image = game:GetService("AssetService"):CreateEditableImageAsync(Content.fromUri(contentId))
	local size = image.Size
	return size, image:ReadPixelsBuffer(Vector2.zero, size)
end

local ok, size, pixels = pcall(click)
if ok then
	local data = base64(pixels)
	local CHUNK = 800 -- Studio cuts log lines at 1023 characters
	local count = math.ceil(#data / CHUNK)
	print(string.format("[LocalRender] click %s %d %d %d", spec.key, size.X, size.Y, count))
	for i = 1, count do
		print(string.format("[LocalRender] px %d %s", i, string.sub(data, (i - 1) * CHUNK + 1, i * CHUNK)))
	end
	print("[LocalRender] ready " .. spec.key)
	return
end
print("[LocalRender] in-engine capture unavailable (" .. tostring(size) .. "); showing markers for a screen capture")

local gui = Instance.new("ScreenGui")
gui.Name = "LocalRenderMarkers"
gui.IgnoreGuiInset = true
gui.DisplayOrder = 1000000
local function marker(anchor)
	local f = Instance.new("Frame")
	f.BackgroundColor3 = Color3.fromRGB(255, 0, 255)
	f.BorderSizePixel = 0
	f.Size = UDim2.fromOffset(6, 6)
	f.AnchorPoint = anchor
	f.Position = UDim2.fromScale(anchor.X, anchor.Y)
	f.Parent = gui
end
marker(Vector2.new(0, 0))
marker(Vector2.new(1, 1))
gui.Parent = CoreGui
task.wait(spec.markerSeconds or 4)
gui:Destroy()
print("[LocalRender] ready " .. spec.key)
