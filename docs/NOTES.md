# Roblox WASM web client: local bring-up

This repo runs Roblox's WebAssembly client (`webclient/WebClient.wasm`,
`WasmPlayer.js`, `WebFlags.json`, `WebClient.metadata.json`) in a browser,
without any Roblox web infrastructure. Some parts of the original deployment
were never shipped, so they are rebuilt here.

Nothing talks to Roblox at runtime: `tools/backend.js` answers every web API
call the client makes, and assets come from a local store (`webclient/assets/`,
filled with `tools/import_asset.js`). Roblox's servers are only used once, by
`tools/fetch_content.sh`, to download the public client packages.

What works:

- The engine boots, runs its main loop and renders with WebGL2 (headless
  Chromium with SwiftShader is enough).
- Play Solo: ROBLOX World Headquarters (from Roblox/Old-Open-Source-Levels)
  loads, a classic R6 character (built from plain parts, with procedural
  walking) spawns, and WASD/space/mouse controls work. The 2026 in-game
  CoreScripts run too: topbar, chat, player list, backpack hotbar.
- The networked join path up to the wire: fake place-launcher response, the
  `local-relay` WebSocket transport, and a WebSocket→UDP relay. The client
  sends RakNet connection requests to `RCC_HOST:RCC_PORT`.

Game server: Roblox Studio 0.745 runs under Wine as the server, logged in
against the local backend (OAuth, user info and security cookie are all served
by `tools/backend.js` through `tools/studio_backend.js` on the sitetest1 host
names). See "Studio as the game server" below.

## Running

```bash
tools/setup.sh                 # content files, patched wasm, luauc, Play Solo overlay
node tools/server.js           # http://localhost:8080/
```

Open http://localhost:8080/ in Chrome or Edge (JSPI and WebGL2 are needed).
Controls: WASD/arrows move, space jumps, Q/E or right-drag turns the camera,
and the mouse wheel zooms.

Headless screenshot (the result goes to `screenshots/latest.png`, with a log next to it):

```bash
node tools/run_headless.js 40
KEYS="w:3000,space:300" node tools/run_headless.js 40    # also presses keys
GLDEBUG=1 node tools/run_headless.js 30                  # WebGL call counts / shader errors
```

To play a different place, run `node tools/build_playsolo.js path/to/place.rbxl`.

Joining a real server through the relay: run `RCC_HOST=<server ip>
RCC_PORT=<udp port> node tools/server.js` and open
`/?placeId=1818&flags=FFlagDebugLocalRccServerConnection=True`.

Joining from the bootstrap instead (the normal page, no `placeId` in the URL):

```bash
node tools/build_playsolo.js --join          # or --join=<placeId>
RCC_HOST=127.0.0.1 RCC_PORT=53640 node tools/run_headless.js 60
```

The Lua App boots as for Play Solo, but its entry script is
`playsolo/Join.lua`, which calls `ExperienceService:LaunchExperience`. The
engine then joins natively (`launchUGCGame`, `/v1/join-game` from the backend,
then RbxTransport if the backend found a Studio server, else RakNet through
`/local-relay`). Run `node tools/build_playsolo.js` again to go back to Play
Solo.

The same build also runs on Roblox's own play page with its real loading screen:
`/games/start?build=local` (see docs/STUDIO_SERVER_JOIN.md).

## Pieces

| Piece | What it is |
|---|---|
| `webclient/WebClient.js` | The Emscripten JS runtime, generated from the wasm with `emcc --post-link` (`tools/build_glue.sh`) |
| `webclient/glue/rbxlib.js` | Reimplemented Roblox imports: fibers on JSPI, main-thread futex wait, synchronous asset fetch, ring buffers, host info, text input, GL buffer mapping, and stubs for the OPFS cache, RNA transport and WebView |
| `webclient/glue/em_asm.py` | The 65 EM_ASM snippets, rebuilt from their call sites (the code strings were stripped from the wasm) |
| `webclient/WasmLoader.js`, `WebClient.html` | The loader context and page that WasmPlayer.js expects, plus local dev settings |
| `tools/server.js` | Dev server: COOP/COEP, content overlay, metadata rewritten from disk, `/proxy/` to the local backend, `/local-relay` |
| `tools/backend.js` | Local Roblox web API: flags (`webclient/LocalFlags.json`), locale, users, avatar, asset delivery, thumbnails, policy, game join, telemetry sink. Unknown calls get a logged 404 |
| `tools/patch_wasm.js` | Two local patches to the served wasm (the original file is untouched) |
| `tools/luauc/` | Luau compiler that emits the client's bytecode format (opcodes ×227, 8-byte prefix) |
| `tools/rbxm.js` | Binary rbxm/rbxl reader and writer |
| `playsolo/PlaySolo.lua` | Play Solo bootstrap; replaces the Lua App entry script |
| `playsolo/Join.lua` | Networked-join bootstrap (`build_playsolo.js --join`): the Lua App launches the game through `ExperienceService` |

