# Production Stabilization — v3.0.2

## Context
The project had already recovered the critical `DebugConsole` startup crash and restored legacy maps 5–10 into `data/maps/`, but the tracked documentation and several runtime metadata files were still inconsistent.

The result was an avoidable mismatch between:
- the intended release version
- the frontend version displayed to players
- the backend `/healthz` version
- replay/achievement/cache metadata
- the current handoff and changelog documents

## Goals
1. Make the live version number truthful everywhere that matters.
2. Keep frontend and backend deployment metadata aligned.
3. Preserve a clear implementation record for the post-recovery production state.
4. Re-verify the production stack after alignment.

## Implemented Changes
### Version synchronization
The following files were aligned to `3.0.2`:
- `VERSION.md`
- `package.json`
- `package-lock.json`
- `src/shared/Config.ts`
- `server/index.js`
- `server/package.json`
- `server/package-lock.json`

### Frontend version display
`src/renderer/scenes/MainMenuScene.ts` was updated so the bottom-right version label uses `APP_VERSION` instead of a hard-coded string.

This removes a recurring source of drift where the config/runtime version changed but the main menu still displayed an older release.

### Ancillary metadata cleanup
The following version-tagged outputs were also aligned to `3.0.2`:
- replay exports in `src/shared/puzzle/Replay.ts`
- achievement snapshot exports in `src/renderer/data/AchievementManager.ts`
- default backend achievement snapshot payload in `server/index.js`
- IndexedDB cache version in `src/renderer/engine/shared/Cache.ts`

## Deployment / Verification Workflow Used
### Local verification
- `npx vite build`
- `npm run typecheck` was also run, but it still surfaces pre-existing repository-wide TypeScript errors unrelated to the version-sync work documented here

### Backend drift inspection
- `BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com ./scripts/audit-backend-drift.sh`

### Production validation
- `BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh`

This verifies:
- backend root and `/healthz`
- Socket.io polling endpoint
- frontend asset references
- embedded backend origin in deployed JS bundles
- editor markers
- critical lazy-loaded runtime chunk families

## Production Hosts
### Frontend
- Host: `5.161.250.43`
- Path: `/srv/www/bobsgame.com`
- Public URL: `https://bobsgame.com`
- Important note: checked-in docs/scripts previously referenced `/var/www/bobsgame.com/current`, but the live nginx config actually serves from `/srv/www/bobsgame.com`

### Backend
- Public URL: `https://ws.bobsgame.com`
- Remote path: `/opt/bobsgameweb/server`
- Service: `bobsgameweb-server`
- Additional production fix: restored `bobsgame:bobsgame` ownership on `/opt/bobsgameweb/server` so periodic profile persistence can write `profiles.json` successfully again

## Related Functional State
### Restored legacy maps
The recovered interior maps remain present as deployed content:
- `data/maps/map_5.json`
- `data/maps/map_6.json`
- `data/maps/map_7.json`
- `data/maps/map_8.json`
- `data/maps/map_9.json`
- `data/maps/map_10.json`

These regenerate successfully via:
```bash
node scripts/convert_maps.js
```

### Important limitation
The restored maps exist as data assets, but they are **not yet fully wired into active gameplay traversal**. `MapDataRegistry` still centers runtime map registration around the procedural `townyuu`, `dark_forest`, `beach`, and `dragon_lair` flow.

## Follow-Up Recommendations
1. Add explicit warp/door/world integration for restored maps 5–10.
2. Continue extracting additional legacy maps and sprite assets from `bobsgame_v8830.zip`.
3. Keep version bumps and deployment verification coupled so future releases do not drift across frontend/backend/docs.
4. Continue roadmap execution on P2P multiplayer and quest/content expansion after the content wiring work.
