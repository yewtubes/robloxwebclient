#!/bin/bash
# Logs every new RobloxStudioBeta command line and any server.rbxl that appears.
out=${1:-/home/user/studio/procs.log}; : > "$out"
declare -A seen
while true; do
  for p in /proc/[0-9]*; do
    c=$(tr '\0' ' ' < $p/cmdline 2>/dev/null)
    [[ $c == *RobloxStudioBeta* && -z ${seen[$p]} ]] && { seen[$p]=1; echo "$(date +%T) ${p#/proc/} $c" >> "$out"; }
  done
  find /home/user/studio/prefix/drive_c -name 'server.rbxl' -newer "$out" 2>/dev/null | while read f; do echo "$(date +%T) FILE $f $(stat -c %s "$f")" >> "$out"; cp -n "$f" /home/user/studio/captured_server.rbxl; done
  sleep 0.5
done
