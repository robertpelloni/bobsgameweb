#!/bin/bash
set -euo pipefail

# Validate a deployed backend host before switching the frontend to it.
#
# Usage:
#   BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
#   BACKEND_URL=http://1.2.3.4 ./scripts/check-backend-host.sh

BACKEND_URL="${BACKEND_URL:-}"

if [[ -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_URL is required (e.g. https://ws.bobsgame.com)"
  exit 1
fi

trimmed="${BACKEND_URL%/}"

echo "=== Checking backend host: $trimmed ==="

echo "[1/3] GET /"
curl -i --max-time 20 "$trimmed/"

echo
echo "[2/3] GET /healthz"
curl -i --max-time 20 "$trimmed/healthz"

echo
echo "[3/3] GET /socket.io/?EIO=4&transport=polling"
curl -i --max-time 20 "$trimmed/socket.io/?EIO=4&transport=polling"

echo
echo "=== Backend verification complete ==="
