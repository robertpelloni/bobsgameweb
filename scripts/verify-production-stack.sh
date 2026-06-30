#!/bin/bash
set -eu

# Verify both the backend host and the production frontend after cutover.
#
# Usage:
#   BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh

BACKEND_URL="${BACKEND_URL:-}"
FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EXPECTED_BACKEND_VERSION="${EXPECTED_BACKEND_VERSION:-}"
ALLOW_BACKEND_RUNTIME_DRIFT="${ALLOW_BACKEND_RUNTIME_DRIFT:-0}"

if [[ -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_URL is required"
  exit 1
fi

BACKEND_URL="$BACKEND_URL" EXPECTED_BACKEND_VERSION="$EXPECTED_BACKEND_VERSION" ALLOW_BACKEND_RUNTIME_DRIFT="$ALLOW_BACKEND_RUNTIME_DRIFT" ./scripts/check-backend-host.sh
FRONTEND_URL="$FRONTEND_URL" EXPECTED_BACKEND="$BACKEND_URL" ./scripts/check-production-frontend.sh
FRONTEND_URL="$FRONTEND_URL" ./scripts/check-production-editor.sh
FRONTEND_URL="$FRONTEND_URL" ./scripts/check-production-runtime-chunks.sh

echo "=== Production stack verification complete ==="
