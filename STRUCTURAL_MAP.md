# STRUCTURAL MAP: `bobsgameweb` (`okgame`) & Recursive Submodules (`v3.0.36`)

## 1. Repository, Submodule & Live Cloud Topology

| Layer | Path / Host | Remote Origin / Endpoint | Branch / Service | Version / Tag | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Root** | `/` (`bobsgameweb`) | `https://github.com/robertpelloni/bobsgameweb.git` | `main` (`master` synced) | **`v3.0.36`** | TypeScript + PixiJS v8 + WebGPU + Electron + Unified Hetzner Backend |
| **Live Web** | `/srv/www/bobsgame.com` (`5.161.250.43`) | `https://bobsgame.com` | `nginx` static + big-data | **`v3.0.36`** | Production frontend + hydrated `maps_v2/`, `audio/`, `lancedb/` |
| **Live Backend** | `/opt/bobsgameweb/server` (`5.161.250.43`) | `https://ws.bobsgame.com` | `systemd` (`bobsgameweb-server`) | **`v3.0.36`** | Unified Socket.io MMO + REST Profiles/Leaderboards + Generative AI API |
| **Submodule L1** | `submodules/bobui` | `https://github.com/robertpelloni/bqt.git` | `main` (`92bb40654b`) | **`v1.2.60`** | **BQt** Go/C++/Rust/TypeScript cross-framework UI & `MeshNode` kernel |
| **Submodule L2** | `submodules/bobui/submodules/juce` | `https://github.com/juce-framework/JUCE` | `master` (`d60b7a7803`) | **`9.0.5`** | C++ audio DSP & GUI framework assimilated by BQt |
| **Submodule L2** | `submodules/bobui/submodules/ultimatepp` | `https://github.com/ultimatepp/ultimatepp` | `master` (`1a56dd3a4a`) | `master` | C++ cross-platform rapid application framework assimilated by BQt |

---

## 2. Root Directory Architecture (`bobsgameweb`)

```text
bobsgameweb/
├── AGENTS.md / CLAUDE.md / GEMINI.md / GPT.md / copilot-instructions.md  # Universal agent governance (Hetzner Live-Only)
├── VERSION.md                  # Single source of truth version string (v3.0.36)
├── VISION.md / MEMORY.md / ROADMAP.md / TODO.md / IDEAS.md / DEPLOY.md / HANDOFF.md / CHANGELOG.md
├── build.bat / start.bat / setup.bat / tools_build.sh                    # BelowNormal build & Hetzner live launcher suite
├── vite.config.ts              # Injects __APP_VERSION__ from VERSION.md + smart copyPublicDir
├── tsconfig.json               # Renderer & shared ESM TypeScript configuration
├── tsconfig.main.json          # Electron main/preload CommonJS -> dist/main/ configuration
├── .memory/                    # Tracked Brain persistent agent memory (main.md + branch logs)
├── .pi-lens/                   # Tracked code-quality & session telemetry
├── src/
│   ├── main/                   # Electron Desktop Shell & Native System Tray (Hetzner Live-Only)
│   │   ├── index.ts            # Loads https://bobsgame.com/#menu & polls https://ws.bobsgame.com/healthz
│   │   └── preload.ts          # Sandboxed contextBridge (`window.electronAPI`)
│   ├── shared/                 # Isomorphic client/server/worker models
│   │   ├── Config.ts           # APP_VERSION, SERVER_URL (https://ws.bobsgame.com), BIG_DATA_URL
│   │   ├── MapData.ts          # Multi-layer tilemap & hit/bounds layer structures
│   │   ├── doors.json          # Canonical 726-door warp & sprite lookup table
│   │   └── puzzle/             # Core falling-block GameLogic, Grid, Piece, SRS, GameType, Replay
│   ├── renderer/               # PixiJS v8 WebGPU/WebGL2 Client Engine
│   │   ├── Game.ts             # Application bootstrap, deep-link router (#menu, #world, #replay=), scene stack
│   │   ├── audio/              # Howler + WebAudio FFT + chiptune3 tracker playback
│   │   ├── data/               # HighScoreManager, AchievementManager, Save/Identity persistence
│   │   ├── editor/             # GenerativeAIManager (https://ws.bobsgame.com/api/*) & CustomGameEditor logic
│   │   ├── engine/             # ECS (World, Components, Systems), HitDetectionSystem, LegacyMapLoader, WasmBridge
│   │   ├── graphics/           # Camera, Filters, WeatherRenderer, WebGPUParticleSystem (WGSL)
│   │   ├── input/              # Unified Keyboard, Mouse, Gamepad & TouchControls manager
│   │   ├── puzzle/             # PuzzleScene & BobNet GZip+Base64 codec
│   │   ├── scenes/             # 33 Scenes anchored by Consolidated Single-Page MainMenuScene & Unified SettingsScene
│   │   ├── state/              # StateManager stack, Scene lifecycle, SceneTransition fades
│   │   └── ui/                 # Button, Tooltip (ⓘ), FFTVisualizer, ToastManager
│   └── __tests__/              # Automated TypeScript verification suites (e.g. shop-config.test.ts)
├── server/                     # Unified Hetzner Cloud Backend (`https://ws.bobsgame.com`)
│   ├── index.js                # Socket.io MMO/Lobby/Tournaments + REST Profiles/Maps/Leaderboards + Generative AI (/api/generate/*, /api/chat)
│   ├── VERSION.md              # Synchronized copy of root VERSION.md for standalone VPS deploys
│   └── ops/                    # nginx (`ws.bobsgame.com.conf`) & systemd (`bobsgameweb-server.service`) templates
├── cpp_port/                   # C++17 engine port & Emscripten WebAssembly physics bridge
├── data/                       # Hydrated static assets (maps_v2/, doors.json, sprites/, audio/, lancedb/)
├── scripts/                    # Hetzner deploy/verify scripts (`deploy-with-rollback.sh`, `verify-production-stack.sh`) + `scripts/archive/`
└── submodules/bobui/           # BQt (v1.2.60) Go/C++ runtime + nested juce & ultimatepp submodules
```
