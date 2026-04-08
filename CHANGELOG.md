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
