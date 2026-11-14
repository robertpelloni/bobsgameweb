# TODO: okgame (`bobsgameweb`) Granular Tasks

## Completed
- [x] Hook SFX library (IDs 0-87) into `AudioManager`.
- [x] Implement 8-directional animations for Yuu (64 frames) using `data/sprites/yuu.json`.
- [x] Fix depth-sorting and collision bugs using extracted `hitBoxFromTop` values (24px for kids, 30px for adults).
- [x] Implement `YuuEntity` class to centralize player logic and animations.
- [x] Standardize NPC logic with `NPCEntity` hub.
- [x] Fix server-side scoping and emit bugs in `server/index.js`.
- [x] Optimize audio by prioritizing OGG variants in performance-constrained environments.
- [x] Implement system path configuration for external tool launching (Aseprite, Tilemap Studio) in `CustomGameEditor.ts`.
- [x] Implement AI sprite/tileset processing and wiring in `GenerativeAIManager.ts` and `CustomGameEditor.ts`.
- [x] Implement rate-limiting and input validation for RPG world sync packets.
- [x] Implement unified particle system and integrate into `WorldScene`.
- [x] Refactor weather and footstep effects to use a unified particle system.
- [x] Evaluate `bobui` C++ integration with `cpp_port/` and implement Wasm bridge skeleton.
- [x] Implement AI-driven NPC Dialogue generation in `WorldEditor`.
- [x] Implement FFT-driven Audio Visualizer (FFTVisualizer & ProjectM/Butterchurn).
- [x] Implement real-time AI NPC chat in `WorldScene`.
- [x] Implement WebGPU-Ready Particle System skeleton and hardware detection.
- [x] Implement full WebGPU-based compute-shader particle demo.
- [x] Finalize `chiptune3.worklet.js` UTF8 string handling (v3.0.18).
- [x] CRITICAL: Fix `isHitTile()` — HitDetectionSystem called before legacy fallback, blocking all movement.
- [x] CRITICAL: Fix `isHitTile()` — `FLOOR_IDS` checked before `WALL_IDS`, walls didn't block.
- [x] Connect `WasmPhysicsBridge` to actual physics loop (`checkBatchCollisions`).
- [x] Wire `WebGPUParticleSystem` fully into `WeatherRenderer` with WGSL hardware detection.
- [x] Implement Electron System Tray, single-instance lock, and AI Proxy status/lifecycle controls (`MainMenuScene` & `src/main/index.ts`).
- [x] Restore & wire ECS `SpriteComponent` door rendering (`doors.json` lookup + procedural variant fallback + `F2`-toggled debug trigger overlay) in `WorldScene.ts`.
- [x] Optimize `vite.config.ts` `copyPublicDir` so `npm run build` skips re-copying 2.5 GB `data/` when `dist/renderer/maps_v2` is already present.
- [x] Add root Windows execution scripts (`build.bat`, `start.bat`, `setup.bat`) and update `tools_build.sh`.
- [x] Update `.gitignore` to ensure databases (`*.db`), `.memory/branches/*/log.md`, and session logs remain tracked while ignoring `build_output/` CMake probe trees.
- [x] Synchronize `submodules/bobui` (`bqt` `v1.2.52`) and nested `juce` (`9.0.5`) + `ultimatepp` (`master`) submodules, and unify version `3.0.34` (`v3.0.34`) across all metadata files.

## Upcoming / Open
- [ ] Extract pixel-art `Door*` sprite sheets from legacy archive into `data/sprites/sprite_atlas.{png,json}` and `sprite_animations.json`.
- [ ] Wire entity `nonWalkable`, `ignoreHitLayer`, and `ignoreHitPlayer` flags from map entity metadata directly into `HitDetectionSystem` `Collider` instances.
- [ ] Deploy `v3.0.34` frontend bundle (`dist/renderer/index.html` + `dist/renderer/assets/`) and `server/` (`3.0.34`) to Hetzner production (`/srv/www/bobsgame.com` & `ws.bobsgame.com`).
- [ ] Expand automated Vitest/Playwright smoke coverage for map transitions, door triggers, and multiplayer room sync.
