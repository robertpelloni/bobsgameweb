# ROADMAP

## Current State
- Engine: okgame (bob's game web) TS/Vite project.
- Engine version: 2.2.7
- Completed features (partial): PixiJS integration, Multiplayer sockets, Custom game editor (Grid size, gravity, piece rules).
- Completed PIXI UI Migration for CustomGameEditor.
- Completed features (partial): PixiJS integration, Multiplayer sockets, Custom game editor (Grid size, gravity, piece rules).
- Recent updates: Bug fixes for PixiJS color crashing, audio CORS blocking, new engine modules (Cinematics System, RPG Event System).

## Short Term
- Consolidate game engine parity across 3 platforms (Web, C++, Java).
- Ensure 100% 1:1 functionality matching and surpassing Defold, Love2D, Phaser, Construct, GameMaker, and RPG Maker.

## Long Term
- Combine all features of 30+ 2D editors and tools into the ultimate omni-engine bgeditor.
- Port bgeditor to C++ using qt6 (robertpelloni/bobui).
- Web port of bgeditor.
- Full generative AI tool integration for asset generation (sprites, 3D models).
- Continuous deployment to Hetzner and auto-scaling.

## Engine Parity Roadmap
### Defold
- [ ] Match instant hot-reloading pipeline for scripts and assets.
- [ ] Implement component-based entity hierarchy mirroring Defold's collection system.
- [ ] Port/implement GUI builder node hierarchy natively within `bgeditor`.

### Love2D
- [ ] Ensure scripting API surface is completely decoupled and transparent (Lua-like simplicity in TS).
- [ ] Implement Box2D or identical physics abstraction module.
- [ ] Create simple pixel-shader pipeline accessible directly from custom game editor.

### Phaser
- [ ] Replicate Phaser's Arcade Physics for platformer/top-down modes.
- [ ] Ensure Scene Management can handle nested/parallel scenes with exact Phaser event hooks (`preupdate`, `postupdate`, etc.).
- [ ] Build visual timeline/tween editor directly into `bgeditor`.

### Construct
- [ ] Implement "Event Sheets" (Visual Scripting) compiling down to our RPG Event format.
- [x] Behavior components (Platformer, 8-Direction, Bullet, Pathfinding) out of the box.
- [ ] Instant preview via hidden iframe / web worker (like Construct 3).

### GameMaker
- [ ] Tightly coupled Image Editor <-> Room Editor workflow (click sprite -> edit -> auto-updates in room).
- [ ] Advanced tiling (auto-tiling, animated tiles, isometric support) matching GM's Room Editor.
- [ ] Dedicated Sequence (Animation/Timeline) editor.

### RPG Maker
- [ ] Comprehensive relational database editor (Items, Weapons, Armor, Enemies, Troops, States, Animations).
- [ ] Map editor with 3-layer auto-tiling logic specifically mimicking RPG Maker XP/VX.
- [ ] Battle screen layout customizer (Front-view, Side-view).
