#!/bin/bash
set -eu

# Tail backend systemd logs remotely over SSH.
#
# Usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/tail-backend-logs.sh
#
# Optional:
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   DEPLOY_PASSWORD=...  (uses sshpass if available)

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
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

"${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "journalctl -u '$BACKEND_SERVICE_NAME' -f --no-pager"
