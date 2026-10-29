--!nonstrict
-- Play Solo bootstrap for the web client.
--
-- Replaces the Lua App's entry point (PatchRoot.CoreScripts.LuaAppStarterScript
-- in UniversalApp.rbxm). The app DataModel loads rbxasset://places/Mobile.rbxl,
-- which the local server replaces with the place to play, so here we only turn
-- that edit DataModel into a running single-player session, like Studio's old
-- "Play Solo": create a local player, run the simulation, spawn a character and
-- drive it with a small controller and follow camera.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local function log(...)
	warn("[PlaySolo]", ...)
end

local function try(what, f, ...)
	local ok, err = pcall(f, ...)
	if not ok then
		log(what, "failed:", err)
	end
	return ok, err
end

task.spawn(function()
	log("starting; place has", #workspace:GetDescendants(), "workspace descendants")
	-- The place's saved camera view, used to put the player in front of it.
	local placeView = workspace.CurrentCamera and workspace.CurrentCamera.CFrame

	local player = Players.LocalPlayer
	if not player then
		try("CreateLocalPlayer", function()
			player = Players:CreateLocalPlayer()
		end)
	end
	if not player then
		log("no local player")
		return
	end
	try("RunService:Run", function()
		RunService:Run()
	end)

	-- Build a classic 2008 R6 character from plain parts, so nothing depends on
	-- avatar or catalog assets (there is no Roblox backend here).
	local function buildCharacter()
		local yellow, blue, green = BrickColor.new("Bright yellow"), BrickColor.new("Bright blue"), BrickColor.new("Br. yellowish green")
		local model = Instance.new("Model")
		model.Name = player.Name
		local function part(name, size, color, cf)
			local p = Instance.new("Part")
			p.Name, p.Size, p.BrickColor, p.CFrame = name, size, color, cf
			p.TopSurface, p.BottomSurface = Enum.SurfaceType.Smooth, Enum.SurfaceType.Smooth
			p.Parent = model
			return p
		end
		local base = CFrame.new(0, 3, 0)
		local root = part("HumanoidRootPart", Vector3.new(2, 2, 1), blue, base)
		root.Transparency = 1
		local torso = part("Torso", Vector3.new(2, 2, 1), blue, base)
		local head = part("Head", Vector3.new(2, 1, 1), yellow, base * CFrame.new(0, 1.5, 0))
		local mesh = Instance.new("SpecialMesh", head)
		mesh.MeshType = Enum.MeshType.Head
		mesh.Scale = Vector3.new(1.25, 1.25, 1.25)
		local face = Instance.new("Decal", head)
		face.Name, face.Texture = "face", "rbxasset://textures/face.png"
		local larm = part("Left Arm", Vector3.new(1, 2, 1), yellow, base * CFrame.new(-1.5, 0, 0))
		local rarm = part("Right Arm", Vector3.new(1, 2, 1), yellow, base * CFrame.new(1.5, 0, 0))
		local lleg = part("Left Leg", Vector3.new(1, 2, 1), green, base * CFrame.new(-0.5, -2, 0))
		local rleg = part("Right Leg", Vector3.new(1, 2, 1), green, base * CFrame.new(0.5, -2, 0))
		local function motor(name, p0, p1, c0, c1)
			local m = Instance.new("Motor6D")
			m.Name, m.Part0, m.Part1, m.C0, m.C1 = name, p0, p1, c0, c1
			m.MaxVelocity = 0.1
			m.Parent = p0
			return m
		end
		local R = CFrame.new(0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 1, 0)
		motor("RootJoint", root, torso, R, R)
		motor("Neck", torso, head, CFrame.new(0, 1, 0, -1, 0, 0, 0, 0, 1, 0, 1, 0), CFrame.new(0, -0.5, 0, -1, 0, 0, 0, 0, 1, 0, 1, 0))
		local joints = {
			rs = motor("Right Shoulder", torso, rarm, CFrame.new(1, 0.5, 0, 0, 0, 1, 0, 1, 0, -1, 0, 0), CFrame.new(-0.5, 0.5, 0, 0, 0, 1, 0, 1, 0, -1, 0, 0)),
			ls = motor("Left Shoulder", torso, larm, CFrame.new(-1, 0.5, 0, 0, 0, -1, 0, 1, 0, 1, 0, 0), CFrame.new(0.5, 0.5, 0, 0, 0, -1, 0, 1, 0, 1, 0, 0)),
			rh = motor("Right Hip", torso, rleg, CFrame.new(1, -1, 0, 0, 0, 1, 0, 1, 0, -1, 0, 0), CFrame.new(0.5, 1, 0, 0, 0, 1, 0, 1, 0, -1, 0, 0)),
			lh = motor("Left Hip", torso, lleg, CFrame.new(-1, -1, 0, 0, 0, -1, 0, 1, 0, 1, 0, 0), CFrame.new(-0.5, 1, 0, 0, 0, -1, 0, 1, 0, 1, 0, 0)),
		}
		local humanoid = Instance.new("Humanoid")
		humanoid.RigType = Enum.HumanoidRigType.R6
		humanoid.Parent = model
		model.PrimaryPart = root
		return model, joints
	end

	-- Prefer the engine's own character (player:LoadCharacter builds Roblox's
	-- default avatar from the local content/avatar files); fall back to a
	-- plain-parts rig only if that fails.
	local character, joints
	local loaded = try("LoadCharacter", function()
		player:LoadCharacter()
	end)
	if loaded and player.Character then
		character = player.Character
		local parts = {}
		for _, d in character:GetDescendants() do
			if d:IsA("BasePart") then table.insert(parts, d.Name .. "(" .. d.ClassName .. ")") end
		end
		log("engine character:", character.Name, #parts, "parts:", table.concat(parts, " "))
	else
		character, joints = buildCharacter()
		character.Parent = workspace
		try("set Character", function()
			player.Character = character
		end)
	end
	local humanoid = character:WaitForChild("Humanoid")
	local root = character:WaitForChild("HumanoidRootPart")
	log("character spawned at", tostring(root.Position))

	-- Procedural classic walk for the fallback rig only (no animation assets).
	local phase = 0
	if joints then RunService.Stepped:Connect(function(_, dt)
		local speed = (root.AssemblyLinearVelocity * Vector3.new(1, 0, 1)).Magnitude
		local amp = 0
		if humanoid.FloorMaterial == Enum.Material.Air then
			joints.rs.DesiredAngle, joints.ls.DesiredAngle = 3.14, -3.14
			joints.rh.DesiredAngle, joints.lh.DesiredAngle = 0, 0
			return
		elseif speed > 0.5 then
			phase += dt * speed * 0.9
			amp = math.sin(phase)
		else
			phase = 0
		end
		joints.rs.DesiredAngle, joints.ls.DesiredAngle = amp, amp
		joints.rh.DesiredAngle, joints.lh.DesiredAngle = -amp, -amp
	end) end

	-- What a game server does when a player joins: StarterGui -> PlayerGui,
	-- StarterPlayerScripts -> PlayerScripts, StarterCharacterScripts -> character.
	local function copyInto(from, to)
		if not (from and to) then return 0 end
		local n = 0
		for _, c in from:GetChildren() do
			if not to:FindFirstChild(c.Name) then
				local ok = pcall(function()
					c:Clone().Parent = to
				end)
				if ok then n += 1 end
			end
		end
		return n
	end
	try("player setup", function()
		local StarterPlayer = game:GetService("StarterPlayer")
		local playerGui = player:FindFirstChildOfClass("PlayerGui")
		local playerScripts = player:FindFirstChildOfClass("PlayerScripts")
		log("PlayerGui", tostring(playerGui), "PlayerScripts", tostring(playerScripts), "Backpack", tostring(player:FindFirstChildOfClass("Backpack")))
		log("copied", copyInto(game:GetService("StarterGui"), playerGui), "guis,",
			copyInto(StarterPlayer:FindFirstChildOfClass("StarterPlayerScripts"), playerScripts), "player scripts,",
			copyInto(StarterPlayer:FindFirstChildOfClass("StarterCharacterScripts"), character), "character scripts")
	end)

	-- Spawn on a SpawnLocation if there is one.
	local spawnLocation = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
	if spawnLocation then
		root.CFrame = spawnLocation.CFrame * CFrame.new(0, spawnLocation.Size.Y / 2 + 3, 0)
		log("spawned at SpawnLocation", spawnLocation:GetFullName())
	end

	-- Spawn where the place's camera was looking (the place has no SpawnLocation).
	local yaw0 = 0
	if placeView and not workspace:FindFirstChildWhichIsA("SpawnLocation", true) then
		try("place spawn", function()
			local look = placeView.LookVector * Vector3.new(1, 0, 1)
			if look.Magnitude < 1e-3 then return end
			look = look.Unit
			local params = RaycastParams.new()
			params.FilterDescendantsInstances = { character }
			params.FilterType = Enum.RaycastFilterType.Exclude
			-- Walk along the camera's view and stand on the first wide, flat
			-- open ground found (not on or inside props).
			local stand
			for d = 20, 400, 10 do
				local p = placeView.Position + look * d
				local down = workspace:Raycast(Vector3.new(p.X, p.Y + 300, p.Z), Vector3.new(0, -1000, 0), params)
				if down and down.Normal.Y > 0.95 and down.Instance:IsA("BasePart")
					and down.Instance.Size.X >= 40 and down.Instance.Size.Z >= 40 then
					-- and nothing tall right in front of it
					local ahead = workspace:Raycast(down.Position + Vector3.new(0, 3, 0), look * 12, params)
					if not ahead then
						stand = down.Position
						break
					end
				end
			end
			if not stand then
				local hit = workspace:Raycast(placeView.Position, placeView.LookVector * 1000, params)
				stand = (hit and hit.Position or (placeView.Position + look * 80)) - look * 120
				local down = workspace:Raycast(stand + Vector3.new(0, 200, 0), Vector3.new(0, -400, 0), params)
				if down then stand = down.Position end
			end
			yaw0 = math.atan2(-look.X, -look.Z)
			root.CFrame = CFrame.new(stand + Vector3.new(0, 4, 0)) * CFrame.Angles(0, yaw0, 0)
			log("moved to", tostring(stand))
		end)
	end

	local camera = workspace.CurrentCamera
	camera.CameraSubject = humanoid
	camera.CameraType = Enum.CameraType.Scriptable

	-- Controls: WASD/arrows to move, space to jump, right mouse drag or Q/E to
	-- turn the camera, mouse wheel to zoom.
	local keys = {}
	local yaw, pitch, zoom = yaw0, -0.12, 20
	UserInputService.InputBegan:Connect(function(input, processed)
		if input.KeyCode == Enum.KeyCode.Space then
			humanoid.Jump = true
		end
		keys[input.KeyCode] = true
		if input.UserInputType == Enum.UserInputType.MouseButton2 then
			UserInputService.MouseBehavior = Enum.MouseBehavior.LockCurrentPosition
		end
	end)
	UserInputService.InputEnded:Connect(function(input)
		keys[input.KeyCode] = nil
		if input.UserInputType == Enum.UserInputType.MouseButton2 then
			UserInputService.MouseBehavior = Enum.MouseBehavior.Default
		end
	end)
	UserInputService.InputChanged:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseMovement
			and UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton2) then
			yaw = yaw - input.Delta.X * 0.008
			pitch = math.clamp(pitch - input.Delta.Y * 0.008, -1.4, 1.2)
		elseif input.UserInputType == Enum.UserInputType.MouseWheel then
			zoom = math.clamp(zoom - input.Position.Z * 2, 4, 60)
		end
	end)

	local function axis(pos, neg, pos2, neg2)
		return ((keys[pos] or keys[pos2]) and 1 or 0) - ((keys[neg] or keys[neg2]) and 1 or 0)
	end

	RunService.RenderStepped:Connect(function(dt)
		if not root.Parent then
			return
		end
		yaw = yaw + axis(Enum.KeyCode.Q, Enum.KeyCode.E) * dt * 2
		local look = CFrame.Angles(0, yaw, 0)
		local f = axis(Enum.KeyCode.W, Enum.KeyCode.S, Enum.KeyCode.Up, Enum.KeyCode.Down)
		local r = axis(Enum.KeyCode.D, Enum.KeyCode.A, Enum.KeyCode.Right, Enum.KeyCode.Left)
		local move = look.LookVector * f + look.RightVector * r
		humanoid:Move(move.Magnitude > 0 and move.Unit or Vector3.zero, false)

		local focus = root.Position + Vector3.new(0, 2, 0)
		local rot = CFrame.Angles(0, yaw, 0) * CFrame.Angles(pitch, 0, 0)
		camera.CFrame = CFrame.new(focus) * rot * CFrame.new(0, 0, zoom)
		camera.Focus = CFrame.new(focus)
	end)

	humanoid.Died:Connect(function()
		task.wait(3)
		humanoid.Health = humanoid.MaxHealth
		root.CFrame = CFrame.new(0, 103, 0)
	end)
	log("ready")

	-- Start the in-game CoreScripts (topbar, chat, backpack, player list, ...)
	-- from the in-experience patch this bootstrap ships in.
	try("StarterScript", function()
		local robloxGui = game:GetService("CoreGui"):WaitForChild("RobloxGui", 10)
		-- AvatarChatService:GetClientFeaturesAsync() waits for the game server,
		-- which a Play Solo session does not have; it would hang the unibar
		-- (topbar) while loading its self view integration.
		try("SharedFlags", function()
			local SharedFlags = require(game:GetService("CorePackages").Workspace.Packages.SharedFlags)
			SharedFlags.GetFFlagAvatarChatServiceEnabled = function()
				return false
			end
		end)
		game:GetService("ScriptContext"):AddCoreScriptLocal("StarterScript", robloxGui)
		log("StarterScript started")
	end)

	task.delay(12, function()
		for _, g in game:GetService("CoreGui"):GetChildren() do
			local info = g.ClassName
			if g:IsA("LayerCollector") then
				info ..= " enabled=" .. tostring(g.Enabled) .. " kids=" .. #g:GetChildren()
			end
			log("CoreGui child:", g.Name, info)
		end
		local rg = game:GetService("CoreGui"):FindFirstChild("RobloxGui")
		if rg then
			for _, g in rg:GetChildren() do
				if g:IsA("GuiObject") then log("RobloxGui child:", g.Name, g.ClassName, "visible=" .. tostring(g.Visible)) end
			end
		end
		local function dump(inst, depth)
			if depth > 4 then return end
			for _, c in inst:GetChildren() do
				local extra = ""
				if c:IsA("GuiObject") then
					extra = string.format(" visible=%s pos=%s size=%s abs=%s", tostring(c.Visible), tostring(c.Position), tostring(c.Size), tostring(c.AbsoluteSize))
				end
				log(string.rep("  ", depth) .. c.Name, c.ClassName .. extra)
				dump(c, depth + 1)
			end
		end
		local ch = game:GetService("CoreGui"):FindFirstChild("Children")
		if ch then dump(ch, 0) end
		log("TopbarInset", tostring(game:GetService("GuiService").TopbarInset))
		try("TopbarEnabled", function()
			log("TopbarEnabled =", tostring(game:GetService("StarterGui"):GetCore("TopbarEnabled")))
		end)
	end)
end)

return {}
