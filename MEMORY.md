# MEMORY: okgame Architectural Observations
- **Technology Stack:** TypeScript, PixiJS (rendering), Howler.js (audio), Vite (build tool), Electron/Capacitor (deployment).
- **Audio:** `AudioManager` handles SFX and music, including support for Tracker modules (MOD, XM, S3M) via `chiptune3`.
- **Legacy Recovery:** Current focus is on the "Great Recovery" phase, indexing Java metadata and importing assets via a dedicated pipeline.
- **Entity System:** Yuu (main character) supports 8-directional movement (64 frames), while standard NPCs are 4-directional (32 frames).
- **Blah System:** NPCs use pitching 'blah' sounds to simulate speech during dialogue.
- **Global Project Version:** 3.0.12
- **AI Asset Ingestion:** `MapEditor` supports direct loading of AI-generated assets. Sprites are scaled to 128x128. Tilesets are sliced into 8x8 tiles with nearest-neighbor palette matching against the current project palette.
- **Server Hardening:** The WebSocket server implements per-socket rate-limiting for high-frequency gameplay and chat events. Input validation and HTML stripping are applied to all incoming event payloads.
