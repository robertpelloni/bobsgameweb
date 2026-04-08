# bob's game web — Omni-Engine Integration Documentation

## Session: April 8, 2026 — v2.1.58

---

## 1. Critical Production Fixes

### 1.1 PixiJS v8 FillGradient Crash

**Symptom**: Game immediately crashed with `Uncaught Error: Unable to convert color 16777215,65535`

**Root Cause**: PixiJS v8's `TextStyle` class serializes `fill` values through a normalizer. When a `FillGradient` object was passed, the normalizer converted it to the string `"16777215,65535"` (comma-separated start/end colors), which then failed the color parser.

**Fix**: Replaced `FillGradient` with a compatible color array:
```typescript
// Before (crashed):
const gradient = new FillGradient(0, 0, 0, 72);
gradient.addColorStop(0, 0xffffff);
gradient.addColorStop(1, 0x00ffff);
fill: gradient

// After (works):
fill: [0xffffff, 0x00ffff]
```

**File**: `src/renderer/scenes/MainMenuScene.ts`

### 1.2 Audio CORS Blocking

**Symptom**: All 13 SFX and 2 music tracks blocked with CORS errors when loading from `bobsgame.s3.amazonaws.com`

**Root Cause**: `AudioManager.load()` was rewriting relative paths (`/audio/sfx/menu_move.wav`) to direct S3 URLs (`https://bobsgame.s3.amazonaws.com/z/audio/sfx/menu_move.wav`) in production. The S3 bucket didn't have CORS headers for `bobsgame.com`.

