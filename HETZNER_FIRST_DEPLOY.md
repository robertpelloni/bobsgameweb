# Hetzner First Deploy — Exact Command Sequence

This is the shortest path from a fresh Hetzner server to a live backend on `ws.bobsgame.com`, followed by frontend cutover on `bobsgame.com`.

## Assumptions
- Ubuntu 24.04 on Hetzner
- SSH access as `root`
- DNS for `ws.bobsgame.com` can point to the new server
- static frontend remains on DreamHost

## Variables used below
Replace as needed:
- `BACKEND_HOST=YOUR_SERVER_IP`
- `BACKEND_USER=root`
- `DOMAIN_NAME=ws.bobsgame.com`
- `DEPLOY_HOST=dreamhost-bobsgame`

## 0. DNS
Create an A record:
- `ws.bobsgame.com` → your Hetzner server IP

Wait until it resolves.

## 1. Provision backend over HTTP first
```bash
cd bobsgameweb
BACKEND_HOST=YOUR_SERVER_IP \
BACKEND_USER=root \
DOMAIN_NAME=ws.bobsgame.com \
INSTALL_DEPS=1 \
INSTALL_SYSTEMD=1 \
INSTALL_NGINX=1 \
ENABLE_TLS=0 \
./scripts/provision-hetzner-backend.sh
```

## 2. Verify backend over HTTP
```bash
BACKEND_URL=http://ws.bobsgame.com ./scripts/check-backend-host.sh
```

This should verify:
- `/`
- `/healthz`
- `/socket.io/?EIO=4&transport=polling`

## 3. Turn on TLS
```bash
BACKEND_HOST=YOUR_SERVER_IP \
BACKEND_USER=root \
DOMAIN_NAME=ws.bobsgame.com \
RUN_BOOTSTRAP=0 \
INSTALL_DEPS=0 \
INSTALL_SYSTEMD=0 \
INSTALL_NGINX=0 \
ENABLE_TLS=1 \
./scripts/provision-hetzner-backend.sh
```

## 4. Verify backend over HTTPS
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
```

## 5. Cut over the frontend
```bash
BACKEND_URL=https://ws.bobsgame.com \
DEPLOY_STATIC=1 \
DEPLOY_HOST=dreamhost-bobsgame \
./scripts/cutover-production.sh
```

This will:
- verify backend again
- rebuild the frontend against `https://ws.bobsgame.com`
- deploy static assets to DreamHost

## 6. Post-deploy verification
Follow:
- `POST_DEPLOY_CHECKLIST.md`

If anything fails, use:
- `BACKEND_RECOVERY.md`
- `./scripts/collect-backend-diagnostics.sh`

## Handy helper
You can print a customized version of the above commands with:

```bash
BACKEND_HOST=YOUR_SERVER_IP DOMAIN_NAME=ws.bobsgame.com ./scripts/print-hetzner-first-deploy.sh
```
