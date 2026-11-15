# Bob's Game Web (`okgame`) — Brain Persistent Memory (`main.md`)

## Current State (`v3.0.35` — 2026-11-14)
- **Root Repository (`robertpelloni/bobsgameweb`)**: `main` (and `master`) at **`v3.0.35`**.
- **Recursive Submodules**:
  - `submodules/bobui` (`robertpelloni/bqt`): **`v1.2.60`** (`92bb40654b`), clean.
  - `submodules/bobui/submodules/juce`: **`9.0.5`** (`d60b7a7803`), clean.
  - `submodules/bobui/submodules/ultimatepp`: `master` (`1a56dd3a4a`), clean.
- **Single-Source Versioning**: `VERSION.md` (`v3.0.35`) is read dynamically by `vite.config.ts` (`__APP_VERSION__`), `src/main/index.ts`, `server/index.js`, and `server/ai_proxy.js`.

## Major Architectural Upgrades Completed in `v3.0.34`–`v3.0.35`
1. **Consolidated Single-Page Omni-Engine Dashboard (`src/renderer/scenes/MainMenuScene.ts`)**:
   - Eliminated the 4-tab exclusive layout that hid 75% of features at any moment. All 38 gameplay modes, RPG scenes, editors, rankings, and tech demos now render on one scrollable multi-column dashboard with visible inline descriptions, `ⓘ` tooltips, `1–5` / `Q·E` section quick-jumps, inline `[MARATHON] [SPRINT] [ULTRA]` pills, and live dual-server (`:6065` & `:6066`) health/control pills.
2. **Unified Settings & Options (`src/renderer/scenes/SettingsScene.ts` & `OptionsScene.ts`)**:
   - Merged Audio Mixer, Haptic Pulse, WebGPU/WebGL2 preference, HQ2X HD Sprites, Ghost Piece, Pixel-Perfect scaling, Touch HUD override, Auto-Login, and Player Name onto one single two-column page (`OptionsScene` aliases `SettingsScene`).
3. **Scene Stack & World HUD Navigation (`src/renderer/Game.ts` & `WorldScene.ts`)**:
   - Seeded `MainMenuScene` beneath `WorldScene` on default/deep-link boots, eliminated duplicate `MainMenuScene.create()` calls, and added a 1-click `☰ Omni-Dashboard (Esc)` HUD button in `WorldScene`.
4. **Electron Main/Preload & System Tray Fix (`tsconfig.main.json`, `src/main/index.ts`, `src/main/preload.ts`)**:
   - Fixed `tsconfig.main.json` (`rootDir: "src/main"`, `CommonJS`) + `dist/main/package.json` (`{"type":"commonjs"}`) so `dist/main/index.js` and `dist/main/preload.js` boot cleanly under Electron 45.
   - Guarded optional `electron-squirrel-startup`, migrated AI Proxy default port from `8080` to `6066` (`0.0.0.0:6066`) to eliminate host Go-server port collisions, added HTTP `/healthz` service-identity probing (`6065`/`6066`), and enforced `BelowNormal` CPU priority across Electron-managed daemons, `build.bat`, `start.bat`, and `scripts/local-ops.ps1`.
5. **Backend REST CORS & Build Speed**:
   - Added universal CORS + `OPTIONS` preflight + `/api/status` to `server/index.js` (`:6065`).
   - Smart `copyPublicDir` in `vite.config.ts` skips re-copying 2.5 GB `data/` when `dist/renderer/maps_v2` is already hydrated.

## Open Problems / Next Priorities
- **Door Pixel-Art Sprite Extraction**: `WorldScene.ts` resolves canonical door sprite names from `data/doors.json` and renders palette-matched procedural doors until `DoorDown*`/`DoorUp*` frames are extracted into `data/sprites/sprite_atlas.{png,json}`.
- **Hetzner SSH Deployment (`5.161.250.43`)**: Blocked inside port-22-restricted agent sandboxes; run `./scripts/deploy-with-rollback.sh` from an unrestricted SSH terminal to update live `bobsgame.com` / `ws.bobsgame.com` to `v3.0.35`.
