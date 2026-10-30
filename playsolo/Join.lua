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
	-- Give the app DataModel a moment to finish starting up (the engine is still
	-- in InitializedLuaApp while the entry script begins running).
	task.wait(1)
	for attempt = 1, 3 do
		if launch(attempt) then
			return
		end
		task.wait(2 * attempt)
	end
	log("giving up")
end)
