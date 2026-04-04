#!/bin/bash
set -euo pipefail

# Create a timestamped backup tarball of mutable backend state.
# Intended to run on the VPS itself.

APP_ROOT="${APP_ROOT:-/opt/bobsgameweb}"
SERVER_DIR="${SERVER_DIR:-$APP_ROOT/server}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="bobsgameweb-backup-$TIMESTAMP.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

mkdir -p "$BACKUP_DIR"

cd "$SERVER_DIR"

tar -czf "$ARCHIVE_PATH" \
  --ignore-failed-read \
  leaderboards.json \
  rpg_database.json \
  maps \
  characters \
  achievement_profiles \
  emulator_states

echo "$ARCHIVE_PATH"
