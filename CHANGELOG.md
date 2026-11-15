# CHANGELOG

## v3.0.36 — 2026-11-14 — Hetzner Live-Only Architecture (Zero Local Servers) & Unified Live Cloud Deployment

### Changed
- **Hetzner Live-Only Configuration (`src/shared/Config.ts`, `GenerativeAIManager.ts`, `DemoWorld.ts`, `BobNet.ts`):** Removed all `localhost` / `127.0.0.1` server fallbacks so `SERVER_URL` and `GenerativeAIManager` always connect directly to live Hetzner Cloud (`https://ws.bobsgame.com`) and `https://bobsgame.com`.
- **Unified Hetzner Backend with Integrated AI Routes (`server/index.js`, `server/VERSION.md`):** Merged Generative AI endpoints (`/api/generate/sprite`, `/api/generate/tileset`, `/api/generate/dialogue`, `/api/chat`) and `openaiConfigured` health reporting directly into `server/index.js` on `https://ws.bobsgame.com`, added dynamic `*.bobsgame.com` `Origin` CORS matching, and archived standalone local `ai_proxy.js` and `local-ops.ps1` into `scripts/archive/`.
- **Dashboard, Manual & Electron Client Cloud Alignment (`MainMenuScene.ts`, `HelpScene.ts`, `src/main/index.ts`, `src/main/preload.ts`, `start.bat`, `package.json`):** Replaced local server Start/Stop daemon controls on the Consolidated Single-Page Dashboard and Electron System Tray with live Hetzner Cloud (`https://ws.bobsgame.com/healthz`) telemetry, and pointed Electron and `start.bat` directly at live `https://bobsgame.com`.
- **Safe, Fast Hetzner Live Deployment Scripts (`scripts/deploy-with-rollback.sh`, `deploy-frontend-hetzner.sh`, `deploy-backend-vps.sh`, `check-backend-host.sh`):** Updated frontend deploy to upload only code bundles (`index.html` + `assets/`) without re-uploading 2.5 GB of hydrated map/audio assets, updated backend deploy to strictly preserve live `profiles.json`, `leaderboards.json`, `achievement_profiles/`, `characters/`, `emulator_states/`, and `maps/`, and deployed `v3.0.36` live to `bobsgame.com` and `ws.bobsgame.com`.

## v3.0.35 — 2026-11-14 — Consolidated Single-Page Dashboard, Unified Settings, Electron Tray Overhaul & Full Governance

### Added
- **Consolidated Single-Page Omni-Engine Dashboard (`src/renderer/scenes/MainMenuScene.ts`):** Redesigned the main menu from a 4-tab exclusive switcher into **one singular, consolidated, smoothly scrollable multi-column dashboard** surfacing all 38 gameplay modes, RPG scenes, Creation Studio editors, multiplayer/competitive rankings, and engine tech demos simultaneously. Added visible inline card descriptions, category accent stripes, `ⓘ` hover/focus `Tooltip` badges, mouse-wheel + draggable scrollbar navigation, `1–5` / `Q·E` section quick-jump anchors, inline `[MARATHON] [SPRINT] [ULTRA]` mode pills, and live header telemetry/control pills for **both** `Game WS Server (:6065)` and `AI Proxy (:6066)`.
- **World HUD Quick-Dashboard Pill (`src/renderer/scenes/WorldScene.ts`):** Added a 1-click `☰ Omni-Dashboard (Esc)` pill button below the status HUD in `WorldScene` and a safe `openConsolidatedDashboard()` transition helper.
- **Expanded Navigation Keys (`src/renderer/input/InputManager.ts`):** Added `PageUp`, `PageDown`, `Home`, and `End` to `enum Key` for smooth scrollable canvas navigation across `MainMenuScene` and `HelpScene`.

