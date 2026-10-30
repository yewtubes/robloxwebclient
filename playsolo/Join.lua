--!nonstrict
-- Networked-join bootstrap for the web client.
--
-- Replaces the Lua App's entry point (PatchRoot.CoreScripts.LuaAppStarterScript)
-- like PlaySolo.lua does, but instead of turning the app DataModel into a
-- local session it asks the engine to join a game server, the way the real
-- Lua App starts an experience: ExperienceService:LaunchExperience. The engine
-- then does the whole join natively (gamejoin /v1/join-game, answered by
-- tools/backend.js, then RbxTransport or RakNet to the server it names), in a
-- new game DataModel; this one stays behind as the app.
--
-- tools/build_playsolo.js --join[=<placeId>] fills in PLACE_ID.

local PLACE_ID = 1818 -- replaced at build time

local ExperienceService = game:GetService("ExperienceService")

local function log(...)
	warn("[Join]", ...)
end

local function launch(attempt)
	log(string.format("launching place %d (attempt %d)", PLACE_ID, attempt))
	local ok, err = pcall(function()
		ExperienceService:LaunchExperience({ placeId = PLACE_ID })
	end)
	if not ok then
		log("LaunchExperience failed:", err)
	end
	return ok
end

task.spawn(function()
	-- Launching while the engine is still starting up (this script runs inside its
	-- initialize(), before the browser main loop exists) stalls the join: the
	-- game's scripts start ~5 s late and it never completes. The first rendered
	-- frame comes from the main loop, so wait for that.
	game:GetService("RunService").RenderStepped:Wait()
	for attempt = 1, 3 do
		if launch(attempt) then
			return
		end
		task.wait(2 * attempt)
	end
	log("giving up")
end)
