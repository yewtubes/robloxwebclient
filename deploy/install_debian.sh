#!/bin/bash
# Installs the self-hosted platform on a Debian 12/13 (or Ubuntu 22.04+) x86-64 server,
# run by systemd as an unprivileged user, with Roblox Studio under Wine as the game server.
#
#   sudo deploy/install_debian.sh [--public-host <ip-or-dns-name>] [--place <placeId>]
#
# Re-running it is safe: finished steps are skipped and /etc/roblox-platform.env is
# kept. Settings (environment, with defaults):
#   APP_DIR=/opt/robloxwebclient   where the code is installed (copied from this checkout)
#   STUDIO_DIR=/opt/studio         Studio install and Wine prefix
#   DATA_DIR=/var/lib/roblox-platform   database, content store, logs
#   SVC_USER=roblox                the account the services run as
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run as root (sudo)"; exit 1; }
SRC=$(cd "$(dirname "$0")/.." && pwd)
APP=${APP_DIR:-/opt/robloxwebclient}
STUDIO=${STUDIO_DIR:-/opt/studio}
DATA=${DATA_DIR:-/var/lib/roblox-platform}
SVC=${SVC_USER:-roblox}
PUBLIC_HOST="" PLACE=1818
while [ $# -gt 0 ]; do
  case $1 in
    --public-host) PUBLIC_HOST=$2; shift 2 ;;
    --place) PLACE=$2; shift 2 ;;
    *) echo "unknown option $1"; exit 1 ;;
  esac
done
[ -n "$PUBLIC_HOST" ] || PUBLIC_HOST=$(hostname -I | awk '{print $1}')
step() { echo; echo "==> $*"; }
as_svc() { runuser -u "$SVC" -- env HOME="/home/$SVC" STUDIO_DIR="$STUDIO" DATA_DIR="$DATA" "$@"; }
. /etc/os-release

step "packages (Wine from WineHQ, Node.js 22 from NodeSource)"
dpkg --print-foreign-architectures | grep -qx i386 || dpkg --add-architecture i386
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg >/dev/null
mkdir -pm755 /etc/apt/keyrings
[ -s /etc/apt/keyrings/winehq-archive.key ] || curl -fsSLo /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
[ -s "/etc/apt/sources.list.d/winehq-$VERSION_CODENAME.sources" ] || \
  curl -fsSLo "/etc/apt/sources.list.d/winehq-$VERSION_CODENAME.sources" \
    "https://dl.winehq.org/wine-builds/$ID/dists/$VERSION_CODENAME/winehq-$VERSION_CODENAME.sources"
# node:sqlite needs Node.js 22.13 or newer; Debian's own nodejs is older.
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a==22&&b>=13)?0:1)' 2>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
fi
apt-get update -qq
apt-get install -y -qq --install-recommends winehq-staging >/dev/null
apt-get install -y -qq nodejs xvfb xdotool imagemagick unzip openssl python3-venv \
  g++-mingw-w64-x86-64 cmake ninja-build git rsync >/dev/null
node --version; wine --version

step "service account $SVC and directories"
id "$SVC" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$SVC"
mkdir -p "$APP" "$STUDIO" "$DATA"
if [ "$SRC" != "$APP" ]; then
  rsync -a --delete --exclude data/ --exclude '*/build-*/' --exclude backend-tls/ca.key --exclude backend-tls/server.key "$SRC/" "$APP/"
fi
chown -R "$SVC:$SVC" "$APP" "$STUDIO" "$DATA"

step "Python environment (WebTransport certificate hash)"
[ -x "$APP/.venv/bin/python" ] || as_svc python3 -m venv "$APP/.venv"
as_svc "$APP/.venv/bin/pip" install -q aioquic cryptography

step "web client files"
ls "$APP"/webclient/live/*/WebClient.wasm >/dev/null 2>&1 || as_svc "$APP/tools/fetch_webclient.sh"
sha256sum "$APP"/webclient/live/*/WebClient.wasm "$APP"/webclient/live/*/WebClient.js "$APP"/webclient/live/*/WasmPlayer.js

