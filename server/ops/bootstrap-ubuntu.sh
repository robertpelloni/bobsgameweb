#!/bin/bash
set -euo pipefail

# Bootstrap script for an Ubuntu VPS intended to host the bobsgameweb backend.
# Run as root or with sudo on a fresh server.

APP_USER="${APP_USER:-bobsgame}"
APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
APP_SERVER_DIR="$APP_ROOT/server"
SERVICE_NAME="${SERVICE_NAME:-bobsgameweb-server}"
DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"

apt update
apt install -y nginx curl git ufw ca-certificates gnupg

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_ROOT"
chown -R "$APP_USER":"$APP_USER" "$APP_ROOT"

ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true

echo

echo "Bootstrap complete. Next steps:"
echo "1. Upload backend files to $APP_SERVER_DIR"
echo "2. Install dependencies: cd $APP_SERVER_DIR && npm install --omit=dev"
echo "3. Copy systemd unit from server/ops/systemd/$SERVICE_NAME.service"
echo "4. Copy nginx config from server/ops/nginx/ws.bobsgame.com.conf"
echo "5. Enable service + nginx and test http://$DOMAIN_NAME/healthz"
