# Legacy Map Loading — v3.0.4

## Goal
Finish the broader Yuu-house interior conversion pass so the first legacy house cluster is no longer limited to only a partial subset of rooms.

## Context
The previous loading pass made the initial Yuu-house cluster playable, but it still left several directly connected house rooms unconverted or not loaded at runtime.

That meant the game could enter some restored legacy interiors, but not yet traverse the larger connected house graph.

## What Changed

### 1. Conversion scope expanded
`scripts/convert_maps.js` now converts **12** legacy Yuu-house maps instead of only the earlier subset.

Converted outputs now include:
- `map_5.json` → `TOWNYUU Downstairs`
- `map_6.json` → `TOWNYUU Upstairs`
- `map_7.json` → `TOWNYUU Upstairs Parents Room`
- `map_8.json` → `TOWNYUU Basement`
- `map_9.json` → `TOWNYUU Garage`
- `map_10.json` → `TOWNYUU Attic`
- `map_11.json` → `TOWNYUU Downstairs Bathroom`
- `map_12.json` → `TOWNYUU Upstairs Yuu's Room`
- `map_13.json` → `TOWNYUU Upstairs Baby Room`
- `map_14.json` → `TOWNYUU Upstairs Brothers Room`
- `map_15.json` → `TOWNYUU Upstairs Bathroom`
- `map_16.json` → `TOWNYUU Backyard Tool Shed`

### 2. Transition resolution improved
The conversion pipeline now:
- preserves unresolved negative arrival coordinates during parse
- resolves missing destination spawn points against converted destination doors / warp areas when possible
- applies small manual fixes where legacy metadata is self-referential or inconsistent (notably garage/attic and downstairs bathroom edge cases)

### 3. Manifest expanded
`data/maps/legacy-house-manifest.json` now includes the expanded 12-map conversion set.

### 4. Runtime loading unchanged in architecture, expanded in content
The runtime path added previously remains the same:
- `ClientGameEngine` loads the static manifest
- `DemoWorld` handles loaded-map doors/warps and transitions

But the actual traversable map graph is now much larger because more converted maps are present and named correctly for runtime transition lookup.

## Current Reachable Converted House Graph
The currently converted-and-wired interior graph now includes:
- Downstairs ↔ Upstairs
- Downstairs ↔ Downstairs Bathroom
- Downstairs ↔ Basement
- Downstairs ↔ Garage
- Upstairs ↔ Parents Room
- Upstairs ↔ Yuu's Room
- Upstairs ↔ Baby Room
- Upstairs ↔ Brothers Room
- Upstairs ↔ Upstairs Bathroom
- Garage ↔ Attic

## Notes on the Tool Shed
`TOWNYUU Backyard Tool Shed` is now converted and loaded as an asset, but it is not yet part of the currently reachable in-game traversal path because its live access path depends on exterior / neighborhood transitions that are not yet part of this converted runtime cluster.

## Verification
Executed locally:
- `node scripts/convert_maps.js`
- `npx vite build`

Executed against production after deploy:
- frontend deploy to `/srv/www/bobsgame.com`
- backend sync + restart
- `BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh`

## Remaining Follow-Up
1. Convert the exterior / neighborhood transitions that connect house exits and the tool shed.
2. Improve visual fidelity by reconstructing richer multi-layer visual meaning, not just functional walkable layouts.
3. Recover more legacy placement/entity semantics from additional layers and metadata.
4. Continue outward from the Yuu-house cluster into adjacent neighborhood/world maps.