**Fix**: Removed the S3 URL rewriting entirely. Audio files are now served as static assets from the same domain (via Vite's `publicDir: 'data'` configuration). Also generated proper WAV tone files (replacing the 44-byte silent stubs).

**Files**: `src/renderer/audio/AudioManager.ts`, `scripts/generate-audio.cjs`

### 1.3 Audio File Generation

The previous audio files were 44-byte silent WAV stubs. Generated proper tonal audio:
- **19 SFX**: Each with unique frequency and duration (800Hz for menu_move, 200Hz for piece_drop, etc.)
- **2 Music tracks**: 8-second and 16-second sine wave melodies
- All generated via `scripts/generate-audio.cjs` (Node.js WAV synthesis)

---

## 2. Omni-Engine Architecture

### 2.1 Module Inventory

Total engine files: **91 TypeScript modules**

| Module | Files | Source | Description |
|---|---|---|---|
| **ecs** | 44 | New + existing | Entity Component System (components, systems, behaviors, world) |
| **rpg** | 19 | Ported from C++ | RPG engine (events, flags, skills, items, wallet, clock, save) |
| **map** | 10 | Ported from C++/Java | Tile maps, areas, doors, lights, autotiling, aseprite |
| **nd** | 7 | Existing | n-dimensional game engine (libretro, puzzle) |
| **cinematics** | 4 | Ported from C++ | Screen effects, fades, letterbox, shake |
| **text** | 2 | Ported from C++/Java | Typography, dialogue, floating text |
| **debug** | 2 | New | Debug console, FPS, logging |
| **stadium** | 2 | Existing | Tournament/stadium mode |
| **entity** | 2 | Ported from C++ | Base entities, A* pathfinding |
| **network** | 1 | Existing | TCP game client |
| **eventsheet** | 1 | Existing | Visual scripting |
| **GameWorker** | 1 | Existing | Web Worker for game logic |

### 2.2 Ported System Details

#### Cinematics System (`engine/cinematics/`)
Source: `okgame/src/Engine/cinematics/`

| Class | Purpose |
|---|---|
| `CinematicsManager` | Central manager for all cinematic effects |
| `ScreenOverlay` | Color overlays with one-way, round-trip, and instant fades |
| `Letterbox` | Cinematic bars with configurable slide duration |

Features:
- `fadeToBlack(ms)`, `fadeFromWhite(ms)` — standard transitions
- `fadeColorFromAlpha(r, g, b, from, to, ms)` — custom color fades
- `setLetterbox(on, duration, size)` — cinematic bars
- `shakeScreen(duration, maxX, maxY, rate)` — screen shake
- `setGameSpeed(multiplier)` — slow motion
- Post-processing flags: 8-bit, inverted, B&W

#### RPG Event System (`engine/rpg/event/`)
Source: `okgame/src/Engine/rpg/event/`

| Class | Purpose |
|---|---|
| `EventManager` | Central registry for all game state |
| `BobEvent` | Game event with typed triggers and commands |
| `EventCommand` | Parsed command tree with child branches |
| `EventParameter` | Typed parameter (string, number, flag ID, etc.) |
| `Flag` | Boolean game state (door opened, boss killed) |
| `Skill` | Numeric skill/stat value |
| `Dialogue` | Conversation completion tracking |
| `GameString` | Localized string lookup |

Event Triggers: `auto`, `talk`, `touch`, `collision`, `timer`, `flag_change`, `skill_threshold`, `enter_area`, `exit_area`, `item_acquired`, `dialogue_done`, `custom`

Condition evaluation: `IF_FLAG`, `IF_NOT_FLAG`, `IF_SKILL_ABOVE`, `IF_SKILL_BELOW`, `IF_DIALOGUE_DONE`

#### RPG Core (`engine/rpg/`)
Source: `okgame/src/Engine/rpg/`

| Class | Purpose |
|---|---|
| `Item` | Inventory item with ID, name, description, acquired state |
| `Wallet` | Currency tracking with add/subtract/has |
| `GameClock` | In-game time (day/hour/minute/second), pause, fast-forward |
| `Easing` | 14 easing functions (quad, cubic, quart, back, elastic, bounce) |
| `FriendCharacter` | MMO friend entity |
| `FriendManager` | Online friend tracking |
| `GameSave` | Persistent save/load with localStorage |

#### Map System (`engine/map/`)
Source: `okgame/src/Engine/map/` + Java `com.bobsgame.editor.Project`

| Class | Purpose |
|---|---|
| `AreaData` | Rectangular area with spawn/event/warp properties |
| `WarpArea` | Map transition trigger zone |
| `DoorData` / `Door` | Openable door with warp destination |
| `LightData` / `Light` | Dynamic light with color, radius, flicker |
| `MapState` | Per-map persistent state (triggered areas, opened doors) |
| `AutoTiler` | 4-bit and 8-bit bitmask autotiling |
| `AsepriteParser` | Parse .ase/.aseprite sprite files in browser |

#### Pathfinding (`engine/entity/`)
Source: `okgame/src/Engine/entity/PathFinder`

| Class | Purpose |
|---|---|
| `PathFinder` | A* on tile grid, supports diagonal movement |
| `TilePath` | Path result with iterator support |

Features: Octile heuristic for diagonal, tile cost weighting, diagonal corner-cutting prevention.

#### Text Engine (`engine/text/`)
Source: `okgame/src/Engine/text/` + Java `BitmapFont`

| Class | Purpose |
|---|---|
| `TypedTextWriter` | Character-by-character text reveal |
| `DialogueBox` | NPC dialogue box with typewriter effect |
| `FloatingTextManager` | In-world floating damage numbers |

#### Debug (`engine/debug/`)

| Class | Purpose |
|---|---|
| `DebugConsole` | In-game overlay with FPS, log, stats |

Toggle: Backquote key. Features: FPS counter, colored log entries, stats display.

---

## 3. Deployment

### 3.1 Infrastructure

| Component | Host | URL |
|---|---|---|
| Frontend (static) | Hetzner VPS (5.161.250.43) | https://bobsgame.com |
| Backend (WebSocket) | Hetzner VPS (ws.bobsgame.com) | https://ws.bobsgame.com |
| Reverse Proxy | nginx with SSL (Let's Encrypt) | — |

### 3.2 nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name bobsgame.com;
    root /var/www/bobsgame.com/current;

    location /z/ {
        proxy_pass https://bobsgame.s3.amazonaws.com/z/;
        proxy_set_header Host bobsgame.s3.amazonaws.com;
        proxy_ssl_server_name on;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3.3 Deployment Scripts

- `scripts/deploy-frontend-hetzner.sh` — Build + tar upload
- `scripts/deploy-backend-vps.sh` — Tar + npm install + systemd restart
- Backend runs as systemd service `bobsgameweb-server`

### 3.4 Stale Build Cleanup

Cleaned Hetzner `/var/www/bobsgame.com/current/assets/` from 217 files (accumulated over multiple deploys) to 20 current files.

---

## 4. Build Statistics

| Metric | Value |
|---|---|
| Total TS modules | 839 |
| Main bundle | 175 KB (44 KB gzip) |
| PixiJS | 495 KB (140 KB gzip) |
| Vendor | 59 KB (19 KB gzip) |
| Engine Demo | 32 KB (10 KB gzip) |
| Audio vendor | 36 KB (10 KB gzip) |
| Build time | ~8 seconds |
| TypeScript errors | 0 |

---

## 5. Commits This Session

1. **v2.1.58**: Fix color crash + CORS audio, port cinematics/RPG events/pathfinding/text
2. **v2.1.58**: Add Map system (Area/Door/Light/Warp), GameSave, DebugConsole
3. **v2.1.58**: Add AutoTiler, AsepriteParser, integrate DebugConsole into Game

All pushed to `master` at `github.com/robertpelloni/bobsgameweb`.