step "systemd units"
for f in "$APP"/deploy/systemd/*.service; do
  sed -e "s#/opt/robloxwebclient#$APP#g" -e "s#/opt/studio#$STUDIO#g" -e "s#/var/lib/roblox-platform#$DATA#g" \
      -e "s#^User=roblox#User=$SVC#" "$f" > "/etc/systemd/system/$(basename "$f")"
done
systemctl daemon-reload
systemctl enable --now roblox-xvfb.service   # the display Studio installs and runs on

step "Roblox Studio under Wine ($STUDIO)"
[ -x "$STUDIO/app/RobloxStudioBeta.exe" ] || as_svc "$APP/tools/studio/install_studio.sh"

step "local_rcc_modern (MinGW cross-build)"
if [ ! -s "$APP/local_rcc_modern/build-win/local_rcc_modern.dll" ]; then
  as_svc cmake -S "$APP/local_rcc_modern" -B "$APP/local_rcc_modern/build-win" -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE="$APP/local_rcc_modern/cmake/mingw-w64-x86_64.cmake" -DCMAKE_BUILD_TYPE=Release >/dev/null
  as_svc ninja -C "$APP/local_rcc_modern/build-win" >/dev/null
fi

step "host names for Studio (/etc/hosts)"
"$APP/tools/studio/setup_env.sh" --hosts-only

step "/etc/roblox-platform.env"
if [ ! -s /etc/roblox-platform.env ]; then
  cat > /etc/roblox-platform.env <<ENV
# Read by every roblox-* unit. See docs/SELF_HOSTING.md for all settings.
DATA_DIR=$DATA
STUDIO_DIR=$STUDIO
# Address players' clients use to reach the game server (UDP).
RCC_HOST=$PUBLIC_HOST
# The web gateway and Studio API only listen on loopback; put a TLS proxy in front
# of the gateway (nginx: listen $PUBLIC_HOST:443 ssl; proxy_pass http://127.0.0.1:8080).
LISTEN_HOST=127.0.0.1
PYTHON=$APP/.venv/bin/python
ADMIN_KEY=$(openssl rand -hex 24)
ASSET_FALLBACK=public
# ASSET_FALLBACK=opencloud with ROBLOX_OPEN_CLOUD_API_KEY=..., or mirror with
# ASSET_MIRROR_URL="https://mirror-a/...{id} https://mirror-b/...{id}" (tried in order).
STUDIO_OAUTH_USER=Builder
STUDIO_CPUS=0,1
ENV
  chmod 640 /etc/roblox-platform.env; chgrp "$SVC" /etc/roblox-platform.env
fi

systemctl enable --now roblox-studio-api.service roblox-gateway.service

step "Studio sign-in (once per Wine prefix)"
set -a; . /etc/roblox-platform.env; set +a
as_svc env DISPLAY_NUM=:78 NO_PROXY=.robloxlabs.com "$APP/tools/studio/signin.sh"

step "game server for place $PLACE"
systemctl enable --now "roblox-studio-server@$PLACE.service"
sleep 5; systemctl --no-pager --lines=5 status "roblox-studio-server@$PLACE.service" || true

cat <<DONE

Installed. Next:
  - TLS proxy for the web gateway (http://127.0.0.1:8080) on https://<your domain>/,
    listening on $PUBLIC_HOST:443 (not 0.0.0.0: the Studio API holds 127.0.0.1:443).
  - Firewall: allow TCP 443 (TLS proxy), UDP 53640 and UDP 49152-65535 (Studio picks
    the game server's WebTransport port from that range at each start; see
    journalctl -u roblox-studio-server@$PLACE | grep RbxTransport).
  - Accounts and experiences: sudo -u $SVC env DATA_DIR=$DATA node $APP/tools/admin.js
  - Optional thumbnail renderer (preliminary): systemctl enable --now roblox-render-worker
DONE
