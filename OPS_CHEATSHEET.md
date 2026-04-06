# Ops Cheatsheet

Short command reference for the backend rollout and maintenance workflow.

## First deploy on Hetzner
```bash
BACKEND_HOST=YOUR_SERVER_IP DOMAIN_NAME=ws.bobsgame.com ./scripts/print-hetzner-first-deploy.sh
```

## Render local config artifacts
```bash
DOMAIN_NAME=ws.bobsgame.com APP_ROOT=/opt/bobsgameweb APP_USER=bobsgame SERVICE_NAME=bobsgameweb-server ./scripts/render-hetzner-configs.sh
```

## Preflight before provisioning
```bash
BACKEND_HOST=YOUR_SERVER_IP BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/preflight-hetzner-backend.sh
```

## One-shot provisioning
```bash
BACKEND_HOST=YOUR_SERVER_IP BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com INSTALL_DEPS=1 INSTALL_SYSTEMD=1 INSTALL_NGINX=1 ENABLE_TLS=0 ./scripts/provision-hetzner-backend.sh
```

## Verify backend
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
```

## Verify backend against an expected runtime version
```bash
BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.49 ./scripts/check-backend-host.sh
```

## Verify backend while temporarily allowing documented runtime drift
```bash
BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.49 ALLOW_BACKEND_RUNTIME_DRIFT=1 ./scripts/check-backend-host.sh
```

## Restart-readiness snapshot (read-only)
```bash
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.51 ./scripts/snapshot-backend-restart-readiness.sh
```

## Compare current state to a saved restart-readiness snapshot
```bash
SNAPSHOT_FILE=artifacts/pre-restart.txt BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.51 ./scripts/compare-backend-restart-snapshot.sh
```

## Planned backend maintenance restart (dry-run by default)
```bash
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.51 ./scripts/run-backend-maintenance-restart.sh
```

## Planned backend maintenance restart (execute only when allowed)
```bash
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.51 EXECUTE_BACKEND_RESTART=1 ./scripts/run-backend-maintenance-restart.sh
```

## Audit backend drift
```bash
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com ./scripts/audit-backend-drift.sh
```

## Rebuild frontend for backend host
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/rebuild-for-backend.sh
```

## Rebuild + deploy static frontend
```bash
BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/rebuild-for-backend.sh
```

## Full frontend cutover (DreamHost static)
```bash
BACKEND_URL=https://ws.bobsgame.com DEPLOY_STATIC=1 DEPLOY_HOST=dreamhost-bobsgame ./scripts/cutover-production.sh
```

## Upload static frontend to Hetzner
```bash
FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root FRONTEND_BUILD=1 BACKEND_URL=https://ws.bobsgame.com ./scripts/deploy-frontend-hetzner.sh
```

## Quick frontend verification after cutover
```bash
FRONTEND_URL=https://bobsgame.com EXPECTED_BACKEND=https://ws.bobsgame.com ./scripts/check-production-frontend.sh
```

## Full backend + frontend verification
```bash
BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh
```

## Backend-only upload to VPS
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root BACKEND_INSTALL_DEPS=1 ./scripts/deploy-backend-vps.sh
```

## Backend-only upload to VPS without restart (force tar-over-ssh path)
```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root BACKEND_FORCE_TAR=1 BACKEND_RESTART=0 ./scripts/deploy-backend-vps.sh
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

## Tail backend logs live
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/tail-backend-logs.sh
```

## Fetch backend backup locally
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root ./scripts/fetch-backend-backup.sh
```

## Check shared Redis on Hetzner
```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-redis-hetzner.sh
```

## Check Hetzner MySQL
```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-mysql-hetzner.sh
```

## Check Hetzner PostgreSQL
```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-postgres-hetzner.sh
```

## Helpful docs
- `HETZNER_FIRST_DEPLOY.md`
- `HETZNER_SETUP.md`
- `BACKEND_DEPLOY.md`
- `POST_DEPLOY_CHECKLIST.md`
- `BACKEND_RECOVERY.md`
- `BACKUP_RESTORE.md`
- `HARDENING_CHECKLIST.md`
- `REDIS_SHARED_SERVICES.md`
- `MYSQL_MIGRATION.md`
- `POSTGRES_SHARED_SERVICES.md`
- `HETZNER_UNIFIED_STACK_STATUS.md`
- `HETZNER_SETUP.md` (now also relevant for `bobsgame.com` static hosting on Hetzner)
