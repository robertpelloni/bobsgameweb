#!/bin/bash
set -eu

# Prints the exact first-deploy command sequence for a Hetzner/VPS backend.
#
# Usage:
#   BACKEND_HOST=203.0.113.10 DOMAIN_NAME=ws.bobsgame.com ./scripts/print-hetzner-first-deploy.sh
#
# Optional:
#   BACKEND_USER=root
#   APP_ROOT=/opt/bobsgameweb
#   APP_USER=bobsgame
#   DEPLOY_HOST=dreamhost-bobsgame

BACKEND_HOST="${BACKEND_HOST:-YOUR_SERVER_IP_OR_HOST}"
BACKEND_USER="${BACKEND_USER:-root}"
DOMAIN_NAME="${DOMAIN_NAME:-ws.bobsgame.com}"
APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
APP_USER="${APP_USER:-bobsgame}"
DEPLOY_HOST_VALUE="${DEPLOY_HOST:-dreamhost-bobsgame}"

cat <<EOF
# === Hetzner first deploy quickstart ===

# 0. DNS
# Point this DNS record first:
#   $DOMAIN_NAME -> $BACKEND_HOST

# 1. One-shot backend provisioning
BACKEND_HOST=$BACKEND_HOST \
BACKEND_USER=$BACKEND_USER \
DOMAIN_NAME=$DOMAIN_NAME \
APP_ROOT=$APP_ROOT \
APP_USER=$APP_USER \
INSTALL_DEPS=1 \
INSTALL_SYSTEMD=1 \
INSTALL_NGINX=1 \
ENABLE_TLS=0 \
./scripts/provision-hetzner-backend.sh

# 2. Verify backend over HTTP before TLS
BACKEND_URL=http://$DOMAIN_NAME ./scripts/check-backend-host.sh

# 3. Enable TLS after HTTP is healthy
BACKEND_HOST=$BACKEND_HOST \
BACKEND_USER=$BACKEND_USER \
DOMAIN_NAME=$DOMAIN_NAME \
APP_ROOT=$APP_ROOT \
APP_USER=$APP_USER \
RUN_BOOTSTRAP=0 \
INSTALL_DEPS=0 \
INSTALL_SYSTEMD=0 \
INSTALL_NGINX=0 \
ENABLE_TLS=1 \
./scripts/provision-hetzner-backend.sh

# 4. Verify backend over HTTPS
BACKEND_URL=https://$DOMAIN_NAME ./scripts/check-backend-host.sh

# 5. Rebuild frontend for the backend host and deploy static site
BACKEND_URL=https://$DOMAIN_NAME \
DEPLOY_STATIC=1 \
DEPLOY_HOST=$DEPLOY_HOST_VALUE \
./scripts/cutover-production.sh

# 6. Run the post-deploy checklist manually
# Open and follow:
#   POST_DEPLOY_CHECKLIST.md
EOF
