#!/bin/bash
set -eu

# Verify the production frontend after cutover.
#
# Usage:
#   FRONTEND_URL=https://bobsgame.com EXPECTED_BACKEND=https://ws.bobsgame.com ./scripts/check-production-frontend.sh

FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EXPECTED_BACKEND="${EXPECTED_BACKEND:-}"

TMP_HTML=$(mktemp)
TMP_SCAN=$(mktemp)
trap 'rm -f "$TMP_HTML" "$TMP_SCAN"' EXIT

echo "=== Checking frontend: $FRONTEND_URL ==="
curl -L --max-time 20 "$FRONTEND_URL" -o "$TMP_HTML"

echo "[1/4] Frontend HTML fetched"
head -40 "$TMP_HTML" || true

echo
echo "[2/4] Asset references present"
ASSET_PATHS=$(grep -o 'assets/[^"]*\.js' "$TMP_HTML" | head -20 || true)
if [[ -z "$ASSET_PATHS" ]]; then
  echo "[error] no JS asset references found in HTML"
  exit 1
fi
printf '%s\n' "$ASSET_PATHS"

echo
if [[ -n "$EXPECTED_BACKEND" ]]; then
  echo "[3/4] Scanning referenced assets for expected backend: $EXPECTED_BACKEND"
  while IFS= read -r asset; do
    [[ -z "$asset" ]] && continue
    asset_url="${FRONTEND_URL%/}/${asset}"
    curl -L --max-time 20 "$asset_url" >> "$TMP_SCAN"
  done <<< "$ASSET_PATHS"

  if grep -Fq "$EXPECTED_BACKEND" "$TMP_SCAN"; then
    echo "[ok] Expected backend origin found in deployed assets"
  else
    echo "[error] Expected backend origin not found in deployed assets"
    exit 1
  fi
else
  echo "[3/4] No EXPECTED_BACKEND provided; skipping backend-origin scan"
fi

echo
echo "[4/4] Frontend check complete"
