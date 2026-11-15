#!/bin/bash
set -eu

# Deploy the unified bobsgameweb backend service to Hetzner (/opt/bobsgameweb/server)
# while strictly preserving live player profiles, leaderboards, characters, maps,
# and existing node_modules.
#
# Usage:
#   BACKEND_HOST=5.161.250.43 BACKEND_USER=root BACKEND_INSTALL_DEPS=1 BACKEND_RESTART=1 ./scripts/deploy-backend-vps.sh

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-5.161.250.43}"
BACKEND_REMOTE_PATH="${BACKEND_REMOTE_PATH:-/opt/bobsgameweb/server}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

run_ssh() {
  "${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "$1"
}

cp -f VERSION.md server/VERSION.md

echo "=== Deploying bobsgameweb backend code to Hetzner VPS ==="
echo "Target: $BACKEND_USER@$BACKEND_HOST:$BACKEND_REMOTE_PATH"

run_ssh "mkdir -p '$BACKEND_REMOTE_PATH' '$BACKEND_REMOTE_PATH/ops/nginx' '$BACKEND_REMOTE_PATH/ops/systemd'"

tar -C server \
  --exclude='node_modules' \
  --exclude='profiles.json' \
  --exclude='leaderboards.json' \
  --exclude='achievement_profiles' \
  --exclude='characters' \
  --exclude='emulator_states' \
  --exclude='maps' \
  -czf - . | run_ssh "tar xzf - -C '$BACKEND_REMOTE_PATH'"

if [[ "${BACKEND_INSTALL_DEPS:-1}" == "1" ]]; then
  echo "[post] Ensuring production backend dependencies on VPS..."
  run_ssh "cd '$BACKEND_REMOTE_PATH' && npm install --omit=dev --no-audit --no-fund"
fi

run_ssh "[ -f '$BACKEND_REMOTE_PATH/VERSION.md' ] && cp -f '$BACKEND_REMOTE_PATH/VERSION.md' '$BACKEND_REMOTE_PATH/../VERSION.md' || true; id -u bobsgame >/dev/null 2>&1 && chown -R bobsgame:bobsgame '$BACKEND_REMOTE_PATH' || true"

if [[ "${BACKEND_RESTART:-1}" == "1" ]]; then
  echo "[post] Restarting systemd service $BACKEND_SERVICE_NAME ..."
  run_ssh "systemctl restart '$BACKEND_SERVICE_NAME' && sleep 1 && systemctl is-active '$BACKEND_SERVICE_NAME'"
fi

echo "=== Backend deployment complete ==="
