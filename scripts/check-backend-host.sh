#!/bin/bash
set -euo pipefail

# Validate a deployed backend host before switching the frontend to it.
#
# Usage:
#   BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
#   BACKEND_URL=http://1.2.3.4 ./scripts/check-backend-host.sh
#
# Optional:
#   EXPECTED_BACKEND_VERSION=2.1.47
#   ALLOW_BACKEND_RUNTIME_DRIFT=1   # warn instead of fail if /healthz version differs

BACKEND_URL="${BACKEND_URL:-}"
EXPECTED_BACKEND_VERSION="${EXPECTED_BACKEND_VERSION:-}"
ALLOW_BACKEND_RUNTIME_DRIFT="${ALLOW_BACKEND_RUNTIME_DRIFT:-0}"

if [[ -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_URL is required (e.g. https://ws.bobsgame.com)"
  exit 1
fi

trimmed="${BACKEND_URL%/}"
TMP_HEALTH=$(mktemp)
trap 'rm -f "$TMP_HEALTH"' EXIT

echo "=== Checking backend host: $trimmed ==="

echo "[1/4] GET /"
curl -i --max-time 20 "$trimmed/"

echo
echo "[2/4] GET /healthz"
curl -i --max-time 20 "$trimmed/healthz"
curl -fsSL --max-time 20 "$trimmed/healthz" -o "$TMP_HEALTH"

echo
if [[ -n "$EXPECTED_BACKEND_VERSION" ]]; then
  runtime_version=$(node -e "const fs=require('fs'); const payload=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(payload.version || '');" "$TMP_HEALTH")
  echo "[3/4] Runtime version check"
  echo "Expected backend version: $EXPECTED_BACKEND_VERSION"
  echo "Observed backend version: $runtime_version"
  if [[ "$runtime_version" != "$EXPECTED_BACKEND_VERSION" ]]; then
    if [[ "$ALLOW_BACKEND_RUNTIME_DRIFT" == "1" ]]; then
      echo "[warn] Backend runtime drift detected but allowed by ALLOW_BACKEND_RUNTIME_DRIFT=1"
    else
      echo "[error] Backend runtime version mismatch"
      exit 1
    fi
  else
    echo "[ok] Backend runtime version matches expected version"
  fi
else
  echo "[3/4] No EXPECTED_BACKEND_VERSION provided; skipping runtime version check"
fi

echo
echo "[4/4] GET /socket.io/?EIO=4&transport=polling"
curl -i --max-time 20 "$trimmed/socket.io/?EIO=4&transport=polling"

echo
echo "=== Backend verification complete ==="
