#!/bin/bash
set -euo pipefail

# Collect useful diagnostics from a VPS-hosted backend.
#
# Usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/collect-backend-diagnostics.sh
#
# Optional:
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   DOMAIN_NAME=ws.bobsgame.com
#   DEPLOY_PASSWORD=...  (uses sshpass if available)

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"
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

"${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" bash -s <<EOF
set -e

echo "=== SYSTEM ==="
uname -a || true
id || true
pwd || true

echo
echo "=== NODE / NGINX ==="
command -v node || true
node -v || true
command -v npm || true
npm -v || true
command -v nginx || true
nginx -v || true

echo
echo "=== SYSTEMD STATUS ==="
systemctl status "$BACKEND_SERVICE_NAME" --no-pager || true

echo
echo "=== LAST JOURNAL LINES ==="
journalctl -u "$BACKEND_SERVICE_NAME" -n 100 --no-pager || true

echo
echo "=== NGINX TEST ==="
nginx -t || true

echo
echo "=== NGINX SITE FILES ==="
ls -la /etc/nginx/sites-available || true
ls -la /etc/nginx/sites-enabled || true
[ -f "/etc/nginx/sites-available/$DOMAIN_NAME" ] && sed -n '1,220p' "/etc/nginx/sites-available/$DOMAIN_NAME" || true

echo
echo "=== LOCAL PORT LISTENERS ==="
ss -tulpn | grep -E ':80|:443|:6065' || true

echo
echo "=== LOCAL HEALTH CHECKS ==="
curl -i --max-time 5 http://127.0.0.1:6065/healthz || true
curl -i --max-time 5 http://127.0.0.1/healthz || true
EOF
