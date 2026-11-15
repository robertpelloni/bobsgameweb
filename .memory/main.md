# Bob's Game Web (`okgame`) — Brain Persistent Memory (`main.md`)

## Current State (`v3.0.36` — 2026-11-15)
- **Root Repository (`robertpelloni/bobsgameweb`)**: `main` (and `master`) at **`v3.0.36`**.
- **Live Hetzner Cloud Production (`5.161.250.43`)**:
  - **Frontend (`https://bobsgame.com`)**: `/srv/www/bobsgame.com` — live on **`v3.0.36`** (verified chunks + WebGPU WGSL markers + hydrated `maps_v2/`, `audio/`, `lancedb/`).
  - **Backend (`https://ws.bobsgame.com`)**: `/opt/bobsgameweb/server` (`systemd` `bobsgameweb-server` = `active`) — live on **`v3.0.36`** (`{"ok":true,"status":"ok","service":"bobsgameweb-socket-server","version":"3.0.36",...}`).
- **Recursive Submodules**:
  - `submodules/bobui` (`robertpelloni/bqt`): **`v1.2.60`** (`92bb40654b`), clean.
  - `submodules/bobui/submodules/juce`: **`9.0.5`** (`d60b7a7803`), clean.
  - `submodules/bobui/submodules/ultimatepp`: `master` (`1a56dd3a4a`), clean.
- **Single-Source Versioning**: `VERSION.md` (`v3.0.36`) is read dynamically by `vite.config.ts` (`__APP_VERSION__`), `src/main/index.ts`, and `server/index.js` (`server/VERSION.md`).

## Major Architectural Upgrades Completed in `v3.0.36` (Hetzner Live-Only)
1. **Zero Local Servers — Hetzner Live-Only Cloud Policy**:
   - Eliminated all local server fallbacks (`localhost:6065`, `127.0.0.1:6066`, `localhost:3001`), local daemon Start/Stop UI pills/cards, Electron child `node` server spawning, and local dev-server npm scripts.
   - `src/shared/Config.ts` (`SERVER_URL`), `src/renderer/editor/GenerativeAIManager.ts`, `src/renderer/engine/rpg/DemoWorld.ts`, `src/renderer/puzzle/BobNet.ts`, `src/main/index.ts`, and `start.bat` point exclusively to **`https://bobsgame.com`** and **`https://ws.bobsgame.com`**.
   - Non-destructively archived `server/ai_proxy.js` → `scripts/archive/ai_proxy.legacy.js` and `scripts/local-ops.ps1` → `scripts/archive/local-ops.legacy.ps1`.
2. **Unified Hetzner Cloud Backend (`server/index.js` on `https://ws.bobsgame.com`)**:
   - Merged `/api/generate/sprite`, `/api/generate/tileset`, `/api/generate/dialogue`, and `/api/chat` (with dynamic optional `openai` SDK loading when `OPENAI_API_KEY` is configured and deterministic mock fallback otherwise) directly into `server/index.js`, alongside Socket.io multiplayer rooms/tournaments and REST profiles/leaderboards/maps.
   - Added dynamic `*.bobsgame.com` `Origin` CORS matching + `openaiConfigured` telemetry on `/healthz` and `/api/status`.
3. **Consolidated Single-Page Omni-Engine Dashboard & Unified Settings (`v3.0.35`–`v3.0.36`)**:
   - `MainMenuScene.ts` renders all 37 gameplay modes, RPG loadout views, Creation Studio editors, online rankings, tech demos, and live `Hetzner Cloud (ws.bobsgame.com)` telemetry on one scrollable multi-column dashboard with visible inline descriptions and `ⓘ` tooltips.
   - `SettingsScene.ts` (`OptionsScene.ts`) unifies all audio, graphics, input, identity, and WebGPU settings onto one two-column page.
4. **Disk-Safe & Data-Safe Live Hetzner Deployment (`scripts/deploy-with-rollback.sh`)**:
   - Backs up & uploads only `index.html` + `assets/` (`~19 MB`) on `/srv/www/bobsgame.com` (preserving multi-gigabyte `maps_v2/`, `audio/`, `lancedb/` and protecting `/dev/sda1` free space).
   - Excludes `profiles.json`, `leaderboards.json`, `achievement_profiles`, `characters`, `emulator_states`, and `maps` during `/opt/bobsgameweb/server` deployment so live player progress is never overwritten.

## Open Problems / Next Priorities
- **Door Pixel-Art Sprite Extraction**: `WorldScene.ts` resolves canonical door sprite names from `src/shared/doors.json` and renders palette-matched procedural doors until `DoorDown*`/`DoorUp*` frames are extracted into `data/sprites/sprite_atlas.{png,json}`.
- **Persistent Town Memory (`LanceDB`)**: Wire `/srv/www/bobsgame.com/lancedb/` into `server/index.js` (`/api/chat` & `/api/generate/dialogue`) on Hetzner.
