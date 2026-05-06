## [2.2.15]
- Completely decoupled SettingsScene from HTML DOM, relying solely on PIXI TextInput wrappers.
- Decoupled WorldScene developer console from raw HTML input forms.

## [2.2.14]
- Created mock WASM submodule payloads in `public/tools/` to allow the Iframe launcher to render successfully while awaiting Emscripten build pipelines.

## [2.2.13]
- Scaffolded `tools_build.sh` WASM compilation hook for submodule engines.

## [2.2.12]
- Implemented global top-level IPC event listener for invoking native submodule desktop binaries or falling back to iframes.

## [2.2.11]
- Introduced External Pixel Tools panel in CustomGameEditor UI.
- Scaffolded launch hooks for Aseprite and Tilemap Studio integrations via Event dispatches.

## [2.2.9]
- Synchronized Submodules across omni-engine integration tree.
- Decoupled CustomGameEditor HTML layout rendering while preserving TS detached stubs.
- Re-verified cross-compilation pipeline across web/Qt6 builds.

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
- **PathFinder**: A* pathfinding on tile grids
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
  - `[6]` A* pathfinding visualization

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
