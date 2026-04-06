# Backend Recovery / Rollback Runbook

Use this runbook when the backend is deployed but unhealthy, returning 502s, failing websocket upgrades, or needing a quick rollback.

## 1. First diagnostic step
Run from your local machine:

```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/collect-backend-diagnostics.sh
```

This will show:
- systemd status
- journal logs
- nginx config test
- listening ports
- local health checks

## 2. Common recovery actions
### Restart backend service
```bash
ssh root@ws.bobsgame.com "sudo systemctl restart bobsgameweb-server && sudo systemctl status bobsgameweb-server --no-pager"
```

### Reload nginx
```bash
ssh root@ws.bobsgame.com "sudo nginx -t && sudo systemctl reload nginx"
```

### Reinstall service/nginx assets from uploaded backend
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/install-backend-service.sh
```

### Re-upload backend files and reinstall deps
```bash
BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root BACKEND_INSTALL_DEPS=1 ./scripts/deploy-backend-vps.sh
```

## 3. Health verification after recovery
```bash
BACKEND_URL=https://ws.bobsgame.com ./scripts/check-backend-host.sh
```

For a controlled maintenance-window restart with pre/post checks, prefer:

```bash
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.49 ./scripts/run-backend-maintenance-restart.sh
```

That helper is dry-run by default. It only performs the restart if `EXECUTE_BACKEND_RESTART=1` is explicitly supplied.

## 4. Frontend rollback strategy
If the frontend has already been rebuilt to the new backend but the backend is unstable:

### Quick rollback option A
Rebuild frontend against the previous known-good backend URL and redeploy.

### Quick rollback option B
Temporarily point DNS for `ws.bobsgame.com` back to the previous backend if one exists.

## 5. Safe cutover principle
Do **not** rebuild/redeploy the frontend to target the backend host until:
- `/healthz` works
- `/socket.io/?EIO=4&transport=polling` works
- nginx is passing traffic
- TLS is valid

## 6. Last resort
If the backend deploy is too broken and time-sensitive rollback is needed:
1. stop using the new backend host in the frontend build
2. redeploy frontend pointing to the previous known-good backend
3. debug the VPS independently using the diagnostics helper
