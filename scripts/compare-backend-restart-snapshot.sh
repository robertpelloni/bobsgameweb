#!/bin/bash
set -eu

# Compare a previously captured backend restart-readiness snapshot against the current live state.
# This is read-only and intended for post-restart validation, but it can also be used before a restart
# to show what still has not changed yet.
#
# Usage:
#   SNAPSHOT_FILE=artifacts/pre-restart.txt BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com ./scripts/compare-backend-restart-snapshot.sh
#
# Optional:
#   BACKEND_USER=root
#   BACKEND_SERVICE_NAME=bobsgameweb-server
#   FRONTEND_URL=https://bobsgame.com
#   EXPECTED_BACKEND_VERSION=2.1.51
#   ALLOW_BACKEND_RUNTIME_DRIFT=1
#   DEPLOY_PASSWORD=...

SNAPSHOT_FILE="${SNAPSHOT_FILE:-}"
BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_URL="${BACKEND_URL:-}"
BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bobsgameweb-server}"
FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EXPECTED_BACKEND_VERSION="${EXPECTED_BACKEND_VERSION:-}"
ALLOW_BACKEND_RUNTIME_DRIFT="${ALLOW_BACKEND_RUNTIME_DRIFT:-0}"
DEPLOY_PASSWORD_VALUE="${DEPLOY_PASSWORD:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$SNAPSHOT_FILE" || -z "$BACKEND_HOST" || -z "$BACKEND_URL" ]]; then
  echo "[error] SNAPSHOT_FILE, BACKEND_HOST, and BACKEND_URL are required"
  exit 1
fi

if [[ ! -f "$SNAPSHOT_FILE" ]]; then
  echo "[error] Snapshot file not found: $SNAPSHOT_FILE"
  exit 1
fi

