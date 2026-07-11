#!/bin/bash
set -eu

# Audit bobsgameweb backend drift between local tracked source, remote files on disk,
# and the currently running public backend process.
#
# Usage:
#   BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com ./scripts/audit-backend-drift.sh
#
# Optional:
#   BACKEND_USER=root
#   BACKEND_REMOTE_PATH=/opt/bobsgameweb/server
#   LOCAL_SERVER_PATH=server

BACKEND_USER="${BACKEND_USER:-root}"
BACKEND_HOST="${BACKEND_HOST:-}"
BACKEND_REMOTE_PATH="${BACKEND_REMOTE_PATH:-/opt/bobsgameweb/server}"
LOCAL_SERVER_PATH="${LOCAL_SERVER_PATH:-server}"
BACKEND_URL="${BACKEND_URL:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

if [[ -z "$BACKEND_HOST" ]]; then
  echo "[error] BACKEND_HOST is required"
  exit 1
fi

if [[ -z "$BACKEND_URL" ]]; then
  BACKEND_URL="https://$BACKEND_HOST"
fi

extract_server_version() {
  node -e "const fs=require('fs'); const text=fs.readFileSync(process.argv[1],'utf8'); const match=text.match(/SERVER_VERSION\\s*=\\s*\"([^\"]+)\"/); if(!match) process.exit(1); console.log(match[1]);" "$1"
}

extract_package_version() {
  node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync(process.argv[1],'utf8')).version || '');" "$1"
}

LOCAL_INDEX="$LOCAL_SERVER_PATH/index.js"
LOCAL_PACKAGE="$LOCAL_SERVER_PATH/package.json"

if [[ ! -f "$LOCAL_INDEX" || ! -f "$LOCAL_PACKAGE" ]]; then
  echo "[error] local server files not found under $LOCAL_SERVER_PATH"
  exit 1
fi

LOCAL_RUNTIME_VERSION=$(extract_server_version "$LOCAL_INDEX")
LOCAL_PACKAGE_VERSION=$(extract_package_version "$LOCAL_PACKAGE")
LOCAL_INDEX_HASH=$(sha256sum "$LOCAL_INDEX" | awk '{print $1}')
LOCAL_PACKAGE_HASH=$(sha256sum "$LOCAL_PACKAGE" | awk '{print $1}')

REMOTE_RUNTIME_VERSION=$(ssh "${SSH_OPTS[@]}" "$BACKEND_USER@$BACKEND_HOST" "node -e \"const fs=require('fs'); const text=fs.readFileSync('$BACKEND_REMOTE_PATH/index.js','utf8'); const match=text.match(/SERVER_VERSION\\s*=\\s*\\\"([^\\\"]+)\\\"/); console.log(match ? match[1] : '');\"")
REMOTE_PACKAGE_VERSION=$(ssh "${SSH_OPTS[@]}" "$BACKEND_USER@$BACKEND_HOST" "node -e \"const fs=require('fs'); console.log(JSON.parse(fs.readFileSync('$BACKEND_REMOTE_PATH/package.json','utf8')).version || '');\"")
REMOTE_INDEX_HASH=$(ssh "${SSH_OPTS[@]}" "$BACKEND_USER@$BACKEND_HOST" "sha256sum '$BACKEND_REMOTE_PATH/index.js' | awk '{print \$1}'")
REMOTE_PACKAGE_HASH=$(ssh "${SSH_OPTS[@]}" "$BACKEND_USER@$BACKEND_HOST" "sha256sum '$BACKEND_REMOTE_PATH/package.json' | awk '{print \$1}'")
RUNTIME_HEALTH_VERSION=$(curl -fsSL --max-time 20 "$BACKEND_URL/healthz" | node -e "let data=''; process.stdin.on('data', d => data += d); process.stdin.on('end', () => console.log((JSON.parse(data).version) || ''));")
SERVICE_EXECSTART=$(ssh "${SSH_OPTS[@]}" "$BACKEND_USER@$BACKEND_HOST" "systemctl cat bobsgameweb-server | grep -m1 '^ExecStart=' | cut -d= -f2-")

printf '=== Backend Drift Audit ===\n'
printf 'Backend URL: %s\n' "$BACKEND_URL"
printf 'Backend host: %s@%s\n' "$BACKEND_USER" "$BACKEND_HOST"
printf 'Remote path: %s\n' "$BACKEND_REMOTE_PATH"
printf 'Service ExecStart: %s\n' "$SERVICE_EXECSTART"
printf '\n'
printf '%-24s %-18s %-18s %-18s\n' 'Signal' 'Local Source' 'Remote Files' 'Running Process'
printf '%-24s %-18s %-18s %-18s\n' '------------------------' '------------------' '------------------' '------------------'
printf '%-24s %-18s %-18s %-18s\n' 'Runtime version' "$LOCAL_RUNTIME_VERSION" "$REMOTE_RUNTIME_VERSION" "$RUNTIME_HEALTH_VERSION"
printf '%-24s %-18s %-18s %-18s\n' 'Package version' "$LOCAL_PACKAGE_VERSION" "$REMOTE_PACKAGE_VERSION" 'n/a'
printf '%-24s %-18s %-18s %-18s\n' 'index.js sha256' "${LOCAL_INDEX_HASH:0:18}" "${REMOTE_INDEX_HASH:0:18}" 'n/a'
printf '%-24s %-18s %-18s %-18s\n' 'package.json sha256' "${LOCAL_PACKAGE_HASH:0:18}" "${REMOTE_PACKAGE_HASH:0:18}" 'n/a'
printf '\n'

STATUS=0

if [[ "$LOCAL_RUNTIME_VERSION" != "$REMOTE_RUNTIME_VERSION" ]]; then
  echo "[warn] Remote backend file drift: remote index.js version does not match local tracked source."
  STATUS=1
else
  echo "[ok] Remote backend index.js matches local tracked source."
fi

if [[ "$LOCAL_PACKAGE_VERSION" != "$REMOTE_PACKAGE_VERSION" ]]; then
  echo "[warn] Remote backend package metadata drift: remote package.json version does not match local tracked source."
  STATUS=1
else
  echo "[ok] Remote backend package.json matches local tracked source."
fi

if [[ "$REMOTE_RUNTIME_VERSION" != "$RUNTIME_HEALTH_VERSION" ]]; then
  echo "[warn] Running backend process differs from remote file version. A restart would be required to load the newer on-disk code."
  STATUS=1
else
  echo "[ok] Running backend version matches remote file version."
fi

if [[ "$LOCAL_RUNTIME_VERSION" != "$LOCAL_PACKAGE_VERSION" ]]; then
  echo "[warn] Local backend source metadata drift: server/index.js and server/package.json report different versions."
  STATUS=1
else
  echo "[ok] Local backend runtime and package metadata versions are aligned."
fi

printf '\n=== Backend Drift Audit Complete ===\n'
exit 0
