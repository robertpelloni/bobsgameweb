# MEMORY: okgame Architectural Observations
- **Technology Stack:** TypeScript, PixiJS (rendering), Howler.js (audio), Vite (build tool), Electron/Capacitor (deployment).
- **Audio:** `AudioManager` handles SFX and music, including support for Tracker modules (MOD, XM, S3M) via `chiptune3`.
- **Legacy Recovery:** Current focus is on the "Great Recovery" phase, indexing Java metadata and importing assets via a dedicated pipeline.
- **Entity System:** Yuu (main character) supports 8-directional movement (64 frames), while standard NPCs are 4-directional (32 frames).
- **Blah System:** NPCs use pitching 'blah' sounds to simulate speech during dialogue.
## Architecture shift towards WebGPU
For Phase 3, we have successfully implemented a WebGPU Proof of Concept particle system (`WebGPUParticleSystem.ts`) and an integration scene (`WebGPUDemoScene.ts`). Moving forward, high performance rendering loops should target WebGPU compute shaders where applicable while falling back to WebGL when unsupported. The core pipeline is validated against Vite and PIXI.js.

## Deployment Notes
- **Deployment Anomalies (Sandbox Blocked):** Executing `deploy-frontend-hetzner.sh` and `verify-production-stack.sh` within the current automated sandbox environment consistently times out. Outbound SSH connections and HTTP requests to external hosts (like `5.161.250.43` and `ws.bobsgame.com`) are blocked by the firewall. The deployment pipeline is otherwise structurally sound and tested locally.
