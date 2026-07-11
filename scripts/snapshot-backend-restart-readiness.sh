#!/bin/bash
set -eu

# Capture a pre-maintenance snapshot before a planned backend restart window.
# This is read-only and does not restart or kill any processes.
#
# Usage:
#   BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.50 ./scripts/snapshot-backend-restart-readiness.sh
#
# Optional:
#   BACKEND_USER=root
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   FRONTEND_URL=https://bobsgame.com
#   JOURNAL_LINES=60
#   SNAPSHOT_FILE=backend-readiness.txt
#   DEPLOY_PASSWORD=...

BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_URL="${BACKEND_URL:-}"
BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EXPECTED_BACKEND_VERSION="${EXPECTED_BACKEND_VERSION:-}"
JOURNAL_LINES="${JOURNAL_LINES:-60}"
SNAPSHOT_FILE="${SNAPSHOT_FILE:-}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$BACKEND_HOST" || -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_HOST and BACKEND_URL are required"
  exit 1
fi

if [[ -n "$SNAPSHOT_FILE" ]]; then
  mkdir -p "$(dirname "$SNAPSHOT_FILE")"
  exec > >(tee "$SNAPSHOT_FILE")
  exec 2>&1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

run_ssh() {
  "${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "$1"
}

TMP_HTML=$(mktemp)
trap 'rm -f "$TMP_HTML"' EXIT

echo "=== Backend Restart Readiness Snapshot ==="
echo "Timestamp (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Backend host: $BACKEND_USER@$BACKEND_HOST"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Service: $BACKEND_SERVICE_NAME"
if [[ -n "$EXPECTED_BACKEND_VERSION" ]]; then
  echo "Expected backend version: $EXPECTED_BACKEND_VERSION"
else
  echo "Expected backend version: (not provided)"
fi

echo
echo "[1/5] Backend drift audit"
BACKEND_HOST="$BACKEND_HOST" BACKEND_URL="$BACKEND_URL" BACKEND_USER="$BACKEND_USER" ./scripts/audit-backend-drift.sh || true

echo
echo "[2/5] Backend host health snapshot"
if [[ -n "$EXPECTED_BACKEND_VERSION" ]]; then
  EXPECTED_BACKEND_VERSION="$EXPECTED_BACKEND_VERSION" ALLOW_BACKEND_RUNTIME_DRIFT=1 BACKEND_URL="$BACKEND_URL" ./scripts/check-backend-host.sh || true
else
  BACKEND_URL="$BACKEND_URL" ./scripts/check-backend-host.sh || true
fi

echo
echo "[3/5] Remote service status snapshot"
run_ssh "echo '--- systemctl is-active ---'; systemctl is-active '$BACKEND_SERVICE_NAME' || true; echo; echo '--- systemctl show ---'; systemctl show '$BACKEND_SERVICE_NAME' -p ActiveState -p SubState -p MainPID -p ExecMainStartTimestamp -p ExecStart --no-pager || true"

echo
echo "[4/5] Remote journal tail (${JOURNAL_LINES} lines)"
run_ssh "journalctl -u '$BACKEND_SERVICE_NAME' -n '$JOURNAL_LINES' --no-pager || true"

echo
echo "[5/5] Public frontend asset snapshot"
curl -L --max-time 20 "$FRONTEND_URL" -o "$TMP_HTML"
echo "Frontend asset references:"
grep -o 'assets/[^"]*\.js' "$TMP_HTML" | head -20 || true
main_asset=$(grep -o 'assets/main-[^"]*\.js' "$TMP_HTML" | head -1 || true)
pixi_asset=$(grep -o 'assets/pixi-[^"]*\.js' "$TMP_HTML" | head -1 || true)
echo "Main asset: ${main_asset:-missing}"
echo "Pixi asset: ${pixi_asset:-missing}"
if [[ -n "$main_asset" ]]; then
  echo "Backend origin markers from main asset:"
  curl -L --max-time 30 "${FRONTEND_URL%/}/${main_asset}" | grep -o 'https://ws\.bobsgame\.com' | sort -u || true
fi

echo
echo "=== Backend Restart Readiness Snapshot Complete ==="
