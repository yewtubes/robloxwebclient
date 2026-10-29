#!/bin/bash
# Downloads Roblox's own web client, once, for local hosting:
#   webclient/live/<version>/  WebClient.wasm, WebClient.js, WasmPlayer.js,
#                              WebClient.metadata.json, audio-processor-fast.js
#   webclient/site/            the play.roblox.com/games/start page, its Next.js
#                              chunks, stylesheet and loading-screen assets,
#                              WasmLoader.js and stub.js
# Nothing is fetched from Roblox at runtime; tools/server.js serves these.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
get() { mkdir -p "$(dirname "$2")"; curl -sfL -A "$UA" -o "$2" "$1" || { echo "failed: $1" >&2; return 1; }; }

ver=$(curl -sf https://clientsettings.roblox.com/v2/client-version/WebClientApp)
upload=$(echo "$ver" | python3 -c 'import sys,json; print(json.load(sys.stdin)["clientVersionUpload"])')
version=$(echo "$ver" | python3 -c 'import sys,json; print(json.load(sys.stdin)["version"])')
dir=webclient/live/$upload
base=https://setup.rbxcdn.com/webclient/$upload-RobloxWebClient
for f in WebClient.wasm WebClient.js WasmPlayer.js WebClient.metadata.json audio-processor-fast.js; do
  [ -s "$dir/$f" ] || get "$base/$f" "$dir/$f"
done
echo "$ver" > "$dir/client-version.json"
# The build's content files (fonts, CoreScripts patch models, shaders, ...), at
# the same paths the engine requests them under its engine base.
python3 - "$dir" "$base" <<'PY'
import json, os, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
d, base = sys.argv[1], sys.argv[2]
todo = [f for f in json.load(open(os.path.join(d, 'WebClient.metadata.json')))
        if not (os.path.isfile(d + f['path']) and os.path.getsize(d + f['path']) == f['size'])]
def get(f):
    dst = d + f['path']
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        with urllib.request.urlopen(base + urllib.parse.quote(f['path'])) as r: data = r.read()
        open(dst, 'wb').write(data)
    except Exception as e:
        print('failed:', f['path'], e, file=sys.stderr)
with ThreadPoolExecutor(16) as ex: list(ex.map(get, todo))
print(f'content: fetched {len(todo)} files')
PY
echo "web client $version ($upload) -> $dir"

site=webclient/site
get "https://play.roblox.com/games/start?placeId=1" "$site/games/start.html"
# Every asset the page references, then everything its stylesheet references.
for p in $(grep -o '/[0-9a-f]\{40\}/[^"]*' "$site/games/start.html" | sort -u); do get "https://play.roblox.com$p" "$site$p"; done
build=$(grep -o '/[0-9a-f]\{40\}/' "$site/games/start.html" | head -1)
for f in WasmLoader.js stub.js; do get "https://play.roblox.com${build}assets/webclient/$f" "$site${build}assets/webclient/$f"; done
for css in $(find "$site" -name '*.css'); do
  for u in $(grep -o 'url([^)]*)' "$css" | sed -E 's/url\(["'"'"']?([^"'"'"')]*)["'"'"']?\)/\1/' | grep -v '^data:' | sort -u); do
    case "$u" in /*) p="$u" ;; *) p="$(dirname "${css#$site}")/$u" ;; esac
    p=$(python3 -c 'import os,sys; print(os.path.normpath(sys.argv[1]))' "$p")
    [ -s "$site$p" ] || get "https://play.roblox.com$p" "$site$p" || true
  done
done
echo "page -> $site (build ${build//\//})"
