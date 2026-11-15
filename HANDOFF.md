# HANDOFF: `bobsgameweb` (`okgame`) — `v3.0.35`

**Timestamp:** 2026-11-14  
**Repository:** `https://github.com/robertpelloni/bobsgameweb.git` (`main` & `master` synchronized)  
**Current Version:** **`v3.0.35`** (single-sourced from `VERSION.md`)  
**Recursive Submodules:**
- `submodules/bobui` (`https://github.com/robertpelloni/bqt.git`): **`v1.2.60`** (`92bb40654b`), clean
- `submodules/bobui/submodules/juce`: **`9.0.5`** (`d60b7a7803`), clean
- `submodules/bobui/submodules/ultimatepp`: `master` (`1a56dd3a4a`), clean

---

## 1. Executive Summary of Completed Milestones (`v3.0.34` → `v3.0.35`)

### A. Consolidated Single-Page Omni-Engine Dashboard (`src/renderer/scenes/MainMenuScene.ts`)
- Replaced the fragmented 4-tab exclusive layout (`play` | `editors` | `community` | `system` — which hid 75% of engine features at any moment and discarded `MenuItem.description`) with **one singular, consolidated, smoothly scrollable multi-column dashboard** (`#menu`) surfacing **all 38 gameplay modes, RPG scenes, Creation Studio editors, online competitive rankings, and engine tech demos** on one page.
- Every card displays its primary title, inline description subtitle, category accent stripe, and an `ⓘ` indicator wired to `Tooltip.ts`.
- Added a **Pinned Telemetry & Control Header** featuring:
  - Live HTTP `/healthz` + Electron IPC daemon status & click-to-toggle pills for **both** `Game WS Server (:6065)` and `AI Proxy (:6066)`.
  - Inline `[MARATHON] [SPRINT] [ULTRA]` Puzzle Mode selector pills.
  - Quick-jump section anchor pills (`1–5` keys or `Q`/`E`) that smoothly scroll the unified page, plus mouse-wheel scrolling, draggable scrollbar thumb, and `PageUp`/`PageDown`/`Home`/`End` support (`InputManager.ts`).

### B. Unified Single-Page Settings & Scene-Stack Integrity
- **`src/renderer/scenes/SettingsScene.ts` & `OptionsScene.ts`**: Merged Audio Mixer, Haptic Pulse, WebGPU/WebGL2 renderer preference, HQ2X HD Sprites, Ghost Piece, Pixel-Perfect Scaling, Mobile Touch HUD override, Auto-Login, and Player Identity onto **one responsive two-column page** with `Tooltip` hover descriptions (`OptionsScene` now aliases `SettingsScene`).
- **`src/renderer/Game.ts` & `WorldScene.ts`**: Fixed the empty `StateManager` scene-stack bug when exiting `WorldScene` on `/` or `#world` boots by seeding `MainMenuScene` beneath `WorldScene`, eliminated a duplicate eager `mainMenuScene.create()` invocation before `StateManager.push()`, and added a 1-click `☰ Omni-Dashboard (Esc)` HUD button inside `WorldScene`.
- **`src/renderer/scenes/HelpScene.ts`**: Added smooth mouse-wheel scrolling, viewport masking, draggable/synced scrollbar thumb, and updated reference documentation for `#menu`, Unified Settings, World HUD shortcuts, and System Tray daemons.

### C. Electron Desktop Shell, Native System Tray & Dual-Server Daemons (`:6065` & `:6066`)
- **Fixed `tsconfig.main.json` & `build:main`**: Set `rootDir: "src/main"`, `"module": "CommonJS"`, `"outDir": "dist/main"`, and generated `dist/main/package.json` (`{"type":"commonjs"}`) so `dist/main/index.js` and `dist/main/preload.js` execute cleanly under Electron 45 alongside the root `"type": "module"` Vite workspace. Guarded optional `electron-squirrel-startup`.
- **Migrated AI Proxy Default Port (`8080` → `6066`) & Added `/healthz` Service Identity Verification**: Live HTTP probing uncovered an unrelated host Go server occupying `127.0.0.1:8080` (returning `404 page not found` while `ai_proxy.js` bound IPv6 `[::]:8080`). Migrated `AI_PROXY_PORT` default to **`6066`** (`0.0.0.0:6066`, paired adjacent to `:6065`) across `server/ai_proxy.js`, `GenerativeAIManager.ts`, `src/main/index.ts`, `MainMenuScene.ts`, `start.bat`, and `scripts/local-ops.ps1`, and implemented `probeServiceHealth()` in `src/main/index.ts` to validate JSON `service` names (`bobsgameweb-socket-server` & `ai-proxy`).
- **Universal REST CORS (`server/index.js`) & Self-Healing `server/node_modules`**: Added `Access-Control-Allow-*` headers, `204` `OPTIONS` preflight handling, and `/api/status` to `server/index.js` (`:6065`); hydrated `server/node_modules` (`89 packages`); and added automatic `server/node_modules/socket.io` checks to `start.bat` and `scripts/local-ops.ps1`.
- **Electron File Telemetry (`logs/local-electron.log`)**: Added `logMain()` and renderer console/load telemetry to `src/main/index.ts` because Windows `electron.exe` (`/SUBSYSTEM:WINDOWS`) does not flush `console.log` over detached `Start-Process` pipes.

