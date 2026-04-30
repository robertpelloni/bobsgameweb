# Hetzner Backend Setup Guide

This guide assumes:
- backend runs on a Hetzner Ubuntu server
- backend public hostname will be `ws.bobsgame.com`
- static frontend may also run on the same Hetzner host as `bobsgame.com`
- nginx reverse proxies to the Node/Socket.io process on localhost `127.0.0.1:6065` and can also serve the built static frontend from disk

## 1. Provision the server
Recommended starting size:
- 2 vCPU
- 8 GB RAM
- 80 GB disk

Recommended OS:
- Ubuntu 24.04 LTS

## 2. DNS
Create `A` records as needed:
- `ws.bobsgame.com` → your Hetzner server IP
- `bobsgame.com` → your Hetzner server IP (if the static frontend is moving off DreamHost)

Wait until DNS resolves before attempting TLS.

## 2b. Shared datastores on Hetzner
This host can also serve as the shared internal datastore box for both `bobsgame` and `fwber` services.
See:
- `REDIS_SHARED_SERVICES.md`
- `MYSQL_MIGRATION.md`
- `POSTGRES_SHARED_SERVICES.md`
- `HETZNER_UNIFIED_STACK_STATUS.md`

## 3. Fast Bootstrap Option
A bootstrap helper is now included:
- `server/ops/bootstrap-ubuntu.sh`

You can run it on the VPS as root/sudo to install the core base packages and Node 20:

```bash
bash bootstrap-ubuntu.sh
```

## 3b. One-Shot Provisioning Option
A higher-level local helper is also included:
- `scripts/provision-hetzner-backend.sh`
- `scripts/print-hetzner-first-deploy.sh`
- `scripts/render-hetzner-configs.sh`
- `HETZNER_FIRST_DEPLOY.md`

Typical usage from your local machine:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/provision-hetzner-backend.sh
```

If you want the exact command sequence for the full first deploy, use:

```bash
BACKEND_HOST=YOUR_SERVER_IP DOMAIN_NAME=ws.bobsgame.com ./scripts/print-hetzner-first-deploy.sh
```

If you want locally rendered domain/path-specific config artifacts first, use:

```bash
DOMAIN_NAME=ws.bobsgame.com APP_ROOT=/opt/bobsgameweb APP_USER=bobsgame SERVICE_NAME=bobsgameweb-server ./scripts/render-hetzner-configs.sh
```

Or follow:
- `HETZNER_FIRST_DEPLOY.md`

This can:
- run the bootstrap script remotely
- upload the backend
- install dependencies
- install the systemd unit
- install the nginx site config
- optionally request TLS

## 3c. Hetzner Cloud-Init Option
A cloud-init template is also included:
- `server/ops/cloud-init/hetzner-user-data.yaml`

You can paste/adapt this in the Hetzner Cloud server creation flow to pre-install nginx, Node 20, the `bobsgame` service user, and base firewall allowances before the first SSH session.

## 4. Manual Base Packages / Node 20
If you prefer doing it manually:

```bash
sudo apt update
sudo apt install -y nginx curl git ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 5. Create service user and app directory
```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin bobsgame || true
sudo mkdir -p /opt/bobsgameweb
sudo chown -R $USER:$USER /opt/bobsgameweb
```

## 6. Upload backend files
Copy `bobsgameweb/server/` to:
- `/opt/bobsgameweb/server`

A deploy helper is now included locally:
- `scripts/deploy-backend-vps.sh`

Typical usage:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root BACKEND_INSTALL_DEPS=1 ./scripts/deploy-backend-vps.sh
```

If you already used `provision-hetzner-backend.sh`, this lower-level deploy script becomes your normal update path.

At minimum that directory should contain:
- `index.js`
- `app.js`
- `package.json`
- `package-lock.json`
- `.env.example`
- `ecosystem.config.cjs`
- `ops/`

For systemd-managed production runtime, the host-level environment file path is:
- `/etc/bobsgameweb-server.env`

## 7. Install backend dependencies
```bash
cd /opt/bobsgameweb/server
npm install --omit=dev
```

## 8. Systemd service + nginx site install
If you want the helper path, use:
- `scripts/install-backend-env.sh`
- `scripts/install-backend-service.sh`

Example:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ENV_ALLOWED_ORIGIN=https://bobsgame.com ./scripts/install-backend-env.sh
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/install-backend-service.sh
```

Manual path is still available if preferred:

