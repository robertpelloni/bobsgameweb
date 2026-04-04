# Deployment Guide: bobsgame.com

The Omni-Engine web port is ready for deployment to DreamHost.

## Current Observed Blockers
From the agent environment on 2026-04-03:
- `sshpass` is installed and usable.
- `rsync` is **not** installed locally.
- password-based SSH using the provided DreamHost credentials was **rejected by the server** (`Permission denied (publickey,password)`).

That means deployment automation is now mostly ready, but live deploy still requires either:
1. a working password, or
2. SSH key auth enabled for `robertpelloni@pdx1-shared-a1-33.dreamhost.com`.

## 1. Prerequisites
Recommended:
- **SSH key auth** configured for DreamHost.

Optional:
- `sshpass` installed if you truly want password-driven automation.
- `rsync` installed for faster incremental uploads.

If `rsync` is not installed, the scripts now automatically fall back to `scp`.

## 2. Automated Deployment
### Bash / Git Bash
Run from `bobsgameweb/`:

```bash
./scripts/deploy.sh
```

### PowerShell
Run from `bobsgameweb/`:

```powershell
./scripts/deploy.ps1
```

## 3. Useful Environment Variables
Both deploy scripts support:

- `DEPLOY_USER` — defaults to `robertpelloni`
- `DEPLOY_HOST` — defaults to `pdx1-shared-a1-33.dreamhost.com`
- `DEPLOY_REMOTE_PATH` — defaults to `~/bobsgame.com`
- `DEPLOY_PASSWORD` — optional; used with `sshpass` if available
- `DEPLOY_INSTALL_SERVER=1` — optionally runs `npm install` remotely in `server/`
- `DEPLOY_RESTART_SERVER=1` — optionally attempts `pm2 restart index.js` remotely

Example:

```bash
DEPLOY_PASSWORD='your-password' DEPLOY_INSTALL_SERVER=1 DEPLOY_RESTART_SERVER=1 ./scripts/deploy.sh
```

## 4. Manual Deployment Steps
If you prefer manual deployment:

1. **Build the project:**
   ```bash
   npm run build
   ```
2. **Create remote directories:**
   ```bash
   ssh robertpelloni@pdx1-shared-a1-33.dreamhost.com "mkdir -p ~/bobsgame.com ~/bobsgame.com/server"
   ```
3. **Transfer static files:**
   ```bash
   scp -r dist/renderer/* robertpelloni@pdx1-shared-a1-33.dreamhost.com:~/bobsgame.com/
   ```
4. **Transfer server files:**
   ```bash
   scp -r server/* robertpelloni@pdx1-shared-a1-33.dreamhost.com:~/bobsgame.com/server/
   ```
5. **Optional server setup:**
   ```bash
   ssh robertpelloni@pdx1-shared-a1-33.dreamhost.com "cd ~/bobsgame.com/server && npm install && (pm2 restart index.js || pm2 start index.js)"
   ```

## 5. Server Configuration
Ensure your DreamHost panel is configured to:
- Point `bobsgame.com` to `~/bobsgame.com/`.
- Allow WebSocket connections (usually enabled by default on shared hosting, but might require Passenger/Node configuration).
- Permit SSH login for the target user.

## 6. Easiest Future Setup
For the easiest one-command deploys, the best improvement is:

1. **Add an SSH key to DreamHost** for `robertpelloni`
2. optionally install `rsync` locally
3. then run:
   ```bash
   DEPLOY_INSTALL_SERVER=1 DEPLOY_RESTART_SERVER=1 ./scripts/deploy.sh
   ```

That avoids interactive password prompts and is the most reliable path for agent-driven deployment.
