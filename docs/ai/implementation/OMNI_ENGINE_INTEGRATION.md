# bob's game web — Omni-Engine Integration Documentation

## Session: April 8, 2026 — v2.1.58 → v2.1.62

---

## Production Status

| Component | URL | Version | Status |
|---|---|---|---|
| Frontend | https://bobsgame.com | 2.1.62 | ✅ Live |
| Backend | https://ws.bobsgame.com | 2.1.62 | ✅ Live |
| GitHub | robertpelloni/bobsgameweb | master | ✅ Pushed |

### Build Stats
- **140 engine TypeScript modules** across **17 subsystems**
- **0 TypeScript errors**
- Build time: ~7 seconds
- Main bundle: 175 KB (44 KB gzip)

---

## Commits This Session

| Version | Description |
|---|---|
| v2.1.58 | Fix PixiJS color crash, CORS audio, port cinematics/RPG events/pathfinding/text |
| v2.1.58 | Add Map system, GameSave, DebugConsole |
| v2.1.58 | Add AutoTiler, AsepriteParser |
| docs | Comprehensive Omni-Engine Integration documentation |
| v2.1.59 | Port Cameraman, GUI system (12 files), StateManager, Puzzle engine (3 files), ActionManager, SpriteAnimation |
| v2.1.60 | Port EventScript (170+ commands/qualifiers), SpriteData/SpriteManager, GameDataLoader, WaveData |
| v2.1.61 | Port BGClientEngine, BobSprite, Character, RandomCharacter, GameSequence, Room |
| v2.1.62 | Port Puzzle Stats (3 files), Behavior AI, ControlsManager, BitmapFont |

---

## Engine Architecture — 140 Modules, 17 Subsystems

```
src/renderer/engine/
├── ecs/ (46)          Entity Component System + Behaviors
│   ├── behaviors/     WanderBehavior, FollowBehavior, PatrolBehavior
│   ├── components/    GraphicsComponent, PositionComponent, etc.
│   ├── systems/       RenderSystem, MovementSystem, etc.
│   └── Entity, World
├── rpg/ (36)          RPG Engine — the largest subsystem
│   ├── gui/ (13)      MenuPanel, StuffMenu, StatusBar, GameStore, Notifications
│   ├── event/ (10)    EventManager, EventScript (170+ commands), Flags, Skills, Dialogue
│   ├── save/          GameSave (localStorage persistence)
│   ├── BGClientEngine (main orchestrator)
│   ├── ActionManager  (context-sensitive prompts)
│   ├── Player, Item, Wallet, GameClock, Easing, FriendManager
├── puzzle/ (10)       Puzzle Game Engine
│   ├── Grid           (line clearing, BFS matching, gravity, garbage)
│   ├── GameLogic      (state machine, scoring, frame sync)
│   ├── PuzzleTypes    (9 game type definitions)
│   ├── GameSequence   (community sequences)
│   ├── Room           (multiplayer rooms, host transfer)
│   └── stats/ (3)     GameStats, UserStats, Leaderboard
├── map/ (9)           Tile maps, areas, doors, lights, autotiling, aseprite
├── entity/ (9)        Character, Cameraman, BobSprite, RandomCharacter, PathFinder
├── nd/ (7)            n-dimensional game engine
├── text/ (4)          TextEngine, TextWindow, BitmapFont, FloatingText
├── cinematics/ (4)    Screen overlay, letterbox, fades, shake
├── input/ (2)         ControlsManager (keyboard, mouse, touch, gamepad)
├── state/ (2)         StateManager (game state stack)
├── stadium/ (2)       Tournament mode
├── shared/ (2)        GameDataLoader, asset pipeline
├── debug/ (2)         Debug console, FPS, logging
├── audio/ (2)         WaveData (WAV encode/decode/synth)
├── network/ (1)       TCP game client
├── eventsheet/ (1)    Visual scripting
└── GameWorker/ (1)    Web Worker for game logic
```

---

## Source Coverage

### C++ → TypeScript (okgame/src/)

| System | Status |
|---|---|
| Engine/cinematics/ | ✅ Complete |
| Engine/rpg/event/ | ✅ Complete + EventScript |
| Engine/rpg/gui/ (30 files) | ✅ Complete |
| Engine/rpg/BGClientEngine | ✅ Complete |
| Engine/rpg/Clock, Item, Wallet, Easing | ✅ Complete |
| Engine/rpg/save/GameSave | ✅ Complete |
| Engine/entity/BobSprite | ✅ Complete |
| Engine/entity/Character | ✅ Complete |
| Engine/entity/RandomCharacter | ✅ Complete |
| Engine/entity/Cameraman | ✅ Complete |
| Engine/entity/PathFinder | ✅ Complete |
| Engine/entity/SpriteData, SpriteManager | ✅ Complete |
| Engine/entity/SpriteAnimation | ✅ Complete |
| Engine/map/ | ✅ Complete |
| Engine/text/ | ✅ Complete |
| Engine/state/StateManager | ✅ Complete |
| Engine/nd/GameDataLoader | ✅ Complete |
| Engine/ecs/behaviors/ | ✅ Complete |
| Puzzle/ (Grid, GameLogic, Types, Stats, Room, GameSequence) | ✅ Complete |
| Utility/ControlsManager | ✅ Complete (web adaptation) |

### Java → TypeScript (bobsgameonlinejava/src/)

| System | Status |
|---|---|
| editor.Project.AutoTiler | ✅ Complete |
| editor.Project.Sprite.AsepriteParser | ✅ Complete |
| audio.WaveData | ✅ Complete |
| client.BitmapFont | ✅ Complete |
| shared.EventData | ✅ Complete (EventScript) |
| game.GameLogic | ✅ Complete |
| shared.GameStats, UserStats, Leaderboard | ✅ Complete |
| audio.OggDecoder, MODFile | 🔲 Pending |
| game.GameSequence | ✅ Complete |

---

## Key Design Decisions

1. **Web-first adaptation**: ControlsManager uses browser APIs (KeyboardEvent, MouseEvent, TouchEvent, Gamepad API) instead of platform-specific C++/LWJGL input
2. **PixiJS rendering**: BitmapFont generates glyph atlases via Canvas 2D and renders as PixiJS sprites
3. **Modular imports**: Every subsystem has its own index.ts barrel export
4. **Type safety**: Strict TypeScript with zero errors across 140 modules
5. **Architecture parity**: All ported classes maintain the same API names adapted for web conventions
