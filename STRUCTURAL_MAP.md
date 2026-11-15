# STRUCTURAL MAP: `bobsgameweb` (`okgame`) & Recursive Submodules (`v3.0.35`)

## 1. Repository & Recursive Submodule Topology

| Layer | Path | Remote Origin | Branch | Version / Tag | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Root** | `/` (`bobsgameweb`) | `https://github.com/robertpelloni/bobsgameweb.git` | `main` (`master` synced) | **`v3.0.35`** | TypeScript + PixiJS v8 + WebGPU + Electron + Socket.io + AI Proxy |
| **Submodule L1** | `submodules/bobui` | `https://github.com/robertpelloni/bqt.git` | `main` (`92bb40654b`) | **`v1.2.60`** | **BQt** Go/C++/Rust/TypeScript cross-framework UI & `MeshNode` kernel |
| **Submodule L2** | `submodules/bobui/submodules/juce` | `https://github.com/juce-framework/JUCE` | `master` (`d60b7a7803`) | **`9.0.5`** | C++ audio DSP & GUI framework assimilated by BQt |
| **Submodule L2** | `submodules/bobui/submodules/ultimatepp` | `https://github.com/ultimatepp/ultimatepp` | `master` (`1a56dd3a4a`) | `master` | C++ cross-platform rapid application framework assimilated by BQt |

---

## 2. Root Directory Architecture (`bobsgameweb`)

```text
bobsgameweb/
├── AGENTS.md / CLAUDE.md / GEMINI.md / GPT.md / copilot-instructions.md  # Universal agent governance
├── VERSION.md                  # Single source of truth version string (v3.0.35)
├── VISION.md / MEMORY.md / ROADMAP.md / TODO.md / IDEAS.md / DEPLOY.md / HANDOFF.md / CHANGELOG.md
├── build.bat / start.bat / setup.bat / tools_build.sh                    # BelowNormal root build/run suite
├── vite.config.ts              # Injects __APP_VERSION__ from VERSION.md + smart copyPublicDir
├── tsconfig.json               # Renderer & shared ESM TypeScript configuration
├── tsconfig.main.json          # Electron main/preload CommonJS -> dist/main/ configuration
├── .memory/                    # Tracked Brain persistent agent memory (main.md + branch logs)
├── .pi-lens/                   # Tracked code-quality & session telemetry
├── src/
│   ├── main/                   # Electron Desktop Shell & Native System Tray
│   │   ├── index.ts            # Tray menu, BelowNormal child daemons (:6065 & :6066), /healthz probes, IPC
│   │   └── preload.ts          # Sandboxed contextBridge (`window.electronAPI`)
│   ├── shared/                 # Isomorphic client/server/worker models
│   │   ├── Config.ts           # APP_VERSION, SERVER_URL, BIG_DATA_URL
│   │   ├── MapData.ts          # Multi-layer tilemap & hit/bounds layer structures
│   │   └── puzzle/             # Core falling-block GameLogic, Grid, Piece, SRS, GameType, Replay
│   ├── renderer/               # PixiJS v8 WebGPU/WebGL2 Client Engine
│   │   ├── Game.ts             # Application bootstrap, deep-link router (#menu, #world, #replay=), scene stack
│   │   ├── audio/              # Howler + WebAudio FFT + chiptune3 tracker playback
│   │   ├── data/               # HighScoreManager, AchievementManager, Save/Identity persistence
│   │   ├── editor/             # GenerativeAIManager (:6066 client) & CustomGameEditor logic
│   │   ├── engine/             # ECS (World, Components, Systems), HitDetectionSystem, LegacyMapLoader, WasmBridge
│   │   ├── graphics/           # Camera, Filters, WeatherRenderer, WebGPUParticleSystem (WGSL)
│   │   ├── input/              # Unified Keyboard, Mouse, Gamepad & TouchControls manager
│   │   ├── puzzle/             # PuzzleScene & BobNet GZip+Base64 codec
│   │   ├── scenes/             # 33 Scenes anchored by Consolidated Single-Page MainMenuScene & Unified SettingsScene
│   │   ├── state/              # StateManager stack, Scene lifecycle, SceneTransition fades
│   │   └── ui/                 # Button, Tooltip (ⓘ), FFTVisualizer, ToastManager
│   └── __tests__/              # Automated TypeScript verification suites (e.g. shop-config.test.ts)
├── server/                     # Backend Node.js Services
│   ├── index.js                # Port 6065: Socket.io MMO/Lobby/Tournament server + CORS REST API (/healthz, /stats, /maps, /leaderboards)
│   └── ai_proxy.js             # Port 6066: Express Generative AI Proxy (OpenAI DALL-E/GPT + offline Mock Mode)
├── cpp_port/                   # C++17 engine port & Emscripten WebAssembly physics bridge
├── data/                       # Hydrated static assets (maps_v2/, doors.json, sprites/, audio/, lancedb/)
├── scripts/                    # local-ops.ps1 + Hetzner deploy/verify scripts + scripts/archive/
└── submodules/bobui/           # BQt (v1.2.60) Go/C++ runtime + nested juce & ultimatepp submodules
```
