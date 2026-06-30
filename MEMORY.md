# PROJECT_MEMORY (merged with jules-port-legacy v3.0.12)

## Overview

`bobsgameweb` (okgame) is a high-performance TypeScript/PIXI.js reimplementation of the "bob's game" engine. It bridges retro 2D gameplay with modern web tech (WebGPU, Wasm, AI) to support massive regional clustering (MMO) and high-fidelity effects while maintaining 1:1 legacy parity.

## Architectural Patterns

### 1. Entity Component System (ECS)

- **Centralized Logic**: `src/renderer/engine/ecs/` decouples data (`Components`) from logic (`Systems`).
- **Core Systems**: `RenderSystem`, `BehaviorSystem`, `Physics`, `PathfindingSystem`, and `WeatherSystem`.
- **Standard Components**: `Transform`, `Sprite`, `Combat`, `Interaction`, `Quest`, `Inventory`.

### 2. Scene Management

- **StateManager**: A self-contained scene stack (e.g., `WorldScene`, `BattleScene`, `MenuScene`).
- **Transition Layer**: `SceneTransition` provides visual effects (fades) during scene shifts.

### 3. Rendering Pipeline (PIXI.js v8)

- **Dual Pipeline**: Automatic WebGL/WebGPU switching.
- **WebGPU Particles**: WGSL compute shaders for 100k+ particles with direct storage buffer rendering.
- **HQ2X Upscaling**: Edge-aware upscaling for character sprites and assets.
- **Depth Sorting**: Metadata-driven `hitBoxFromTop` (30px/24px) ensures correct Y-sorting for living entities.

### 4. Physics & Movement

- **Broad-phase**: Spatial Grid partitioning (128px cells) for $O(N)$ efficiency.
- **Narrow-phase**: AABB collision detection with a **Wasm Physics Bridge** (C++ backend) for high-density scenarios.
- **8-Directional Movement**: Includes "parity turning" (transitions through diagonals) to match legacy visual behavior.
- **Collision Rules**: Tile-based collision using `WALL_IDS`, `FLOOR_IDS`, and `extra` layer markers.

### 5. AI-Driven Ecosystem

- **Generative Assets**: Text-to-sprite and text-to-dialogue generation integrated into the World Editor.
- **Conversational NPCs**: Persistent chat history using `persona` and `mood` metadata.

### 6. Network & Scaling

- **Spatial Partitioning**: Map-specific Socket.io rooms to minimize global bandwidth.
- **Binary Compression**: `pako` (zlib) compression for world sync packets > 512 bytes.
- **Interpolation**: Client-side exponential decay lerping for remote players.

## Technical Decisions

- **Submodule Assimilation**: Removed 31 redundant submodules (Aseprite, Ogmo, etc.) and ported their core logic to TypeScript to reduce technical debt.
- **Environment Detection**: `PerformanceManager` optimizes assets (prioritizing OGG) for mobile or low-end hardware.
- **Wasm Migration**: Strategic migration of CPU-heavy logic (physics, pathfinding) to C++ via Emscripten.

## Implementation Details (v3.0.22)

- Standardized character interaction via an `interactionMode` state machine.
- Integrated high-performance particle effects (dust, rain, fire) into `WorldScene`.
- Full integration test suite (32+ files) verified at 100% pass rate.
- **Audio**: `AudioManager` handles SFX and music, including Tracker modules (MOD, XM, S3M) via `chiptune3`.
- **Entity System**: Yuu supports 8-directional movement (64 frames), NPCs 4-directional (32 frames).
- **Blah System**: NPCs use pitching 'blah' sounds to simulate speech during dialogue.
