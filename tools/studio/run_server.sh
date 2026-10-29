#!/bin/bash
# Starts Roblox Studio as a local game server under Wine on display :78.
#   run_server.sh <place.rbxl> [port]
# Studio's StartServer task ignores the path argument and always loads
# %LOCALAPPDATA%\Roblox\server.rbxl (the editor saves the place there before it
# spawns the server), so the place is staged there first. The arguments match
# what Studio itself passes for Test > Server and Clients.
place=$(readlink -f "$1"); port=${2:-53640}
LRM=$(readlink -f "$(dirname "$(readlink -f "$0")")/../../local_rcc_modern/build-win")
S=/home/user/studio
export PATH=$S/bin:$PATH NO_PROXY="$NO_PROXY,.robloxlabs.com" no_proxy="$NO_PROXY,.robloxlabs.com"
export WINEPREFIX=$S/prefix WINEDEBUG=-all WINEARCH=win64
stage=$WINEPREFIX/drive_c/users/root/AppData/Local/Roblox
mkdir -p "$stage" && cp "$place" "$stage/server.rbxl" || exit 1
pgrep -x Xvfb >/dev/null || (setsid Xvfb :78 -screen 0 1280x800x24 >/dev/null 2>&1 &)
sleep 1
export DISPLAY=:78
# The server's 3D view renders with llvmpipe and would take every core; keep it
# to STUDIO_CPUS so clients on the same machine (Chrome) aren't starved, which
# otherwise stalls the WebTransport handshake past Chromium's 4 s timeout.
export LP_NUM_THREADS=${LP_NUM_THREADS:-1}
cd $S/app
# LOCAL_RCC=1 loads local_rcc_modern (RCC-style script replication; see
# local_rcc_modern/README.md) through its injector before Studio starts.
inject=()
if [ -n "${LOCAL_RCC:-}" ]; then
  export LOCAL_RCC_LOG=${LOCAL_RCC_LOG:-Z:/home/user/studio/local_rcc_modern.log}
  inject=("Z:$LRM/local_rcc_inject.exe" "Z:$LRM/local_rcc_modern.dll" RobloxStudioBeta.exe)
fi
exec ${WRAP:-} taskset -c ${STUDIO_CPUS:-0,1} wine "${inject[@]:-RobloxStudioBeta.exe}" -creatorId 0 -placeVersion 0 -task StartServer \
  -localProjectFile "C:/users/root/AppData/Local/Roblox/server.rbxl" -placeId 0 -universeId 0 \
  -port "$port" -creatorType 0 -numTestServerPlayersUponStartup 0 \
  -userid 1 -baseUrl https://www.sitetest1.robloxlabs.com -channel production \
  -instanceId StudioServer -playTestSessionGuid "$(cat /proc/sys/kernel/random/uuid | tr a-z A-Z)"
