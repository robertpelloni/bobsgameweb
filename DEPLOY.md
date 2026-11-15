# Deployment Guide: `bobsgameweb` — Hetzner Live Only (`bobsgame.com` & `ws.bobsgame.com`)

> **Policy (`v3.0.36+`):** `bobsgameweb` operates **exclusively against live Hetzner Cloud** (`https://bobsgame.com` frontend and `https://ws.bobsgame.com` unified multiplayer + REST + Generative AI backend). **Do not run or configure local servers.**

---

## 1. Live Hetzner Architecture

| Tier | Host / Domain | Remote Path / Service | Role |
| :--- | :--- | :--- | :--- |
| **Frontend Static & Big-Data** | `https://bobsgame.com` (`5.161.250.43`) | `/srv/www/bobsgame.com` (`nginx`) | Serves Vite WebGPU/WebGL2 bundle (`index.html`, `assets/*`) + hydrated `maps_v2/`, `audio/`, `doors.json`, `lancedb/` |
| **Unified Backend (WS + REST + AI)** | `https://ws.bobsgame.com` (`5.161.250.43`) | `/opt/bobsgameweb/server` (`systemd` `bobsgameweb-server`, `:6065` behind `nginx` `:443`) | Socket.io multiplayer rooms/tournaments, `/healthz`, `/api/status`, `/stats`, `/players/*`, `/leaderboards`, `/maps/*`, and `/api/generate/*` + `/api/chat` |

---

## 2. One-Command Live Hetzner Deploy (with Automatic Rollback & Verification)

```bash
FRONTEND_HOST=5.161.250.43 ./scripts/deploy-with-rollback.sh
```

What `scripts/deploy-with-rollback.sh` executes sequentially:
1. Snapshots `/srv/www/bobsgame.com/index.html` and `/srv/www/bobsgame.com/assets/` on Hetzner into `/tmp/bobsgame_frontend_backup_<timestamp>`.
2. Builds the local production bundle (`VITE_SERVER_URL=https://ws.bobsgame.com VITE_COPY_PUBLIC_DIR=false npm run build`).
3. Deploys the unified backend (`scripts/deploy-backend-vps.sh`) to `/opt/bobsgameweb/server` while **strictly preserving** live `profiles.json`, `leaderboards.json`, `achievement_profiles/`, `characters/`, `emulator_states/`, and `maps/`, then restarts `bobsgameweb-server`.
4. Uploads `dist/renderer/index.html` + `dist/renderer/assets/` (`scripts/deploy-frontend-hetzner.sh`) to `/srv/www/bobsgame.com` without touching hydrated map/audio directories.
5. Verifies live `https://ws.bobsgame.com/healthz` (`EXPECTED_BACKEND_VERSION`), `https://bobsgame.com`, custom editor markers, lazy runtime chunks, and WebGPU WGSL particle chunks (`scripts/verify-production-stack.sh`), rolling back automatically on any failure.

---

## 3. Individual Hetzner Scripts

```bash
# Deploy backend code only & restart systemd service bobsgameweb-server
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/deploy-backend-vps.sh

# Deploy frontend code bundle only (index.html + assets/)
FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root ./scripts/deploy-frontend-hetzner.sh

# Verify live Hetzner stack end-to-end
BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com EXPECTED_BACKEND_VERSION=3.0.36 ./scripts/verify-production-stack.sh
```
