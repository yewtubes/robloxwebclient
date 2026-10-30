# Self-hosting

The platform is four processes on one machine (or split across machines):

| Process | What | Default |
|---|---|---|
| `node tools/server.js` | web gateway: Roblox's play page and the original web client files, `/proxy/` to the API, `/api/local/` (accounts, servers, render jobs), `/login` | `http://0.0.0.0:8080` |
| `node tools/studio_backend.js` | the same API over HTTPS on `*.sitetest1.robloxlabs.com`, for Studio | `:443` |
| `node tools/render/worker.js` | thumbnail renderer: avatars and places rendered by Studio (own Studio instance and display) | display `:79` |
| `tools/studio/run_server.sh <placeId>` | Roblox Studio under Wine as the game server; registers itself in the database | UDP `53640` + an RbxTransport (QUIC) port Studio picks |
| browser | the original WebClient | Chrome/Edge (JSPI, WebGL2, WebTransport) |

All of them share one SQLite database, `data/platform.db` (`DATA_DIR` to move it).

## 0. Debian VPS, one command

On a fresh Debian 12/13 (or Ubuntu 22.04+) x86-64 server with 4 cores and 8 GB RAM:

```bash
git clone https://github.com/yewtubes/robloxwebclient && cd robloxwebclient
sudo deploy/install_debian.sh --public-host <your server's public IP or DNS name>
```

The installer:
- installs Wine (WineHQ staging) and Node.js 22, then copies the code to
  `/opt/robloxwebclient`;
- downloads the original web client and Studio 0.745.0.7451137 into a Wine prefix
  in `/opt/studio`;
- builds `local_rcc_modern`, writes the sitetest1 names to `/etc/hosts`, and
  creates `/etc/roblox-platform.env` (with a random `ADMIN_KEY`);
- installs the systemd units and signs Studio in (`tools/studio/signin.sh`);
- starts a game server for place 1818 (`roblox-studio-server@1818`).

It is safe to run again. Everything runs as the unprivileged `roblox` user.
Afterwards:

- Put a TLS proxy in front of the gateway (`http://127.0.0.1:8080`). The nginx
  example in section 5 works, but its `listen` must name the public address
  (`listen <public-ip>:443 ssl;`): the Studio API holds `127.0.0.1:443`.
