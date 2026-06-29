#!/bin/bash
set -euo pipefail

# Rebuild the frontend against a specific backend host and optionally deploy it.
#
# Usage:
#   BACKEND_URL=https://ws.bobsgame.com ./scripts/rebuild-for-backend.sh
#   BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/rebuild-for-backend.sh

BACKEND_URL="${BACKEND_URL:-}"
DEPLOY_STATIC="${DEPLOY_STATIC:-0}"

if [[ -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_URL is required (e.g. https://ws.bobsgame.com)"
  exit 1
fi

echo "=== Rebuilding frontend for backend: $BACKEND_URL ==="
VITE_SERVER_URL="$BACKEND_URL" npm run build

echo "Build complete."

if [[ "$DEPLOY_STATIC" == "1" ]]; then
  echo "Static deploy requested. Running deploy.sh ..."
  ./scripts/deploy.sh
fi
