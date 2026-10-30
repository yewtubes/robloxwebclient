# Roblox's web client joining a Studio server: findings

Working log for running Roblox's own, unmodified web client (page, WasmLoader,
WasmPlayer, WebClient.js, WebClient.wasm 0.745.0.7451145) against Roblox Studio
0.745.0.7451137 as the game server under Wine. Keep this file current; it is the
record that survives context loss.

## Status (2026-10-29)

| Step | State |
|---|---|
| Studio server starts with Baseplate / Grow a Garden | works (`tools/studio/run_server.sh`) |
| Real web client boots from the local server | works (`/games/start?placeId=1818`) |
| Join through our backend (`tools/backend.js`) | works |
| WebTransport handshake to Studio's RbxTransport | works when Studio and Chrome are on separate cores |
| Replicator created, world and character replicate | works |
| Studio sends compiled script bytecode (`LOCAL_RCC=1`, `local_rcc_modern/`) | works |
| Game client scripts run (LocalScripts, Animate, PlayerModule) | **blocked: the client rejects the bytecode in `luau_load` ("bytecode corrupted", integrity footer)** |

## The join page is Roblox's own

`webclient/site/` holds Roblox's actual play page (`play.roblox.com/games/start`):
the Next.js HTML, its JS/CSS chunks, fonts, and `WasmLoader.js`/`stub.js`,
fetched anonymously by `tools/fetch_webclient.sh` and committed unmodified. It is
served at `http://localhost:8080/games/start?placeId=<id>` (use this URL, not
`/`, which is still the older hand-written `webclient/WebClient.html`).
`tools/server.js` only injects `<script src="/site-shim.js">` into the served
HTML (the file on disk is unchanged); that shim points the page's roblox.com
requests at the local backend. The large engine files (`WebClient.js`,
`WebClient.wasm`, `WasmPlayer.js`, 2862 content files) are not committed; run
`tools/fetch_webclient.sh` once to download them into `webclient/live/`.

## How to reproduce the working connection

```bash
tools/studio/setup_env.sh                       # after a container restart: /etc/hosts, Xvfb, studio backend
tools/studio/run_server.sh /home/user/studio/prefix/drive_c/places/Baseplate.rbxl 53640
RCC_HOST=127.0.0.1 RCC_PORT=53640 taskset -c 2,3 node tools/run_headless.js 75 'games/start?placeId=1818' screenshots/real-join.png
```

- `run_server.sh` pins Studio to `STUDIO_CPUS` (default `0,1`) and sets
  `LP_NUM_THREADS=1`. Studio's server window renders through llvmpipe; unpinned
  it takes ~250% CPU on 4 cores and Chrome's QUIC handshake misses its 4 s idle
  timeout (netlog: server ACKs Initial, no TLS reply). Run Chrome on the other
  cores (`taskset -c 2,3`).
- The backend reads the RbxTransport port from the newest Studio log
  (`Started RbxTransport network server 0.0.0.0|PORT`; the port is random,
  `-rbxTransportPort` breaks the server) and the certificate's SHA-256 with
  `tools/studio/wt_cert_hash.py`.
- Join script: `NetStackPort`, `NetStackTokenValue` (base64 "local_test"),
  `GameFqdn`, `NetStackConfig` = `{"certHashes":["<base64 sha256>"]}`.
  The engine form-decodes that value before it reaches WebClient.js (`atob`), so
  a `+` arrives as a space ("InvalidCharacterError"). The backend sends `+` as
  `%2B`. A hash without `+` worked before that fix, which made it look flaky.
- Logs of a good run: `screenshots/real-join.log` (Replicator created,
  then `CreatorError: Error: <script>` for every game script).

### Patched wasm and the join (2026-10-30)

- `tools/studio/wt_cert_hash.py` needs `aioquic` (`pip install aioquic`).
  Without it the join script has no RbxTransport fields and the client falls
  back to RakNet with port 0 ("Failed to start network client").
- `WebClient.patched.wasm` is not part of this path: `games/start` loads the
  live 7451145 build from `webclient/live/` unmodified, and the patches in
  `tools/patch_wasm.js` are for the 7451142 wasm used by Play Solo. A join
  with `places/WorldHQ.rbxl` as the server (`screenshots/patched-join.log`)
  gives the same result as before: RbxTransport, Replicator created, every
  client script `bytecode corrupted`.

## Why Studio sent no bytecode, and the fix (`local_rcc_modern/`)

Two Studio stubs, both confirmed by disassembly (same causes as local_rcc
describes for older Studio builds):

1. `LuaVM::compile` (0x142ae2d30) returns an empty string. Studio does call it
   while registering replicated scripts, so every script's client bytecode is "".
2. The NetworkSchema picks the `ProtectedString` format (0x14611bd0c–0x14611bd25):
   ProtectedStringBytecode (0x2f) only if the predicate at 0x1407cced0 returns
   true, but in Studio it's `xor al,al; ret`, so the schema says
   ProtectedStringSource (6). Read-watching a registered script during a join
   confirmed the source-format path: the serializer reads only the script's
   16-byte content hash (written by 0x145fa3870, which queues the script) and a
   dictionary step (0x145fa3500) decides whether to send the content; the
   source text and the bytecode registry are never read.

`local_rcc_modern` (see its README) fixes both for this exact build, after
checking timestamp, image size and the original bytes: `LuaVM::compile` runs
Luau 0.744 and wraps the result in local_rcc's RSB1 container, and the
predicate call becomes `mov al,1`. Started with `LOCAL_RCC=1
tools/studio/run_server.sh …`. Network setup unchanged (CPU pinning, port and
cert discovery, `%2B`).

