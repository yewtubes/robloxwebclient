#!/bin/bash
# One-time setup after cloning: content files, patched wasm, Luau compiler and
# the Play Solo overlay. Needs curl, unzip, node 22, g++ and a Luau checkout
# (LUAU, default /home/user/luau; https://github.com/luau-lang/luau).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/tools/fetch_content.sh"
node "$ROOT/tools/patch_wasm.js"
[ -x "$ROOT/tools/luauc/luauc" ] || "$ROOT/tools/luauc/build.sh"
node "$ROOT/tools/build_playsolo.js" "${1:-$ROOT/places/WorldHQ.rbxl}"
echo "done: run 'node tools/server.js' and open http://localhost:8080/"
