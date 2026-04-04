# Backend Backup / Restore Guide

Use this guide to protect and recover the mutable backend state for the production Socket.io service.

## What is backed up
The provided backup flow captures the key mutable server data:
- `leaderboards.json`
- `rpg_database.json`
- `maps/`
- `characters/`
- `achievement_profiles/`
- `emulator_states/`

## Create a backup on the VPS manually
Run on the server:

```bash
cd /opt/bobsgameweb/server/ops
bash backup-backend-data.sh
```

This creates a timestamped archive under:
- `/opt/bobsgameweb/backups/`

## Trigger and download a backup from your local machine
Run locally:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/fetch-backend-backup.sh
```

Optional local destination:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root LOCAL_BACKUP_DIR=./backups ./scripts/fetch-backend-backup.sh
```

## Restore a backup manually on the VPS
### 1. Stop the backend first
```bash
sudo systemctl stop bobsgameweb-server
```

### 2. Extract the backup from the server root
Example:

```bash
cd /opt/bobsgameweb/server
tar -xzf /opt/bobsgameweb/backups/YOUR_BACKUP_FILE.tar.gz
```

### 3. Start the backend again
```bash
sudo systemctl start bobsgameweb-server
sudo systemctl status bobsgameweb-server --no-pager
```

### 4. Re-verify health
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
```

## Recommended operational habit
- take a backup before major backend changes
- take a backup before first production cutover
- take a backup before schema/storage changes
- keep at least one known-good off-server copy

## Related runbooks
- `BACKEND_RECOVERY.md`
- `POST_DEPLOY_CHECKLIST.md`
- `HARDENING_CHECKLIST.md`
