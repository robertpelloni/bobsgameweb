#!/bin/bash
set -eu

# Automated Live Hetzner Deployment (Frontend + Backend) with Automatic Rollback
#
# Usage:
#   FRONTEND_HOST=5.161.250.43 ./scripts/deploy-with-rollback.sh

export FRONTEND_HOST="${FRONTEND_HOST:-5.161.250.43}"
export FRONTEND_USER="${FRONTEND_USER:-root}"
export FRONTEND_REMOTE_PATH="${FRONTEND_REMOTE_PATH:-/srv/www/bobsgame.com}"
export BACKEND_HOST="${BACKEND_HOST:-$FRONTEND_HOST}"
export BACKEND_USER="${BACKEND_USER:-$FRONTEND_USER}"
export BACKEND_URL="${BACKEND_URL:-https://ws.bobsgame.com}"
export FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

EXPECTED_VERSION=$(tr -d '[:space:]' < VERSION.md | sed 's/^v//')
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_PATH="/tmp/bobsgame_frontend_backup_${TIMESTAMP}"

echo "=== 1. Creating Fast Remote Code Backup ($BACKUP_PATH) ==="
"${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "mkdir -p '$BACKUP_PATH' && cp -f '$FRONTEND_REMOTE_PATH/index.html' '$BACKUP_PATH/' 2>/dev/null || true; [ -d '$FRONTEND_REMOTE_PATH/assets' ] && cp -r '$FRONTEND_REMOTE_PATH/assets' '$BACKUP_PATH/assets' || true"

if [[ "${FORCE_BUILD:-0}" == "1" ]] || [[ ! -f "dist/renderer/index.html" ]]; then
  echo "=== 2. Building Frontend for Hetzner Live ($BACKEND_URL, v$EXPECTED_VERSION) ==="
  VITE_SERVER_URL="$BACKEND_URL" VITE_COPY_PUBLIC_DIR=false npm run build
else
  echo "=== 2. Using Pre-Built Local Bundle (v$EXPECTED_VERSION) ==="
fi

echo "=== 3. Deploying Backend to Hetzner Live ($BACKEND_HOST) ==="
BACKEND_HOST="$BACKEND_HOST" BACKEND_USER="$BACKEND_USER" BACKEND_INSTALL_DEPS=1 BACKEND_RESTART=1 bash ./scripts/deploy-backend-vps.sh

echo "=== 4. Deploying Frontend to Hetzner Live ($FRONTEND_HOST) ==="
if ! bash ./scripts/deploy-frontend-hetzner.sh; then
  echo "[error] Frontend deployment failed. Rolling back..."
  "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "[ -f '$BACKUP_PATH/index.html' ] && cp -f '$BACKUP_PATH/index.html' '$FRONTEND_REMOTE_PATH/index.html'; [ -d '$BACKUP_PATH/assets' ] && rm -rf '$FRONTEND_REMOTE_PATH/assets' && cp -r '$BACKUP_PATH/assets' '$FRONTEND_REMOTE_PATH/assets'"
  exit 1
fi

echo "=== 5. Verifying Live Production Stack ($FRONTEND_URL & $BACKEND_URL) ==="
if ! BACKEND_URL="$BACKEND_URL" FRONTEND_URL="$FRONTEND_URL" EXPECTED_BACKEND_VERSION="$EXPECTED_VERSION" bash ./scripts/verify-production-stack.sh; then
  echo "[error] Verification failed. Rolling back frontend..."
  "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "[ -f '$BACKUP_PATH/index.html' ] && cp -f '$BACKUP_PATH/index.html' '$FRONTEND_REMOTE_PATH/index.html'; [ -d '$BACKUP_PATH/assets' ] && rm -rf '$FRONTEND_REMOTE_PATH/assets' && cp -r '$BACKUP_PATH/assets' '$FRONTEND_REMOTE_PATH/assets'"
  exit 1
fi

echo "=== 6. Cleaning Up Temporary Backup ==="
"${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "rm -rf '$BACKUP_PATH'"

echo "=== Hetzner Live Deployment and Verification Successful (v$EXPECTED_VERSION) ==="
