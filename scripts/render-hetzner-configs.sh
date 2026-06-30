#!/bin/bash
set -euo pipefail

# Render domain-/path-specific VPS config artifacts locally from the checked-in templates.
#
# Usage:
#   DOMAIN_NAME=ws.bobsgame.com APP_ROOT=/opt/bobsgameweb APP_USER=bobsgame SERVICE_NAME=bobsgameweb-server \
#   ./scripts/render-hetzner-configs.sh
#
# Optional:
#   OUTPUT_DIR=./deploy-artifacts
#   ENV_ALLOWED_ORIGIN=https://bobsgame.com
#   ENV_HOST=127.0.0.1
#   ENV_PORT=6065

DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"
APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
APP_USER="${APP_USER:-bobsgame}"
SERVICE_NAME="${SERVICE_NAME:-bobsgameweb-server}"
OUTPUT_DIR="${OUTPUT_DIR:-./deploy-artifacts}"
ENV_NODE_ENV="${ENV_NODE_ENV:-production}"
ENV_HOST="${ENV_HOST:-127.0.0.1}"
ENV_PORT="${ENV_PORT:-6065}"
ENV_ALLOWED_ORIGIN="${ENV_ALLOWED_ORIGIN:-https://bobsgame.com}"

mkdir -p "$OUTPUT_DIR/nginx" "$OUTPUT_DIR/systemd"

render() {
  local src="$1"
  local dest="$2"
  sed \
    -e "s#ws.bobsgame.com#$DOMAIN_NAME#g" \
    -e "s#/opt/bobsgameweb#$APP_ROOT#g" \
    -e "s#User=bobsgame#User=$APP_USER#g" \
    -e "s#Group=bobsgame#Group=$APP_USER#g" \
    -e "s#bobsgameweb-server#$SERVICE_NAME#g" \
    "$src" > "$dest"
}

render "server/ops/nginx/ws.bobsgame.com.conf" "$OUTPUT_DIR/nginx/$DOMAIN_NAME.conf"
render "server/ops/nginx/ws.bobsgame.com.ssl.conf" "$OUTPUT_DIR/nginx/$DOMAIN_NAME.ssl.conf"
render "server/ops/systemd/bobsgameweb-server.service" "$OUTPUT_DIR/systemd/$SERVICE_NAME.service"

cat > "$OUTPUT_DIR/systemd/$SERVICE_NAME.env" <<EOF
NODE_ENV=$ENV_NODE_ENV
HOST=$ENV_HOST
PORT=$ENV_PORT
ALLOWED_ORIGIN=$ENV_ALLOWED_ORIGIN
EOF

cat <<EOF
Rendered artifacts:
- $OUTPUT_DIR/nginx/$DOMAIN_NAME.conf
- $OUTPUT_DIR/nginx/$DOMAIN_NAME.ssl.conf
- $OUTPUT_DIR/systemd/$SERVICE_NAME.service
- $OUTPUT_DIR/systemd/$SERVICE_NAME.env
EOF
