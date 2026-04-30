#!/bin/bash
set -euo pipefail

# Preflight checks before provisioning or deploying the backend to a VPS.
#
# Usage:
#   BACKEND_HOST=YOUR_SERVER_IP DOMAIN_NAME=ws.bobsgame.com ./scripts/preflight-hetzner-backend.sh
#
# Optional:
#   BACKEND_USER=root
#   DEPLOY_PASSWORD=...  (uses sshpass if available)

BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_USER="${BACKEND_USER:-root}"
DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10)

if [[ -z "$BACKEND_HOST" ]]; then
  echo "[error] BACKEND_HOST is required"
  exit 1
fi

for bin in ssh scp curl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[error] missing required local binary: $bin"
    exit 1
  fi
done

if command -v rsync >/dev/null 2>&1; then
  echo "[ok] rsync available"
else
  echo "[warn] rsync not found; deploy scripts will fall back to scp"
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

echo "=== DNS check ==="
if command -v getent >/dev/null 2>&1; then
  getent hosts "$DOMAIN_NAME" || echo "[warn] DNS not resolving yet for $DOMAIN_NAME"
else
  nslookup "$DOMAIN_NAME" || echo "[warn] DNS not resolving yet for $DOMAIN_NAME"
fi

echo
echo "=== SSH connectivity check ==="
"${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "echo CONNECTED && uname -a && command -v sudo || true && command -v nginx || true && command -v node || true"

echo
echo "=== HTTP probe (expected to fail until service exists) ==="
curl -I --max-time 10 "http://$DOMAIN_NAME" || echo "[info] backend host not serving HTTP yet (expected on first run)"

echo
echo "=== Preflight complete ==="
