#!/bin/bash
# Starts Roblox Studio as a play-test client (the reference client) joining a
# local Studio server started by run_server.sh.
#   run_client.sh [port] [rbxTransportPort]
# Arguments match what Studio's editor passes for Test > Server and Clients
# (captured with watch_procs.sh). The RbxTransport port defaults to the one the
# newest server log reports.
port=${1:-53640}
S=/home/user/studio
export PATH=$S/bin:$PATH NO_PROXY="$NO_PROXY,.robloxlabs.com" no_proxy="$NO_PROXY,.robloxlabs.com"
export WINEPREFIX=$S/prefix WINEDEBUG=-all WINEARCH=win64 DISPLAY=:78 LP_NUM_THREADS=${LP_NUM_THREADS:-1}
logs=$WINEPREFIX/drive_c/users/root/AppData/Local/Roblox/logs
rbxport=${2:-$(grep -aoh 'Started RbxTransport network server [0-9.]*|[0-9]*' $(ls -t $logs/*.log) 2>/dev/null | head -1 | cut -d'|' -f2)}
cd $S/app
exec taskset -c ${CLIENT_CPUS:-2,3} wine RobloxStudioBeta.exe -task StartClient -rbxTransportToken bG9jYWxfdGVzdA== \
  -localProjectFile "C:/users/root/AppData/Local/Roblox/server.rbxl" -universeId 0 -placeId 0 -port "$port" \
  -numTestServerPlayersUponStartup 0 -rbxTransportPort "$rbxport" -userid 1 \
  -baseUrl https://www.sitetest1.robloxlabs.com -channel production -instanceId StudioPlayer_0 \
  -playTestSessionGuid "$(cat /proc/sys/kernel/random/uuid | tr a-z A-Z)"
