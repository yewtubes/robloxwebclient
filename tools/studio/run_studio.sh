#!/bin/bash
# Runs Roblox Studio under Wine on a virtual X display and screenshots it.
#   run_studio.sh <seconds> <shot.png> [studio args...]
# CLICKS="20:616,464;30:700,300" clicks at x,y after the given second.
secs=$1; shot=$2; shift 2
export PATH=${STUDIO_DIR:-/home/user/studio}/bin:$PATH NO_PROXY="$NO_PROXY,.robloxlabs.com" no_proxy="$NO_PROXY,.robloxlabs.com"
export WINEPREFIX=${STUDIO_DIR:-/home/user/studio}/prefix WINEDEBUG=-all WINEARCH=win64
Xvfb :77 -screen 0 1280x800x24 >/dev/null 2>&1 & XPID=$!
sleep 1
export DISPLAY=:77
cd ${STUDIO_DIR:-/home/user/studio}/app
wine RobloxStudioBeta.exe "$@" >${STUDIO_DIR:-/home/user/studio}/studio_stdout.txt 2>&1 &
declare -A clicks
IFS=';' read -ra items <<< "${CLICKS:-}"
for it in "${items[@]}"; do [ -n "$it" ] && clicks[${it%%:*}]="${clicks[${it%%:*}]} ${it#*:}"; done
for t in $(seq 1 "$secs"); do
  sleep 1
  for xy in ${clicks[$t]}; do xdotool mousemove ${xy%,*} ${xy#*,} click 1; echo "click $xy at ${t}s" >> ${STUDIO_DIR:-/home/user/studio}/opened-urls.log; done
  if (( t % 10 == 0 )); then import -window root "$shot" 2>/dev/null; fi
done
wineserver -k 2>/dev/null
kill $XPID 2>/dev/null
