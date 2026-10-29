#!/bin/bash
# Signs the Studio install in $STUDIO_DIR in to the local platform, once per Wine
# prefix (the session then persists). Needs the Studio API (tools/studio_backend.js)
# running with STUDIO_OAUTH_USER set, and the display ($DISPLAY_NUM, default :78).
# Studio's embedded login page (WebView2) doesn't load under Wine, so this clicks
# "Login via Browser"; tools/studio/bin/xdg-open approves the request for
# STUDIO_OAUTH_USER and hands the code back to Studio (see docs/SELF_HOSTING.md).
set -uo pipefail
ROOT=$(readlink -f "$(dirname "$(readlink -f "$0")")/../..")
S=${STUDIO_DIR:-/home/user/studio}
export PATH=$ROOT/tools/studio/bin:$PATH NO_PROXY="${NO_PROXY:-},.robloxlabs.com" no_proxy="${no_proxy:-},.robloxlabs.com"
export WINEPREFIX=$S/prefix WINEDEBUG=-all WINEARCH=win64 WINEDLLOVERRIDES="mscoree,mshtml=" STUDIO_DIR=$S
export DISPLAY=${DISPLAY_NUM:-:78}
logs=$WINEPREFIX/drive_c/users/$(whoami)/AppData/Local/Roblox/logs
[ -e "/tmp/.X11-unix/X${DISPLAY#:}" ] || { setsid Xvfb "$DISPLAY" -screen 0 1280x800x24 >/dev/null 2>&1 & sleep 1; }
mkdir -p "$logs"; marker=$(mktemp)
cd "$S/app"
wine RobloxStudioBeta.exe -baseUrl https://www.sitetest1.robloxlabs.com >/dev/null 2>&1 &
studio=$!
newest() { find "$logs" -name '*.log' -newer "$marker" 2>/dev/null | xargs -r ls -t | head -1; }
result=1
for i in $(seq 1 90); do
  sleep 2
  log=$(newest)
  [ -n "$log" ] || continue
  if grep -aq 'login \[end\]\[success\]' "$log"; then echo "signin: Studio is signed in"; result=0; break; fi
  # The login dialog: "Login via Browser" (1280x800 display). Click every 10 s until it takes.
  (( i % 5 == 0 )) && xdotool mousemove 749 460 click 1
done
[ $result -ne 0 ] && echo "signin: no successful login after 180 s (see $(newest), $S/opened-urls.log)"
kill $studio 2>/dev/null; sleep 2
# Only this Studio: a game server's command line starts with -creatorId, not -baseUrl.
for pid in $(pgrep -f 'RobloxStudioBeta.exe -baseUrl https://www.sitetest1'); do kill "$pid" 2>/dev/null; done
rm -f "$marker"
exit $result
