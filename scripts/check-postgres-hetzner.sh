#!/bin/bash
set -eu

# Check PostgreSQL state on the Hetzner backend host.
#
# Usage:
#   BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-postgres-hetzner.sh
#
# Optional:
#   DEPLOY_PASSWORD=...  (uses sshpass if available)

BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_USER="${BACKEND_USER:-root}"
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

"${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" bash -s <<'EOF'
set -e

echo "=== POSTGRES BINARIES ==="
command -v psql || true
command -v postgres || true
command -v pg_isready || true

echo
echo "=== POSTGRES SERVICE STATUS ==="
systemctl status postgresql --no-pager | sed -n '1,60p' || true
systemctl status postgresql@16-main --no-pager | sed -n '1,60p' || true

echo
echo "=== POSTGRES PORTS ==="
ss -tulpn | grep ':5432' || true

echo
echo "=== POSTGRES READINESS ==="
pg_isready || true

echo
echo "=== POSTGRES VERSION ==="
runuser -u postgres -- psql -tAc 'SELECT version();' || true

echo
echo "=== POSTGRES LISTEN ADDRESSES ==="
runuser -u postgres -- psql -tAc 'SHOW listen_addresses;' || true

echo
echo "=== POSTGRES DATABASES ==="
runuser -u postgres -- psql -tAc 'SELECT datname FROM pg_database ORDER BY datname;' || true
EOF
