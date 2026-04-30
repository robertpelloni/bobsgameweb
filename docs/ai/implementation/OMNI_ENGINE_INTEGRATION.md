# bob's game web — The Ultimate Omni-Engine

## Version 2.1.73 — April 8, 2026

---

## Production Status

| Component | URL | Version | Status |
|---|---|---|---|
| Frontend | https://bobsgame.com | 2.1.73 | ✅ Live |
| Backend | https://ws.bobsgame.com | 2.1.73 | ✅ Live |
| GitHub | robertpelloni/bobsgameweb | master | ✅ Pushed |

### Build Stats
- **187 engine TypeScript modules** across **16 subsystems**
- **0 TypeScript errors**
- Build time: ~5.5 seconds
- Main bundle: 175 KB (44 KB gzip)

---

## Commits This Session (21 total)

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
| v2.1.65 | AudioManager, TextEngine, TextWindow, CaptionManager |
| v2.1.66 | Ping (Pong), Ramio (Breakout), Stadium, TournamentManager |
| v2.1.67 | ServerConnection, BobMenu, Wheel (3D carousel) |
| v2.1.68 | Wheel/BobsGameRoom/TournamentManager barrel exports, 173 modules |
| v2.1.69 | OKGame, GlobalSettings, FrameState, NetworkGameSave — 177 modules |
| v2.1.70 | EightDirectionBehavior, VisualScriptSystem, WheelItem, NDMenu, MapStateData, ManifestLoader — 182 modules |
| v2.1.71 | ClientGameEngine (from 1125-line Java), BobsGame (from 692-line C++), FileUtils — 185 modules |
| v2.1.72 | AudioUtils (Web Audio API), PeerConnection (WebRTC P2P) — 187 modules |
| v2.1.73 | ND console container (630-line port), Easing additions — 187 modules |

---

## Engine Architecture — 187 Modules, 16 Subsystems

