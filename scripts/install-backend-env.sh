#!/bin/bash
set -euo pipefail

# Install or refresh the backend environment file on a VPS.
#
# Usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/install-backend-env.sh
#
# Optional:
#   ENV_NODE_ENV=production
#   ENV_HOST=127.0.0.1
#   ENV_PORT=6065
#   ENV_ALLOWED_ORIGIN=https://bobsgame.com
#   ENV_REMOTE_PATH=/etc/bobsgameweb-server.env
#   DEPLOY_PASSWORD=...   (uses sshpass if available)

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
ENV_NODE_ENV="${ENV_NODE_ENV:-production}"
ENV_HOST="${ENV_HOST:-127.0.0.1}"
ENV_PORT="${ENV_PORT:-6065}"
ENV_ALLOWED_ORIGIN="${ENV_ALLOWED_ORIGIN:-https://bobsgame.com}"
ENV_REMOTE_PATH="${ENV_REMOTE_PATH:-/etc/bobsgameweb-server.env}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$BACKEND_HOST" ]]; then
  echo "[error] BACKEND_HOST is required"
  exit 1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

ENV_CONTENT=$(cat <<EOF
NODE_ENV=$ENV_NODE_ENV
HOST=$ENV_HOST
PORT=$ENV_PORT
ALLOWED_ORIGIN=$ENV_ALLOWED_ORIGIN
EOF
)

"${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "cat > '$ENV_REMOTE_PATH' <<'EOF'
$ENV_CONTENT
EOF
chmod 600 '$ENV_REMOTE_PATH'
cat '$ENV_REMOTE_PATH'"
