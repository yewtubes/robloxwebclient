#!/bin/bash
# Opens a place file in Studio (edit mode) under Wine on display :78.
#   run_edit.sh 'C:\places\X.rbxl' [extra args]
p=$1; shift
export PATH=${STUDIO_DIR:-/home/user/studio}/bin:$PATH NO_PROXY="$NO_PROXY,.robloxlabs.com" no_proxy="$NO_PROXY,.robloxlabs.com"
export WINEPREFIX=${STUDIO_DIR:-/home/user/studio}/prefix WINEDEBUG=-all WINEARCH=win64
pgrep -x Xvfb >/dev/null || (Xvfb :78 -screen 0 1280x800x24 >/dev/null 2>&1 &)
sleep 1
export DISPLAY=:78
cd ${STUDIO_DIR:-/home/user/studio}/app
exec wine RobloxStudioBeta.exe -task EditFile -localPlaceFile "$p" "$@"
