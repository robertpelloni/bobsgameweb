# Post-Deploy Checklist

Use this after backend deployment or production cutover.

## Backend host (`ws.bobsgame.com`)
- [ ] DNS resolves to the expected server IP
- [ ] `http://ws.bobsgame.com/healthz` works before TLS
- [ ] `https://ws.bobsgame.com/healthz` works after TLS
- [ ] `https://ws.bobsgame.com/socket.io/?EIO=4&transport=polling` does not return provider/nginx 404
- [ ] systemd service is active
- [ ] nginx config passes `nginx -t`
- [ ] backend journal shows no repeated crash loop

## Frontend (`bobsgame.com`)
- [ ] web build used `VITE_SERVER_URL=https://ws.bobsgame.com`
- [ ] static deploy completed successfully
- [ ] `bobsgame.com` resolves to the intended host (DreamHost or Hetzner)
- [ ] TLS certificate served for `bobsgame.com` matches the hostname
- [ ] browser loads new assets without 404s
- [ ] network panel shows requests to `https://ws.bobsgame.com`
- [ ] main menu loads and version string matches the intended release

## Functional checks
- [ ] open lobby successfully
- [ ] leaderboard request succeeds
- [ ] rankings request succeeds
- [ ] create room works
- [ ] join room works
- [ ] multiplayer game start works
- [ ] achievement snapshot save/load still works online
- [ ] world character save/load still works

## If anything fails
- run:
  ```bash
  BACKEND_HOST=ws.bobsgame.com BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/collect-backend-diagnostics.sh
  ```
- for planned maintenance windows, capture a restart-readiness baseline first:
  ```bash
  BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 ./scripts/snapshot-backend-restart-readiness.sh
  ```
- after the restart window, compare against that baseline:
  ```bash
  SNAPSHOT_FILE=artifacts/pre-restart.txt BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 ./scripts/compare-backend-restart-snapshot.sh
  ```
- consult `BACKEND_RECOVERY.md`
- for the full planned restart sequence, consult `MAINTENANCE_WINDOW_RUNBOOK.md`
