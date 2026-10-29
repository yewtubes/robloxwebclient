-- A typical client script shape: services, events, closures.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer
local t = 0
RunService.Heartbeat:Connect(function(dt)
	t += dt
	if t > 1 then
		t = 0
		print(player.Name, workspace.CurrentCamera.CFrame.Position, Vector3.new(0, 1, 0))
	end
end)
