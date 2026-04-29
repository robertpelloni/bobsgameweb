# HANDOFF.md

## Current State

The agent has successfully eradicated the final remaining legacy HTML forms/check boxes inside the `CustomGameEditor.ts` UI by migrating the "Advanced Rule Toggles", "Movement / Randomizer Toggles", and "Block Usage Checkboxes" into native PIXI components. The legacy DOM elements have been visually hidden (`display: none`) via CSS to preserve the current backend wiring and ensure that TypeScript compilation (`tsc --noEmit`) continues to pass with zero strict-null errors.

The primary PIXI UI transformation for `CustomGameEditor` is largely complete, successfully shifting the tool from a messy HTML DOM overlay to an abstract, cross-platform PIXI rendering context.

## Next Steps

1. The generative AI buttons inside the Custom Game Editor (`Text-to-Sprite`, `Text-to-Tileset`) are currently wired up to mock setTimeout/delay endpoints inside `GenerativeAIManager.ts`. These need to be connected to actual inference APIs (or expanded upon).
2. The PIXI generic inputs (`TextInput`, `Button`) currently simulate Dropdowns and Checkboxes. We need to implement proper PIXI `Dropdown` and `Checkbox` native components inside `src/renderer/ui/` and swap out the placeholder `TextInput` or `Button` components inside `CustomGameEditor.ts`.
3. Advance the C++ Qt6 port inside `cpp_port/` by integrating Ultimate++ widgets to mirror the new PIXI layouts.
4. Continue moving down the roadmap to integrate external submodules/editors.

## Important Note for Next Agent
If you make bulk search/replace operations with sed or similar tools, be extremely careful in `CustomGameEditor.ts`! A previous iteration removed all `return;` statements via a blanket sed script, which caused hundreds of TypeScript strict null check compilation errors. Use targeted JS script replacement with `code.replace('string', ...)` which targets only the first occurrence.