### Content
`tools/fetch_content.sh` builds `webclient/files/` from the public Windows
Player and Studio packages. That covers 10,752 of the 30,566 listed files,
including CoreScripts; most of the rest are Lua App test packages.
`shaders_glsles3_web.pack` is not public, so the desktop `shaders_glsl3.pack`
is used, and `rbxConvertShader` in rbxlib.js rewrites GLSL 1.50 into
GLSL ES 3.00 at `glShaderSource` time.

### Wasm patches (`tools/patch_wasm.js`)
1. The `DataModelPatchConfigurer` signature check always passes (func 116001).
   The bundled Lua App patch is the Windows package's copy, whose signature
   the web build rejects.
2. `luau_load` no longer stops at "bytecode corrupted" (func 147667). The
   client expects a footer on bytecode, which our own compiled bootstrap
   lacks. Bytecode that has a footer still loads as before.

### Play Solo
The Lua App DataModel loads `rbxasset://places/Mobile.rbxl`, and the overlay
serves the chosen place under that name. The Lua App patch it serves is built
from `InExperience.rbxm`, the 2026 in-game CoreScripts and CorePackages. In
that patch, the test-only module `CoreScripts/jest.config` is renamed to
`LuaAppStarterScript` (the module the engine starts) and given the compiled
`PlaySolo.lua`. The bootstrap calls `Players:CreateLocalPlayer()` and
`RunService:Run()`, builds the character, and then starts the real
`StarterScript` with `ScriptContext:AddCoreScriptLocal`.

### Rebuilding WebClient.js
Rebuilding is only needed after changing `rbxlib.js` or `em_asm.py`. It needs
an Emscripten checkout with `tools/emscripten-local.patch` applied, which:
injects the EM_ASM bodies, skips native library builds in `--post-link`, and
assumes wasm features (the `target_features` section was stripped). It also
needs a config whose LLVM_ROOT holds stand-ins for `clang --version` and
`llvm-objcopy` (copy-through), plus binaryen (`npm i binaryen`). Then run:

```bash
EM_CONFIG=... tools/build_glue.sh
```

## Notes on the client
- Version 0.745.0.7451142, Emscripten pthreads build with JSPI and wasm
  exceptions, 2 GiB shared memory, no Emscripten filesystem (it has its own
  VFS).
- Lua App and in-experience CoreScripts come from the signed patch models
  `UniversalApp.rbxm` and `InExperience.rbxm`, as encoded Luau bytecode. The
  `.lua` files in `ExtraContent/scripts` are not used.
- The engine has `NetworkServer`/`ServerReplicator` code, but it does not
  expose starting a server to Lua.

## Studio as the game server
`tools/studio/run_server.sh <place.rbxl> [port]` starts a local server.

- Studio's `StartServer` task ignores the place path argument. It always
  loads `%LOCALAPPDATA%\Roblox\server.rbxl`, the file the editor writes before
  it spawns the server for Test > Server and Clients. The launcher copies the
  place there first and passes the same arguments the editor does (captured
  with `tools/studio/watch_procs.sh`).
- The server listens with RakNet on the given UDP port and with RbxTransport
  (QUIC, WebTransport over HTTP/3 with a self-signed
  `CN=Roblox RtcIo WebTransport` ECDSA certificate) on a second port.
- Studio's own client (`-task StartClient -rbxTransportToken bG9jYWxfdGVzdA==
  -rbxTransportPort <port>`) joins over RbxTransport and plays: see
  `screenshots/studio-server-baseplate-*.png`.
- Studio gets its own production flags (`webclient/flags/PCStudioApp.json`,
  fetched once from clientsettingscdn) plus `PCStudioApp.local.json`.

WASM client status: Roblox's own web client joins over RbxTransport/WebTransport
and the Replicator is created. Game scripts still arrive with empty bytecode.
Details, patches and reproduction steps: `docs/STUDIO_SERVER_JOIN.md`.
