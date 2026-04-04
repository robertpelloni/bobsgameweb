#!/bin/bash
set -euo pipefail

# Trigger a backup on the VPS and download it locally.
#
# Usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/fetch-backend-backup.sh
#
# Optional:
#   APP_ROOT=/opt/bobsgameweb
#   LOCAL_BACKUP_DIR=./backups
#   DEPLOY_PASSWORD=...  (uses sshpass if available)

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-./backups}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$BACKEND_HOST" ]]; then
  echo "[error] BACKEND_HOST is required"
  exit 1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
SCP_BASE=(scp "${SSH_OPTS[@]}")

if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
  SCP_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" scp "${SSH_OPTS[@]}")
fi

mkdir -p "$LOCAL_BACKUP_DIR"

REMOTE_PATH=$("${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "APP_ROOT='$APP_ROOT' bash '$APP_ROOT/server/ops/backup-backend-data.sh'")
REMOTE_PATH="$(echo "$REMOTE_PATH" | tail -n 1)"

if [[ -z "$REMOTE_PATH" ]]; then
  echo "[error] remote backup script did not return a backup path"
  exit 1
fi

"${SCP_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST:$REMOTE_PATH" "$LOCAL_BACKUP_DIR/"

echo "Downloaded backup to $LOCAL_BACKUP_DIR"