### D. Vite Dev/Build Fixes, Single-Source Versioning & `BelowNormal` Ops Suite
- **Single-Source `VERSION.md`**: Dynamically ingested by `vite.config.ts` (`__APP_VERSION__`), `src/shared/Config.ts`, `src/main/index.ts`, `server/index.js`, and `server/ai_proxy.js`.
- **Vite Dev & Electron `file://` Fixes (`vite.config.ts`, `src/shared/doors.json`, `DemoWorld.ts`)**:
  - Mirrored `data/doors.json` to `src/shared/doors.json` so Vite dev mode no longer throws `Assets in public directory cannot be imported from JavaScript` when importing `WorldScene` / `LegacyMapLoader`.
  - Added `base: './'` (fixing `file://` asset loading in standalone/packaged Electron builds), `optimizeDeps.entries: ['index.html']`, `server.watch.ignored` (`data/`, `submodules/`, `dist/`, `cpp_port/`, `logs/`), and smart `copyPublicDir` (skipping redundant 2.5 GB `data/` copies when `dist/renderer/maps_v2` is already hydrated, reducing incremental `vite build` to **~1.31s**).
  - Updated `DemoWorld.ts` dynamic scene imports to analyzable template literals (`../../scenes/${sceneName}.ts`).
- **Process Priority & Binary Safety (`build.bat`, `start.bat`, `setup.bat`, `scripts/local-ops.ps1`, `.gitattributes`)**:
  - Normalized `.bat` files to pure ASCII + CRLF via `.gitattributes` (preventing Windows `cmd.exe` multi-byte offset corruption).
  - Enforced **`BelowNormal`** CPU scheduling priority across all build scripts, Node daemons, and Electron children, with owned PIDs tracked in `logs/pids.json` so `stop` never terminates unrelated host processes.

---

## 2. Verified Build, Unit Test & Live Full-Stack Probe Results

1. **Production Build (`cmd.exe /c build.bat` & `npm run build`)**:
   - `tsc` + `npm run build:main` + `vite build`: **0 errors**, `930 modules transformed`, built in **1.31s**.
2. **Automated Test Suites (`190 / 190` Assertions Passed)**:
   - `npx tsx src/__tests__/shop-config.test.ts` → **3 passed, 0 failed**
   - `npx tsx scripts/tests/puzzle-logic.test.ts` → **60 passed, 0 failed**
   - `npx tsx scripts/tests/validation.test.ts` → **57 passed, 0 failed**
   - `npx tsx scripts/tests/map-data.test.ts` → **70 passed, 0 failed**
3. **Live Full-Stack 4-Service Runtime Verification (Zero STDERR Warnings/Errors)**:
   - **`server/index.js` (`http://127.0.0.1:6065/healthz` & `/api/status`)**: `HTTP 200`, `Access-Control-Allow-Origin: *`, `{"ok":true,"status":"ok","service":"bobsgameweb-socket-server","version":"3.0.35","port":6065,...}`
   - **`server/ai_proxy.js` (`http://127.0.0.1:6066/healthz`)**: `HTTP 200`, `{"status":"ok","service":"ai-proxy","version":"3.0.35","openaiConfigured":true,"port":6066}`
   - **Vite Web Dev Server (`http://127.0.0.1:3000/`)**: `HTTP 200` (`7,822 bytes`, ready in `704 ms`, zero `STDERR` warnings)
   - **Electron Desktop Shell + System Tray (`logs/local-electron.log`)**: `ExitCode: 0`, `[Main] System Tray initialized (version=v3.0.35, icon=...\public\bobsgame.png, empty=false)`, `wsOnline=true, aiOnline=true`, `BrowserWindow finished loading URL: http://127.0.0.1:3000/#menu`, `Game initialized`, `Game starting...`

---

## 3. Quick-Start Operational Commands

```powershell
# Check status of WS (:6065), AI (:6066), Vite Web (:3000), and Electron Tray
.\scripts\local-ops.ps1 -Action status

# Start all local background daemons + web dev server at BelowNormal priority
.\scripts\local-ops.ps1 -Action start -Target all

# Launch Electron Desktop Shell + Native System Tray
.\scripts\local-ops.ps1 -Action start -Target electron

# Tail service & Electron logs
.\scripts\local-ops.ps1 -Action logs -Target all

# Stop only exact child PIDs owned by local-ops.ps1
.\scripts\local-ops.ps1 -Action stop -Target all
```

---

## 4. Known Constraints & Next Actionable Steps

1. **Hetzner Live VPS Cutover (`5.161.250.43`)**: Outbound SSH port `22` is restricted inside the agent terminal sandbox. From an unrestricted developer shell with SSH keys, run `./scripts/deploy-with-rollback.sh` (documented in `DEPLOY.md`) to publish `v3.0.35` to `bobsgame.com` and `ws.bobsgame.com`.
2. **Legacy Pixel-Art `Door*` Atlas Frames**: `WorldScene.ts` resolves canonical door sprite names (`DoorDownBrownGoldKnob`, etc.) from `doors.json` via `SpriteAtlas` and currently renders palette-matched procedural doors (`createFallbackDoorGraphic`) until `DoorDown*`/`DoorUp*` sheets are extracted into `data/sprites/sprite_atlas.{png,json}`.
3. **Low Disk Space on `C:` (`< 4 GB` free)**: Keep `vite.config.ts` smart `copyPublicDir` enabled (`dist/renderer/maps_v2` is already hydrated on disk) and avoid duplicating the 2.5 GB `data/` directory unnecessarily.
4. **Host Debugging Port Boundary**: Raw host browser debugging ports (such as `msedge` CDP `9222`) were intentionally not probed per environment security boundaries; runtime verification was conducted via dedicated spawned `BelowNormal` instances and Electron `logs/local-electron.log` telemetry.
