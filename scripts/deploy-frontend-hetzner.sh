#!/bin/bash
set -eu

# Upload the built bobsgameweb static frontend bundle (index.html + assets/)
# to the live Hetzner host (/srv/www/bobsgame.com) without re-uploading or
# deleting the multi-gigabyte static map/audio/lancedb directories on the VPS.
#
# Usage:
#   FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root ./scripts/deploy-frontend-hetzner.sh
#
# Optional:
#   FRONTEND_REMOTE_PATH=/srv/www/bobsgame.com
#   FRONTEND_BUILD=1          # default 0, set to 1 to rebuild locally first
#   FRONTEND_FULL_SYNC=1      # default 0; set to 1 only to upload full dist/renderer/
#   BACKEND_URL=https://ws.bobsgame.com

FRONTEND_HOST="${FRONTEND_HOST:-5.161.250.43}"
FRONTEND_USER="${FRONTEND_USER:-root}"
FRONTEND_REMOTE_PATH="${FRONTEND_REMOTE_PATH:-/srv/www/bobsgame.com}"
FRONTEND_BUILD="${FRONTEND_BUILD:-0}"
FRONTEND_FULL_SYNC="${FRONTEND_FULL_SYNC:-0}"
BACKEND_URL="${BACKEND_URL:-https://ws.bobsgame.com}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

if [[ "$FRONTEND_BUILD" == "1" ]]; then
  echo "=== Building frontend for Hetzner live backend: $BACKEND_URL ==="
  VITE_SERVER_URL="$BACKEND_URL" VITE_COPY_PUBLIC_DIR=false npm run build
fi

if [[ ! -f "dist/renderer/index.html" ]]; then
  echo "[error] dist/renderer/index.html not found. Build first or set FRONTEND_BUILD=1."
  exit 1
fi

"${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "mkdir -p '$FRONTEND_REMOTE_PATH/assets'"

if [[ "$FRONTEND_FULL_SYNC" == "1" ]]; then
  echo "=== Uploading FULL dist/renderer/ directory to Hetzner ==="
  tar -C dist/renderer -czf - . | "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "tar xzf - -C '$FRONTEND_REMOTE_PATH'"
else
  echo "=== Uploading code bundle (index.html + assets/) to Hetzner ==="
  tar -C dist/renderer -czf - index.html assets | "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "rm -rf '$FRONTEND_REMOTE_PATH/assets' && mkdir -p '$FRONTEND_REMOTE_PATH/assets' && tar xzf - -C '$FRONTEND_REMOTE_PATH'"
fi

echo "=== Frontend upload complete ==="
echo "Remote path: $FRONTEND_USER@$FRONTEND_HOST:$FRONTEND_REMOTE_PATH"
