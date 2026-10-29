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
| `ASSET_MIRROR_URL` | | for `mirror`: URL with `{id}` |
| `STUDIO_OAUTH_USER` | | local account Studio's OAuth is approved for when no browser session is present (headless servers) |
| `RCC_HOST` | `127.0.0.1` | address clients use to reach the game server (public IP or DNS name on a VPS) |
| `STUDIO_DIR` | `/home/user/studio` | Studio install and Wine prefix |
| `STUDIO_CPUS` | `0,1` | cores Studio is pinned to (keep the browser on others when both run on one machine) |
| `LOCAL_RCC` | | `1` loads `local_rcc_modern` into the Studio server |
| `RENDER_API` | `http://127.0.0.1:8080` | gateway the render worker claims jobs from |
| `RENDER_DISPLAY` | `:79` | virtual display for the render Studio (keep it apart from the server's) |
| `RENDER_KINDS` | `avatar,avatar-headshot,avatar-bust,place` | job kinds this worker takes |
| `RENDER_TIMEOUT_MS` | 150000 | per job |
| `PRESENCE_TIMEOUT_MS`, `SERVER_TIMEOUT_MS` | 120000, 180000 | when players/servers count as gone |

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

Studio has to be signed in once per Wine prefix (the session then persists):

```bash
STUDIO_OAUTH_USER=Builder tools/studio/setup_env.sh
cd $STUDIO_DIR/app && PATH=$PWD/../../robloxwebclient/tools/studio/bin:$PATH \
  NO_PROXY="$NO_PROXY,.robloxlabs.com" WINEPREFIX=$STUDIO_DIR/prefix DISPLAY=:78 \
  wine RobloxStudioBeta.exe -baseUrl https://www.sitetest1.robloxlabs.com
# click "Login via Browser" (xdotool mousemove 749 460 click 1 on the 1280x800 display)
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
