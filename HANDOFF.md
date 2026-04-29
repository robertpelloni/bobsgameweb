# HANDOFF.md

## Current State

The agent successfully ported the Block Palette and Pieces Editor panels from HTML DOM over to native PIXI UI components within `CustomGameEditor.ts`. The previous HTML block (header, tabs, content) remains visually hidden using a targeted CSS injection (`.custom-game-editor { display: none; }`) to allow the underlying TS logic to still successfully select HTML elements using `querySelector` without throwing null reference exceptions during compilation.

## Next Steps

1. Continue porting the rest of the forms inside `CustomGameEditor.ts` (e.g., Rotation Panel, specific parameter editing).
2. Wire the mock Generative AI buttons (`Text-to-Sprite`, `Text-to-Tileset`) up to an actual AI backend/inference service instead of using simulated delay endpoints.
3. Advance the C++ Qt6 port inside `cpp_port/` by integrating Ultimate++ widgets to mirror the new PIXI layouts.

## Important Note for Next Agent
If you make bulk search/replace operations with sed or similar tools, be extremely careful in `CustomGameEditor.ts`! A previous iteration removed all `return;` statements via a blanket sed script, which caused hundreds of TypeScript strict null check compilation errors. The file is large and contains some duplication, so use targeted JS script replacement with `code.replace('string', ...)` which targets only the first occurrence, or carefully bounded diff patches.