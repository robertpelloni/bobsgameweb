#!/bin/bash
set -eu

# Verify that critical lazy-loaded runtime chunks are discoverable from the live site.
#
# Usage:
#   FRONTEND_URL=https://bobsgame.com ./scripts/check-production-runtime-chunks.sh
#
# Optional:
#   REQUIRED_RUNTIME_CHUNKS='CustomGameEditorScene|AchievementsScene|WorldScene|WorldEditorScene|LobbyScene'

FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
REQUIRED_RUNTIME_CHUNKS="${REQUIRED_RUNTIME_CHUNKS:-CustomGameEditorScene|AchievementsScene|WorldScene|WorldEditorScene|LobbyScene}"

TMP_HTML=$(mktemp)
TMP_SCAN=$(mktemp)
TMP_INITIAL=$(mktemp)
TMP_DISCOVERED=$(mktemp)
trap 'rm -f "$TMP_HTML" "$TMP_SCAN" "$TMP_INITIAL" "$TMP_DISCOVERED"' EXIT

echo "=== Checking production runtime chunks: $FRONTEND_URL ==="
curl -Lk --max-time 60 "$FRONTEND_URL" -o "$TMP_HTML"

grep -o 'assets/[^\"]*\.js' "$TMP_HTML" | head -20 | sort -u > "$TMP_INITIAL" || true
if [[ ! -s "$TMP_INITIAL" ]]; then
  echo "[error] no JS asset references found in HTML"
  exit 1
fi

echo "[1/4] Initial JS assets"
cat "$TMP_INITIAL"

echo
echo "[2/4] Downloading initial assets to discover lazy chunks"
while IFS= read -r asset; do
  [[ -z "$asset" ]] && continue
  curl -Lk --max-time 60 "${FRONTEND_URL%/}/${asset}" >> "$TMP_SCAN"
done < "$TMP_INITIAL"

grep -o 'assets/[A-Za-z0-9_.-]*\.js' "$TMP_SCAN" | sort -u > "$TMP_DISCOVERED" || true
if [[ ! -s "$TMP_DISCOVERED" ]]; then
  echo "[error] no lazy chunk references discovered from initial assets"
  exit 1
fi

echo
echo "[3/4] Discovered lazy-loaded chunks"
cat "$TMP_DISCOVERED"

echo
echo "[4/4] Verifying required runtime chunk families"
IFS='|' read -r -a required <<< "$REQUIRED_RUNTIME_CHUNKS"
for family in "${required[@]}"; do
  match=$(grep -m1 "assets/${family}-.*\.js" "$TMP_DISCOVERED" || true)
  if [[ -z "$match" ]]; then
    echo "[error] missing runtime chunk family: $family"
    exit 1
  fi

  echo "[ok] found runtime chunk: $match"
  chunk_size=$(curl -Lk --max-time 60 --silent "${FRONTEND_URL%/}/${match}" | wc -c | tr -d ' ')
  if [[ "$chunk_size" -le 0 ]]; then
    echo "[error] runtime chunk fetched empty: $match"
    exit 1
  fi
  echo "     fetched bytes: $chunk_size"
done

echo
echo "=== Production runtime chunk check complete ==="
