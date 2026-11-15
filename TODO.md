# TODO: `okgame` (`bobsgameweb`) Granular Tasks

## Completed (`v3.0.34` – `v3.0.35`)
- [x] Synchronize `submodules/bobui` (`bqt`) to `v1.2.60` (`92bb40654b`) and verify nested `juce` (`9.0.5`) and `ultimatepp` (`master`) cleanliness.
- [x] Wire single-source `VERSION.md` dynamic version ingestion across `vite.config.ts`, `src/shared/Config.ts`, `src/main/index.ts`, `server/index.js`, and `server/ai_proxy.js`.
- [x] Fix missing HTTP CORS & `OPTIONS` preflight headers + add `/api/status` on `server/index.js` (`:6065`).
- [x] Redesign `MainMenuScene.ts` into a **single consolidated scrollable dashboard page** surfacing all 38 capabilities with visible inline descriptions, `ⓘ` tooltips, quick-jump section anchors (`1–5` / `Q·E`), inline `[MARATHON] [SPRINT] [ULTRA]` mode pills, and live dual-server (`:6065` & `:6066`) controls.
- [x] Consolidate `OptionsScene.ts` into `SettingsScene.ts` so Audio, Haptics, WebGPU, HQ2X HD Sprites, Ghost Piece, Pixel-Perfect scaling, Touch HUD, Auto-Login, and Player Name live on one page with tooltips.
- [x] Fix `Game.ts` + `WorldScene.ts` scene stack so default/deep-link `WorldScene` boots over `MainMenuScene`, add a 1-click `☰ Omni-Dashboard (Esc)` HUD button in `WorldScene`, and eliminate double `MainMenuScene.create()` invocation.
- [x] Fix Electron main/preload compilation (`tsconfig.main.json` `rootDir: "src/main"`, `CommonJS` + `dist/main/package.json`), guard `electron-squirrel-startup`, migrate AI Proxy default port from `8080` to `6066`, add `/healthz` service-identity verification (`6065`/`6066`), and lower child server priority to `BelowNormal`.
- [x] Update `HelpScene.ts` with mouse-wheel scrolling and full documentation of the Consolidated Dashboard, Unified Settings, World HUD shortcuts, and System Tray daemons.
- [x] Add `scripts/local-ops.ps1` (`BelowNormal` PID-tracked process manager), update `build.bat` & `start.bat` to `BelowNormal` priority, and non-destructively archive obsolete one-off scripts into `scripts/archive/`.
- [x] Unify `AGENTS.md` master instructions and align `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`, `VISION.md`, `MEMORY.md`, `DEPLOY.md`, `IDEAS.md`, `STRUCTURAL_MAP.md`, `.memory/main.md`, and `HANDOFF.md`.

## Upcoming / Actionable Backlog
- [ ] Extract legacy pixel-art `DoorDown*` / `DoorUp*` sprite frames into `data/sprites/sprite_atlas.{png,json}` and `sprite_animations.json`.
- [ ] Wire map entity `nonWalkable`, `ignoreHitLayer`, and `ignoreHitPlayer` flags directly into `HitDetectionSystem` `Collider` instances.
- [ ] Add live type-ahead filter bar on `MainMenuScene.ts` to filter the 38 dashboard cards by keyword.
- [ ] Add `#cartridge=` compressed URL sharing for `CustomGameType` + `GameSequence` creations.
- [ ] Run `./scripts/deploy-with-rollback.sh` from an SSH-enabled workstation outside the port-22-restricted sandbox to cut over `bobsgame.com` and `ws.bobsgame.com` to `v3.0.35`.
