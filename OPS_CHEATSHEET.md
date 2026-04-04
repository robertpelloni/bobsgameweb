# Ops Cheatsheet

Short command reference for the backend rollout and maintenance workflow.

## First deploy on Hetzner
```bash
BACKEND_HOST=YOUR_SERVER_IP DOMAIN_NAME=ws.bobsgame.com ./scripts/print-hetzner-first-deploy.sh
```

## One-shot provisioning
```bash
BACKEND_HOST=YOUR_SERVER_IP BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com INSTALL_DEPS=1 INSTALL_SYSTEMD=1 INSTALL_NGINX=1 ENABLE_TLS=0 ./scripts/provision-hetzner-backend.sh
```

## Verify backend
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
```

## Rebuild frontend for backend host
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/rebuild-for-backend.sh
```

## Rebuild + deploy static frontend
```bash
BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/rebuild-for-backend.sh
```

## Full frontend cutover
```bash
BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/cutover-production.sh
```

## Backend-only upload to VPS
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root BACKEND_INSTALL_DEPS=1 ./scripts/deploy-backend-vps.sh
```

## Install / refresh backend env file on VPS
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ENV_ALLOWED_ORIGIN=https://bobsgame.com ./scripts/install-backend-env.sh
```

## Reinstall service/nginx assets on VPS
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/install-backend-service.sh
```

## Collect backend diagnostics
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/collect-backend-diagnostics.sh
```

## Helpful docs
- `HETZNER_FIRST_DEPLOY.md`
- `HETZNER_SETUP.md`
- `BACKEND_DEPLOY.md`
- `POST_DEPLOY_CHECKLIST.md`
- `BACKEND_RECOVERY.md`
- `HARDENING_CHECKLIST.md`
