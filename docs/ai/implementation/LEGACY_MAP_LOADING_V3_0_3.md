# Legacy Map Loading — v3.0.3

## Goal
Finish the initial Yuu-house legacy map recovery so the converted interiors are not just archived JSON assets, but are actually loaded by the web client and traversable at runtime.

## Problem Before This Change
The project already contained recovered JSON files for maps `5–10`, but they had major limitations:
- the conversion script only read one layer
- it interpreted the binary tile data incorrectly
- it used incorrect dimensions for several maps
- it produced mostly placeholder grass-filled output
- the converted maps were not wired into the live `ClientGameEngine` / `DemoWorld` flow

As a result, the files existed, but they were not meaningfully usable as live maps.

## What Changed
### 1. Conversion pipeline rebuilt
`scripts/convert_maps.js` now:
- reads `_Project.txt` from `bobsgame_v8830.zip`
- extracts real map dimensions from legacy metadata
- reads hit-layer binary data using the correct big-endian format
- derives functional walkable-vs-blocked map layouts
- parses legacy door and warp metadata for the converted Yuu-house maps
- writes updated `map_5.json` through `map_10.json`
- generates `data/maps/legacy-house-manifest.json`

### 2. Converted maps are now functional layout maps
The converted map outputs now include:
- real dimensions
- numeric tile matrices in the modern frontend-friendly format
- door transition data
- warp transition data
- default spawn locations

### 3. Runtime loading added
`ClientGameEngine` now loads the legacy-house manifest from static assets after built-in maps are registered.

This means the converted maps override the placeholder/fallback house layout when available.

### 4. Runtime traversal added
`DemoWorld` now supports:
- dynamic map dimensions for loaded maps
- loaded-map door interactions
- loaded-map warp transitions
- map transition callbacks back into `ClientGameEngine`
- transition cooldowns to avoid instant bounce loops on arrival

## Converted Interior Set
The currently completed set is:
- `map_5.json` → `TOWNYUU Downstairs`
- `map_6.json` → `TOWNYUU Upstairs`
- `map_7.json` → `TOWNYUU Upstairs Parents Room`
- `map_8.json` → `TOWNYUU Basement`
- `map_9.json` → `TOWNYUU Garage`
- `map_10.json` → `TOWNYUU Attic`

## Runtime Flow
The client now starts in the converted `TOWNYUU Downstairs` map and can traverse the currently converted interior chain:
- Downstairs ↔ Upstairs
- Downstairs ↔ Basement
- Downstairs ↔ Garage
- Upstairs ↔ Parents Room
- Garage ↔ Attic

Transitions to still-unconverted destinations are intentionally omitted from the generated live map data to avoid dead transitions.

## Verification
Executed locally:
- `node scripts/convert_maps.js`
- `npx vite build`

## Remaining Follow-Up
This change completes the first playable interior cluster, but not the entire archive migration.

Next high-value work:
1. convert additional connected Yuu-house rooms still referenced by metadata but not yet live
2. enrich the visual conversion beyond wall/floor functional layouts
3. recover sprite/entity placement for stronger visual fidelity
4. eventually replace heuristic layout conversion with fuller multi-layer reconstruction
