# bob's game web — The Ultimate Omni-Engine

## Version 2.1.64 — April 8, 2026

---

## Production Status

| Component | URL | Version | Status |
|---|---|---|---|
| Frontend | https://bobsgame.com | 2.1.64 | ✅ Live |
| Backend | https://ws.bobsgame.com | 2.1.64 | ✅ Live |
| GitHub | robertpelloni/bobsgameweb | master | ✅ Pushed |

### Build Stats
- **152 engine TypeScript modules** across **16 subsystems**
- **0 TypeScript errors**
- Build time: ~7 seconds
- Main bundle: 175 KB (44 KB gzip)

---

## Commits This Session (14 total)

| Version | Description |
|---|---|
| v2.1.58 | Fix PixiJS color crash, CORS audio, port cinematics/RPG events/pathfinding/text |
| v2.1.58 | Add Map system, GameSave, DebugConsole |
| v2.1.58 | Add AutoTiler, AsepriteParser |
| docs | Comprehensive integration documentation |
| v2.1.59 | Cameraman, GUI system (12 files), StateManager, Puzzle engine, ActionManager |
| v2.1.60 | EventScript (170+ commands), SpriteData/Manager, GameDataLoader, WaveData |
| v2.1.61 | BGClientEngine, BobSprite, Character, RandomCharacter, GameSequence, Room |
| v2.1.62 | Puzzle Stats, Behavior AI, ControlsManager, BitmapFont |
| v2.1.63 | MapManager, EntityData, ScreenSprite, NetworkManager, MiniGameEngine |
| v2.1.64 | EventDataTypes, GameFlowStates, HQ2X, OggDecoder, OKNet |

---

## Engine Architecture — 152 Modules, 16 Subsystems

```
src/renderer/engine/  (152 files)
│
├── ecs/ (46) ───────── Entity Component System
│   ├── behaviors/ ──── Behavior AI (Wander, Follow, Patrol)
│   ├── components/ ──── GraphicsComponent, PositionComponent, etc.
│   ├── systems/ ─────── RenderSystem, MovementSystem, etc.
│   └── Entity, World
│
├── rpg/ (37) ──────────── RPG Engine (largest subsystem)
│   ├── gui/ (13) ─────── MenuPanel, StuffMenu, StatusBar, GameStore,
│   │                      ItemsPanel, StatusPanel, FriendsPanel, SettingsPanel,
│   │                      LogsPanel, Notifications, SubPanel
│   ├── event/ (11) ───── EventManager, EventScript (170+ commands/qualifiers),
│   │                      Flag, Skill, Dialogue, GameString, EventDataTypes
│   ├── save/ ──────────── GameSave (localStorage persistence)
│   ├── BGClientEngine ─── Main orchestrator (all subsystems wired together)
│   ├── ActionManager ──── Context-sensitive interaction prompts
│   └── Player, Item, Wallet, GameClock, Easing, FriendManager
│
├── puzzle/ (10) ───────── Puzzle Game Engine
│   ├── Grid ───────────── Line clearing, BFS matching, gravity, garbage
│   ├── GameLogic ───────── State machine, scoring, frame sync, combos
│   ├── PuzzleTypes ─────── 9 game type definitions (Tetris → Custom)
│   ├── GameSequence ────── Community puzzle sequences
│   ├── Room ────────────── Multiplayer rooms, host transfer, lifecycle
│   └── stats/ (3) ─────── GameStats, UserStats, Leaderboard
│
├── map/ (11) ──────────── Map System
│   ├── MapManager ──────── Multi-map registry, transitions, door/warp
│   ├── EntityData ──────── Entity definition (spawn, physics, animation)
│   ├── AreaData, WarpArea, DoorData, LightData
│   ├── MapState, GameMap, MapData
│   └── AutoTiler, AsepriteParser
│
├── entity/ (10) ───────── Entity System
│   ├── Character ───────── 8-dir movement, pathfinding, collision
│   ├── Cameraman ────────── Auto-zoom, shake, boundary detection
│   ├── BobSprite ────────── Loaded sprite with animation
│   ├── RandomCharacter ──── Procedural NPC with randomized appearance
│   ├── ScreenSprite ─────── Screen-space UI sprite (percent/absolute)
│   ├── SpriteData, SpriteManager, SpriteAnimation, PathFinder
│
├── nd/ (9) ─────────────── n-dimensional / Mini-game Engine
│   ├── MiniGameEngine ───── Title screen, pause menu, game over, shake
│   ├── NDGameEngine, NDPuzzleGame, ND, Ping, Ramio
│   └── LibretroGame, LibretroWorker
│
├── text/ (4) ───────────── Text System
│   ├── TextEngine ───────── Typewriter, DialogueBox, FloatingText
│   ├── TextWindow ───────── Scrollable text console
│   └── BitmapFont ───────── Canvas 2D glyph atlas renderer
│
├── network/ (4) ────────── Networking
│   ├── NetworkManager ───── Socket.io rooms, game state, chat, scoring
│   └── OKNet ────────────── Auth, server discovery, matchmaking
│
├── cinematics/ (4) ──────── Screen Effects
│   └── CinematicsManager, ScreenOverlay, Letterbox
│
├── state/ (3) ──────────── Game States
│   ├── StateManager ─────── Stack-based state machine
│   └── GameFlowStates ───── TitleScreen, Login, Lobby
│
├── shared/ (3) ──────────── Shared Utilities
│   ├── GameDataLoader ───── Manifest-based asset pipeline
│   └── HQ2X ────────────── Edge-aware 2x pixel art upscaler
│
├── audio/ (3) ──────────── Audio System
│   ├── WaveData ─────────── WAV encode/decode, tone synthesis
│   └── OggDecoder ───────── Ogg Vorbis decoder (Web Audio API)
│
├── input/ (2) ──────────── Input System
│   └── ControlsManager ─── Keyboard, mouse, touch, gamepad
│
├── debug/ (2) ──────────── Debug Tools
│   └── DebugConsole ─────── FPS, logging, stats overlay
│
├── stadium/ (2) ─────────── Tournament Mode
├── eventsheet/ (1) ──────── Visual Scripting
└── GameWorker/ (1) ─────── Web Worker
```

