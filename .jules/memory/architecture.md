### **Project Architecture & Design Summary**

`bobsgameweb` (okgame) is a high-performance, hybrid-engine implementation of the "bob's game" universe. It is built to bridge the gap between retro 2D pixel art and modern web capabilities, supporting massive regional clustering (MMO) and compute-heavy visual effects.

#### **1. Core Architectural Pillars**
*   **Entity Component System (ECS):** The engine uses a custom ECS (`src/renderer/engine/ecs/`) to decouple game data from logic. Systems such as `Physics`, `RenderSystem`, and `BehaviorSystem` operate on entities with specific component signatures (e.g., `TransformComponent`, `SpriteComponent`).
*   **Scene Management:** Managed by a `StateManager` stack. Each scene (e.g., `WorldScene`, `BattleScene`, `VisualizerScene`) is an isolated environment with its own update/render lifecycle.
*   **State Machine Interaction:** Interaction logic in `WorldScene.ts` follows a dedicated state machine (`normal`, `dialogue`, `chat_choice`, `chatting`). This prevents overlapping input listeners and manages the transition between static legacy dialogue and dynamic AI chat.

#### **2. Rendering & Graphics**
*   **PIXI.js v8 Integration:** Uses a dual-pipeline renderer that prefers WebGPU for modern hardware while maintaining a WebGL fallback.
*   **Compute-Driven Particles:** The `WebGPUParticleSystem` uses WGSL compute shaders to simulate 100k+ particles directly on the GPU, feeding into a vertex shader for high-performance rendering.
*   **HQ2X Upscaling:** Real-time, edge-aware upscaling is available for legacy assets, ensuring they look sharp on high-DPI displays without losing pixel art integrity.
*   **Metadata-Driven Sorting:** Living entities are Y-sorted using legacy hit-box offsets (30px for adults, 24px for children) to ensure 1:1 visual parity with the original game.

#### **3. Performance & Multiplayer Scaling**
*   **Spatial Partitioning:** The world is divided into map-specific Socket.io rooms to minimize broadcast noise.
*   **Wasm Physics Bridge:** Narrow-phase collision detection and batch array processing are offloaded to a C++ backend (`cpp_port/`) via WebAssembly, achieving $O(N)$ efficiency.
*   **Network Optimization:** Uses `pako` (zlib) for binary compression of synchronization packets and exponential decay interpolation to eliminate movement jitter for remote players.

#### **4. AI-Driven Ecosystem**
*   **Generative Pipeline:** Integrated `GenerativeAIManager` facilitates text-to-sprite and text-to-dialogue generation, allowing for dynamic NPC and asset creation directly within the `WorldEditor`.
*   **Conversational NPCs:** NPCs support persistent chat history and are characterized by `persona` and `mood` metadata stored in the `RPGDatabase`.

#### **5. Mobile & UX Refinement**
*   **Mobile-First Controls:** The `TouchControls` system mimics a handheld console with a virtual analog joystick and dedicated action buttons (A, B, E, INV, QST, RUN).
*   **Haptic Integration:** Tactile feedback is integrated into all virtual interactions via the `navigator.vibrate` API, with user-configurable intensity.

---

### **Current Version: v3.0.24**
*   **Modernization (Phase 3):** 100% Complete.
*   **Expansion (Phase 4):** In progress. Focusing on high-density performance and cross-platform multiplayer hardening.

I will now update the plan to focus on the next logical performance milestone: migrating the A* pathfinding logic to the Wasm layer.
#### **6. WebGPU Validation & Deployment**
*   **WebGPU Integration Status:** The `WebGPUParticleSystem` with WGSL compute shaders is fully integrated locally into `WeatherRenderer.ts`. It correctly uses `navigator.gpu` to verify hardware availability and gracefully falls back to legacy WebGL particles if unavailable.
*   **Wasm/Visualizer Sync:** The visualizer rendering loop in the engine requires precise integration with Wasm and native bindings to correctly sync high-density workloads (like FFT-driven frequency bands mapping to Wasm logic). This integration is present in the `main` branch codebase.
*   **Deployment Constraints:** Because outbound SSH access is structurally restricted (blocked port 22) in the local sandbox environment, automated frontend deployments via `deploy-frontend-hetzner.sh` will timeout and fail.
*   **Production State Mismatch:** Due to this sandbox constraint, the live Hetzner deployment at `bobsgame.com` is out-of-sync. Automated verification scripts via `verify-production-stack.sh` confirm that WebGPU chunks (`particle.wgsl`, `WebGPUParticleSystem`) are successfully built in local bundles but are *missing* in production. The deployment must be executed manually by the supervisor.
