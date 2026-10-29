#!/bin/bash
# Prepares this machine for running Studio against the local backend, after a
# fresh container start: host names, the virtual display and the HTTPS front.
# Studio's BaseUrl is https://www.sitetest1.robloxlabs.com, so every
# <service>.sitetest1.robloxlabs.com name it uses must resolve to 127.0.0.1;
# tools/studio_backend.js answers them with a certificate from backend-tls/
# (trusted only in Studio's ssl/cacert.pem).
cd "$(dirname "$0")/../.."
services="abtesting accountinformation accountsettings ads api apis assetdelivery assetgame
  auth avatar badges billing catalog chat clientsettings clientsettingscdn contacts
  contentstore develop discord ecsv2 economy economycreatorstats engagementpayouts
  followings friends gameinternationalization gamejoin gamepersistence games groups
  inventory itemconfiguration locale localizationtables lms metrics notifications
  points premiumfeatures presence privatemessages publish realtime realtime-signalr
  s setup share thumbnails thumbnailsresizer trades translationroles translations
  twostepverification usermoderation users voice www"
block=$(mktemp)
{
  echo "# >>> roblox local backend"
  echo "127.0.0.1 sitetest1.robloxlabs.com"
  for s in $services; do echo "127.0.0.1 $s.sitetest1.robloxlabs.com"; done
  for s in ephemeralcounters; do echo "127.0.0.1 $s.api.sitetest1.robloxlabs.com"; done
  # Crash reports must not leave the machine.
  echo "127.0.0.1 upload.crashes.rbxinfra.com"
  echo "# <<< roblox local backend"
} > "$block"
sed -i '/# >>> roblox local backend/,/# <<< roblox local backend/d' /etc/hosts
cat "$block" >> /etc/hosts && rm "$block"
echo "hosts: $(grep -c 'sitetest1' /etc/hosts) sitetest1 names"
pgrep -x Xvfb >/dev/null || (setsid Xvfb :78 -screen 0 1280x800x24 >/dev/null 2>&1 &)
tools/restart_studio_backend.sh
