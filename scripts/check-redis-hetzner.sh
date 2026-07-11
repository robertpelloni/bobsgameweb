#!/bin/bash
set -eu

# Check Redis state on the Hetzner backend host.
#
# Usage:
#   BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-redis-hetzner.sh
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

echo "=== REDIS BINARIES ==="
command -v redis-server || true
command -v redis-cli || true

echo
echo "=== REDIS SERVICE STATUS ==="
systemctl status redis-server --no-pager | sed -n '1,60p' || true

echo
echo "=== REDIS PORTS ==="
ss -tulpn | grep ':6379' || true

echo
echo "=== REDIS PING ==="
redis-cli ping || true

echo
echo "=== REDIS MEMORY ==="
redis-cli INFO memory | grep -E 'used_memory_human|maxmemory_human|mem_fragmentation_ratio' || true

echo
echo "=== REDIS PERSISTENCE ==="
redis-cli INFO persistence | grep -E 'loading:|rdb_last_save_time|aof_enabled' || true
EOF
