#!/bin/bash
# Starts Roblox Studio as a local game server under Wine on a virtual display.
#   run_server.sh <placeId | place.rbxl[x]>[:port] [port]   (default port 53640)
# A place id is looked up in the platform database (places.file_path).
# Studio's StartServer task ignores the path argument and always loads
# %LOCALAPPDATA%\Roblox\server.rbxl (the editor saves the place there before it
# spawns the server), so the place is staged there first. The arguments match
# what Studio itself passes for Test > Server and Clients.
#
# Once Studio logs its RbxTransport port, the server is registered in the
# platform database (game_servers) with its certificate hash, heartbeated while
# Studio runs and closed when it exits, so gamejoin can allocate it.
ROOT=$(readlink -f "$(dirname "$(readlink -f "$0")")/../..")
arg=${1%%:*}; port=${2:-53640}; [[ $1 == *:* ]] && port=${1##*:}
# Studio picks the WebTransport (RbxTransport) port itself, from the Windows dynamic
# range 49152-65535, and it is read from the log below. (-rbxTransportPort exists
# but makes this build tear the server down at once.)
set -- "$arg"
if [[ $1 =~ ^[0-9]+$ ]]; then
  PLACE_ID=$1
  file=$(node -e "const p=require('$ROOT/tools/backend/model.js').place(+process.argv[1]); if(!p||!p.file_path) process.exit(1); console.log(p.file_path)" "$1" 2>/dev/null) \
    || { echo "place $1 has no file in the database (tools/admin.js place add)"; exit 1; }
  place=$(readlink -f "$ROOT/$file")
else
  place=$(readlink -f "$1"); PLACE_ID=${PLACE_ID:-1818}
fi
LRM=$ROOT/local_rcc_modern/build-win
S=${STUDIO_DIR:-/home/user/studio}
export PATH=$ROOT/tools/studio/bin:$S/bin:$PATH NO_PROXY="$NO_PROXY,.robloxlabs.com" no_proxy="$NO_PROXY,.robloxlabs.com"
export WINEPREFIX=$S/prefix WINEDEBUG=-all WINEARCH=win64 WINEDLLOVERRIDES="mscoree,mshtml="
WINUSER=$(whoami)
stage=$WINEPREFIX/drive_c/users/$WINUSER/AppData/Local/Roblox
logs=$stage/logs
mkdir -p "$stage" && cp "$place" "$stage/server.rbxl" || exit 1
export DISPLAY=${DISPLAY_NUM:-:78}
pgrep -x Xvfb >/dev/null || (setsid Xvfb "$DISPLAY" -screen 0 1280x800x24 >/dev/null 2>&1 &)
sleep 1
# The server's 3D view renders with llvmpipe and would take every core; keep it
# to STUDIO_CPUS so clients on the same machine (Chrome) aren't starved, which
# otherwise stalls the WebTransport handshake past Chromium's 4 s timeout.
export LP_NUM_THREADS=${LP_NUM_THREADS:-1}
cd "$S/app"
# LOCAL_RCC=1 loads local_rcc_modern (RCC-style script replication; see
# local_rcc_modern/README.md) through its injector before Studio starts.
inject=()
if [ -n "${LOCAL_RCC:-}" ]; then
  export LOCAL_RCC_LOG=${LOCAL_RCC_LOG:-Z:$S/local_rcc_modern.log}
  inject=("Z:$LRM/local_rcc_inject.exe" "Z:$LRM/local_rcc_modern.dll" RobloxStudioBeta.exe)
fi
mkdir -p "$logs"; marker=$(mktemp); trap 'rm -f "$marker"' EXIT
${WRAP:-} taskset -c "${STUDIO_CPUS:-0,1}" wine "${inject[@]:-RobloxStudioBeta.exe}" -creatorId 0 -placeVersion 0 -task StartServer \
  -localProjectFile "C:/users/$WINUSER/AppData/Local/Roblox/server.rbxl" -placeId 0 -universeId 0 \
  -port "$port" -creatorType 0 -numTestServerPlayersUponStartup 0 \
  -userid 1 -baseUrl https://www.sitetest1.robloxlabs.com -channel production \
  -instanceId StudioServer -playTestSessionGuid "$(cat /proc/sys/kernel/random/uuid | tr a-z A-Z)" &
studio=$!

host=${RCC_HOST:-127.0.0.1}
job=""
for _ in $(seq 1 120); do
  kill -0 $studio 2>/dev/null || break
  log=$(find "$logs" -name '*.log' -newer "$marker" 2>/dev/null | xargs -r grep -al 'Started RbxTransport network server' | head -1)
  if [ -n "$log" ]; then
    tport=$(grep -ao 'Started RbxTransport network server [0-9.]*|[0-9]*' "$log" | head -1 | cut -d'|' -f2)
    cert=""
    for _ in 1 2 3 4 5; do cert=$("${PYTHON:-python3}" "$ROOT/tools/studio/wt_cert_hash.py" "$tport" "$host" 2>/dev/null) && [ -n "$cert" ] && break; sleep 2; done
    job=$(node "$ROOT/tools/admin.js" server register "$PLACE_ID" "$host" "$port" "$tport" ${cert:+--cert "$cert"})
    echo "run_server: registered job $job for place $PLACE_ID at $host:$port (RbxTransport $tport, cert ${cert:-unknown})"
    break
  fi
  sleep 2
done
[ -z "$job" ] && echo "run_server: Studio did not report an RbxTransport port; not registered"
trap '[ -n "$job" ] && node "$ROOT/tools/admin.js" server close "$job" >/dev/null; rm -f "$marker"; kill $studio 2>/dev/null' EXIT INT TERM
while kill -0 $studio 2>/dev/null; do
  [ -n "$job" ] && node "$ROOT/tools/admin.js" server heartbeat "$job" >/dev/null 2>&1
  sleep 30
done
wait $studio
