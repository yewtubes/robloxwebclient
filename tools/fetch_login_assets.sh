#!/bin/bash
# Downloads the assets the sign-in / sign-up page (webclient/pages/login.html)
# uses, once, into webclient/pages/assets/:
#   - Builder Sans / Builder Extended, the fonts roblox.com/login serves from
#     css.rbxcdn.com (the @font-face list in its Builder.css)
#   - the background: the hero video on roblox.com's landing page
#     (tools/fetch_landing_video.js; needs Playwright and ffmpeg), plus a still
#     from it as the poster
# Nothing is fetched from Roblox at runtime; tools/server.js serves these.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
out=webclient/pages/assets
mkdir -p "$out"
get() { curl -sfL -A "$UA" -o "$2" "$1" || { echo "failed: $1" >&2; return 1; }; }

# The login page's stylesheets, to find Builder.css and its font files.
login=$(curl -sfL -A "$UA" https://www.roblox.com/login)
builder=$(grep -o 'https://css.rbxcdn.com/[0-9a-f]*-Builder\.css' <<<"$login" | head -1)
css=$(curl -sfL -A "$UA" "$builder")
# family weight -> local name; upright faces only.
font() {
  local u
  u=$(grep -o "@font-face{font-family:$1;src:url([^)]*\.woff2)[^}]*font-weight:$2;font-style:normal}" <<<"$css" \
      | grep -o 'https://css.rbxcdn.com/[0-9a-f]*\.woff2' | head -1)
  [ -n "$u" ] || { echo "no $1 $2 in $builder" >&2; return 1; }
  get "$u" "$out/$3"
}
font 'Builder Sans' 400 BuilderSans-Regular.woff2
font 'Builder Sans' 500 BuilderSans-Medium.woff2
font 'Builder Sans' 600 BuilderSans-SemiBold.woff2
font 'Builder Sans' 700 BuilderSans-Bold.woff2
font 'Builder Extended' 800 BuilderExtended-ExtraBold.woff2

node tools/fetch_landing_video.js "$out/landing.webm"
ffmpeg -v error -y -ss 9 -i "$out/landing.webm" -frames:v 1 -q:v 4 "$out/landing.jpg"
ls -l "$out"
