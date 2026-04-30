# IDEAS: bobsgameweb Improvements

## 1. Engine & Rendering
- **WebGPU Migration:** Evaluate `pixi.js` WebGPU backend vs WebGL for potentially smoother 144hz+ puzzle rendering on modern devices.
- **Particle System Rewrite:** Replace the custom simple particle arrays in `MainMenuScene` with `@pixi/particle-emitter` for explosive line clears and garbage dumps without hitting the CPU.

## 2. Gameplay & Polish
- **Interpolated Drops:** Add tweening to piece drops rather than instantaneous grid snapping, allowing for a smoother, modern feel (like Tetris Effect).
- **Dynamic Camera:** Implement slight camera zooms/shakes when hitting a Tetris/bob's game or receiving massive VS garbage.
- **Visualizer Backgrounds:** Since `projectM` or `MilkDrop` native isn't easily possible on the web, integrate an FFT-driven WebGL shader background that reacts to the tracker music in real-time.

## 3. Architecture & State
- **Zustand or Redux:** For UI state outside the game canvas (Lobby, Settings, Custom Game Rules), integrate a lightweight state manager so React/Preact can be mounted over the Pixi canvas for complex UI rather than building DOM elements dynamically via JS strings.
- **WebRTC P2P:** For multiplayer, instead of routing all frames through the central TCP/Socket.io server, establish a WebRTC data channel for direct P2P low-latency input syncing.

## 4. Portability
- **Capacitor Hardening:** Refine the touch controls (on-screen D-Pad and rotation buttons) to ensure the mobile web build plays perfectly in Capacitor on iOS/Android.

## 5. Asset Pipeline
- **IndexedDB Caching:** Use `localforage` not just for high scores, but to heavily cache the S3 `.xm` tracker files and textures, allowing the game to function entirely offline as a PWA after the first load.
