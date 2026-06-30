#!/bin/bash
set -eu

# Install or refresh the nginx + systemd assets for the backend on a VPS.
#
# Usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/install-backend-service.sh
#
# Optional:
#   APP_ROOT=/opt/bobsgameweb
#   APP_USER=bobsgame
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   DEPLOY_PASSWORD=...  (uses sshpass if available)
#
# Note:
#   Pair with scripts/install-backend-env.sh to manage /etc/bobsgameweb-server.env cleanly.

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"
APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
APP_USER="${APP_USER:-bobsgame}"
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

"${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" bash -s <<EOF
set -e

cp "$APP_ROOT/server/ops/systemd/bobsgameweb-server.service" "/etc/systemd/system/$BACKEND_SERVICE_NAME.service"
sed -i "s#User=bobsgame#User=$APP_USER#g; s#Group=bobsgame#Group=$APP_USER#g; s#/opt/bobsgameweb#$APP_ROOT#g; s#bobsgameweb-server#$BACKEND_SERVICE_NAME#g" "/etc/systemd/system/$BACKEND_SERVICE_NAME.service"

cp "$APP_ROOT/server/ops/nginx/ws.bobsgame.com.conf" "/etc/nginx/sites-available/$DOMAIN_NAME"
sed -i "s#ws.bobsgame.com#$DOMAIN_NAME#g" "/etc/nginx/sites-available/$DOMAIN_NAME"
ln -sf "/etc/nginx/sites-available/$DOMAIN_NAME" "/etc/nginx/sites-enabled/$DOMAIN_NAME"

systemctl daemon-reload
systemctl enable "$BACKEND_SERVICE_NAME"
systemctl restart "$BACKEND_SERVICE_NAME"
nginx -t
systemctl reload nginx

echo "=== install-backend-service complete ==="
echo "Environment file expected at: /etc/bobsgameweb-server.env"
systemctl status "$BACKEND_SERVICE_NAME" --no-pager || true
EOF
