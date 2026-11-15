# Deployment & Operations Guide: `bobsgameweb` (`bobsgame.com`)

## 1. Local Full-Stack Operations (`BelowNormal` Priority)

All Windows build and runtime scripts automatically lower CPU scheduling priority to **`BelowNormal`** and never purge compiled binaries or hydrated static assets.

### PowerShell Orchestrator (`scripts/local-ops.ps1` — Recommended)
```powershell
# Inspect live TCP + /healthz status across WS (:6065), AI (:6066), Web (:3000), and Electron
.\scripts\local-ops.ps1 -Action status

# Start all local services (WS :6065 + AI :6066 + Vite Web :3000) in background at BelowNormal priority
.\scripts\local-ops.ps1 -Action start -Target all

# Start Electron Desktop Shell + System Tray
.\scripts\local-ops.ps1 -Action start -Target electron

# View recent stdout/stderr logs in logs/local-*.log
.\scripts\local-ops.ps1 -Action logs -Target all

# Stop only exact child PIDs spawned by local-ops.ps1 (tracked in logs/pids.json)
.\scripts\local-ops.ps1 -Action stop -Target all
```

### Root Batch Launchers (`setup.bat`, `build.bat`, `start.bat`)
```bat
setup.bat                :: Sync recursive submodules + npm install in root and server/
build.bat                :: Build bobui (if Go installed) + tsc + Electron main + Vite bundle
build.bat --copy-assets  :: Force full 2.5 GB data/ -> dist/renderer/ asset copy
start.bat                :: Start WS (:6065) + AI (:6066) + Vite dev (:3000) at BelowNormal priority
start.bat --electron     :: Launch Vite + Electron System Tray desktop shell
start.bat --server       :: Run Multiplayer WS/REST server (:6065) standalone
start.bat --ai-proxy     :: Run Generative AI Proxy (:6066) standalone
start.bat --preview      :: Serve production bundle in dist/renderer via Vite preview
```

---

## 2. Hetzner Production Deployment (`bobsgame.com` & `ws.bobsgame.com`)

- **Frontend Host**: Hetzner VPS (`5.161.250.43`), served by `nginx` from `/srv/www/bobsgame.com`.
- **Backend WebSocket / REST Host**: `https://ws.bobsgame.com` (`nginx` TLS proxy on `:443` → `127.0.0.1:6065`, `systemd` unit `bobsgameweb-server`).

### Frontend Deploy with Automatic Rollback & Post-Deploy Verification
Run from a machine with SSH key access to `5.161.250.43`:

```bash
VITE_SERVER_URL=https://ws.bobsgame.com VITE_COPY_PUBLIC_DIR=false npm run build

FRONTEND_HOST=5.161.250.43 \
FRONTEND_USER=root \
BACKEND_URL=https://ws.bobsgame.com \
./scripts/deploy-with-rollback.sh
```

Or step-by-step:
```bash
# 1. Upload built frontend assets (index.html + assets/ chunks; skips 2.5 GB data/)
FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root BACKEND_URL=https://ws.bobsgame.com ./scripts/deploy-frontend-hetzner.sh

# 2. Deploy / restart backend Socket.io service on port 6065
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/deploy-backend-vps.sh

# 3. Verify live frontend chunks, custom editor markers, and backend /healthz version
BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com EXPECTED_BACKEND_VERSION=3.0.35 ./scripts/verify-production-stack.sh
```

### Active Operations Scripts in `scripts/`
| Script | Purpose |
| :--- | :--- |
| `scripts/local-ops.ps1` | Local Windows `BelowNormal` process manager (`status`, `start`, `stop`, `restart`, `logs`, `build`). |
| `scripts/deploy-with-rollback.sh` | Wraps `deploy-frontend-hetzner.sh` + `verify-production-stack.sh` with automatic tar backup & rollback. |
| `scripts/deploy-frontend-hetzner.sh` | Uploads `dist/renderer/` code bundles to `/srv/www/bobsgame.com`. |
| `scripts/deploy-backend-vps.sh` | Syncs `server/` to Hetzner VPS and restarts `bobsgameweb-server`. |
| `scripts/verify-production-stack.sh` | Runs `check-backend-host.sh`, `check-production-frontend.sh`, `check-production-editor.sh`, and `check-production-runtime-chunks.sh`. |
| `scripts/run-backend-maintenance-restart.sh` | Snapshots pre/post restart diagnostics (`snapshot-backend-restart-readiness.sh` + `compare-backend-restart-snapshot.sh`). |
| `scripts/archive/` | Non-destructive archive of historical/one-off migration and setup scripts. |

---

## 3. Known Sandbox / Environment Deployment Notes
- **Outgoing SSH Port 22 Restriction in Agent Sandboxes**: Automated agent sandboxes typically block outbound TCP port `22`, preventing direct `ssh`/`scp`/`rsync` pushes to `5.161.250.43` from inside the sandbox. Build & commit inside the repo, then run `./scripts/deploy-with-rollback.sh` from an unrestricted host terminal with `~/.ssh` credentials.
- **Static Big-Data (`data/lancedb`, `data/maps_v2`)**: Hydrated once on `/srv/www/bobsgame.com`; `vite.config.ts` skips re-copying `data/` when `dist/renderer/maps_v2` exists (or when `VITE_COPY_PUBLIC_DIR=false`).
