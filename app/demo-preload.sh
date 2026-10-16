#!/bin/sh
# Preload demo user with Apr–Aug statements; upload September live in the demo (streak → 6/6).
set -e
API=${API:-http://localhost:4000}
J=$(mktemp)
curl -sf -c "$J" -H 'content-type: application/json' -d '{"email":"demo@firstjobjab.app","password":"demo1234"}' "$API/auth/login" >/dev/null
for m in 04 05 06 07 08; do for b in KBANK BBL; do
  id=$(curl -sf -b "$J" -F "file=@mock-data/${b}_2026-$m.pdf" "$API/uploads" | sed -n 's/.*"uploadId":"\([^"]*\)".*/\1/p')
  curl -sf -b "$J" -X POST "$API/uploads/$id/confirm" >/dev/null && echo "ok $b $m"
done; done
rm -f "$J"
