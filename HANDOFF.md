# HANDOFF: `bobsgameweb` (`okgame`) — `v3.0.36` (Hetzner Live-Only)

**Timestamp:** 2026-11-15  
**Repository:** `https://github.com/robertpelloni/bobsgameweb.git` (`main` & `master` synchronized)  
**Current Version:** **`v3.0.36`** (single-sourced from `VERSION.md`, deployed live on Hetzner)  
**Live Production Endpoints (Hetzner `5.161.250.43`):**
- **Frontend:** `https://bobsgame.com` (`/srv/www/bobsgame.com` — live `v3.0.36`)
- **Unified Backend:** `https://ws.bobsgame.com` (`/opt/bobsgameweb/server`, `systemd` `bobsgameweb-server` = `active`, `version: "3.0.36"`)

**Recursive Submodules:**
- `submodules/bobui` (`https://github.com/robertpelloni/bqt.git`): **`v1.2.60`** (`92bb40654b`), clean
- `submodules/bobui/submodules/juce`: **`9.0.5`** (`d60b7a7803`), clean
- `submodules/bobui/submodules/ultimatepp`: `master` (`1a56dd3a4a`), clean

---

## 1. Executive Summary of `v3.0.36` (Hetzner Live-Only Cutover)

### A. Zero Local Servers — Exclusive Hetzner Live Architecture
- Per explicit directive (**no local servers — Hetzner deploy only live**), removed all local server fallbacks (`localhost:6065`, `127.0.0.1:6066`, `localhost:3001`), local daemon Start/Stop UI pills/cards, Electron child `node` server spawning, and local dev-server scripts (`dev`, `server`, `server:ws`, `dev:electron`, `preview`).
- **`src/shared/Config.ts`**, **`src/renderer/editor/GenerativeAIManager.ts`**, **`src/renderer/engine/rpg/DemoWorld.ts`**, and **`src/renderer/puzzle/BobNet.ts`** connect unconditionally to **`https://ws.bobsgame.com`** and **`https://bobsgame.com`**.
- **`src/main/index.ts` & `src/main/preload.ts`**: Simplified the Electron Desktop Shell + Native System Tray into a pure live Hetzner Cloud client loading `https://bobsgame.com/#menu` and probing `https://ws.bobsgame.com/healthz` with zero local background daemons.
- **`start.bat`**: Opens live `https://bobsgame.com` directly (`start.bat --electron` launches Electron against Hetzner live; `start.bat --deploy` executes `./scripts/deploy-with-rollback.sh`).
- Non-destructively archived `server/ai_proxy.js` → `scripts/archive/ai_proxy.legacy.js` and `scripts/local-ops.ps1` → `scripts/archive/local-ops.legacy.ps1`.

### B. Unified Hetzner Cloud Backend (`server/index.js` on `https://ws.bobsgame.com`)
- Integrated Creation Studio Generative AI endpoints (`/api/generate/sprite`, `/api/generate/tileset`, `/api/generate/dialogue`, `/api/chat`) directly into `server/index.js`, loading the `openai` SDK dynamically when `OPENAI_API_KEY` is configured in `/etc/bobsgameweb-server.env` and falling back cleanly to deterministic procedural payloads otherwise.
- Added dynamic `*.bobsgame.com` `Origin` CORS reflection and `openaiConfigured` status reporting on `/healthz` and `/api/status`.

### C. Consolidated Single-Page Dashboard & Hetzner Telemetry (`MainMenuScene.ts` & `HelpScene.ts`)
- Replaced the local `Game WS Server (:6065)` and `AI Proxy Server (:6066)` toggle pills/cards on `MainMenuScene.ts` with a live **`Hetzner Cloud (ws.bobsgame.com)`** status pill in the pinned header and a `Hetzner Cloud Status` telemetry card in Section 5 (37 consolidated cards total).
- Updated `HelpScene.ts` to document the Hetzner Live-Only Cloud architecture.

### D. Disk-Safe & Data-Safe Hetzner Deployment Suite (`scripts/`)
- **`scripts/deploy-frontend-hetzner.sh` & `scripts/deploy-with-rollback.sh`**: Back up `/srv/www/bobsgame.com/index.html` + `assets/` to `/tmp/bobsgame_frontend_backup_<ts>` and upload only `dist/renderer/index.html` + `dist/renderer/assets/` (`~19.37 MB` uncompressed), preserving the multi-gigabyte hydrated static assets (`maps_v2/`, `audio/`, `lancedb/`) on Hetzner and safeguarding `/dev/sda1` free disk space (`14 GB` free).
- **`scripts/deploy-backend-vps.sh`**: Syncs `VERSION.md` to `server/VERSION.md` and `/opt/bobsgameweb/VERSION.md`, uploads `server/` via `tar` excluding `node_modules`, `profiles.json`, `leaderboards.json`, `achievement_profiles`, `characters`, `emulator_states`, and `maps`, runs `npm install --omit=dev`, restores `bobsgame:bobsgame` ownership, and restarts `bobsgameweb-server`.
- **`scripts/check-backend-host.sh`**: Pipes `/healthz` JSON via `stdin` into `node -e` so Windows Git Bash + native `node.exe` never fails on `/tmp/...` POSIX paths.

---

## 2. Live Production Deployment & Verification Telemetry (`v3.0.36`)

1. **Local Production Bundle Build (`npm run build`)**:
   - `tsc` + `npm run build:main` + `vite build` (`VITE_SERVER_URL=https://ws.bobsgame.com VITE_COPY_PUBLIC_DIR=false`): **0 errors**, `930 modules transformed`, built in **1.15s**.
2. **Live Hetzner Backend Verification (`https://ws.bobsgame.com`)**:
   - `systemctl is-active bobsgameweb-server` → **`active`**
   - `GET https://ws.bobsgame.com/healthz` → **`HTTP/1.1 200 OK`**, `access-control-allow-origin: https://bobsgame.com`, `{"ok":true,"status":"ok","service":"bobsgameweb-socket-server","version":"3.0.36","openaiConfigured":false,"port":6065,"uptime":7,"connections":0,"rooms":0,"time":1794717222231}`
   - `GET https://ws.bobsgame.com/socket.io/?EIO=4&transport=polling` → **`HTTP/1.1 200 OK`** (`upgrades: ["websocket"]`)
3. **Live Hetzner Frontend Verification (`https://bobsgame.com`)**:
   - Expected backend origin `https://ws.bobsgame.com` confirmed in live deployed JS chunks (`assets/main-B46fDiix.js`, `assets/Config-DEq-DvBv.js`, `assets/GenerativeAIManager-DEoRKMqD.js`).
   - All custom editor markers (`Saved Template Slots`, `preset-slots-panel`, `block-conversion-list`, etc.) verified live.
   - Lazy runtime chunk families verified live (`CustomGameEditorScene-k3N8nJxJ.js` `118,306 B`, `AchievementsScene-DuDVp7tL.js` `4,686 B`, `WorldScene-PxRBriwv.js` `120,091 B`, `WorldEditorScene-18e0dxfb.js` `10,647 B`, `LobbyScene-CD82KO6m.js` `13,667 B`).
   - WebGPU WGSL particle integration verified live (`assets/WebGPUParticleSystem-kSZv-oSf.js`).

---

## 3. Operational Commands (Hetzner Live-Only)

```bash
# Build frontend + Electron main locally (no local server started)
npm run build

# Deploy frontend + backend live to Hetzner with automatic rollback & verification
npm run deploy:hetzner

# Re-verify live https://bobsgame.com & https://ws.bobsgame.com stack
npm run verify:live
```
