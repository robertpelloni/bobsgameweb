#!/bin/bash
set -euo pipefail

# Prune old backend backup archives on the VPS.
# Intended to run on the server itself.

BACKUP_DIR="${BACKUP_DIR:-/opt/bobsgameweb/backups}"
KEEP_COUNT="${KEEP_COUNT:-10}"

mkdir -p "$BACKUP_DIR"

mapfile -t files < <(ls -1t "$BACKUP_DIR"/bobsgameweb-backup-*.tar.gz 2>/dev/null || true)

if [[ ${#files[@]} -le $KEEP_COUNT ]]; then
  echo "No pruning needed. Backups present: ${#files[@]}"
  exit 0
fi

for ((i=KEEP_COUNT; i<${#files[@]}; i++)); do
  rm -f "${files[$i]}"
  echo "Removed ${files[$i]}"
done
