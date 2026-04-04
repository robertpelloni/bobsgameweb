#!/bin/bash
set -euo pipefail

# Omni-Engine Deployment Script for bobsgame.com
#
# Supports:
# - SSH key auth (recommended)
# - Password auth via DEPLOY_PASSWORD + sshpass (if available)
# - rsync when installed, otherwise falls back to scp
# - optional remote npm install / pm2 restart flags

USER_NAME="${DEPLOY_USER:-robertpelloni}"
HOST_NAME="${DEPLOY_HOST:-pdx1-shared-a1-33.dreamhost.com}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:-~/bobsgame.com}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

SSH_BASE=(ssh "${SSH_OPTS[@]}")
SCP_BASE=(scp "${SSH_OPTS[@]}")
RSYNC_SSH="ssh ${SSH_OPTS[*]}"

if [[ -n "$DEPLOY_PASSWORD_VALUE" ]]; then
  if command -v sshpass >/dev/null 2>&1; then
    SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
    SCP_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" scp "${SSH_OPTS[@]}")
    RSYNC_SSH="sshpass -p '$DEPLOY_PASSWORD_VALUE' ssh ${SSH_OPTS[*]}"
  else
    echo "[warn] DEPLOY_PASSWORD is set, but sshpass is not installed. Falling back to plain ssh/scp."
  fi
fi

HAS_RSYNC=0
if command -v rsync >/dev/null 2>&1; then
  HAS_RSYNC=1
fi

run_ssh() {
  "${SSH_BASE[@]}" "$USER_NAME@$HOST_NAME" "$1"
}

copy_dir() {
  local src="$1"
  local dest="$2"

  if [[ "$HAS_RSYNC" -eq 1 ]]; then
    RSYNC_RSH="$RSYNC_SSH" rsync -avz --delete "$src" "$USER_NAME@$HOST_NAME:$dest"
  else
    echo "[info] rsync not found, falling back to scp for $src"
    "${SCP_BASE[@]}" -r "$src" "$USER_NAME@$HOST_NAME:$dest"
  fi
}

echo "=== Starting Deployment to bobsgame.com ==="
echo "Target: $USER_NAME@$HOST_NAME:$REMOTE_PATH"

# 1. Build
echo "[1/5] Building production assets..."
npm run build

# 2. Ensure remote directories exist
echo "[2/5] Ensuring remote directories exist..."
run_ssh "mkdir -p $REMOTE_PATH $REMOTE_PATH/server"

# 3. Upload static files
echo "[3/5] Uploading static files..."
copy_dir "dist/renderer/" "$REMOTE_PATH/"

# 4. Upload server files
echo "[4/5] Uploading multiplayer server files..."
copy_dir "server/" "$REMOTE_PATH/server/"

# 5. Optional remote server setup/restart
echo "[5/5] Remote post-deploy actions..."
if [[ "${DEPLOY_INSTALL_SERVER:-0}" == "1" ]]; then
  echo "[post] Running npm install in remote server directory..."
  run_ssh "cd $REMOTE_PATH/server && npm install"
fi

if [[ "${DEPLOY_RESTART_SERVER:-0}" == "1" ]]; then
  echo "[post] Attempting PM2 restart..."
  run_ssh "cd $REMOTE_PATH/server && (pm2 restart index.js || pm2 start index.js)"
fi

echo "=== Deployment Complete ==="
echo "Tip: set DEPLOY_INSTALL_SERVER=1 and DEPLOY_RESTART_SERVER=1 for a fuller server deploy."