### Changed
- **Unified Single-Page Settings & Options (`src/renderer/scenes/SettingsScene.ts`, `OptionsScene.ts`):** Consolidated all controls from `OptionsScene` (WebGPU/WebGL2 renderer preference, HQ2X HD Sprites, Mobile Touch HUD override, Haptic Pulse) plus Ghost Piece, Pixel-Perfect scaling, Auto-Login, Audio Mixer, and Player Identity onto **one responsive two-column page** with `Tooltip` descriptions on every control; converted `OptionsScene` into a clean compatibility subclass of `SettingsScene`.
- **Electron Main/Preload & System Tray Overhaul (`tsconfig.main.json`, `src/main/index.ts`, `src/main/preload.ts`):** Fixed `tsconfig.main.json` (`rootDir: "src/main"`, `"module": "CommonJS"`) and `build:main` (`dist/main/package.json` `{"type":"commonjs"}`) so `dist/main/index.js` and `dist/main/preload.js` execute cleanly under Electron 45; guarded optional `electron-squirrel-startup`; added HTTP `/healthz` JSON service-identity verification (`probeServiceHealth` for `bobsgameweb-socket-server` on `:6065` and `ai-proxy` on `:6066`) so external daemons are recognized without `EADDRINUSE` collisions or false-positive port matches; added `#menu` / `#world` tray navigation and `restartWsServer`/`restartAiServer` IPC bridges; lowered spawned daemon priorities to `BelowNormal`.
- **AI Proxy Dedicated Port Migration (`server/ai_proxy.js`, `src/renderer/editor/GenerativeAIManager.ts`, `start.bat`, `scripts/local-ops.ps1`):** Moved default `AI_PROXY_PORT` from `8080` to **`6066`** (`0.0.0.0:6066`, paired adjacent to `6065`) to eliminate IPv4 port `8080` collisions with common host Go/Java/Docker services, and added automatic `server/node_modules` dependency verification to `start.bat` and `scripts/local-ops.ps1`.
- **In-Game Manual Sync (`src/renderer/scenes/HelpScene.ts`):** Added smooth mouse-wheel scrolling, viewport masking, movable scrollbar thumb, and updated reference sections covering the Consolidated Dashboard, Unified Settings, World HUD, and System Tray daemons.
- **Universal Documentation & Master Agent Governance:** Updated `AGENTS.md` as the master instruction file referenced by `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `copilot-instructions.md`, and comprehensively updated `VISION.md`, `MEMORY.md`, `DEPLOY.md`, `IDEAS.md`, `ROADMAP.md`, `TODO.md`, `STRUCTURAL_MAP.md`, `.memory/main.md`, and `HANDOFF.md`.

### Fixed
- **Empty Scene-Stack Black Screen on World Exit (`src/renderer/Game.ts`):** Pushed `MainMenuScene` onto `StateManager` beneath `WorldScene` on both `#world` and default `/` startup paths so exiting `WorldScene` transitions cleanly to the Consolidated Dashboard instead of popping to an empty stack, and removed redundant eager `mainMenuScene.create()` prior to `StateManager.push()` (which previously caused `Scene.onEnter()` to construct duplicate child layers).
- **Vite Dev-Mode `publicDir` Import Crash, Watcher Stall & Electron `file://` Asset Paths (`vite.config.ts`, `src/shared/doors.json`, `WorldScene.ts`, `LegacyMapLoader.ts`, `DemoWorld.ts`):** Mirrored `doors.json` into `src/shared/doors.json` so Vite dev mode no longer rejects `import doorsConfig from ".../data/doors.json"` under `publicDir: "data"`; added `base: "./"`, `optimizeDeps.entries: ["index.html"]`, and `server.watch.ignored` (`data/`, `submodules/`, `dist/`, `cpp_port/`, `logs/`); and converted `DemoWorld.ts` dynamic scene loading to analyzable template imports (`../../scenes/${sceneName}.ts`).
- **Windows Batch Encoding & Missing `server/node_modules` (`build.bat`, `start.bat`, `setup.bat`, `.gitattributes`):** Normalized all `.bat` files to pure ASCII + CRLF via `.gitattributes` and added automatic `server/node_modules/socket.io` installation checks to `start.bat` and `scripts/local-ops.ps1`.

