#!/bin/bash
set -eu

# One-shot-ish Hetzner/VPS backend provisioner.
#
# This script assumes a fresh Ubuntu server that you can SSH into as root
# (or another sudo-capable user if you adapt the commands).
#
# Typical usage:
#   BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/provision-hetzner-backend.sh
#
# Optional flags:
#   RUN_BOOTSTRAP=1         # default 1
#   INSTALL_DEPS=1          # default 1
#   INSTALL_SYSTEMD=1       # default 1
#   INSTALL_NGINX=1         # default 1
#   ENABLE_TLS=0            # default 0
#   APP_ROOT=/opt/bobsgameweb
#   APP_USER=bobsgame
#   SERVICE_NAME=bobsgameweb-server
#   DEPLOY_PASSWORD=...     # uses sshpass if available

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"
APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
APP_USER="${APP_USER:-bobsgame}"
SERVICE_NAME="${SERVICE_NAME:-bobsgameweb-server}"
RUN_BOOTSTRAP="${RUN_BOOTSTRAP:-1}"
INSTALL_DEPS="${INSTALL_DEPS:-1}"
INSTALL_SYSTEMD="${INSTALL_SYSTEMD:-1}"
INSTALL_NGINX="${INSTALL_NGINX:-1}"
ENABLE_TLS="${ENABLE_TLS:-0}"
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

run_ssh() {
  "${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "$1"
}

copy_dir() {
  local src="$1"
  local dest="$2"
  if [[ "$HAS_RSYNC" -eq 1 ]]; then
    RSYNC_RSH="$RSYNC_SSH" rsync -avz --delete "$src" "$BACKEND_USER@$BACKEND_HOST:$dest"
  else
    "${SCP_BASE[@]}" -r "$src" "$BACKEND_USER@$BACKEND_HOST:$dest"
  fi
}

echo "=== Provisioning Hetzner/VPS backend ==="
echo "Target: $BACKEND_USER@$BACKEND_HOST"
echo "Domain: $DOMAIN_NAME"

if [[ "$RUN_BOOTSTRAP" == "1" ]]; then
  echo "[1/6] Uploading and running bootstrap script..."
  run_ssh "mkdir -p /tmp/bobsgame-bootstrap"
  copy_dir "server/ops/bootstrap-ubuntu.sh" "/tmp/bobsgame-bootstrap/"
  run_ssh "chmod +x /tmp/bobsgame-bootstrap/bootstrap-ubuntu.sh && APP_USER=$APP_USER APP_ROOT=$APP_ROOT SERVICE_NAME=$SERVICE_NAME DOMAIN_NAME=$DOMAIN_NAME bash /tmp/bobsgame-bootstrap/bootstrap-ubuntu.sh"
fi

echo "[2/6] Uploading backend service files..."
BACKEND_REMOTE_PATH="$APP_ROOT/server" BACKEND_SERVICE_NAME="$SERVICE_NAME" BACKEND_INSTALL_DEPS="$INSTALL_DEPS" BACKEND_RESTART=0 BACKEND_USER="$BACKEND_USER" BACKEND_HOST="$BACKEND_HOST" DEPLOY_PASSWORD="$DEPLOY_PASSWORD_VALUE" bash ./scripts/deploy-backend-vps.sh

if [[ "$INSTALL_SYSTEMD" == "1" ]]; then
  echo "[3/6] Installing systemd unit..."
  run_ssh "cp $APP_ROOT/server/ops/systemd/bobsgameweb-server.service /etc/systemd/system/$SERVICE_NAME.service && sed -i 's#User=bobsgame#User=$APP_USER#g; s#Group=bobsgame#Group=$APP_USER#g; s#/opt/bobsgameweb#$APP_ROOT#g' /etc/systemd/system/$SERVICE_NAME.service && systemctl daemon-reload && systemctl enable $SERVICE_NAME && systemctl restart $SERVICE_NAME"
fi

if [[ "$INSTALL_NGINX" == "1" ]]; then
  echo "[4/6] Installing nginx site config..."
  run_ssh "cp $APP_ROOT/server/ops/nginx/ws.bobsgame.com.conf /etc/nginx/sites-available/$DOMAIN_NAME && sed -i 's#ws.bobsgame.com#$DOMAIN_NAME#g' /etc/nginx/sites-available/$DOMAIN_NAME && ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME && nginx -t && systemctl reload nginx"
fi

if [[ "$ENABLE_TLS" == "1" ]]; then
  echo "[5/6] Installing certbot / requesting TLS..."
  run_ssh "apt install -y certbot python3-certbot-nginx && certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos -m admin@$DOMAIN_NAME --redirect"
else
  echo "[5/6] Skipping TLS (ENABLE_TLS=0)"
fi

echo "[6/6] Smoke test hints"
echo "Run these locally once DNS is ready:"
echo "  curl -i http://$DOMAIN_NAME/healthz"
if [[ "$ENABLE_TLS" == "1" ]]; then
  echo "  curl -i https://$DOMAIN_NAME/healthz"
fi

echo "=== Provisioning complete ==="
