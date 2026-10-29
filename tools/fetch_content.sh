#!/bin/bash
# Fetches the public Windows Player/Studio packages from setup.rbxcdn.com and lays
# them out under webclient/files/ to match the paths in WebClient.metadata.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/webclient/files"
PKG="${PKG_DIR:-$ROOT/.pkgcache}"
mkdir -p "$OUT" "$PKG/player" "$PKG/studio" "$PKG/stage"

ver() { curl -fsS "https://clientsettingscdn.roblox.com/v2/client-version/$1" | sed -E 's/.*"clientVersionUpload":"([^"]+)".*/\1/'; }
PLAYER=$(ver WindowsPlayer)
STUDIO=$(ver WindowsStudio64)
echo "player $PLAYER, studio $STUDIO"

get() { [ -s "$3/$2.zip" ] || curl -fsS -o "$3/$2.zip" "https://setup.rbxcdn.com/$1-$2.zip"; }
ex() { mkdir -p "$3/$2"; unzip -oq "$1.zip" -d "$3/$2" 2>/dev/null || true; }

# player package -> metadata directory
while read -r pkg dir; do
  get "$PLAYER" "$pkg" "$PKG/player"
  (cd "$PKG/player" && ex "$pkg" "$dir" "$OUT")
done <<'MAP'
content-avatar content/avatar
content-configs content/configs
content-fonts content/fonts
content-models content/models
content-sky content/sky
content-sounds content/sounds
content-textures2 content/textures
content-textures3 PlatformContent/pc/textures
content-terrain PlatformContent/pc/terrain
content-platform-fonts PlatformContent/pc/fonts
content-platform-dictionaries PlatformContent/pc/shared_compression_dictionaries
extracontent-luapackages ExtraContent/LuaPackages
extracontent-translations ExtraContent/translations
extracontent-models ExtraContent/models
extracontent-textures ExtraContent/textures
extracontent-places ExtraContent/places
ssl ssl
MAP

# studio-only packages (CoreScripts, fuller LuaPackages) used to fill gaps
while read -r pkg dir; do
  get "$STUDIO" "$pkg" "$PKG/studio"
  (cd "$PKG/studio" && ex "$pkg" "$dir" "$PKG/stage")
done <<'MAP'
extracontent-scripts ExtraContent/scripts
extracontent-luapackages ExtraContent/LuaPackages
content-avatar content/avatar
content-models content/models
extracontent-models ExtraContent/models
MAP

node "$ROOT/tools/fill_missing.js" "$ROOT/webclient/WebClient.metadata.json" "$OUT" "$PKG/stage"

# The web build's shaders_glsles3_web.pack is not public. The desktop GLSL pack
# has the same layout; WebClient.js converts its shaders to GLSL ES at load time.
get "$PLAYER" shaders "$PKG/player"
mkdir -p "$OUT/shaders"
unzip -p "$PKG/player/shaders.zip" shaders_glsl3.pack > "$OUT/shaders/shaders_glsles3_web.pack"