### Systemd service
Copy:
- `server/ops/systemd/bobsgameweb-server.service`

to:
- `/etc/systemd/system/bobsgameweb-server.service`

Then reload and start:

```bash
sudo cp ops/systemd/bobsgameweb-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bobsgameweb-server
sudo systemctl start bobsgameweb-server
sudo systemctl status bobsgameweb-server
```

### Nginx reverse proxy
Copy:
- `server/ops/nginx/ws.bobsgame.com.conf`

to:
- `/etc/nginx/sites-available/ws.bobsgame.com`

Then enable it:

```bash
sudo cp ops/nginx/ws.bobsgame.com.conf /etc/nginx/sites-available/ws.bobsgame.com
sudo ln -sf /etc/nginx/sites-available/ws.bobsgame.com /etc/nginx/sites-enabled/ws.bobsgame.com
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 10b. Optional log rotation / backup hygiene
Optional ops assets are also included:
- `server/ops/logrotate/bobsgameweb-server`
- `server/ops/prune-backups.sh`

These help keep nginx logs and backup retention under control over time.

## 11. Smoke tests before TLS
From your local machine:

```bash
curl -i http://ws.bobsgame.com/
curl -i http://ws.bobsgame.com/healthz
curl -i "http://ws.bobsgame.com/socket.io/?EIO=4&transport=polling"
```

Expected:
- `/` → 200 plain text
- `/healthz` → JSON with `ok: true`
- `/socket.io/...` → Socket.io response, not nginx or app 404

## 12. TLS with Let's Encrypt
Once HTTP is working:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ws.bobsgame.com
```

If the static frontend is also moving to Hetzner, request a certificate for:

```bash
sudo certbot --nginx -d bobsgame.com
```

HTTPS nginx examples are included:
- `server/ops/nginx/ws.bobsgame.com.ssl.conf`
- `server/ops/nginx/bobsgame.com.ssl.conf`

Then retest:

```bash
curl -i https://ws.bobsgame.com/healthz
```

## 13. Verify backend from your local machine
A local verification helper is now included:
- `scripts/check-backend-host.sh`

Example:

```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
```

## 14. Rebuild frontend against the backend host
On your local machine:

```bash
cd bobsgameweb
BACKEND_URL=https://ws.bobsgame.com ./scripts/rebuild-for-backend.sh
```

To rebuild and immediately redeploy static assets to DreamHost:

```bash
BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/rebuild-for-backend.sh
```

To upload the static frontend to Hetzner instead:

```bash
FRONTEND_HOST=YOUR_SERVER_IP FRONTEND_USER=root FRONTEND_BUILD=1 BACKEND_URL=https://ws.bobsgame.com ./scripts/deploy-frontend-hetzner.sh
```

Tracked nginx configs for the static site:
- `server/ops/nginx/bobsgame.com.conf`
- `server/ops/nginx/bobsgame.com.ssl.conf`

## 15. Final production test
If you want a single local handoff step after backend verification for the legacy DreamHost static path, use:

```bash
BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/cutover-production.sh
```

That will:
- verify backend readiness
- rebuild the frontend for `ws.bobsgame.com`
- trigger DreamHost static deploy

If `bobsgame.com` DNS already points to Hetzner, prefer the tracked Hetzner static-site path instead.

Then:
- open `https://bobsgame.com`
- verify browser network requests target `https://ws.bobsgame.com`
- test lobby creation / leaderboard / multiplayer handshake
- run through `POST_DEPLOY_CHECKLIST.md`
- run through `HARDENING_CHECKLIST.md`
- take and store an initial backup using `BACKUP_RESTORE.md`
- keep `BACKEND_RECOVERY.md` handy for rollback/recovery

## Troubleshooting
### `502 Bad Gateway`
- backend process probably not running
- quick diagnostic helper:
  ```bash
  BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/collect-backend-diagnostics.sh
  ```
- manual checks:
  ```bash
  sudo systemctl status bobsgameweb-server
  journalctl -u bobsgameweb-server -n 100 --no-pager
  ```

### `/healthz` works but websocket fails
- usually nginx websocket headers or upstream binding issue
- confirm nginx config matches the provided sample

### CORS / connection refused
- verify `ALLOWED_ORIGIN=https://bobsgame.com`
- verify backend is listening on `127.0.0.1:6065` or expected host/port
- verify `/etc/bobsgameweb-server.env` contains the intended values
