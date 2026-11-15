# IDEAS: `bob's game` Omni-Engine — Aggressive Architectural & Gameplay Roadmap

## 1. Living Cloud World & Generative Gameplay (`ws.bobsgame.com`)
1. **Persistent Global Town Memory & Rumor Propagation (`LanceDB` + `ws.bobsgame.com`)**
   - Wire `/srv/www/bobsgame.com/lancedb/` directly into the unified Hetzner backend (`server/index.js` `/api/chat` & `/api/generate/dialogue`) so NPCs across `TOWNYUU` and `CITYCity` remember past player conversations, tournament victories, and quest choices—and gossip about real online players visiting their neighborhood!
2. **In-World Arcade Cabinets & Playable nD Cartridges**
   - Bind interactive arcade cabinets, bedroom TVs, and nD kiosks inside `WorldScene` directly to `GameSequence` playlists—walking up to a cabinet in Bob's Apartment or the Casino launches a bespoke puzzle challenge with wagers in RPG Gold (`\$19.99`) and live Hetzner regional cabinet high-score plaques!
3. **Puzzle-Combat Hybrid Boss Encounters ("nD Overdrive Battles")**
   - Add a third battle mode combining `BattleScene` and `PuzzleScene`: clearing SRS T-Spins or 4-line combos charges RPG spell meters and sends garbage shockwaves that stagger MMO raid bosses on `ws.bobsgame.com` in real time.

## 2. Engine, Wasm & `BQt` (`bobui`) Convergence
4. **Full Legacy Door & Prop Atlas Extraction Pipeline**
   - Write an automated extractor script (`scripts/extract-door-sprites.mjs`) to decode the remaining `DoorDownBrownGoldKnob` / `DoorUp*` / animated shop-door pixel sheets into `data/sprites/sprite_atlas.{png,json}`—instantly upgrading `WorldScene` from its palette-matched procedural door graphics to authentic multi-frame opening/closing animations with zero scene code changes!
5. **WebGPU Lighting + Normal-Mapped 2D Pixel Shaders**
   - Upgrade `LightingSystem` from 2D radial alpha masks to a single-pass WGSL deferred point-light shader casting soft pixel-stepped shadows off `MAP_HIT_LAYER` walls and flickering torches.
6. **Zero-Copy SharedArrayBuffer Worker Ring for Massive 100-Player Rooms**
   - Stream compressed binary puzzle grids (`Uint8Array` + `pako`) from `wss://ws.bobsgame.com` through a `WebWorker` ring buffer so 30–100 simultaneous opponent boards render in a single instanced PixiJS `ParticleContainer` draw call at 120 FPS.
7. **Native `BQt` (`submodules/bobui` v1.2.60) C++/Go Cloud Client Bridge**
   - Connect `submodules/bobui` native desktop clients directly to `wss://ws.bobsgame.com` so web browsers, Electron clients, and native C++/Go `BQt` builds share the exact same live MMO lobbies and tournaments!

## 3. Creator Economy & Esports Polish
8. **1-Click URL Cartridge Sharing (`https://bobsgame.com/#cartridge=<GZipBase64>`)**
   - Extend `BobNet.toBase64GZippedGSON` beyond replays so creators can share an entire `CustomGameType` + `GameSequence` + custom sprite palette as a single `https://bobsgame.com/#game=...` link playable instantly on click.
9. **Frame-Accurate Replay Scrubber & Ghost Race Mode**
   - Add a timeline scrubber + "Take Over From Here" button in Replay playback, plus "Race Against Replay Ghost" in Sprint (40L) mode so players compete side-by-side against any shared `#replay=` link!
10. **Live Dashboard Search / Filter Type-Ahead**
    - Typing letters directly on the Consolidated Omni-Engine Dashboard (outside hotkeys) dynamically highlights matching cards across all 5 sections for instant power-user launching.