```
src/renderer/engine/  (187 files)
│
├── ecs/ (47) ───────── Entity Component System
│   ├── behaviors/ ──── Behavior AI (Wander, Follow, Patrol, EightDirection)
│   ├── components/ ──── GraphicsComponent, PositionComponent, etc.
│   ├── systems/ ─────── VisualScriptSystem, RenderSystem, MovementSystem, etc.
│   └── Entity, World
│
├── rpg/ (40) ────────── RPG Engine
│   ├── event/ ───────── EventManager, EventScript (170+ commands), Flags, Skills
│   ├── gui/ ──────────── GUIManager, StatusBar, StuffMenu, SubPanels (7 types)
│   ├── save/ ─────────── GameSave (localStorage), NetworkGameSave (cloud)
│   ├── BGClientEngine ── Base client engine with all subsystems
│   ├── ClientGameEngine ─ Full game engine hub (Player, GUI, Wallet, Clock, etc.)
│   ├── Player, Wallet, GameClock, Item, FriendManager, ActionManager, Easing
│   └── FriendCharacter
│
├── puzzle/ (17) ──────── Puzzle Game Engine
│   ├── OKGame ────────── Main puzzle game engine (state machine, menus)
│   ├── BobsGame ──────── Full puzzle game with 20+ menu states, multiplayer
│   ├── Grid, GameLogic, Piece, Block, PuzzlePlayer, PuzzleRenderer
│   ├── GameSequence, Room, FrameState
│   └── stats/ ────────── GameStats, Leaderboard, UserStats
│
├── nd/ (12) ──────────── N-Dimensional Mini-Games
│   ├── ND ────────────── Mini-game console container (zoom, easing, dual-screen)
│   ├── MiniGameEngine ── Abstract base class
│   ├── Ping ──────────── Pong game with AI
│   ├── Ramio ─────────── Breakout game with bricks/bobas
│   ├── Wheel ─────────── 3D rotating game carousel
│   ├── WheelItem ─────── Game entry with info panel rendering
│   └── NDMenu ────────── N-dimensional game selector menu
│
├── map/ (12) ──────────── Map System
│   ├── GameMap, MapData, MapManager, MapState
│   ├── AreaData, WarpArea, Door, Light, EntityData
│   ├── AutoTiler, AsepriteParser
│   └── MapStateData ──── Serializable per-map state (tiles, doors, entities)
│
├── entity/ (11) ──────── Entity System
│   ├── BobSprite, Character (8-dir), RandomCharacter, ScreenSprite, Sprite
│   ├── SpriteData, SpriteManager, SpriteAnimation
│   ├── Cameraman, PathFinder
│   └── Entity
│
├── shared/ (11) ──────── Shared Utilities
│   ├── GameDataLoader, HQ2X, Cache (IndexedDB), BobMenu
│   ├── OKMath, OKColor (50+ named colors)
│   ├── AssetData (Music, Sound, Sprite, Map)
│   ├── GlobalSettings ── Persistent settings with localStorage
│   ├── ManifestLoader ── Asset manifest loading and verification
│   └── FileUtils ─────── Browser file utilities (fetch, IndexedDB, download)
│
├── network/ (7) ──────── Networking
│   ├── NetworkManager (Socket.io), OKNet (auth/matchmaking)
│   ├── ServerConnection (WebSocket, auto-reconnect, ping)
│   ├── BobsGameRoom ──── Full room config
│   └── PeerConnection ── WebRTC P2P (replaces C++ UDP)
│
├── text/ (6) ──────────── Text Rendering
│   ├── TextManager, TypedTextWriter, DialogueBox
│   ├── TextWindow, BitmapFont, CaptionManager
│   └── TextEngine
│
├── cinematics/ (5) ───── Cinematics
│   ├── CinematicsManager, ScreenOverlay, Letterbox
│   └── GlowTileBackground
│
├── stadium/ (4) ──────── Stadium & Tournaments
│   ├── OKGameStadium ──── Stadium visualization
│   └── TournamentManager ─ Bracket elimination, bye propagation
│
├── audio/ (5) ────────── Audio Engine
│   ├── AudioManager ──── Music channels, SFX pool, volume/fade
│   ├── AudioUtils ────── Web Audio API utilities (channel pooling, buffer loading)
│   ├── WaveData, OggDecoder
│   └── AudioContext management
│
├── state/ (3) ────────── State Management
│   ├── StateManager, GameFlowStates (Title/Login/Lobby)
│   └── TitleScreen with animated logo
│
├── debug/ (3) ────────── Debug Tools
│   ├── DebugConsole, Logger (levels, colorized, history)
│   └── Console text output
│
├── input/ (2) ────────── Input
│   └── ControlsManager (Keyboard, mouse, touch, gamepad)
│
└── eventsheet/ (1) ───── Event Sheet
    └── EventSheet (visual scripting)
```

---

## Source → Web Port Map

### C++ okgame → TypeScript bobsgameweb

| C++ Source | TS Module | Notes |
|---|---|---|
| `Puzzle/OKGame.h` (711 lines) | `puzzle/OKGame.ts` | Game flow state machine |
| `Puzzle/BobsGame.h` (692 lines) | `puzzle/BobsGame.ts` | 20+ menus, multiplayer, network |
| `Puzzle/Grid.h` | `puzzle/Grid.ts` | BFS matching, gravity, garbage |
| `Puzzle/GameLogic.h` | `puzzle/GameLogic.ts` | State machine, scoring |
| `Puzzle/Piece.h` | `puzzle/Piece.ts` | 7 tetrominos, kick tables |
| `Puzzle/Block.h` | `puzzle/Block.ts` | Types, specials, colors |
| `Puzzle/PuzzlePlayer.h` | `puzzle/PuzzlePlayer.ts` | Full input, DAS |
| `Puzzle/PuzzleRenderer` | `puzzle/PuzzleRenderer.ts` | Grid, ghost, next/hold |
| `Puzzle/Stats/*` | `puzzle/stats/*` | GameStats, Leaderboard |
| `Engine/rpg/BGClientEngine.h` | `rpg/BGClientEngine.ts` | Base client engine |
| `Engine/rpg/event/*` | `rpg/event/*` | 170+ event commands |
| `Engine/rpg/gui/*` | `rpg/gui/*` | 14 GUI components |
| `Engine/entity/*` | `entity/*` | Sprites, characters, camera |
| `Engine/map/*` | `map/*` | Maps, areas, doors, lights |
| `Engine/nd/MiniGameEngine.h` | `nd/MiniGameEngine.ts` | Abstract mini-game base |
| `Engine/network/*` | `network/*` | Socket.io + WebRTC P2P |
| `Engine/cinematics/*` | `cinematics/*` | Cinematics, letterbox, overlay |
| `Engine/audio/*` | `audio/*` | Web Audio API |
| `Engine/text/*` | `text/*` | BitmapFont, typewriter |
| `Engine/shared/*` | `shared/*` | Settings, cache, colors, math |
| `Engine/state/*` | `state/*` | State manager, game flow |
| `Engine/debug/*` | `debug/*` | Logger, console |
| `Engine/ecs/*` | `ecs/*` | Full ECS (46 modules) |
| `Engine/input/*` | `input/*` | Keyboard/mouse/touch/gamepad |
| `Utility/BobMenu.h` | `shared/BobMenu.ts` | In-game menu system |
| `Utility/FileUtils.h` | `shared/FileUtils.ts` | Browser file utilities |
| `Utility/OKMath.h` | `shared/OKMath.ts` | Math utilities |
| `Utility/OKColor.h` | `shared/OKColor.ts` | 50+ named colors |
| `Utility/CaptionManager.h` | `text/CaptionManager.ts` | Floating text labels |
| `Utility/ControlsManager.h` | `input/ControlsManager.ts` | Input handling |

