#!/bin/bash
set -euo pipefail

# Verify the production frontend after cutover.
#
# Usage:
#   FRONTEND_URL=https://bobsgame.com EXPECTED_BACKEND=https://ws.bobsgame.com ./scripts/check-production-frontend.sh

FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EXPECTED_BACKEND="${EXPECTED_BACKEND:-}"

TMP_HTML=$(mktemp)
trap 'rm -f "$TMP_HTML"' EXIT

echo "=== Checking frontend: $FRONTEND_URL ==="
curl -L --max-time 20 "$FRONTEND_URL" -o "$TMP_HTML"

echo "[1/3] Frontend HTML fetched"
head -40 "$TMP_HTML" || true

echo
echo "[2/3] Asset references present"
grep -o 'assets/[^"]*\.js' "$TMP_HTML" | head -20 || echo "[warn] no JS asset references found in HTML"

echo
if [[ -n "$EXPECTED_BACKEND" ]]; then
  echo "[3/3] Expected backend reminder: $EXPECTED_BACKEND"
  echo "Check browser network panel or runtime config against that origin after opening the app."
else
  echo "[3/3] No EXPECTED_BACKEND provided; skipping backend-origin reminder"
fi

echo

echo "=== Frontend check complete ==="
