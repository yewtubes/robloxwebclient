#!/bin/bash
# Installs Roblox Studio for Windows under Wine, as the local game server.
#   install_studio.sh [version-upload]   (default: version-7062aec9dbe74b14 = 0.745.0.7451137,
#                                         the build local_rcc_modern has a profile for)
# Result: $STUDIO_DIR/{app,prefix} (default /home/user/studio). Needs wine (tested with winehq-staging 11.20),
# Xvfb, unzip and curl. Packages come from Roblox's public setup CDN, once.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VER=${1:-version-7062aec9dbe74b14}
S=${STUDIO_DIR:-/home/user/studio}
APP=$S/app PKG=$S/pkg
mkdir -p "$APP" "$PKG"
base=https://setup.rbxcdn.com/$VER
curl -fsS "$base-rbxPkgManifest.txt" -o "$PKG/manifest.txt"
# Package -> folder layout of an installed Studio.
declare -A DIR=(
  [RobloxStudio.zip]= [redist.zip]= [Libraries.zip]= [LibrariesQt5.zip]= [WebView2.zip]=
  [WebView2RuntimeInstaller.zip]=WebView2RuntimeInstaller [shaders.zip]=shaders [ssl.zip]=ssl
  [Qml.zip]=Qml [Plugins.zip]=Plugins [StudioFonts.zip]=StudioFonts [BuiltInPlugins.zip]=BuiltInPlugins
  [ApplicationConfig.zip]=ApplicationConfig [BuiltInStandalonePlugins.zip]=BuiltInStandalonePlugins
  [content-qt_translations.zip]=content/qt_translations [content-sky.zip]=content/sky
  [content-fonts.zip]=content/fonts [content-avatar.zip]=content/avatar [content-models.zip]=content/models
  [content-sounds.zip]=content/sounds [content-configs.zip]=content/configs [content-api-docs.zip]=content/api_docs
  [content-textures2.zip]=content/textures [content-studio_svg_textures.zip]=content/studio_svg_textures
  [content-platform-fonts.zip]=PlatformContent/pc/fonts
  [content-platform-dictionaries.zip]=PlatformContent/pc/shared_compression_dictionaries
  [content-terrain.zip]=PlatformContent/pc/terrain [content-textures3.zip]=PlatformContent/pc/textures
  [extracontent-translations.zip]=ExtraContent/translations [extracontent-luapackages.zip]=ExtraContent/LuaPackages
  [extracontent-textures.zip]=ExtraContent/textures [extracontent-scripts.zip]=ExtraContent/scripts
  [extracontent-models.zip]=ExtraContent/models [studiocontent-models.zip]=StudioContent/models
  [studiocontent-textures.zip]=StudioContent/textures
)
for p in $(tr -d '\r' < "$PKG/manifest.txt" | grep '\.zip$'); do
  [ -s "$PKG/$p" ] || curl -fsS "$base-$p" -o "$PKG/$p"
  if [ -n "${DIR[$p]+x}" ]; then
    mkdir -p "$APP/${DIR[$p]}"
    unzip -oq "$PKG/$p" -d "$APP/${DIR[$p]}" || true
  else
    echo "skip unknown package $p"
  fi
done
cat > "$APP/AppSettings.xml" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<Settings>
	<ContentFolder>content</ContentFolder>
	<BaseUrl>https://www.sitetest1.robloxlabs.com</BaseUrl>
</Settings>
XML
# Studio trusts the local backend's CA (backend-tls/, see tools/studio/make_tls.sh) and nothing else changes.
"$ROOT/tools/studio/make_tls.sh"
grep -q 'Local Roblox Backend CA' "$APP/ssl/cacert.pem" 2>/dev/null || {
  printf '\nLocal Roblox Backend CA\n' >> "$APP/ssl/cacert.pem"; cat "$ROOT/backend-tls/ca.crt" >> "$APP/ssl/cacert.pem"; }
export WINEPREFIX=$S/prefix WINEDEBUG=-all WINEARCH=win64
[ -d "$WINEPREFIX/drive_c" ] || { pgrep -x Xvfb >/dev/null || (setsid Xvfb :78 -screen 0 1280x800x24 >/dev/null 2>&1 &); sleep 1; DISPLAY=:78 WINEDLLOVERRIDES="mscoree,mshtml=" wineboot -i; wineserver -w; }
# The installed build, for the backend's client-version/WindowsStudio64 answer.
ver=$(curl -fsS https://clientsettingscdn.roblox.com/v2/client-version/WindowsStudio64 | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["version"] if d["clientVersionUpload"]==sys.argv[1] else "")' "$VER" || true)
printf '{"version":"%s","clientVersionUpload":"%s","bootstrapperVersion":""}\n' "${ver:-${STUDIO_VERSION:-0.745.0.7451137}}" "$VER" > "$S/version.json"
sha256sum "$APP/RobloxStudioBeta.exe"
echo "studio $VER -> $APP"
