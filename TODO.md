# TODO: `okgame` (`bobsgameweb`) Granular Tasks

## Completed (`v3.0.34` – `v3.0.36`)
- [x] Synchronize `submodules/bobui` (`bqt`) to `v1.2.60` (`92bb40654b`) and verify nested `juce` (`9.0.5`) and `ultimatepp` (`master`) cleanliness.
- [x] Wire single-source `VERSION.md` dynamic version ingestion across `vite.config.ts`, `src/shared/Config.ts`, `src/main/index.ts`, and `server/index.js`.
- [x] Redesign `MainMenuScene.ts` into a **single consolidated scrollable dashboard page** surfacing all 37 capabilities with visible inline descriptions, `ⓘ` tooltips, quick-jump section anchors (`1–5` / `Q·E`), inline `[MARATHON] [SPRINT] [ULTRA]` mode pills, and live `Hetzner Cloud (ws.bobsgame.com)` health telemetry.
- [x] Consolidate `OptionsScene.ts` into `SettingsScene.ts` so Audio, Haptics, WebGPU, HQ2X HD Sprites, Ghost Piece, Pixel-Perfect scaling, Touch HUD, Auto-Login, and Player Name live on one page with tooltips.
- [x] Fix `Game.ts` + `WorldScene.ts` scene stack so default/deep-link `WorldScene` boots over `MainMenuScene`, add a 1-click `☰ Omni-Dashboard (Esc)` HUD button in `WorldScene`, and eliminate double `MainMenuScene.create()` invocation.
- [x] **Eliminate all local servers (`v3.0.36`)**: Remove `localhost:6065` / `127.0.0.1:6066` / `localhost:3001` fallbacks across `Config.ts`, `GenerativeAIManager.ts`, `DemoWorld.ts`, `BobNet.ts`, `MainMenuScene.ts`, `HelpScene.ts`, `src/main/index.ts`, `src/main/preload.ts`, `package.json`, and `start.bat`; archive `ai_proxy.legacy.js` and `local-ops.legacy.ps1`.
- [x] **Unify Generative AI endpoints into `server/index.js` (`v3.0.36`)**: Serve `/api/generate/sprite`, `/api/generate/tileset`, `/api/generate/dialogue`, and `/api/chat` directly from `https://ws.bobsgame.com`.
- [x] **Deploy `v3.0.36` live to Hetzner (`5.161.250.43`)**: Upgrade `deploy-with-rollback.sh`, `deploy-frontend-hetzner.sh`, `deploy-backend-vps.sh`, and `check-backend-host.sh` to preserve live player profiles and big-data assets while deploying and verifying `https://bobsgame.com` and `https://ws.bobsgame.com`.

## Upcoming / Actionable Backlog
- [ ] Extract legacy pixel-art `DoorDown*` / `DoorUp*` sprite frames into `data/sprites/sprite_atlas.{png,json}` and `sprite_animations.json` and sync updated sprite sheets to Hetzner `/srv/www/bobsgame.com`.
- [ ] Wire map entity `nonWalkable`, `ignoreHitLayer`, and `ignoreHitPlayer` flags directly into `HitDetectionSystem` `Collider` instances.
- [ ] Add live type-ahead filter bar on `MainMenuScene.ts` to filter the 37 dashboard cards by keyword.
- [ ] Add `#cartridge=` compressed URL sharing for `CustomGameType` + `GameSequence` creations on `https://bobsgame.com`.
- [ ] Wire Hetzner `lancedb/` vector memory into `server/index.js` (`/api/chat` & `/api/generate/dialogue`) for persistent town NPC memory.
