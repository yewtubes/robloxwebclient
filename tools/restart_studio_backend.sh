#!/bin/bash
# (Re)starts tools/studio_backend.js in the background.
cd "$(dirname "$0")/.."
for pid in $(pgrep -x node); do
  if tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null | grep -q 'tools/studio_backend.js'; then kill "$pid"; fi
done
sleep 0.5
setsid node tools/studio_backend.js > "${STUDIO_BACKEND_OUT:-/tmp/studio_backend.out}" 2>&1 < /dev/null &
sleep 1
echo "studio backend restarted"
