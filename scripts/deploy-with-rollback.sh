#!/bin/bash
set -eu

# Automated Deployment with Rollback for Hetzner
#
# Usage:
#   FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/deploy-with-rollback.sh

export FRONTEND_HOST="${FRONTEND_HOST:-}"
export FRONTEND_USER="${FRONTEND_USER:-root}"
export FRONTEND_REMOTE_PATH="${FRONTEND_REMOTE_PATH:-/srv/www/bobsgame.com}"
export BACKEND_URL="${BACKEND_URL:-https://ws.bobsgame.com}"
export FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
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

TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_PATH="${FRONTEND_REMOTE_PATH}_backup_${TIMESTAMP}"

echo "=== 1. Creating Remote Backup ==="
if "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "[ -d '$FRONTEND_REMOTE_PATH' ]"; then
  echo "[info] Backing up current production to $BACKUP_PATH"
  "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "cp -r '$FRONTEND_REMOTE_PATH' '$BACKUP_PATH'"
else
  echo "[info] No existing production directory found at $FRONTEND_REMOTE_PATH. Skipping backup."
fi

echo "=== 2. Building Frontend ==="
VITE_SERVER_URL="$BACKEND_URL" npm run build

echo "=== 3. Deploying to Production ==="
if ! ./scripts/deploy-frontend-hetzner.sh; then
  echo "[error] Deployment failed. Attempting rollback..."
  if "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "[ -d '$BACKUP_PATH' ]"; then
    "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "rm -rf '$FRONTEND_REMOTE_PATH' && mv '$BACKUP_PATH' '$FRONTEND_REMOTE_PATH'"
    echo "[info] Rollback successful."
  else
    echo "[error] Rollback failed: Backup not found."
  fi
  exit 1
fi

echo "=== 4. Verifying Production Stack ==="
if ! BACKEND_URL="$BACKEND_URL" FRONTEND_URL="$FRONTEND_URL" ./scripts/verify-production-stack.sh; then
  echo "[error] Verification failed. Attempting rollback..."
  if "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "[ -d '$BACKUP_PATH' ]"; then
    "${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "rm -rf '$FRONTEND_REMOTE_PATH' && mv '$BACKUP_PATH' '$FRONTEND_REMOTE_PATH'"
    echo "[info] Rollback successful."
  else
    echo "[error] Rollback failed: Backup not found."
  fi
  exit 1
fi

echo "=== 5. Cleaning up Backup ==="
"${SSH_BASE[@]}" "$FRONTEND_USER@$FRONTEND_HOST" "rm -rf '$BACKUP_PATH'"

echo "=== Deployment and Verification Successful ==="
