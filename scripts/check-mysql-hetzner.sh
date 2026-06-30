#!/bin/bash
set -euo pipefail

# Check MySQL state on the Hetzner backend host.
#
# Usage:
#   BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-mysql-hetzner.sh
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

echo "=== MYSQL BINARIES ==="
command -v mysql || true
command -v mysqld || true

echo
echo "=== MYSQL SERVICE STATUS ==="
systemctl status mysql --no-pager | sed -n '1,60p' || true

echo
echo "=== MYSQL PORTS ==="
ss -tulpn | grep ':3306' || true

echo
echo "=== MYSQL PING ==="
mysqladmin ping || true

echo
echo "=== MYSQL VERSION ==="
mysql --version || true
EOF
