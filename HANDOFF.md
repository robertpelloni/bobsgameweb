# Handoff — 2026-05-21 — Version 3.0.7

## Agent
Jules (Software Engineer)

## Session Summary
Successfully implemented automated rollback capabilities for the Hetzner deployment pipeline and established a comprehensive documentation foundation. Also achieved significant progress on engine feature parity, specifically in audio simulation and directional movement.

## What Was Completed

### 1. Foundational Documentation & Workflow
- Created `README.md` to document development, build, and deployment workflows.
- Established `VISION.md`, `MEMORY.md`, `ROADMAP.md`, and `TODO.md` as per core project directives.
- Updated `package.json` with `deploy:hetzner` script.

### 2. Automated Rollback Pipeline
- Implemented `scripts/deploy-with-rollback.sh`.
- **Strategy:** Creates a remote backup of the production directory before deployment. Runs `scripts/verify-production-stack.sh` post-deployment.
- **Auto-Rollback:** Automatically restores the backup if deployment or verification fails.

### 3. "Blah" System Refactor & Audio
- Moved dialogue audio logic into `TypedTextWriter` in `src/renderer/engine/text/TextEngine.ts`.
- Dialogue now automatically plays random-pitched 'piece_move' sounds (simulating the 14 legacy "blah" sounds) during text reveal.
- Hooked interactive SFX: Footstep sounds in `DemoWorld.ts` movement and door sounds in transitions.

### 4. 8-Directional Movement Support
- Updated `DemoWorld.ts` movement logic to support 8-way directional input.
- Added eye-rendering offsets for all 8 directions in `renderCharacter`.
- **Direction Indexing:** 0=D, 1=DL, 2=L, 3=UL, 4=U, 5=UR, 6=R, 7=DR.

## Production Actions Performed
- Updated `VERSION.md` to **3.0.7**.
- Updated `CHANGELOG.md` with rollback and audio milestones.
- Committed all changes to the feature branch.

## Crucial Technical Insight
- **The "Blah" System:** Implemented! `DemoWorld.ts` now triggers pitched `piece_move` sounds via `AudioManager` when characters speak.
- **8-Directional Movement:** Yuu's sprite metadata (ID 794/796) confirms 8-directional support (64 frames), whereas standard NPCs are 4-directional (32 frames).
- **Tracker Support:** The engine currently lacks native playback for the 40+ Tracker files (.mod/.s3m). These either need a WASM tracker library or pre-conversion to OGG.
- **Legacy Map Dialogue Parsing:** Note that current java-extracted JSON maps (e.g. `map_10.json`) do not seem to include an `entities` or `dialogue` field in their exported structure yet. This needs to be exported from Java before `importLegacyMap` can ingest it.

## Highest-Value Next Steps
1. **Audio Implementation:** Hook the SFX library (IDs 0-87) into the `AudioManager` for interactive events (doors, footsteps).
2. **8-Directional Animation:** Update the renderer to support the 64-frame Yuu animations confirmed in the registry.
3. **Collision Parity:** Use the extracted `hitBoxFromTop` values (24px for kids, 30px for adults) to fix depth-sorting and collision bugs in the modern engine.
