#!/bin/bash
set -euo pipefail

# Deploy only the backend service to a VPS (Hetzner/DO/etc.)
#
# Expected remote layout:
#   /opt/bobsgameweb/server
#
# Typical usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/deploy-backend-vps.sh
#
# Optional behavior:
#   BACKEND_REMOTE_PATH=/opt/bobsgameweb/server
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   BACKEND_INSTALL_DEPS=1
#   BACKEND_RESTART=1
#   BACKEND_FORCE_TAR=1   # skip rsync and use tar-over-ssh even if rsync exists
#   DEPLOY_PASSWORD=...   (uses sshpass if available)

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_REMOTE_PATH="${BACKEND_REMOTE_PATH:-/opt/bobsgameweb/server}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$BACKEND_HOST" ]]; then
  echo "[error] BACKEND_HOST is required"
  exit 1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
SCP_BASE=(scp "${SSH_OPTS[@]}")
RSYNC_SSH="ssh ${SSH_OPTS[*]}"

if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
  SCP_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" scp "${SSH_OPTS[@]}")
  RSYNC_SSH="sshpass -p '$DEPLOY_PASSWORD_VALUE' ssh ${SSH_OPTS[*]}"
fi

HAS_RSYNC=0
if command -v rsync >/dev/null 2>&1; then
  HAS_RSYNC=1
fi
if [[ "${BACKEND_FORCE_TAR:-0}" == "1" ]]; then
  HAS_RSYNC=0
fi

run_ssh() {
  "${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "$1"
}

copy_dir() {
  local src="$1"
  local dest="$2"

  if [[ "$HAS_RSYNC" -eq 1 ]]; then
    RSYNC_RSH="$RSYNC_SSH" rsync -avz --delete "$src" "$BACKEND_USER@$BACKEND_HOST:$dest"
  else
    echo "[info] using tar-over-ssh upload path for $src"
    local src_trimmed="${src%/}"
    run_ssh "mkdir -p $dest"
    tar -C "$src_trimmed" -czf - . | run_ssh "tar xzf - -C $dest"
  fi
}

echo "=== Deploying bobsgameweb backend to VPS ==="
echo "Target: $BACKEND_USER@$BACKEND_HOST:$BACKEND_REMOTE_PATH"

run_ssh "mkdir -p $BACKEND_REMOTE_PATH $BACKEND_REMOTE_PATH/ops/nginx $BACKEND_REMOTE_PATH/ops/systemd"

copy_dir "server/" "$BACKEND_REMOTE_PATH/"

if [[ "${BACKEND_INSTALL_DEPS:-0}" == "1" ]]; then
  echo "[post] Installing backend dependencies..."
  run_ssh "cd $BACKEND_REMOTE_PATH && npm install --omit=dev"
fi

if [[ "${BACKEND_RESTART:-0}" == "1" ]]; then
  echo "[post] Restarting systemd service $BACKEND_SERVICE_NAME ..."
  run_ssh "sudo systemctl restart $BACKEND_SERVICE_NAME && sudo systemctl status $BACKEND_SERVICE_NAME --no-pager || true"
fi

echo "=== Backend deployment complete ==="
echo "Next checks:"
echo "  curl -i https://$BACKEND_HOST/healthz"
echo "  curl -i \"https://$BACKEND_HOST/socket.io/?EIO=4&transport=polling\""
