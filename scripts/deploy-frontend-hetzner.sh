#!/bin/bash
set -euo pipefail

# Upload the built bobsgameweb static frontend to the Hetzner host.
#
# Usage:
#   FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root ./scripts/deploy-frontend-hetzner.sh
#
# Optional:
#   FRONTEND_REMOTE_PATH=/var/www/bobsgame.com/current
#   FRONTEND_BUILD=1          # default 0, set to 1 to rebuild locally first
#   BACKEND_URL=https://ws.bobsgame.com
#   DEPLOY_PASSWORD=...       # uses sshpass if available

FRONTEND_HOST="${FRONTEND_HOST:-}"
FRONTEND_USER="${FRONTEND_USER:-root}"
FRONTEND_REMOTE_PATH="${FRONTEND_REMOTE_PATH:-/var/www/bobsgame.com/current}"
FRONTEND_BUILD="${FRONTEND_BUILD:-0}"
BACKEND_URL="${BACKEND_URL:-https://ws.bobsgame.com}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$FRONTEND_HOST" ]]; then
  echo "[error] FRONTEND_HOST is required"
  exit 1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

if [[ "$FRONTEND_BUILD" == "1" ]]; then
  echo "=== Building frontend for backend: $BACKEND_URL ==="
  VITE_SERVER_URL="$BACKEND_URL" npm run build
fi

if [[ ! -f "dist/renderer/index.html" ]]; then
  echo "[error] dist/renderer/index.html not found. Build first or set FRONTEND_BUILD=1."
  exit 1
fi

echo "=== Uploading frontend to Hetzner ==="
"${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "mkdir -p '$FRONTEND_REMOTE_PATH'"
tar -C dist/renderer -czf - . | "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "tar xzf - -C '$FRONTEND_REMOTE_PATH'"

echo "=== Frontend upload complete ==="
echo "Remote path: $FRONTEND_USER@$FRONTEND_HOST:$FRONTEND_REMOTE_PATH"
