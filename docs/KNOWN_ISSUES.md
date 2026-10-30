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

## R15 characters have no head

The default dynamic head uses mesh asset 123480233606534, which Roblox serves
only to authenticated requests (the default `ASSET_FALLBACK=public` gets 401).
On 2026-10-30 it was fetched once with a signed-in account
(`assetdelivery.roblox.com/v2/assetId/…`, a gzip'd `version 7.00` mesh, 100 KB)
and imported with `node tools/admin.js asset import 123480233606534 <file> --type 4`.
The store (`data/`) isn't committed, so each deployment needs that import (or
`ASSET_FALLBACK=opencloud` with your own key). Not yet checked in-game.

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

## Thumbnail rendering is preliminary

Roblox renders thumbnails on RCC with `ThumbnailGenerator:Click`. Studio has no
`ThumbnailGenerator`, so `tools/render/worker.js` lets Studio render the scene in
its editor viewport and captures that from the worker's virtual display. The
engine loads avatars from the backend: `GetHumanoidDescriptionFromUserId` reads
`/v2/avatar/avatar-fetch`, because `CreateLocalPlayer` needs the RCC-only
`LocalUser` capability. Renders come out with transparent backgrounds and
Roblox's headshot framing (straight on, head slightly below center). It isn't
finished:

- Studio's "opening place" toast is a separate top-level window. With no window
  manager on the virtual display it never closes, so it shows up in captures.
  Unmapping it from the worker also unmapped the editor's dialogs, which left the
  viewport black. That approach was dropped.
- First-run dialogs ("Start Tour") can also sit over the viewport.

Until this is solved, experiences can use uploaded images instead of renders
(`tools/admin.js universe icon|thumbnail`). Avatar thumbnails stay `Pending`
unless the worker runs.

## Chat: typed text doesn't reach the chat box (patched build)

`/` opens chat and focuses the box (the game sees `Slash` as processed), but
typed text never arrives, so nothing is sent. Cause, from Roblox's own
WebClient.js: the engine edits TextBoxes through the page's hidden
`<input>`/`<textarea>`. `choose_current_text_input` picks one, sets it to
`display:block` and makes it `Module.currentInput`; focus, blur, sync, rect,
overlay and font calls then act on it, and its input events feed
`on_virtual_text_changed`. Our `webclient/glue/rbxlib.js` has stubs for these
(the input is never shown, so focusing it does nothing). Fix: port those
functions into rbxlib.js (and the generated WebClient.js). Not done yet.

## Lag (all devices)

Reported as very laggy on every device. Not investigated yet. Things to check:
our rebuilt WebClient.js is an `-O0 -sASSERTIONS=1` post-link (tools/build_glue.sh),
unlike Roblox's optimized glue, and runs the engine's JS imports unoptimized;
SwiftShader timings in headless runs don't say anything about real devices.

## Studio test server dies or can't sign in (cloud container)

The container sometimes rewrites `/etc/hosts` (the sitetest1 names disappear:
Studio then gets "self-signed certificate in certificate chain" from Roblox's
real hosts) and can kill background processes. Re-run
`tools/studio/setup_env.sh --hosts-only`, restart `tools/studio_backend.js`, and
start servers with `nohup setsid … &` so they outlive the shell.

