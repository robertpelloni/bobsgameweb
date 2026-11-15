# PROJECT MEMORY (`bobsgameweb` / `okgame` — v3.0.35)

## Overview

`bobsgameweb` (`okgame`) is a high-performance TypeScript, PixiJS v8 (WebGPU/WebGL2), WebAssembly, and Electron reimplementation and expansion of the **"bob's game"** omni-engine. It unifies the 244-map / 726-door open-world RPG, customizable falling-block puzzle engine, 30-player real-time multiplayer & ELO tournament server, in-engine Creation Studio, and Generative AI proxy into one cross-platform architecture.

---

## Core Architectural Decisions & Patterns

### 1. Consolidated Single-Page UI Architecture (`v3.0.35`)
- **Single-Page Omni-Engine Dashboard (`src/renderer/scenes/MainMenuScene.ts`)**:
  - Replaced the earlier 4-tab exclusive layout (which hid 75% of features behind tab switches and discarded `MenuItem.description`) with **one singular, consolidated, smoothly scrollable multi-column dashboard** displaying all 38 gameplay modes, RPG loadout views, editors, online rankings, and tech demos simultaneously.
  - Features a **Pinned Telemetry & Control Header** with live HTTP/IPC health pills and Start/Stop controls for **both** `Game WS Server (:6065)` and `AI Proxy (:6066)`, inline `[MARATHON] [SPRINT] [ULTRA]` mode pills, and quick-jump section anchors (`1–5` / `Q·E`) that smoothly scroll the unified page.
  - Every card renders its title, concise inline subtitle, category accent bar, and `ⓘ` tooltip indicator wired to `Tooltip.ts`.
- **Unified Settings & Options (`src/renderer/scenes/SettingsScene.ts` & `OptionsScene.ts`)**:
  - Eliminated subpage hopping and duplicate volume sliders by merging Audio Mixer, Haptic Pulse, WebGPU/WebGL2 preference, HQ2X HD Sprites, Ghost Piece, Pixel-Perfect Scaling, Mobile Touch HUD override, Auto-Login, and Player Identity onto **one two-column settings page** (`OptionsScene` extends `SettingsScene` as a compatibility alias).
- **Scene Stack Integrity (`src/renderer/Game.ts` & `WorldScene.ts`)**:
  - Default `/` and `#world` boots push `MainMenuScene` at the base of `StateManager` underneath `WorldScene`, and `WorldScene` exposes a 1-click `☰ Omni-Dashboard (Esc)` HUD button + safe `openConsolidatedDashboard()` handler so returning from the RPG world never empties the scene stack.
  - `Game.createMainMenuScene()` constructs `MainMenuScene` without prematurely calling `.create()` (since `Scene.onEnter()` invokes `await this.create()` on `StateManager.push`), preventing duplicate child containers.

### 2. Electron Desktop Shell & Dual-Server System Tray (`src/main/`)
- **CommonJS Output Isolation (`tsconfig.main.json` + `dist/main/package.json`)**:
  - Root `package.json` uses `"type": "module"` for Vite, whereas Electron's sandboxed `preload.js` and `__dirname` require CommonJS. `tsconfig.main.json` compiles `rootDir: "src/main"` with `"module": "CommonJS"` directly to `dist/main/index.js` & `dist/main/preload.js`, and `npm run build:main` writes `{"type":"commonjs"}` to `dist/main/package.json`.
- **External Daemon Awareness & `BelowNormal` Priority**:
  - `src/main/index.ts` probes `http://127.0.0.1:6065/healthz` (`bobsgameweb-socket-server`) and `http://127.0.0.1:6066/healthz` (`ai-proxy`) via `probeServiceHealth` before spawning child `node` servers so daemons started externally via `start.bat` or `scripts/local-ops.ps1` are detected cleanly without `EADDRINUSE` collisions or false positives from unrelated host processes.
  - All Electron-managed server processes and `build.bat` / `start.bat` / `scripts/local-ops.ps1` workers lower their Windows scheduling priority to **`BelowNormal`**.

### 3. Single-Source Version Governance (`VERSION.md`)
- `VERSION.md` is the **single source of truth** across the entire stack:
  - `vite.config.ts` reads `VERSION.md` and injects `__APP_VERSION__` into `src/shared/Config.ts` (`APP_VERSION`).
  - `src/main/index.ts`, `server/index.js`, and `server/ai_proxy.js` dynamically read `VERSION.md` at startup.

### 4. Entity Component System (ECS), Collision & Doors
- **ECS Core (`src/renderer/engine/ecs/`)**: Decouples `Components` (`Transform`, `Sprite`, `Combat`, `Interaction`, `Teleport`, `Inventory`, `SkillTree`, `Light`, `Particle`) from `Systems` (`RenderSystem`, `BehaviorSystem`, `PathfindingSystem`, `WeatherSystem`).
- **Hybrid 1X (`8px`) Hit Detection**: `HitDetectionSystem.ts` mirrors the v8830 Java pixel-level collision checks alongside legacy `MAP_HIT_LAYER` (`!== 0` blocked, `WALL_IDS` checked prior to `FLOOR_IDS`) and `MAP_CAMERA_BOUNDS_LAYER` (`extra`).
- **ECS Door Rendering (`WorldScene.ts` + `data/doors.json`)**: Door entities resolve canonical sprite names (`DoorDownBrownGoldKnob`, `DoorDownGraySilverKnob`, etc.) from `data/doors.json`, attach `SpriteComponent` via `SpriteAtlas` or palette-matched procedural door graphics anchored at `(0, 1)`, and bind debug trigger overlays to `F2` (`debugShowHitLayer`).

### 5. Multiplayer Backend (`server/index.js`) & AI Proxy (`server/ai_proxy.js`)
- **Universal REST CORS**: `server/index.js` (`:6065`) attaches `Access-Control-Allow-*` headers and `204` `OPTIONS` preflight responses to all HTTP endpoints (`/healthz`, `/api/status`, `/stats`, `/maps/*`, `/players/*`, `/leaderboards`) in addition to Socket.io rooms and `pako` binary packet compression.
- **Generative AI Proxy (`:6066`)**: Bound to `0.0.0.0:6066` (avoiding host port `8080` conflicts); serves `/api/generate/sprite`, `/api/generate/tileset`, `/api/generate/dialogue`, `/api/chat`, `/healthz`, and `/api/status` using OpenAI when `OPENAI_API_KEY` is configured or deterministic offline mock payloads otherwise.

### 6. Build Optimization & Submodule Ecosystem
- **Smart `copyPublicDir` (`vite.config.ts`)**: Skips re-copying the ~2.5 GB `data/` folder (`lancedb/`, `maps/`) during `vite build` when `dist/renderer/maps_v2` is already hydrated on disk (`emptyOutDir: false`), reducing incremental frontend builds from multi-minute stalls to seconds.
- **Recursive Submodules**: `submodules/bobui` tracks `robertpelloni/bqt` (`v1.2.60`, `92bb40654b`), with nested `submodules/juce` (`JUCE 9.0.5`, `d60b7a7803`) and `submodules/ultimatepp` (`1a56dd3a4a`).
