# Backend Deployment Notes

This document is provider-neutral and applies whether the Node/Socket.io backend is hosted on a VPS, Hetzner, DigitalOcean, Railway, Render, or a DreamHost subdomain with proper Node support.

## Runtime Requirements
- Node 20+ preferred
- persistent process support
- websocket support
- ability to set environment variables
- reverse proxy or provider support for websocket upgrades

## Required Environment Variables
```bash
HOST=0.0.0.0
PORT=6065
ALLOWED_ORIGIN=https://bobsgame.com
```

If using a dedicated backend domain like `ws.bobsgame.com`, set:
```bash
ALLOWED_ORIGIN=https://bobsgame.com
```

## Startup Options
### Plain Node
```bash
cd server
npm install
node index.js
```

### Passenger-style startup
```bash
cd server
node app.js
```

### PM2
```bash
cd server
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

### Systemd environment file
For VPS/systemd deployments, a separate env file path is now supported via the unit file:
```bash
/etc/bobsgameweb-server.env
```
Use the helper script:
```bash
BACKEND_HOST=YOUR-BACKEND-HOST BACKEND_USER=root ENV_ALLOWED_ORIGIN=https://bobsgame.com ./scripts/install-backend-env.sh
```

### Docker
```bash
cd server
docker build -t bobsgameweb-server .
docker run -p 6065:6065 -e HOST=0.0.0.0 -e PORT=6065 -e ALLOWED_ORIGIN=https://bobsgame.com bobsgameweb-server
```

## Health Checks
Verify these before touching the frontend config:

```bash
curl -i https://YOUR-BACKEND-HOST/
curl -i https://YOUR-BACKEND-HOST/healthz
curl -i "https://YOUR-BACKEND-HOST/socket.io/?EIO=4&transport=polling"
```

For drift-aware verification on Hetzner/VPS installs, also run:

```bash
BACKEND_HOST=YOUR_SERVER_IP BACKEND_URL=https://YOUR-BACKEND-HOST ./scripts/audit-backend-drift.sh
```

This compares:
- local tracked backend source
- remote backend files on disk
- live running backend process version from `/healthz`

Expected:
- `/` → 200 plain text
- `/healthz` → 200 JSON with `ok: true`
- `/socket.io/...` → Socket.io response, not provider 404

## Frontend Rebuild / Cutover
Once the backend host works, you can use the helper scripts:

```bash
BACKEND_URL=https://YOUR-BACKEND-HOST ./scripts/check-backend-host.sh
BACKEND_URL=https://YOUR-BACKEND-HOST ./scripts/rebuild-for-backend.sh
```

To rebuild and immediately redeploy static assets:

```bash
BACKEND_URL=https://YOUR-BACKEND-HOST DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/rebuild-for-backend.sh
```

Or use the combined cutover helper:

```bash
BACKEND_URL=https://YOUR-BACKEND-HOST DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/cutover-production.sh
```

## No-Restart Backend File Syncs
If you need to align backend files on disk without restarting the live service:

```bash
BACKEND_HOST=YOUR_SERVER_IP BACKEND_USER=root BACKEND_FORCE_TAR=1 BACKEND_RESTART=0 ./scripts/deploy-backend-vps.sh
```

This is useful when:
- you must not kill/restart processes right now
- you still want `/opt/bobsgameweb/server` to match tracked source
- you want the next planned restart to pick up already-synced code

## Suggested Provider Shapes
### VPS / Hetzner / DigitalOcean
- run `node index.js` or PM2/systemd
- bind backend to localhost or `0.0.0.0`
- put nginx/Caddy in front
- terminate TLS at the proxy
- for Hetzner specifically, see `HETZNER_SETUP.md` plus:
  - `server/ops/nginx/ws.bobsgame.com.conf`
  - `server/ops/nginx/ws.bobsgame.com.ssl.conf`
  - `server/ops/systemd/bobsgameweb-server.service`
  - `server/ops/bootstrap-ubuntu.sh`
  - `server/ops/cloud-init/hetzner-user-data.yaml`
  - `scripts/deploy-backend-vps.sh`
  - `scripts/install-backend-env.sh`
  - `scripts/install-backend-service.sh`
  - `scripts/collect-backend-diagnostics.sh`
  - `scripts/provision-hetzner-backend.sh`
  - `scripts/cutover-production.sh`
  - `HARDENING_CHECKLIST.md`

### PaaS / Railway / Render
- set `HOST`, `PORT`, and `ALLOWED_ORIGIN`
- use the platform port assignment
- verify `/healthz` before rebuilding the frontend

### DreamHost-style Passenger hosting
- use `app.js` as startup entrypoint
- verify `GET /healthz` works before testing Socket.io
- if Passenger/Node app hosting is unavailable, use a VPS or external backend host instead
