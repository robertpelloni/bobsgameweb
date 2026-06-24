# TODO: okgame Granular Tasks
- [x] Hook SFX library (IDs 0-87) into `AudioManager`.
- [x] Implement 8-directional animations for Yuu (64 frames) using `data/sprites/yuu.json`.
- [x] Fix depth-sorting and collision bugs using extracted `hitBoxFromTop` values (24px for kids, 30px for adults).
- [x] Implement `YuuEntity` class to centralize player logic and animations.
- [x] Standardize NPC logic with `NPCEntity` hub.
- [x] Fix server-side scoping and emit bugs in `server/index.js`.
<<<<<<< HEAD
<<<<<<< HEAD
- [ ] Optimize Tracker playback or pre-convert to OGG.
- [ ] Implement system path configuration for external tool launching (Aseprite, Tilemap Studio) in `CustomGameEditor.ts`.
- [ ] Evaluate `bobui` C++ integration with `cpp_port/` as the engine matures.
=======
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
- [ ] Connect `WasmPhysicsBridge` to actual physics loop for performance.
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
- [ ] Optimize Tracker playback or pre-convert to OGG.
- [ ] Implement system path configuration for external tool launching (Aseprite, Tilemap Studio) in `CustomGameEditor.ts`.
- [ ] Evaluate `bobui` C++ integration with `cpp_port/` as the engine matures.
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
