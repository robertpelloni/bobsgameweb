#!/bin/bash
set -eu

# End-to-end production cutover helper.
#
# Verifies a backend host, rebuilds the frontend against it, and optionally
# deploys static assets immediately after a successful check.
#
# Usage:
#   BACKEND_URL=https://ws.bobsgame.com ./scripts/cutover-production.sh
#   BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/cutover-production.sh

BACKEND_URL="${BACKEND_URL:-}"
DEPLOY_STATIC="${DEPLOY_STATIC:-0}"

if [[ -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_URL is required"
  exit 1
fi

echo "=== Cutover: verifying backend ==="
BACKEND_URL="$BACKEND_URL" ./scripts/check-backend-host.sh

echo "=== Cutover: rebuilding frontend ==="
BACKEND_URL="$BACKEND_URL" DEPLOY_STATIC="$DEPLOY_STATIC" ./scripts/rebuild-for-backend.sh

echo "=== Cutover complete ==="
if [[ "$DEPLOY_STATIC" == "1" ]]; then
  echo "Frontend rebuilt and static deploy triggered."
else
  echo "Frontend rebuilt only. Set DEPLOY_STATIC=1 to deploy automatically."
fi