Result (`docs/evidence/local-rcc-modern-*.log`): Studio compiles every
replicated script (one Luau syntax error, in a 5.5 KB server script, line 118),
the client joins as before, and now gets bytecode. Every game script then
fails with `<script>: bytecode corrupted`. That is the client's `luau_load`
rejecting bytecode without Roblox's integrity footer, which Luau's compiler
doesn't produce. Faking that footer or turning the check off is out of scope
for this project. `PlayerScriptsLoader` no longer appears in the errors; it
fails on `require(PlayerModule)` instead ("Requested module experienced an
error while loading").

Earlier binary patches (`tools/studio/patch_studio.py`: force compile target 2,
force getBytecode at three serializer call sites) were wrong guesses. Compile is
a stub whatever the target, and the serializer sites are never reached in source
mode. They're reverted: Studio runs from the original executable
(sha256 781b36ed…) and the script is removed.

## Script bytecode: what is known

- Failing scripts (Baseplate.rbxl as uploaded, which is not an empty Baseplate:
  it has GUIs and Lighting.Inject):
  `Players.Player1.PlayerScripts.{LocalScript, PlayerScriptsLoader, RbxCharacterSounds}`,
  `Lighting.Inject`, `Players.Player1.PlayerGui.Freecam.FreecamScript`,
  `Players.Player1.PlayerGui.SelectUI.Frame.LocalScript`, `Workspace.Player1.Animate`.
- Client side: the engine's script loader (function 105853 in 7451142) gets
  `size == 0` for each of them (`tools/debug_break.js`, `FUNC=105853 SIZE=13`),
  then treats ≤8 bytes as error bytecode and logs `Error: <chunkname>`.
- The web client has no Luau compiler, so it needs compiled bytecode from the server.
- Server side, during one join (gdb attached to the Studio process, image base
  0x140000000, no ASLR under Wine):
  - registration `0x1460b5830` fires 6 times (the per-player script clones);
  - getBytecode `0x14604e1b0`, its lookup `0x1460b0380` and fetch `0x1460b0480`
    are never called.
  So the property serializer that would call getBytecode is not the path that
  sends these scripts.
- Registry layout (NetworkServer): map at `+0xf40` keyed by script → {id, target};
  entries in vector `+0xf20..+0xf28` (40 bytes each: [+0] source/bytecode
  string, [+0x10]/[+0x18] bytecode for target 0/2, [+0x21]/[+0x22] ready flags);
  a second hash table at `+0x1038/+0x1058` (`0x1460b03d0`, keyed by a 64-bit value,
  likely a content hash) with 9 callers elsewhere. This might be a hash →
  bytecode cache for a separate request path.
- Team-test mode: `[NetworkServer+0x230]` (1 = team test, set by
  `0x1460ade90`; 2 = cloud edit). Local Studio servers leave it 0.
- Relevant flags: `CompileLuauLazily`, `UseScriptReplicationTarget` (lazy
  per-target compile in fetch), `AddClientBytecodeCompileTimeToRCCInstanceTracking`,
  `LoadRawBytecodeWithHashKey`, client `DebugBypassTeamTestSignatureVerification`
  and the string "Bytecode Auth Check missing or wrong version.".

## Version check

- Live metadata (`WebClient.metadata.json`, upload `version-75f1039cb4964863`)
  is only a list of 2862 `{path,size}` content files (86.7 MB: textures, fonts,
  avatar rbxm, LuaPackages, `shaders/shaders_glsles3_web.pack`). It carries no
  version or protocol data and no game-script bytecode; all files are mirrored
  in `webclient/live/<upload>/` by `tools/fetch_webclient.sh`.
- `client-version.json`: 0.745.0.7451145. Studio: 0.745.0.7451137. Same release
  (0.745), different build numbers. The replication handshake and instance
  replication agree in practice; the script bytecode format is not yet verified.

## Ruled out: page host name and missing web APIs

- `http://play.localhost:8080/games/start?placeId=1818` (`HOST=play.localhost`
  for `tools/run_headless.js`) joins the same way as `localhost:8080`, and the
  same 7 scripts fail. WasmPlayer.js only checks whether the host is
  `roblox.com`/`*.roblox.com`/`*.robloxlabs.com`; any other host (localhost or
  play.localhost) takes the `__wasmDevSettings.apiProxy` path.
- Every HTTP call the engine makes reaches `tools/backend.js` (it logs them). The
  ones that 404 during a join are presentation and policy APIs (economy asset
  details, games, universes, player-policy, product-experimentation,
  player-hydration, voice, groups, checkout, modals, shop widgets). None is
  about scripts.
- Script bytecode is not fetched over HTTP: the client reads it inline from
  the replicated property stream (wasm string ` << bpfBytecode ProtectedString`,
  the same batched deserializer exists in Studio at 0x14423f899), and its loader
  gets 0 bytes.
- Studio's own client can't be started on its own (`run_client.sh`): it takes
  its flags from the editor that normally spawns it ("Found startup config
  from in memory cache" → "Does not contain application settings table"). The
  reference test has to go through the editor's Test > Server & Clients.

## Next steps

- Client scripts need bytecode the client accepts, with the integrity footer
  Roblox's own servers produce. Studio has no compiler for that (it's a stub),
  and this project doesn't forge or bypass the check, so it's open.
- Unrelated to scripts: the place references assets the backend can't serve
  (123480233606534, 2790382281, 2790390993, 3570695787, 9475422736:
  "Authentication required to access Asset").