---

## Source Coverage Summary

### C++ → TypeScript (okgame/src/)
**Cinematics** ✅ · **RPG Events+GUI+Core** ✅ · **BGClientEngine** ✅ · **Character+NPC** ✅
**Camera** ✅ · **Sprite System** ✅ · **Map System** ✅ · **EntityData** ✅ · **PathFinder** ✅
**Text Engine** ✅ · **State Manager** ✅ · **GameDataLoader** ✅ · **ControlsManager** ✅
**Puzzle Engine** ✅ · **Stats** ✅ · **Room** ✅ · **NetworkManager** ✅ · **MiniGameEngine** ✅ · **Behavior AI** ✅

### Java → TypeScript (bobsgameonlinejava/src/)
**AutoTiler** ✅ · **AsepriteParser** ✅ · **BitmapFont** ✅ · **WaveData** ✅ · **OggDecoder** ✅
**EventScript** ✅ · **GameDataTypes** ✅ · **HQ2X** ✅ · **GameSequence** ✅ · **OKNet** ✅

---

## Key APIs

### EventScript Visual Scripting Language
- **70+ qualifiers** (conditions): player touch, flag checks, position, time, weather, dialogue
- **100+ commands** (actions): blocking, map transitions, camera, player/entity control, cinematics
- **6 event types**: initial loader, cutscene, map load, normal repeat, callable, one-shot

### Puzzle Engine (9 Game Types)
Tetris · Puyo Puyo · Columns · Dr. Mario · Panel de Pon · Magic Drop · Lumines · Tetris Attack · Custom

### GUI System
StatusBar · StuffMenu (5 tabs) · GameStore · Notifications (fade+progress) · ItemsPanel · StatusPanel · FriendsPanel · SettingsPanel · LogsPanel

### Camera System
Auto-zoom (runs→zooms out, stands→zooms in) · Screen shake (3 levels) · Boundary scanning · Smooth follow with easing
