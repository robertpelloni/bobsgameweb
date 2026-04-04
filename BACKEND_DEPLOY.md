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

Expected:
- `/` → 200 plain text
- `/healthz` → 200 JSON with `ok: true`
- `/socket.io/...` → Socket.io response, not provider 404

## Frontend Rebuild
Once the backend host works, rebuild the frontend with:
```bash
VITE_SERVER_URL=https://YOUR-BACKEND-HOST npm run build
```

Then redeploy static assets to `bobsgame.com`.

## Suggested Provider Shapes
### VPS / Hetzner / DigitalOcean
- run `node index.js` or PM2
- bind backend to localhost or `0.0.0.0`
- put nginx/Caddy in front
- terminate TLS at the proxy

### PaaS / Railway / Render
- set `HOST`, `PORT`, and `ALLOWED_ORIGIN`
- use the platform port assignment
- verify `/healthz` before rebuilding the frontend

### DreamHost-style Passenger hosting
- use `app.js` as startup entrypoint
- verify `GET /healthz` works before testing Socket.io
- if Passenger/Node app hosting is unavailable, use a VPS or external backend host instead