## v3.0.34 — 2026-11-14 — Repository Synchronization, Single-Source Versioning, REST CORS Fix, BelowNormal Ops & Submodule Governance

### Added
- **Consolidated Local Operations Orchestrator (`scripts/local-ops.ps1`):** Added a unified PowerShell orchestrator (`status`, `start`, `stop`, `restart`, `logs`, `build`) for `ws` (`6065`), `ai` (`8080`), `web` (`3000`), and `electron` that lowers Windows scheduling priority to `BelowNormal` and records owned PIDs in `logs/pids.json` so `stop` never terminates unrelated host processes.
- **Root Windows Execution Suite (`build.bat`, `start.bat`, `setup.bat`):** Added root batch scripts supporting full-stack local dev startup (`start.bat`), Electron desktop mode (`--electron`), production preview (`--preview`), backend/AI-proxy standalone launch (`--server`, `--ai-proxy`), `bobui` delegation (`--bobui`), recursive submodule setup (`setup.bat`), and non-destructive full builds (`build.bat`), all lowered to `BelowNormal` CPU scheduling priority. Updated `tools_build.sh` for `submodules/bobui` Go builds and `cpp_port/` Emscripten builds.
- **Universal REST HTTP CORS & `/api/status` Endpoint (`server/index.js`):** Added `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `204` `OPTIONS` preflight handling, and `/api/status` health metadata directly to `httpServer` so browser clients can query `/healthz`, `/api/status`, `/stats`, `/maps/*`, `/players/*`, and `/leaderboards` without CORS failures.
- **Structural Map (`STRUCTURAL_MAP.md`):** Generated a complete recursive repository & submodule structural map documenting exact remote URLs, tracking branches, commit SHAs, and directory layout across `bobsgameweb`, `submodules/bobui` (`bqt`), `submodules/bobui/submodules/juce` (JUCE `9.0.5`), and `submodules/bobui/submodules/ultimatepp`.

### Changed
- **Recursive Submodule Synchronization (`submodules/bobui` -> `v1.2.60`):** Fast-forwarded `submodules/bobui` (`https://github.com/robertpelloni/bqt.git`) to `92bb40654b` (`v1.2.60`), retaining nested `submodules/juce` at `origin/master` (`d60b7a78030661574a615b586d9325ba7a7fa7dd`) and `submodules/ultimatepp` at `origin/master` (`1a56dd3a4a02112563eb9e16f62f17bba8a0edd1`).
- **Single-Source Version Governance (`VERSION.md`):** Wired `vite.config.ts` (`define: { __APP_VERSION__ }`), `src/shared/Config.ts`, `server/index.js`, and `server/ai_proxy.js` to dynamically read `VERSION.md` as the single source of truth rather than duplicating hardcoded version literals across client and backend entrypoints.
- **Vite Public Directory Build Optimization (`vite.config.ts`):** Added smart `copyPublicDir` detection that skips re-copying the ~2.5 GB `data/` directory (`lancedb/`, `maps/`) when `dist/renderer/maps_v2` is already hydrated on disk (overridable via `VITE_COPY_PUBLIC_DIR=true|false`), eliminating multi-minute build stalls while preserving `emptyOutDir: false`.
- **Tracking & Non-Destructive Script Archival:** Removed `*.db` and `.memory/branches/*/log.md` exclusions from `.gitignore` so all agent memory, `.pi-lens/` sessions, databases, and non-sensitive documentation remain tracked in git; ignored ephemeral `logs/*.log` and `logs/pids.json`; archived obsolete one-off scripts (`resolve_conflicts.sh`, `generate-dummy-assets.cjs`, `fix_hallway_doors.py`, `fix_room_arrivals.py`, `print-hetzner-first-deploy.sh`, `rebuild-for-backend.sh`) into `scripts/archive/`.

## v3.0.25–v3.0.33 (Reconciled Map, Door & Collision Milestones)

### Added & Fixed
- **Map Layer Pre-Rendering & Coordinate Unification:** Pre-rendered static tile layers to composite textures for frame-rate stability, unified 1X (`8px`) hit-detection coordinate scales across `WorldScene` and `HitDetectionSystem`, and integrated `data/doors.json` arrival/reverse-door overrides in `LegacyMapLoader.ts`.
- **Hit Layer & Bounds Layer Alignment:** Mapped `hitBounds` to `MapData.MAP_HIT_LAYER` (`!== 0` blocked) and `extra` to `MapData.MAP_CAMERA_BOUNDS_LAYER` (`1` interior walkable override), with `F2` visual debug overlays for both layers.

## v3.0.13 - System Tray, AI Proxy Integration & Consolidated Dashboard UI

### Added
- **Electron System Tray (`src/main/index.ts`):** Added native system tray with icon, window visibility toggling, minimize-to-tray handling, dynamic server process lifecycle controls (start/stop/restart AI proxy on port 8080), and graceful exit teardown.
- **Consolidated Dashboard UI (`MainMenuScene.ts`):** Redesigned the main menu into high-value organized category tabs (Play Games, Creation & Editors, Community & Progress, System & Engine) with contextual Tooltips, keyboard quick-switching (Q/E), and clean navigation.
- **AI Proxy Server Status & Client Controls (`GenerativeAIManager.ts` & `MainMenuScene.ts`):** Added `/healthz` and `/api/status` endpoints to `server/ai_proxy.js`, wired `checkServerStatus()` in `GenerativeAIManager`, and added an interactive dashboard button under *System & Engine* allowing users to inspect and toggle the AI server via Electron IPC.
- **Script Archival:** Non-destructively moved legacy deployment scripts to `scripts/archive/`.

### Fixed
- **TypeScript Compilation:** Stripped merge conflict markers in `WorldScene.ts` and resolved definite assignment checks in `TouchControls.ts` and `LegacyMapLoader.ts`.
- **Electron Icon Resolution:** Dynamically resolves application icon across dev and packaged layouts.

## v3.0.12 - Phase 4 Engine Stabilization & Tooling (Hetzner Merge)

### Added
- **WebGPU Validation Section:** Documented the successful local integration of WebGPU WGSL compute shaders (`WebGPUParticleSystem`) in `WeatherRenderer.ts` within `MEMORY.md`.
- **Insecure Curl Flags:** Added `-k` (insecure) flags to automated production verification bash scripts (`scripts/verify-production-stack.sh`, etc.) to bypass strict validation blocks caused by an expired SSL certificate on `bobsgame.com`.

### Notes
- Automated deployment to Hetzner is structurally blocked by sandbox port 22 firewalls.
- Verified that local `main` engine code is out of sync with the live production deployment.


## v3.0.12 (2026-06-30)
### Added
- CustomGameEditor tooltips
- BOM removal from bash scripts for reliable execution
- WasmPhysicsBridge integration into Physics loop checkBatchCollisions

### Fixed
- Collision fixes deployed and validated on production
- Duplicate function definitions in MainMenuScene resolved
- WeatherSystem instantiation fixed in WorldScene


## v3.0.11 (2026-06-28)
### Added
- "Blah" dialogue system
- 8-directional movement support and animations for Yuu
- HQ2X sprite scaling toggle
- WebGPU PoC with compute-shader particles
- FFT visualizer integration to AudioManager and WebGPU

### Fixed
- Collision parity: Wall checks strictly override floor markers
- CustomGameEditor PIXIText parameter bugs
## v3.0.9 — 2026-05-28

### Added
- **SFX Library Integration**: Mapped legacy SFX IDs (0-87) to available audio assets in `AudioManager`.
- **8-Directional Yuu Animations**: Implemented 64-frame animation support for Yuu in `DemoWorld`.
- **Collision Parity**: Integrated `hitBoxFromTop` logic for accurate entity depth-sorting and collisions.

## v3.0.8 — 2026-05-25

### Changed
- **Map System Refactor:** Centralized `MapData` in `src/shared/MapData.ts` for consistent use between client and server.
- **Enhanced Map Rendering:** Improved `GameMap` rendering with optimized `zIndex` layering and `blendMode` support for shadows (`multiply`) and lights (`add`).
- **Robust Collision Detection:** Updated `WorldScene` collision logic with new `WALL_IDS` and `FLOOR_IDS` registries in `MapData` for more accurate tile-based movement.
- **Improved Map Loading:** Refined `LegacyMapLoader` with prioritized spawn point detection near doors and improved door snapping to wall openings.
- Synchronized version 3.0.8 across `package.json`, `server/package.json`, `src/shared/Config.ts`, and `VERSION.md`.

## v3.0.7 — 2026-05-22

### Changed
- Synchronized version 3.0.7 across metadata files.
- Merged feature branches for dialogue audio ('blah' system) and 8-way movement.

## v3.0.6 — 2026-05-01

### Added
- **NPC Sprite Registry Recovery:** Extracted and categorized 800+ sprite IDs including Adults, Kids, Animals, Vehicles, and Interactive Objects.
- **World Graph Completion:** Documented 144 unique maps across 7 regional clusters (Town, School, City, Hospital, Police, City Hall, Stadium).
- **Dialogue & Scripting Recovery:** Extracted initial dialogue set (IDs 0–21+) and recovered legacy scripting tags (`<SETSPRITEBOX>`, `<NOCANCEL>`, etc.).
- **SFX & Music Registry:** Indexed 87+ sound effects (OGG) and 81+ music tracks (MOD/S3M/XM/OGG).
- **Legacy Import Pipeline:** Implemented `importLegacyMap` in `MapDataRegistry.ts` to convert Java-extracted JSON assets into the TypeScript engine format.

### Changed
- Refactored `MapDataRegistry` to support data-driven map loading from `data/maps/manifest.json`.
- Updated `MapEntity` interface to support legacy `warp` and `door` coordinate mapping.
- Bumped project version to `3.0.6`.
- Implemented the "Blah System" in `DemoWorld.ts` by using the `AudioManager` to play random pitched sounds while dialogue text is typed.

### Verified
- Automated unit tests for Legacy Import Pipeline: 15/15 passed.
- Legacy Sprite and Map data integrity via MD5 hash verification.

### Added

- Expanded the legacy Yuu-house conversion set to 12 maps, including Downstairs Bathroom, Yuu's Room, Baby Room, Brothers Room, Upstairs Bathroom, and Backyard Tool Shed
- Added current implementation notes in `docs/ai/implementation/LEGACY_MAP_LOADING_V3_0_4.md`

### Changed

- `scripts/convert_maps.js` now resolves more legacy door/warp destinations and outputs a larger connected interior cluster
- The runtime-loaded Yuu-house graph now includes the additional upstairs rooms plus the downstairs bathroom
- Synced release/version metadata to `3.0.4`

### Verified

- `node scripts/convert_maps.js`
- `npx vite build`
- frontend deploy to Hetzner `/srv/www/bobsgame.com`
- backend sync/restart and full `scripts/verify-production-stack.sh`

### Known Validation Gap

- `npm run typecheck` still reports pre-existing repository-wide TypeScript errors unrelated to this legacy-map expansion work

## v3.0.3 — 2026-05-02

### Added

- Completed legacy Yuu-house conversion pipeline in `scripts/convert_maps.js` using `_Project.txt` plus archive hit-layer data from `bobsgame_v8830.zip`
- Added `data/maps/legacy-house-manifest.json` for static loading of converted interior maps
- Added the first-pass legacy map loading implementation notes (now superseded by `docs/ai/implementation/LEGACY_MAP_LOADING_V3_0_4.md`)

### Changed

- Converted maps `5–10` now use the real legacy dimensions and connectivity metadata instead of placeholder grass-only layouts
- `ClientGameEngine` now loads converted legacy house maps from static assets and starts in the converted `TOWNYUU Downstairs` map
- `DemoWorld` now supports loaded-map doors, warp transitions, dynamic map dimensions, and static-map traversal between the converted Yuu house interiors
- Synced release/version metadata to `3.0.3`

### Verified

- `node scripts/convert_maps.js`
- `npx vite build`

### Known Validation Gap

- `npm run typecheck` still reports pre-existing repository-wide TypeScript errors unrelated to the legacy-map loading work

## v3.0.2 — 2026-05-02

### Changed

- Synced the live version string across `VERSION.md`, root `package.json`, root `package-lock.json`, `src/shared/Config.ts`, `src/renderer/scenes/MainMenuScene.ts`, server/index.js, server/package.json, and server/package-lock.json
- Main menu version text now uses `APP_VERSION` instead of a stale hard-coded string
- Updated replay export, achievement snapshot export, backend achievement snapshot defaults, and IndexedDB cache version metadata to `3.0.2`
- Corrected the tracked Hetzner frontend deploy path from `/var/www/bobsgame.com/current` to the nginx-served path `/srv/www/bobsgame.com`
- Corrected tracked nginx frontend configs to use `/srv/www/bobsgame.com`
- Fixed backend write permissions by restoring `bobsgame:bobsgame` ownership on `/opt/bobsgameweb/server`

### Documentation

- Added current production stabilization notes under `docs/ai/implementation/PRODUCTION_STABILIZATION_V3_0_2.md`
- Refreshed `HANDOFF.md` to reflect the Hetzner production stack, the restored legacy maps, and the current follow-up tasks

### Verified

- `npx vite build`
- `BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com ./scripts/audit-backend-drift.sh`
- `BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh`

### Known Validation Gap

- `npm run typecheck` still reports pre-existing repository-wide TypeScript errors unrelated to the version-sync work in this release

## v2.2.7 — 2026-04-29

### Added

- HelpScene: In-game controls reference and tips (keyboard + gamepad)
- SplashScene: Animated boot screen with logo, progress bar, and key prompt
- DefaultEvents: 5 starter RPG events (tutorial, NPC talk, area enter, bridge, explorer achievement)
- DemoWorld gamepad support: Left stick, D-pad, A/B buttons mapped to movement/interact/cancel
- DemoWorld.loadFromMapData(): Bridge MapLoader tile IDs → DemoWorld Tile colors
- DemoWorld.getMapWidth/Height(): Dynamic map dimensions after loadFromMapData
- ClientGameEngine now loads town map into DemoWorld on init
- APP_VERSION in Config.ts updated (was stale at 2.1.57)

### Fixed

- ClientGameEngine: Removed unused private fields (_mapContainer, _guiContainer, _overlayContainer, _introMode, etc.)
- ClientGameEngine: Fixed EventManager import type → value import
- ClientGameEngine: Cleaned up game save setter methods

### Build Stats

- 298 TypeScript files, 894 modules, 26 scenes, 195 engine modules
- Zero errors, zero warnings

## v2.2.6 — 2026-04-29

### Added

- TournamentScene: Visual bracket tournament (4/8/16/32 players, ELO-weighted simulation)
- DefaultEvents: Starter RPG event set (tutorial, NPC dialogues, area triggers, achievements)
- EventManager now registers default events on init (5 events, 3 skills, 3 dialogues, 3 strings)
- DemoWorld.loadFromMapData(): Bridge MapLoader integer tile IDs → DemoWorld Tile colors
- Server: Enhanced tournament bracket generation for N players with createTournament/listTournaments
- MapManager → DemoWorld wiring: Town map loaded into rendered tiles

### Fixed

- ClientGameEngine: Removed unused private fields (_mapContainer, _guiContainer, etc.)
- ClientGameEngine: Fixed EventManager import type → value import
- ClientGameEngine: Cleaned up game save setter methods

### Build Stats

- 295 TypeScript files, 893 modules, 25 scenes, 195 engine modules
- Build time: ~7s (cached), ~30s (cold)
- Zero errors, zero warnings

## v2.2.5 — 2026-04-29

### Added

- AudioManager wiring: ClientGameEngine syncs GlobalSettings volumes to Howler AudioManager
- MapLoader: Complete map data pipeline (server API, static JSON, procedural generation)
- Map Server API: GET/PUT /maps/:id, GET /maps manifest endpoints
- SettingsScene: Live audio volume sliders, mute toggle, test sound button
- Placeholder audio: 11 SFX WAV + 2 music WAV (procedurally generated)
- ClientGameEngine MapManager + MapLoader integration

### Changed

- Game.ts music paths updated .mp3 → .wav
- Version bumped to 2.2.5

### Verified

- `npx vite build` succeeds (291 TS files, 885 modules)

---

# bob's game web — v2.1.58 Changelog

## Critical Bug Fixes

### 🐛 Fix: PixiJS Color Crash on Title Screen

- **Issue**: `Uncaught Error: Unable to convert color 16777215,65535` crashed the game immediately on load
- **Root Cause**: `FillGradient` object was being serialized as a string by PixiJS v8's text style normalizer
- **Fix**: Replaced `FillGradient` with compatible color array `[0xffffff, 0x00ffff]` for text gradient
- **File**: `src/renderer/scenes/MainMenuScene.ts`

### 🐛 Fix: Audio CORS Blocking (All Sound Effects + Music)

- **Issue**: All audio files blocked by CORS policy when loading from `bobsgame.s3.amazonaws.com`
- **Root Cause**: AudioManager was rewriting relative audio paths to direct S3 URLs in production
- **Fix**: Audio files are now served as static assets from the same domain (no CORS needed)
- **Additional**: Generated proper WAV tone files for all 19 SFX + 2 music tracks (previously 44-byte silent stubs)
- **Files**: `src/renderer/audio/AudioManager.ts`, `scripts/generate-audio.cjs`

## New Engine Modules (Ported from C++ okgame Engine)

### 🎬 Cinematics System (`engine/cinematics/`)

Ported from `okgame/src/Engine/cinematics/`

- **CinematicsManager**: Central manager for screen effects, fades, letterbox, shake
- **ScreenOverlay**: Full-screen color overlay with one-way, round-trip, and instant fade transitions
- **Letterbox**: Cinematic letterbox bars with configurable slide duration and size
- Screen shake (constant and timed) with sinusoidal easing
- Post-processing flags (8-bit, inverted, B&W modes)
- Game speed control (slow-motion)
- Fade effects: `fadeToBlack()`, `fadeFromWhite()`, custom color fades, under-lights overlays

### 🎮 RPG Event System (`engine/rpg/event/`)

Ported from `okgame/src/Engine/rpg/event/`

- **EventManager**: Central registry for flags, skills, dialogues, strings, and events
- **BobEvent**: Game events with typed triggers (auto, talk, touch, collision, timer, area enter/exit, etc.)
- **EventCommand**: Parsed command tree with child commands and qualifiers
- **EventParameter**: Typed parameters (string, number, flag/skill/dialogue IDs, direction, color, coordinate)
- **Flag**: Boolean game state tracking with save/load
- **Skill**: Numeric skill/stat values
- **Dialogue**: Conversation completion tracking
- **GameString**: Localized string lookup by ID

### 💰 RPG Core (`engine/rpg/`)

Ported from `okgame/src/Engine/rpg/`

- **Item**: Inventory items with ID, name, description, sprite, acquired state
- **Wallet**: Currency tracking with add/subtract/has operations
- **GameClock**: In-game time (day/hour/minute/second) with pause, fast-forward, set
- **Easing**: Complete easing library (quad, cubic, quart, back, elastic, bounce)
- **FriendCharacter**: MMO friend entity
- **FriendManager**: Online friend tracking for MMO world

### 🗺️ Pathfinding (`engine/entity/`)

Ported from `okgame/src/Engine/entity/PathFinder`

- **PathFinder**: A\* pathfinding on tile grids
- **TilePath**: Path result with iteration support
- Supports diagonal movement, tile cost weighting, octile heuristic

### 💬 Text Engine (`engine/text/`)

Ported from `okgame/src/Engine/text/` + Java BitmapFont

- **TypedTextWriter**: Character-by-character text reveal with configurable speed
- **DialogueBox**: Styled text box for NPC conversations with typewriter effect
- **FloatingTextManager**: In-world floating damage numbers / notifications

### Engine Demo Scene Enhancements

- Integrated all new systems into the EngineDemoScene
- Added interactive demo controls:
  - `[2]` Fade to black and back (cinematics)
  - `[3]` Letterbox on/off (cinematics)
  - `[4]` Test dialogue with RPG state info
  - `[5]` Drop money (floating text + wallet)
  - `[6]` A\* pathfinding visualization

## Deployment Improvements

- Cleaned stale build artifacts from Hetzner (217 → 20 files)
- Audio files now served as proper static assets (no CORS proxy needed)
- Frontend and backend versions synced at v2.1.58

---

## v2.1.78–v2.1.87: The RPG World Update (30 deploys)

### 🌍 Interactive RPG Town (DemoWorld)

- 30×22 tile map with 12 tile types (grass, path, water, tree, building, roof, flower, door, fence, bridge, chest, sand)
- Player character with 8-directional movement, collision detection, and footstep particles
- 6 named NPCs with wandering AI and unique multi-line dialogue (typewriter effect)
- 3 enterable buildings (Cafe, Shop, Stadium) with interiors, items on display, and exit functionality
- Animated flowing river with Bézier wave lines and sparkle effects
- 5 hidden treasure chests that auto-open on contact
- Fishing system with 6 fish types, animated bobber, and inventory integration
- Random combat encounters with 5 enemy types, auto-battle, HP bars, and gold/XP rewards
- Weather system (rain/snow/storm) with particles and lightning flashes
- Day/night cycle with torch light glow
- Grass sway and flower animations
- Player inventory, HP, leveling (XP + stat growth), and 8 achievements
- Save/Load system (F5/F9) with auto-save every 30 seconds
- Minimap with player/NPC/chest dots
- Floating notifications and edge-of-map area transition previews

### 🐛 Critical Fix: PixiJS Color Crash (v2.1.85)

- Fixed `Unable to convert color 16777215,65535` crash on main menu
- Root cause: PixiJS v8 TextStyle serializes color arrays as invalid values
- Fixed in MainMenuScene and HighScoresScene

### 🏗️ Engine Features

- TitleIntroAnimation: Full animated title screen with particles, scanlines, glow
- Cinematics barrel export updated
- Building interiors: 12×9 grid with brick walls, tables, items, door indicator
- Combat system: 5 enemy types, auto-battle tick, HP tracking, combat log UI
- Fishing state machine: idle → casting → waiting → caught
- Save/Load: localStorage-based with quicksave/quickload + auto-save
- Achievement system: 8 achievements tracked across all game systems
- Leveling: XP-based with scaling thresholds and stat bonuses

## v2.2.5 - Project Analysis and Submodule Expansion

### Features & Documentation
- **Massive Documentation Overhaul**: Generated `ROADMAP.md`, `TODO.md`, `VISION.md`, `MEMORY.md`, `IDEAS.md`, and `SUBMODULES.md` representing an extensive analysis of the current project state and future direction towards the ultimate omni-engine.
- **LLM Agent Instructions**: Created explicit rule files for multiple agent platforms (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`) dictating deep analysis, exhaustive commenting, and autonomous operation.
- **Submodule Integration**: Initiated integration of 30+ external game dev tools (sprite editors, tile editors, voxel editors) as git submodules into `/submodules/` directory for reference and eventual merging into `bgeditor`.
- **Omni-Engine Roadmap**: Outlined plan to achieve 100% feature parity with top 2D engines (Defold, Love2D, Phaser, Construct, GameMaker, RPGMaker) across Web, C++, and Java.
