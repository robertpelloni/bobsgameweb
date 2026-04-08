# bob's game web — Omni-Engine Integration Documentation

## Session: April 8, 2026 — v2.1.58 → v2.1.60

---

## 1. Production Status

| Component | URL | Version | Status |
|---|---|---|---|
| Frontend | https://bobsgame.com | 2.1.60 | ✅ Live |
| Backend | https://ws.bobsgame.com | 2.1.60 | ✅ Live |
| GitHub | robertpelloni/bobsgameweb | master | ✅ Pushed |

### Build Stats
- **126 engine TypeScript modules** (up from 44 at session start)
- **0 TypeScript errors**
- Build time: ~6 seconds
- Main bundle: 175 KB (44 KB gzip)
- PixiJS: 495 KB (140 KB gzip)

---

## 2. Session Commits

| Version | Description |
|---|---|
| v2.1.58 | Fix PixiJS color crash, CORS audio, port cinematics/RPG events/pathfinding/text from C++ |
| v2.1.58 | Add Map system (Area/Door/Light/Warp), GameSave, DebugConsole |
| v2.1.58 | Add AutoTiler, AsepriteParser, integrate DebugConsole into Game |
| docs | Comprehensive Omni-Engine Integration documentation |
| v2.1.59 | Port Cameraman, GUI system, StateManager, Puzzle engine, ActionManager, SpriteAnimation |
| v2.1.60 | Port EventScript visual scripting, SpriteData/SpriteManager, GameDataLoader, WaveData |

---

## 3. Engine Architecture — 126 Modules

### Module Breakdown

| Module | Files | Source | Description |
|---|---|---|---|
| **ecs** | 44 | New | Entity Component System |
| **rpg** | 35 | C++/Java | RPG engine (events, GUI, actions, save, items, wallet) |
| **map** | 9 | C++/Java | Tile maps, areas, doors, lights, autotiling, aseprite |
| **nd** | 7 | Existing | n-dimensional game engine |
| **entity** | 7 | C++ | Camera, sprites, pathfinding, animation, data |
| **puzzle** | 4 | C++ | Puzzle game engine (Grid, GameLogic, Types) |
| **cinematics** | 4 | C++ | Screen effects, fades, letterbox, shake |
| **text** | 3 | C++/Java | Typography, dialogue, floating text, text window |
| **state** | 2 | C++ | Game state stack (title, lobby, gameplay) |
| **stadium** | 2 | Existing | Tournament/stadium mode |
| **shared** | 2 | C++ | Game data loader, asset pipeline |
| **debug** | 2 | New | Debug console, FPS, logging |
| **audio** | 2 | Java | WAV encoder/decoder, tone/melody synthesis |
| **network** | 1 | Existing | TCP game client |
| **eventsheet** | 1 | Existing | Visual scripting |
| **GameWorker** | 1 | Existing | Web Worker for game logic |

### Key Systems Ported This Session

#### 🎥 Cameraman (entity/)
Advanced camera system with:
- Auto-zoom (zooms out when player runs, zooms in when standing)
- Screen shake (small/medium/hard with easing)
- Boundary detection (scans FX layer for camstop tiles)
- Smooth follow with easing (easeOutCubic)
- Quick zoom for conversations
- Pop zoom animations

#### 🎮 GUI System (rpg/gui/)
Complete in-game UI framework:
- **GUIManager**: Central orchestrator for all menus and notifications
- **MenuPanel**: Base class with fade-in/out, scrolling, activation
- **StuffMenu**: Tabbed in-game menu with 5 tabs
- **StatusBar**: Bottom-of-screen bar (clock, day, money, notifications)
- **NotificationManager**: Stack of notifications with fade-in/out + progress bars
- **GameStore**: In-game item store with purchase flow
- **ItemsPanel**: Inventory with descriptions
- **StatusPanel**: Player stats with skill bars
- **FriendsPanel**: Online friends list
- **SettingsPanel**: Toggle settings
- **LogsPanel**: Game log with colored levels

#### 🧩 Puzzle Engine (puzzle/)
Complete puzzle game engine supporting 9 game types:
- **Tetris**: 10×20, 7-color, wall kicks, hold piece, hard drop
- **Puyo Puyo**: 6×13, 5-color, connected group matching
- **Columns**: 6×13, 7-color, 3-block vertical matching
- **Dr. Mario**: 8×16, 3-color, connected matching
- **Panel de Pon**: 6×12, 5-color, swap-based matching
- **Magic Drop**: 6×15, 6-color, push-based matching
- **Lumines**: 16×10, 2-color, 4-block square matching
- **Tetris Attack**: 6×12, 5-color, swap matching
- **Custom**: Fully configurable