SSH_BASE=(ssh "${SSH_OPTS[@]}")
if [[ -n "$DEPLOY_PASSWORD_VALUE" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD_VALUE" ssh "${SSH_OPTS[@]}")
fi

run_ssh() {
  "${SSH_BASE[@]}" "$BACKEND_USER@$BACKEND_HOST" "$1"
}

extract_last_field() {
  local pattern="$1"
  grep -m1 "$pattern" "$SNAPSHOT_FILE" | awk '{print $NF}'
}

extract_service_field() {
  local pattern="$1"
  grep -m1 "^${pattern}=" "$SNAPSHOT_FILE" | sed "s/^${pattern}=//"
}

baseline_expected=$(grep -m1 '^Expected backend version:' "$SNAPSHOT_FILE" | sed 's/^Expected backend version: //' || true)
baseline_runtime=$(extract_last_field '^Runtime version' || true)
baseline_main_asset=$(grep -m1 '^Main asset:' "$SNAPSHOT_FILE" | sed 's/^Main asset: //' || true)
baseline_pixi_asset=$(grep -m1 '^Pixi asset:' "$SNAPSHOT_FILE" | sed 's/^Pixi asset: //' || true)
baseline_active_state=$(extract_service_field 'ActiveState' || true)
baseline_sub_state=$(extract_service_field 'SubState' || true)
baseline_main_pid=$(extract_service_field 'MainPID' || true)
baseline_exec_start=$(extract_service_field 'ExecMainStartTimestamp' || true)

TMP_HTML=$(mktemp)
TMP_HEALTH=$(mktemp)
trap 'rm -f "$TMP_HTML" "$TMP_HEALTH"' EXIT

curl -L --max-time 20 "$FRONTEND_URL" -o "$TMP_HTML"
curl -fsSL --max-time 20 "$BACKEND_URL/healthz" -o "$TMP_HEALTH"

current_runtime=$(node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync(process.argv[1],'utf8')).version || '');" "$TMP_HEALTH")
current_main_asset=$(grep -o 'assets/main-[^"]*\.js' "$TMP_HTML" | head -1 || true)
current_pixi_asset=$(grep -o 'assets/pixi-[^"]*\.js' "$TMP_HTML" | head -1 || true)
current_service_dump=$(run_ssh "systemctl show '$BACKEND_SERVICE_NAME' -p ActiveState -p SubState -p MainPID -p ExecMainStartTimestamp --no-pager || true")
current_active_state=$(printf '%s
' "$current_service_dump" | grep -m1 '^ActiveState=' | sed 's/^ActiveState=//')
current_sub_state=$(printf '%s
' "$current_service_dump" | grep -m1 '^SubState=' | sed 's/^SubState=//')
current_main_pid=$(printf '%s
' "$current_service_dump" | grep -m1 '^MainPID=' | sed 's/^MainPID=//')
current_exec_start=$(printf '%s
' "$current_service_dump" | grep -m1 '^ExecMainStartTimestamp=' | sed 's/^ExecMainStartTimestamp=//')

if [[ -z "$EXPECTED_BACKEND_VERSION" && -n "$baseline_expected" && "$baseline_expected" != "(not provided)" ]]; then
  EXPECTED_BACKEND_VERSION="$baseline_expected"
fi

STATUS=0

echo "=== Backend Restart Snapshot Comparison ==="
echo "Snapshot file: $SNAPSHOT_FILE"
echo "Backend host: $BACKEND_USER@$BACKEND_HOST"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo
printf '%-26s %-28s %-28s
' 'Signal' 'Snapshot' 'Current'
printf '%-26s %-28s %-28s
' '--------------------------' '----------------------------' '----------------------------'
printf '%-26s %-28s %-28s
' 'Runtime version' "${baseline_runtime:-unknown}" "${current_runtime:-unknown}"
printf '%-26s %-28s %-28s
' 'Main asset' "${baseline_main_asset:-unknown}" "${current_main_asset:-unknown}"
printf '%-26s %-28s %-28s
' 'Pixi asset' "${baseline_pixi_asset:-unknown}" "${current_pixi_asset:-unknown}"
printf '%-26s %-28s %-28s
' 'ActiveState' "${baseline_active_state:-unknown}" "${current_active_state:-unknown}"
printf '%-26s %-28s %-28s
' 'SubState' "${baseline_sub_state:-unknown}" "${current_sub_state:-unknown}"
printf '%-26s %-28s %-28s
' 'MainPID' "${baseline_main_pid:-unknown}" "${current_main_pid:-unknown}"
printf '%-26s %-28s %-28s
' 'ExecMainStartTimestamp' "${baseline_exec_start:-unknown}" "${current_exec_start:-unknown}"
echo

if [[ -n "$EXPECTED_BACKEND_VERSION" ]]; then
  echo "Expected backend version: $EXPECTED_BACKEND_VERSION"
  if [[ "$current_runtime" == "$EXPECTED_BACKEND_VERSION" ]]; then
    echo "[ok] Current backend runtime matches expected version."
  else
    if [[ "$ALLOW_BACKEND_RUNTIME_DRIFT" == "1" ]]; then
      echo "[warn] Current backend runtime still differs from expected version, but drift is allowed."
      STATUS=1
    else
      echo "[error] Current backend runtime does not match expected version."
      exit 1
    fi
  fi
fi

if [[ -n "$baseline_runtime" ]]; then
  if [[ "$current_runtime" != "$baseline_runtime" ]]; then
    echo "[ok] Backend runtime version changed since snapshot."
  else
    echo "[warn] Backend runtime version is unchanged since snapshot."
    STATUS=1
  fi
fi

if [[ -n "$baseline_main_asset" ]]; then
  if [[ "$current_main_asset" == "$baseline_main_asset" ]]; then
    echo "[ok] Public frontend main asset stayed stable across comparison."
  else
    echo "[warn] Public frontend main asset changed since snapshot."
    STATUS=1
  fi
fi

if [[ -n "$baseline_pixi_asset" ]]; then
  if [[ "$current_pixi_asset" == "$baseline_pixi_asset" ]]; then
    echo "[ok] Public pixi asset stayed stable across comparison."
  else
    echo "[warn] Public pixi asset changed since snapshot."
    STATUS=1
  fi
fi

if [[ "$current_active_state" == "active" && "$current_sub_state" == "running" ]]; then
  echo "[ok] Backend service is active/running."
else
  echo "[warn] Backend service is not in active/running state."
  STATUS=1
fi

if [[ -n "$baseline_main_pid" ]]; then
  if [[ "$current_main_pid" != "$baseline_main_pid" ]]; then
    echo "[ok] MainPID changed since snapshot, consistent with a restart or process replacement."
  else
    echo "[warn] MainPID is unchanged since snapshot."
    STATUS=1
  fi
fi

echo
if [[ "$STATUS" -ne 0 ]]; then
  echo "=== Backend Restart Snapshot Comparison Complete (warnings present) ==="
else
  echo "=== Backend Restart Snapshot Comparison Complete ==="
fi

exit 0
