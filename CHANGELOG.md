# bob's game web — Changelog

## v3.0.4 — 2026-05-02

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

- Synced the live version string across `VERSION.md`, root `package.json`, root `package-lock.json`, `src/shared/Config.ts`, `src/renderer/scenes/MainMenuScene.ts`, `server/index.js`, `server/package.json`, and `server/package-lock.json`
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