### Java bobsgameonlinejava → TypeScript bobsgameweb

| Java Source | TS Module | Notes |
|---|---|---|
| `ClientGameEngine.java` (1125 lines) | `rpg/ClientGameEngine.ts` | Central game engine hub |
| `AudioUtils.java` (366 lines) | `audio/AudioUtils.ts` | Web Audio API utilities |
| `BobsGameRoom.java` | `network/BobsGameRoom.ts` | Multiplayer room config |
| `TournamentManager.java` | `stadium/TournamentManager.ts` | Elimination brackets |
| `GameSave.java` | `rpg/save/GameSave.ts` | localStorage persistence |
| `BitmapFont.java` | `text/BitmapFont.ts` | Canvas 2D glyph atlas |
| `Cache.java` | `shared/Cache.ts` | IndexedDB storage |
| `WaveData.java` | `audio/WaveData.ts` | Audio sample data |
| `AudioManager.java` | `audio/AudioManager.ts` | Music/SFX management |
| `GlowTileBackground.java` | `cinematics/GlowTileBackground.ts` | Animated tile background |
| `AutoTiler.java` | `map/AutoTiler.ts` | Auto-tiling rules |
| `AsepriteParser.java` | `map/AsepriteParser.ts` | Aseprite file parser |
| `GameItem.java` | `rpg/gui/GameItem.ts` | Store items |

---

## Key Architectural Decisions

1. **PixiJS v8 for rendering** — All 2D rendering via PixiJS sprites, graphics, text
2. **Web Audio API** — Replaces OpenAL/LWJGL for audio playback and mixing
3. **WebRTC DataChannels** — Replaces C++ UDP sockets for P2P multiplayer
4. **Socket.io** — Replaces custom TCP/UDP for client-server communication
5. **IndexedDB** — Replaces filesystem cache for offline asset storage
6. **localStorage** — Replaces registry/config files for settings and saves
7. **Canvas 2D** — Used for BitmapFont glyph atlas generation
8. **Fetch API** — Used for all asset loading (replaces file I/O)
9. **Color arrays instead of FillGradient** — PixiJS v8 TextStyle serializes FillGradient poorly
10. **BACKEND_FORCE_TAR=1** — rsync fails on Windows/Cygwin; tar-over-SSH works reliably

---

## Next Steps

1. **Wire up BGClientEngine/ClientGameEngine** as the actual running game loop
2. **Create interactive demos** for newly ported systems
3. **Port remaining C++ systems**: Custom game types, game sequences, custom editor
4. **Port remaining Java systems**: Remaining ND games, client game flow
5. **End-to-end testing** at https://bobsgame.com
6. **Performance optimization** — lazy loading, code splitting