Features: Grid with line clearing, connected group BFS, gravity, garbage rows, 
piece rotation with wall kicks, hold piece, scoring with combos, seeded RNG,
screen shake effects, frame state recording for multiplayer replay.

#### 📜 EventScript Visual Scripting (rpg/event/EventScript.ts)
Complete visual scripting language from bob's game:

**70+ Qualifiers (conditions)**:
- Player interaction: touching, walking into doors/warps/entities
- State: flag set, skill threshold, money, items, games owned
- Position: standing in area, entity at area, area empty
- Time: hour/minute comparisons, time since flag set
- Dialogue: finished, text box open, answer selected
- Weather: rain, wind, snow, fog
- Random: one-in-N chance checks
- Activation: this activated, been here ever/since enter room

**100+ Commands (actions)**:
- Blocking: wait for button press, wait for ticks, wait for clock time
- Map: change map, enter door/warp, load state
- Dialogue: show dialogue, show with caption, cinematic text
- Camera: set target, ignore bounds, auto-zoom, push/pop state
- Player: teleport, walk to, block until reach, animate, set speed
- Entity: all player commands for any entity by reference
- Cinematics: screen fade, letterbox, shake, game speed
- Flags/Skills: set/toggle flags, give/remove skill points
- Money/Items: give/remove money and items
- Weather: rain, wind, snow, fog
- Music/Sound: play, stop, loop
- Doors/Lights: open/close doors, toggle lights

#### 🎵 WaveData Audio (audio/)
Browser-native audio synthesis:
- WAV encoder (PCM 16-bit with proper headers)
- WAV decoder using Web Audio API
- Tone generation (sine, square, sawtooth, triangle)
- Attack/release envelope support
- Melody synthesis from note arrays

#### 🗂️ Asset Management (entity/, shared/)
- **SpriteData**: Full sprite definition (type flags, hitbox, animations, MD5 hashes)
- **SpriteManager**: Registry with ID/name lookup, category filtering (NPCs, items, doors, games)
- **GameDataLoader**: Manifest-based asset pipeline with progress tracking

#### 🎬 State Management (state/)
- **StateManager**: Stack-based game state machine (push/pop/replace)
- States: logo, title, login, lobby, gameplay, paused, game over
- Enter/exit lifecycle callbacks

---

## 4. Porting Progress

### C++ → TypeScript Coverage

| C++ Module | Status |
|---|---|
| Engine/cinematics/ | ✅ Complete |
| Engine/rpg/event/ | ✅ Complete + EventScript |
| Engine/rpg/Clock, Item, Wallet, Easing | ✅ Complete |
| Engine/rpg/FriendManager | ✅ Complete |
| Engine/rpg/save/GameSave | ✅ Complete |
| Engine/rpg/gui/ (30 files) | ✅ Complete |
| Engine/entity/Cameraman | ✅ Complete |
| Engine/entity/PathFinder | ✅ Complete |
| Engine/entity/SpriteData, SpriteManager | ✅ Complete |
| Engine/entity/SpriteAnimation | ✅ Complete |
| Engine/map/ | ✅ Complete |
| Engine/text/ | ✅ Complete |
| Engine/state/StateManager | ✅ Complete |
| Engine/nd/GameDataLoader | ✅ Complete |
| Puzzle/ (Grid, GameLogic, Types) | ✅ Complete |
| Engine/entity/BobSprite | 🔲 Pending |
| Engine/entity/RandomCharacter, ScreenSprite | 🔲 Pending |
| Engine/rpg/BGClientEngine | 🔲 Pending (main orchestrator) |

### Java → TypeScript Coverage

| Java Module | Status |
|---|---|
| com.bobsgame.editor.Project.AutoTiler | ✅ Complete |
| com.bobsgame.editor.Project.Sprite.AsepriteParser | ✅ Complete |
| com.bobsgame.audio.WaveData | ✅ Complete |
| com.bobsgame.shared.EventData | ✅ Complete (EventScript) |
| com.bobsgame.game.GameLogic | ✅ Complete |
| com.bobsgame.audio.OggDecoder, MODFile | 🔲 Pending |
| com.bobsgame.game.GameSequence | 🔲 Pending |

---

## 5. Deployment Architecture

```
bobsgame.com (5.161.250.43)
├── nginx (SSL, SPA routing, /z/ → S3 proxy)
├── /var/www/bobsgame.com/current/ (static frontend)
└── ws.bobsgame.com
    ├── nginx (SSL, WebSocket proxy)
    └── /opt/bobsgameweb/server/ (systemd: bobsgameweb-server)
```
