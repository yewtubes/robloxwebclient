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

## R15 characters have no head

The default dynamic head uses mesh asset 123480233606534. Roblox serves it only
to authenticated requests, so the default `ASSET_FALLBACK=public` gets 401
(`data/logs/asset-fallback.log`: `fallback-denied`). Use
`ASSET_FALLBACK=opencloud` with your own Open Cloud API key, or import the asset
(`node tools/admin.js asset import 123480233606534 <file> --type 4`).

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
