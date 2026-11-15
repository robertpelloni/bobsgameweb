# VISION: `bob's game` Omni-Engine (`okgame` / `bobsgameweb`)

## 1. Ultimate Goal
The ultimate goal of **`bobsgameweb` (`okgame`)** is to unify, preserve, and transcend the complete multi-decade `bob's game` universe—combining the **244-map / 726-door open-world RPG ("Yuu's Quest")**, the **universal customizable falling-block puzzle meta-engine**, **30-player real-time multiplayer & tournament esports**, **live in-engine creation tools**, and **Generative AI asset/dialogue synthesis**—into a **zero-friction, instant-loading WebGPU + WebAssembly + Electron Omni-Engine** accessible from any browser, desktop system tray, or mobile device.

## 2. Core Foundational Concepts
1. **1:1 Legacy Soul, Next-Gen Silicon Execution**
   - Every nuance of the v8830 Java/C++ engine is preserved—8-directional 64-frame character parity turning, pixel-accurate 1X (`8px`) hit detection (`HitDetectionSystem` + `doors.json` warp graphs), procedural `"Blah"` speech synthesis, tracker module playback (`MOD`/`XM`/`S3M` via `chiptune3`), and the embedded **nD** virtual handheld console.
   - Underneath that authentic pixel aesthetic runs a modern **PixiJS v8 WebGPU/WebGL2 renderer**, **WGSL compute-shader particle physics**, **C++ → WebAssembly batch collision acceleration (`cpp_port/`)**, and native cross-engine interoperability with **`BQt` (`submodules/bobui`)** (Go/C++/JUCE/Ultimate++).
2. **Every Player Is a Game Creator ("The Omni-Studio")**
   - `bob's game` was conceived around the idea that *every puzzle game ever made—and every puzzle game yet to be imagined—can be expressed inside one parametric engine and chained into sequences*.
   - The **Creation Studio** (`CustomGameEditorScene`, `GameSequenceEditorScene`, `WorldEditorScene`, `SpriteEditorScene`, `EventSheetEditorScene`) lives directly inside the runtime, augmented by a local/cloud **Generative AI Proxy (`:6066`)** for Text-to-Sprite, Text-to-Tileset, and living LLM NPC conversations.
3. **Single-Surface Clarity Over Menu Mazes**
   - A massive engine with 38+ distinct gameplay modes, editors, rankings, and diagnostics fails its users if 75% of its capabilities are buried behind nested tabs and submenus.
   - The **Consolidated Single-Page Omni-Engine Dashboard (`MainMenuScene`)** and **Unified Settings & Options (`SettingsScene`)** surface the entire ecosystem on scannable, scrollable, self-documenting pages with inline descriptions, `ⓘ` tooltips, live server health telemetry (`:6065` & `:6066`), and 1-click access from the RPG world (`☰ Omni-Dashboard`).
4. **Sovereign Local-First + Global MMO Hybrid**
   - Players and creators can run the entire stack offline on their own machine via `start.bat`, `scripts/local-ops.ps1`, or the **Electron System Tray** (`BelowNormal` background daemons, zero cloud lock-in, deterministic mock AI fallback), OR connect seamlessly to the shared Hetzner MMO & tournament cluster (`bobsgame.com` / `ws.bobsgame.com`).

## 3. User-Saving Propositions
- **Zero Setup Friction for Players**: Click a URL (even a compressed `#replay=` link!) and play immediately in 60+ FPS WebGPU/WebGL2—no multi-gigabyte installer required.
- **Zero Subpage Hunting**: Every game mode, RPG loadout screen, editor, leaderboard, setting, and server daemon toggle is visible, searchable by eye, and documented with hover tooltips.
- **Zero Lost Creative Work**: Non-destructive build pipelines (`emptyOutDir: false`, smart `copyPublicDir` asset hydration), multi-slot local + cloud save states, and shareable JSON/GZip game rulesets ensure player creations survive forever.
- **Host-Friendly Desktop Citizenship**: Electron System Tray minimization and `BelowNormal` CPU priority across build scripts and Node daemons guarantee `bob's game` never starves the user's workstation.
