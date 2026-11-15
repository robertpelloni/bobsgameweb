# PROJECT MEMORY (`bobsgameweb` / `okgame` — v3.0.36)

## Overview

`bobsgameweb` (`okgame`) is a high-performance TypeScript, PixiJS v8 (WebGPU/WebGL2), WebAssembly, and Electron reimplementation and expansion of the **"bob's game"** omni-engine. It unifies the 244-map / 726-door open-world RPG, customizable falling-block puzzle engine, 30-player real-time multiplayer & ELO tournament server, in-engine Creation Studio, and Generative AI synthesis into a **Hetzner Live-Only Cloud architecture** (`https://bobsgame.com` frontend + `https://ws.bobsgame.com` unified backend).

---

## Core Architectural Decisions & Patterns

### 1. Hetzner Live-Only Cloud Architecture (`v3.0.36`)
- **Zero Local Servers**:
  - Per explicit architectural policy, all local server fallbacks (`localhost:6065`, `127.0.0.1:6066`, `localhost:3001`), local daemon Start/Stop UI pills, Electron child `node` server spawning, and local dev-server scripts have been removed or archived (`scripts/archive/ai_proxy.legacy.js`, `scripts/archive/local-ops.legacy.ps1`).
  - `src/shared/Config.ts` (`SERVER_URL`), `src/renderer/editor/GenerativeAIManager.ts` (`AI_BASE_URL`), `src/renderer/engine/rpg/DemoWorld.ts`, `src/renderer/puzzle/BobNet.ts`, and `src/main/index.ts` point unconditionally to **`https://ws.bobsgame.com`** and **`https://bobsgame.com`**.
- **Unified Hetzner Cloud Backend (`server/index.js` on `https://ws.bobsgame.com`)**:
  - Deployed to `/opt/bobsgameweb/server` (`systemd` unit `bobsgameweb-server` behind nginx `ws.bobsgame.com`).
  - Serves Socket.io multiplayer rooms/matchmaking/tournaments (`pako` binary packet compression), persistent player profiles/leaderboards/maps REST APIs, AND the Creation Studio Generative AI endpoints (`/api/generate/sprite`, `/api/generate/tileset`, `/api/generate/dialogue`, `/api/chat` via dynamic `openai` SDK loading when `OPENAI_API_KEY` is configured or deterministic mock fallback otherwise) from one unified production service.
  - Emits dynamic `*.bobsgame.com` `Origin` CORS headers and `204` `OPTIONS` preflights across all HTTP endpoints (`/healthz`, `/api/status`, `/stats`, `/api/*`).
- **Safe Non-Destructive Hetzner Deployment (`scripts/deploy-with-rollback.sh`)**:
  - Uploads only `dist/renderer/index.html` + `dist/renderer/assets/` (`~19 MB`) to `/srv/www/bobsgame.com` (preserving the hydrated multi-gigabyte `maps_v2/`, `audio/`, and `lancedb/` assets on `/dev/sda1`) with automatic `/tmp/` code backup & rollback.
  - Uploads `server/` excluding `node_modules`, `profiles.json`, `leaderboards.json`, `achievement_profiles`, `characters`, `emulator_states`, and `maps`, preserving all live player progress on Hetzner.

### 2. Consolidated Single-Page UI Architecture (`v3.0.35`–`v3.0.36`)
- **Single-Page Omni-Engine Dashboard (`src/renderer/scenes/MainMenuScene.ts`)**:
  - Displays all 37 gameplay modes, RPG loadout views, Creation Studio editors, online rankings, tech demos, and live Hetzner Cloud telemetry on **one singular, consolidated, smoothly scrollable multi-column dashboard**.
  - Features a **Pinned Telemetry & Control Header** with a live `Hetzner Cloud (ws.bobsgame.com)` `/healthz` status badge, inline `[MARATHON] [SPRINT] [ULTRA]` mode pills, and quick-jump section anchors (`1–5` / `Q·E`).
  - Every card renders its title, concise inline subtitle, category accent bar, and `ⓘ` tooltip indicator wired to `Tooltip.ts`.
- **Unified Settings & Options (`src/renderer/scenes/SettingsScene.ts` & `OptionsScene.ts`)**:
  - Merges Audio Mixer, Haptic Pulse, WebGPU/WebGL2 preference, HQ2X HD Sprites, Ghost Piece, Pixel-Perfect Scaling, Mobile Touch HUD override, Auto-Login, and Player Identity onto **one two-column settings page** (`OptionsScene` extends `SettingsScene`).
- **Scene Stack Integrity (`src/renderer/Game.ts` & `WorldScene.ts`)**:
  - Default `/` and `#world` boots push `MainMenuScene` at the base of `StateManager` underneath `WorldScene`, and `WorldScene` exposes a 1-click `☰ Omni-Dashboard (Esc)` HUD button so returning from the RPG world never empties the scene stack.

### 3. Electron Desktop Shell & System Tray (`src/main/`)
- **CommonJS Output Isolation (`tsconfig.main.json` + `dist/main/package.json`)**:
  - Compiles `src/main` with `"module": "CommonJS"` directly to `dist/main/index.js` & `dist/main/preload.js` with `{"type":"commonjs"}` in `dist/main/package.json`.
- **Live Cloud Desktop Client**:
  - Loads live `https://bobsgame.com/#menu` directly and polls `https://ws.bobsgame.com/healthz` from the native System Tray with zero local background servers spawned.

### 4. Single-Source Version Governance (`VERSION.md`)
- `VERSION.md` (`v3.0.36`) is the **single source of truth** across the entire stack:
  - `vite.config.ts` reads `VERSION.md` and injects `__APP_VERSION__` into `src/shared/Config.ts` (`APP_VERSION`).
  - `src/main/index.ts` and `server/index.js` (`server/VERSION.md`) dynamically read `VERSION.md` at startup.

### 5. Entity Component System (ECS), Collision & Doors
- **ECS Core (`src/renderer/engine/ecs/`)**: Decouples `Components` from `Systems` (`RenderSystem`, `BehaviorSystem`, `PathfindingSystem`, `WeatherSystem`).
- **Hybrid 1X (`8px`) Hit Detection**: `HitDetectionSystem.ts` mirrors the v8830 Java pixel-level collision checks alongside legacy `MAP_HIT_LAYER` (`!== 0` blocked, `WALL_IDS` checked prior to `FLOOR_IDS`) and `MAP_CAMERA_BOUNDS_LAYER` (`extra`).
- **ECS Door Rendering (`WorldScene.ts` + `src/shared/doors.json`)**: Door entities resolve canonical sprite names from `doors.json`, attach `SpriteComponent` via `SpriteAtlas` or palette-matched procedural door graphics anchored at `(0, 1)`, and bind debug trigger overlays to `F2` (`debugShowHitLayer`).

### 6. Build Optimization & Submodule Ecosystem
- **Smart `copyPublicDir` (`vite.config.ts`)**: Skips re-copying the ~2.5 GB `data/` folder during `vite build` when `VITE_COPY_PUBLIC_DIR=false` or `dist/renderer/maps_v2` is already hydrated (`emptyOutDir: false`), completing production builds in ~1.15s.
- **Recursive Submodules**: `submodules/bobui` tracks `robertpelloni/bqt` (`v1.2.60`, `92bb40654b`), with nested `submodules/juce` (`JUCE 9.0.5`, `d60b7a7803`) and `submodules/ultimatepp` (`1a56dd3a4a`).
