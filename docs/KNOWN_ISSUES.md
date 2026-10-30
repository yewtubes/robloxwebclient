# Known issues

## Player controls and character scripts don't run

Client scripts replicated from the Studio server (`PlayerModule`, which is the
control and camera scripts, `Animate`, `RbxCharacterSounds`, `Freecam`, …) fail
with `bytecode corrupted`, so the character can't be controlled and doesn't
animate. `local_rcc_modern` compiles them into the client's RSB1 container
(opcode encoding ×227, zstd, XXH32 key, the same scheme as
[local_rcc](https://github.com/unknownluau/local_rcc-1)). The client unpacks
them, but the 2026 client also checks an integrity footer on all bytecode that
Luau's compiler doesn't produce. This project doesn't forge or bypass that
check. See `local_rcc_modern/README.md`. API work doesn't affect this.

This applies to Roblox's unmodified build (`/games/start?placeId=…`). This
repo's patched build (`/` or `/games/start?build=local`, with the Lua App
bootstrap from `tools/build_playsolo.js --join`) loads them: controls, jumping
and animation work there (docs/STUDIO_SERVER_JOIN.md,
`screenshots/bootstrap-join-movement.mp4`).

## R15 characters have no head (fixed)

The default dynamic head uses mesh asset 123480233606534, which Roblox serves
only to signed-in requests. It's now in the repo as
`webclient/assets/123480233606534` (`version 7.00` mesh, fetched once on
2026-10-30 with a signed-in account), which the backend imports into its store
on first use.
## One client texture isn't available

The client requests an image by content hash, `01fbb35a1b3f53173f68a2d02bb735d2`
(`assetdelivery /v1/asset?hash=…`, Residual representation). It isn't in the
store, and Roblox's CDN refuses it (403), so it logs "Request asset was not
found". Nothing visible depends on it so far. It can be imported once a copy
is legitimately available.

## Wearables load on the server, but can't be checked from the client view yet

Wearables (e.g. the Red Baseball Cap 1028606 and the Smile face 144075659,
fetched through the public fallback) are loaded by the game server. On join it
calls `LoadCharacter`, reads `/v2/avatar/avatar-fetch` (200) and loads the items
from the asset store (`/v1/assets/batch`). The client can't yet frame the head:
without client scripts there is no camera or control script, and the unanimated
character falls over at spawn. See `screenshots/e2e-player1-r6-topbar.jpg`.

## Missing topbar in headless Chromium (test harness only)

In `tools/run_headless.js` runs, the topbar (Roblox menu, chat button) doesn't
appear. `CoreGui.RobloxGui.Modules.Settings.SettingsHub` reports "Script has
run for over N seconds", and page screenshots time out. Headless Chromium draws
WebGL with SwiftShader on the CPU, sharing 4 cores with Studio's llvmpipe
renderer. That starves the main thread and the CoreScripts that build the
topbar. On a real browser with a GPU, the topbar and CoreGui load normally
(confirmed on a hosted deployment). Headless runs sometimes get there too, given
time (`screenshots/e2e-player1-r6-topbar.jpg`, about 110 s). Treat headless screenshots as checks of
loading and replication, not of the GUI.

## Studio editor services

Studio's editor calls a few services this platform doesn't provide (start page
feeds, templates, the assistant, real-time notifications). See "Called but not
implemented" in `docs/API_ROUTE_COVERAGE.md`. Studio keeps working without them.

## Thumbnail rendering

Roblox renders thumbnails on RCC with `ThumbnailGenerator:Click`, which returns
the image as base64. Studio has no ThumbnailGenerator, so `tools/render/RenderPlugin.lua`
does the same inside the engine: it builds the scene (avatars from avatar-fetch),
captures the 3D view with `CaptureService`, reads the pixels back with an
EditableImage and prints them to Studio's log as base64 in 800-character chunks
(Studio cuts log lines at 1023). `tools/render/worker.js` reassembles them into
the PNG. No display capture is involved. A screen capture located by magenta
markers is kept only as a fallback.

Fixed along the way: Studio's textures never loaded, because Studio gzips its
asset delivery batch requests (now decompressed by the backend) and asked for
ktx2 textures only (turned off with `FStringTextureTranscodeRollout` in
`webclient/flags/PCStudioApp.local.json`).

Open: one Studio launch per job (about 80 s here, mostly Studio start-up). A
worker that keeps one Studio open across jobs would be much faster; its plugin
would need to fetch jobs over HTTP, which needs Studio's plugin HTTP permissions
(`studio-user-settings/plugin-permissions`, not implemented). The fixed wait
after preloading is down from 10 s to 3 s.

## Chat (patched build)

Typing and sending work (TextBox functions ported from Roblox's WebClient.js
into `webclient/glue/rbxlib.js`; Enter in the textarea submits). Open: speech
bubbles show without text. Bubble chat sizes its text with `TextService`. A
client probe suggested `GetTextSize` never returns, but the same probe also lost
plain `print` output, so that isn't established.

## Lag and lighting (all devices)

Reported as very laggy on every device. The main loop now runs like Roblox's
(a MessageChannel loop, not requestAnimationFrame). Still to check: our
WebClient.js is an `-O0 -sASSERTIONS=1` post-link (tools/build_glue.sh), unlike
Roblox's optimized glue. Lighting is reported flat (no shadows). Automatic
graphics quality drops to its lowest level when the frame rate is low, which
turns shadows off, so this may follow from the lag. Not confirmed yet: open the
game with `&quality=21` (site-shim.js sets `DFIntDebugFRMQualityLevelOverride`)
on a device with a GPU and compare. Wasm exports are now called directly rather
than through -sASSERTIONS' per-call checking wrapper.

## Crash after loading on some devices ("SIGTRAP")

Reported on Chromebooks and other devices that otherwise run the client: the
game loads, then the engine crashes with "SIGTRAP" (a wasm trap: `unreachable`,
an out-of-bounds access, or an engine fatal error). Not reproduced here. The page
now sends crashes with the last 120 console lines to the backend
(`<data>/logs/client-report.log`, `"kind":"crash"`); that report shows where it
trapped. Ruled out: the heap size. It is fixed at `FIntWasmMemoryPages` (2 GiB),
and a device that can't reserve it fails at start, not after loading. Our glue
isn't built for more than 2 GiB.

## Verified and admin badges

Verified: `tools/admin.js user verify <name>` sets `users.has_verified_badge`,
which the join script carries (`HasVerifiedBadge`); the game server sets
`Player.HasVerifiedBadge` from it. Admin: `tools/admin.js admin <name>` adds the
account to group 1200769 at rank 255. The game server's group check reaches the
backend and gets that rank. Not yet confirmed in game which icons the 2026
CoreScripts draw from it. A running game server caches group ranks, so restart
it after changing them.

## Studio test server dies or can't sign in (cloud container)

The container sometimes rewrites `/etc/hosts` (the sitetest1 names disappear:
Studio then gets "self-signed certificate in certificate chain" from Roblox's
real hosts) and can kill background processes. Re-run
`tools/studio/setup_env.sh --hosts-only`, restart `tools/studio_backend.js`, and
start servers with `nohup setsid … &` so they outlive the shell.

