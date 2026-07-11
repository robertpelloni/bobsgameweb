#!/bin/bash
set -eu

# Planned maintenance helper for aligning the running backend process with already-synced
# backend files on disk. This script is intentionally DRY-RUN by default.
#
# Usage (dry-run / plan only):
#   BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.49 ./scripts/run-backend-maintenance-restart.sh
#
# Usage (actual restart, only when explicitly allowed):
#   BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.49 EXECUTE_BACKEND_RESTART=1 ./scripts/run-backend-maintenance-restart.sh
#
# Optional:
#   BACKEND_USER=root
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   FRONTEND_URL=https://bobsgame.com
#   RUN_FULL_STACK_VERIFY=1
#   DEPLOY_PASSWORD=...

BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_URL="${BACKEND_URL:-}"
BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
EXPECTED_BACKEND_VERSION="${EXPECTED_BACKEND_VERSION:-}"
FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
RUN_FULL_STACK_VERIFY="${RUN_FULL_STACK_VERIFY:-1}"
EXECUTE_BACKEND_RESTART="${EXECUTE_BACKEND_RESTART:-0}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$BACKEND_HOST" || -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_HOST and BACKEND_URL are required"
  exit 1
fi

if [[ -z "$EXPECTED_BACKEND_VERSION" ]]; then
  echo "[error] EXPECTED_BACKEND_VERSION is required"
  exit 1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

run_ssh() {
  "${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "$1"
}

echo "=== Planned Backend Maintenance Restart ==="
echo "Backend host: $BACKEND_USER@$BACKEND_HOST"
echo "Backend URL: $BACKEND_URL"
echo "Service: $BACKEND_SERVICE_NAME"
echo "Expected runtime version after restart: $EXPECTED_BACKEND_VERSION"
echo

echo "[1/5] Pre-restart drift audit"
BACKEND_HOST="$BACKEND_HOST" BACKEND_URL="$BACKEND_URL" BACKEND_USER="$BACKEND_USER" ./scripts/audit-backend-drift.sh

echo
if [[ "$EXECUTE_BACKEND_RESTART" != "1" ]]; then
  echo "[2/5] Dry-run mode active"
  echo "No restart executed."
  echo "To perform the actual controlled restart later, rerun with:"
  echo "  EXECUTE_BACKEND_RESTART=1 BACKEND_HOST=$BACKEND_HOST BACKEND_URL=$BACKEND_URL EXPECTED_BACKEND_VERSION=$EXPECTED_BACKEND_VERSION ./scripts/run-backend-maintenance-restart.sh"
  echo
  echo "Planned next steps after restart would be:"
  echo "  - strict backend version check"
  echo "  - post-restart drift audit"
  echo "  - optional full production stack verification"
  echo
  echo "=== Planned Backend Maintenance Restart Complete (dry-run) ==="
  exit 0
fi

echo "[2/5] Restarting backend service"
run_ssh "sudo systemctl restart '$BACKEND_SERVICE_NAME' && sudo systemctl status '$BACKEND_SERVICE_NAME' --no-pager || true"

echo
echo "[3/5] Strict backend runtime check"
EXPECTED_BACKEND_VERSION="$EXPECTED_BACKEND_VERSION" BACKEND_URL="$BACKEND_URL" ./scripts/check-backend-host.sh

echo
echo "[4/5] Post-restart drift audit"
BACKEND_HOST="$BACKEND_HOST" BACKEND_URL="$BACKEND_URL" BACKEND_USER="$BACKEND_USER" ./scripts/audit-backend-drift.sh

echo
if [[ "$RUN_FULL_STACK_VERIFY" == "1" ]]; then
  echo "[5/5] Full production stack verification"
  EXPECTED_BACKEND_VERSION="$EXPECTED_BACKEND_VERSION" BACKEND_URL="$BACKEND_URL" FRONTEND_URL="$FRONTEND_URL" ./scripts/verify-production-stack.sh
else
  echo "[5/5] Skipping full production stack verification"
fi

echo
echo "=== Planned Backend Maintenance Restart Complete ==="
