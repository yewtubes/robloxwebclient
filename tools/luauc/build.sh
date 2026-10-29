#!/bin/bash
# Builds tools/luauc/luauc against a Luau checkout (LUAU, default /home/user/luau).
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
LUAU="${LUAU:-/home/user/luau}"
SRC=$(ls "$LUAU"/Compiler/src/*.cpp "$LUAU"/Ast/src/*.cpp "$LUAU"/Bytecode/src/*.cpp "$LUAU"/Common/src/*.cpp 2>/dev/null)
g++ -std=c++17 -O1 -I"$LUAU/Compiler/include" -I"$LUAU/Ast/include" -I"$LUAU/Common/include" -I"$LUAU/Bytecode/include" \
  "$D/luauc.cpp" $SRC -o "$D/luauc"
echo "built $D/luauc"