- Firewall: TCP 443, UDP 53640, and UDP 49152–65535 (Studio picks the game
  server's WebTransport port from that range at each start).
- More game servers: `systemctl enable --now roblox-studio-server@<placeId>:<udpPort>`,
  one UDP port per server.
- Admin: `sudo -u roblox env DATA_DIR=/var/lib/roblox-platform node /opt/robloxwebclient/tools/admin.js …`.

The sections below explain the parts, and how to run them by hand for development.

## 1. Requirements

- Linux x86-64 (tested: Ubuntu 24.04; Debian 12 works the same way, see below), 4 cores, 8 GB RAM
- Node.js 22.13+ (uses the built-in `node:sqlite`; no npm packages)
- Python 3 with `aioquic` and `cryptography` (reads Studio's WebTransport certificate hash)
- Wine (tested: winehq-staging 11.20), Xvfb, xdotool, imagemagick, curl, unzip
- For `local_rcc_modern`: mingw-w64, cmake, ninja

Debian 12 / Ubuntu:

```bash
sudo dpkg --add-architecture i386
sudo mkdir -pm755 /etc/apt/keyrings
sudo curl -fsSo /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
. /etc/os-release   # Debian: bookworm; Ubuntu: noble
sudo curl -fsSo /etc/apt/sources.list.d/winehq-$VERSION_CODENAME.sources \
  https://dl.winehq.org/wine-builds/$ID/dists/$VERSION_CODENAME/winehq-$VERSION_CODENAME.sources
sudo apt-get update
sudo apt-get install -y --install-recommends winehq-staging
sudo apt-get install -y xvfb xdotool imagemagick curl unzip python3-pip g++-mingw-w64-x86-64 cmake ninja-build
pip install aioquic cryptography
```

## 2. Client files (once)

```bash
tools/fetch_webclient.sh        # the original web client build + Roblox's play page -> webclient/live/, webclient/site/
sha256sum webclient/live/*/WebClient.wasm webclient/live/*/WebClient.js webclient/live/*/WasmPlayer.js
```

Nothing in these files is changed. Keep the hashes to compare later.

The sign-in / sign-up page (`/login`, `/signup`) uses the Builder Sans fonts
roblox.com/login serves and the video from roblox.com's landing page as its
background; they are committed in `webclient/pages/assets/`, and `tools/fetch_login_assets.sh`
downloads them again.

## 3. Database

Created on first start: migrations in `tools/backend/migrations/` run in order
(recorded in `schema_migrations`), then `config/seed.json` adds the initial
account `Builder` (id 1, owns the default experiences, Studio signs in as it)
and the universes/places (1818 Baseplate, 1819 World HQ). Rows that already
exist are left alone.

```bash
node tools/admin.js user create Alice 'a-long-password' --birthdate 2001-05-04
node tools/admin.js user password Builder 'another-password'
node tools/admin.js universe create 3 "My Game" --creator 2
node tools/admin.js place add 3000 3 places/MyGame.rbxl --root
node tools/admin.js asset import 6372755229 ./grid.png --type 1 --name "Baseplate grid"
node tools/admin.js universe icon 3 <imageAssetId>
node tools/admin.js asset misses         # what the store couldn't serve
node tools/admin.js asset fetch 1028606 144075659        # pull public catalog items in via ASSET_FALLBACK
node tools/admin.js avatar wear Alice 1028606 144075659  # hat + face (fetched if missing)
node tools/admin.js avatar type Alice R6
node tools/admin.js avatar colors Alice 24 23 24 24 119 119
```

Wearables come from the store. Items not in it are fetched through
`ASSET_FALLBACK` when someone wears them, by `set-wearing-assets` or
`avatar wear`. Their meshes and textures follow on demand when a game server
or client loads them. Each fetch is logged in `data/logs/asset-fallback.log`.
With `public`, only items Roblox serves anonymously come through. Others are
logged as `fallback-denied` and need `opencloud` with your own key, or an
import.

`mirror` sends every asset id it looks up to the mirror's operator. What a
mirror returns is stored as is; nothing checks it against Roblox's copy. List
only mirrors you trust and are allowed to use, best first:

```bash
ASSET_FALLBACK=mirror ASSET_MIRROR_URL="https://mirror-a.example/asset?id={id} https://mirror-b.example/v1/asset?id={id}"
```

Back up `data/` (database + `data/content/` blobs). Players also sign up
themselves at `/signup`.

## 4. Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 8080 | web gateway port |
| `HTTPS_PORT` | 443 | Studio-facing HTTPS port |
| `DATA_DIR` | `./data` | database, content store, logs |
| `ADMIN_KEY` | (unset) | required as `X-Admin-Key` for `/api/local/servers` and `/api/local/render/*`; unset = loopback callers only |
| `ASSET_FALLBACK` | `public` | `none`, `public` (Roblox's anonymous asset delivery), `opencloud`, `mirror` |
| `ROBLOX_OPEN_CLOUD_API_KEY` | | for `opencloud`: an Open Cloud API key you created |
| `ASSET_MIRROR_URL` | | for `mirror`: one or more URL templates, comma or space separated, tried in order; `{id}` is replaced with the asset id (appended if absent). Each attempt is logged |
| `STUDIO_OAUTH_USER` | | local account Studio's OAuth is approved for when no browser session is present (headless servers) |
| `LISTEN_HOST` | all interfaces | address the gateway and the Studio API bind to (`127.0.0.1` behind a TLS proxy) |
| `PYTHON` | `python3` | interpreter with `aioquic` for `tools/studio/wt_cert_hash.py` (the installer uses `/opt/robloxwebclient/.venv`) |
| `RCC_HOST` | `127.0.0.1` | address clients use to reach the game server (public IP or DNS name on a VPS) |
| `STUDIO_DIR` | `/home/user/studio` | Studio install and Wine prefix |
| `STUDIO_CPUS` | `0,1` | cores Studio is pinned to (keep the browser on others when both run on one machine) |
| `LOCAL_RCC` | | `1` loads `local_rcc_modern` into the Studio server |
| `RENDER_API` | `http://127.0.0.1:8080` | gateway the render worker claims jobs from |
| `RENDER_DISPLAY` | `:79` | virtual display for the render Studio (keep it apart from the server's) |
| `RENDER_KINDS` | `avatar,avatar-headshot,avatar-bust,place` | job kinds this worker takes |
| `RENDER_TIMEOUT_MS` | 150000 | per job |
| `PRESENCE_TIMEOUT_MS`, `SERVER_TIMEOUT_MS` | 120000, 180000 | when players/servers count as gone |
| `WEBCLIENT_FLAG_OVERRIDES` | `{}` | JSON of fast flags handed to the engine through WasmPlayer's own `getFlagOverrides` hook, e.g. `{"FIntWasmMemoryPages":"24576"}` (see section 9) |

## 5. HTTPS

- **Studio**: `tools/studio/make_tls.sh` creates `backend-tls/ca.key` (local CA)
  and a certificate for `*.sitetest1.robloxlabs.com`; `install_studio.sh` adds
  the CA to Studio's own `ssl/cacert.pem` only. `tools/studio/setup_env.sh`
  points the sitetest1 names at 127.0.0.1 in `/etc/hosts`.
- **Browser**: the web client needs a secure context (SharedArrayBuffer,
  WebTransport). `http://localhost` is one. On a VPS, put the gateway behind a
  TLS reverse proxy with a real certificate for your own domain, and keep the
  COOP/COEP headers `tools/server.js` sends:

  ```nginx
  server {
    listen 443 ssl http2;
    server_name play.example.org;
    ssl_certificate     /etc/letsencrypt/live/play.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/play.example.org/privkey.pem;
    client_max_body_size 64m;
    location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; proxy_buffering off; }
  }
  ```
- **Game traffic**: WebTransport to Studio uses Studio's self-signed certificate,
  pinned by hash in the join script (`NetStackConfig.certHashes`), so it needs no
  CA. Open the UDP ports (`53640` and the RbxTransport port, see
  `run_server.sh` output) in the firewall and set `RCC_HOST` to the public address.

## 6. Studio game server

```bash
tools/studio/install_studio.sh                  # Studio 0.745.0.7451137 + Wine prefix + CA
cmake -S local_rcc_modern -B local_rcc_modern/build-win -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE=cmake/mingw-w64-x86_64.cmake -DCMAKE_BUILD_TYPE=Release
ninja -C local_rcc_modern/build-win
STUDIO_OAUTH_USER=Builder tools/studio/setup_env.sh   # hosts, Xvfb, HTTPS front (needs root for /etc/hosts and :443)
LOCAL_RCC=1 tools/studio/run_server.sh 1818     # place 1818's file from the database
```

`run_server.sh` stages the place, starts Studio, waits for its RbxTransport port,
reads the certificate hash, registers the server (`game_servers`), heartbeats it
every 30 s and closes it when Studio exits. `gamejoin` then hands players to it.

Studio has to be signed in once per Wine prefix (the session then persists).
With the Studio API running (`STUDIO_OAUTH_USER` set):

```bash
tools/studio/signin.sh     # starts Studio, clicks "Login via Browser", waits for the sign-in
```

Studio's embedded login page (WebView2) doesn't load under Wine, so it offers
"Login via Browser". That opens our `/oauth/v1/authorize` through
`tools/studio/bin/xdg-open`, which approves it for `STUDIO_OAUTH_USER` and
launches a second Studio with the `roblox-studio-auth-sitetest1:/?code=…`
redirect, as a desktop's protocol handler would. That second Studio passes the
code to the first over `\\.\pipe\RBX_STUDIO_NS-<pid>`. The message carries a
`BuildIdentifier` derived from the base URL in `AppSettings.xml`, and the waiting
Studio ignores messages from a different one, so `AppSettings.xml` must name the
same base URL Studio is started with (`install_studio.sh` writes
`https://www.sitetest1.robloxlabs.com`). Then the waiting Studio exchanges the
code at `/oauth/v1/token` and shows "Welcome, Builder".

## 7. Thumbnails (Studio render worker; preliminary, see docs/KNOWN_ISSUES.md)

```bash
node tools/render/worker.js          # keeps claiming jobs; --once for a single job
```

Thumbnail requests (`thumbnails.roblox.com/v1/users/avatar-headshot`, game icons
without an uploaded image, …) queue a job and answer `Pending`. For each job the
worker opens a place in a separate Studio (an empty place for avatars, a copy
of the place file for place thumbnails), with `tools/render/RenderPlugin.lua`
installed for that job only. The plugin builds the scene with the engine:
avatars come from the backend's avatar-fetch, as RCC's render scripts load them.
It then frames the camera and marks the viewport. The worker captures the
rendered viewport, keys out the backdrop, sizes the image and posts it to
`/api/local/render/jobs/{key}/result`. The images go into the content store,
and the thumbnail APIs return them as `Completed`. A render takes about a
minute (Studio start-up). Results are cached per input, so a new render happens
only when an avatar or place changes. Failed jobs are retried 3 times and then
marked `Error`. `node tools/admin.js render list` shows the queue.

## 8. Run

Development (one machine):

```bash
STUDIO_OAUTH_USER=Builder tools/studio/setup_env.sh
LOCAL_RCC=1 tools/studio/run_server.sh 1818 &
node tools/server.js
# open http://localhost:8080/games/start?placeId=1818 and sign up
```

Headless test client (signs in or signs up `ACCOUNT`):

```bash
ACCOUNT=Player1 taskset -c 2,3 node tools/run_headless.js 75 'games/start?placeId=1818' screenshots/join.png
PORT=8081 ACCOUNT=Player2 taskset -c 2,3 node tools/run_headless.js 75 'games/start?placeId=1818' screenshots/join2.png
```

Production: run the services under systemd (`deploy/systemd/`, including
`roblox-render-worker.service`), behind the TLS proxy above.

Known issues (player controls, R15 head, headless GUI): `docs/KNOWN_ISSUES.md`.

## 9. Chromebooks and school devices

The client is Roblox's own build, unchanged, so a device runs it only if its
browser has what that build needs. `site-shim.js` checks each browser when the
play page opens, prints anything missing to the console
(`[LocalPlatform] this browser lacks …`) and posts a report (user agent, CPU
architecture and bitness, memory, GPU, WebGL extensions) to
`<data>/logs/client-report.log`. Check that log first when a device doesn't load.

What the engine needs, from the shipped `WebClient.js` / `WasmPlayer.js`:

| Requirement | Why | Typical Chromebook |
|---|---|---|
| HTTPS (secure context) and the gateway's COOP/COEP headers | `SharedArrayBuffer`: the engine is multi-threaded on shared memory | fine once served over HTTPS (the gateway sets the headers; keep them through the TLS proxy) |
| WebGL 2 | the only graphics path; Emscripten's context creation asks for `webgl2` and nothing else, with no WebGL 1 or WebGPU fallback | ARM Mali and Intel Chromebooks report it (`chrome://gpu`: "WebGL2: Hardware accelerated") unless an admin policy or the GPU blocklist disables it |
| JS Promise Integration (`WebAssembly.Suspending`) | async engine calls | Chrome 137 and later |
| WebTransport over UDP to the game server | game traffic (`RbxTransport`) | often the real blocker on school networks, which filter or drop UDP/QUIC; the server's UDP port must be reachable from that network |
| 2 GiB of shared memory, reserved at start | `WasmPlayer.js` allocates `FIntWasmMemoryPages` × 64 KiB (default 32768 pages = 2 GiB; Roblox's own flags don't change it) as one fixed, non-growable block | can fail on 4 GB devices or 32-bit browsers |

Texture formats are not a requirement: the asset service serves source
images and the engine compresses them on the device (it has ETC2, ASTC and BC
encoders), so GPUs without S3TC/BPTC (ARM Mali, for example) are covered.
Extensions such as `EXT_clip_control`, `EXT_depth_clamp` and
`OES_texture_float_linear` are queried by name rather than required at
context creation, and Roblox's `FFlagRenderWebGLWasmCompatibilityFallbacks` is
on. That the engine renders fully without them hasn't been verified on such a
device yet; the client report shows which ones a device lacks.

If the report shows the memory reservation as the problem, the operator can
set a smaller reservation with an engine flag (not a change to the client), e.g.
`WEBCLIENT_FLAG_OVERRIDES='{"FIntWasmMemoryPages":"24576"}'` (1.5 GiB). It
applies to every player, and big places can run out of memory with less, so
lower it only as far as needed.
