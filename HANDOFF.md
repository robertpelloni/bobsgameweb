# Handoff - 2026-04-05

## Scope
Focused on the web-port custom puzzle editor as part of a broader 3-port parity pass.

## What Changed
- Enhanced `src/renderer/editor/CustomGameEditor.ts` with a live summary panel.
- Added real-time reporting for:
  - mode
  - grid size
  - gravity / lock delay
  - chain / next-piece settings
  - total piece count
  - total rotation count
  - total filled cells across all rotations
  - current piece being edited
  - encoded share payload length
- Ensured the summary reflects the current draft form values by applying the form state before generating the summary and before saving.
- Updated the piece editor header text so the selected piece name is visible during rotation editing.
- Bumped the repo version to `2.1.18` and created a local `CHANGELOG.md` for future subrepo-level tracking.

## Validation
- `npm run build` ✅

## Notes
- This work was intentionally scoped to editor UX and feedback; it does not change server deployment behavior.
- The version bump also updated frontend-visible version strings and backend version constants inside this repo for consistency.

## Additional Follow-Up - 2026-04-05
- Added `Import` support for full shared URLs and raw `#play=` payloads.
- Added remove-piece and remove-rotation controls with selection recovery.
- The editor now handles empty-piece and empty-rotation states more gracefully after destructive edits.
- Bumped the repo version again to `2.1.19`.

## Additional Follow-Up - 2026-04-05 (Delete Confirmations)
- Added confirmation prompts before removing a piece or rotation in the web custom editor.
- Bumped the repo version again to `2.1.20`.

## Additional Follow-Up - 2026-04-05 (Duplication Workflow)
- Added duplicate-piece and duplicate-rotation actions to the web custom editor.
- Bumped the repo version again to `2.1.21`.

## Additional Follow-Up - 2026-04-05 (Rotation Overview)
- Added clickable mini rotation preview cards with occupied-cell counts in the web custom editor.
- Bumped the repo version again to `2.1.22`.

## Additional Follow-Up - 2026-04-05 (Advanced Rule Toggles)
- Added gameplay-rule checkboxes for cascade gravity, disconnected gravity, row/column/diagonal chains, and recursive chain search.
- Expanded the summary to report enabled advanced rules directly.
- Bumped the repo version again to `2.1.23`.

## Additional Follow-Up - 2026-04-05 (Movement / Randomizer Toggles)
- Added next-piece, hold-piece, bag-randomizer, hard-drop punch-through, and movement/kick toggles to the web custom editor.
- Expanded the summary so those enabled movement/randomizer rules are visible immediately.
- Bumped the repo version again to `2.1.24`.

## Additional Follow-Up - 2026-04-05 (Preset Slots)
- Added localStorage-backed preset slots to the web custom editor for quick save/load iteration.
- Bumped the repo version again to `2.1.25`.

## Additional Follow-Up - 2026-04-05 (Preset Shortcut Buttons)
- Added one-click Classic Drop, Cascade Puzzle, and Stack Arcade preset buttons on top of the web preset-slot workflow.
- Bumped the repo version again to `2.1.26`.

## Additional Follow-Up - 2026-04-05 (Rotation Analytics)
- Added current-rotation bounding-box size, unique rotation count, and duplicate rotation count to the web custom editor summary.
- Expanded rotation overview cards to show bounding-box info.
- Bumped the repo version again to `2.1.27`.

## Additional Follow-Up - 2026-04-05 (Symmetry & Duplicate Hints)
- Added current-rotation symmetry reporting plus duplicate-rotation warnings in the web rotation overview.
- Bumped the repo version again to `2.1.28`.

## Additional Follow-Up - 2026-04-05 (Normalize / Center Helpers)
- Added one-click normalize and center helpers for the current rotation in the web custom editor.
- Bumped the repo version again to `2.1.29`.

## Additional Follow-Up - 2026-04-05 (Duplicate Cleanup)
- Added a one-click duplicate-rotation cleanup action to the web custom editor.
- Bumped the repo version again to `2.1.30`.

## Additional Follow-Up - 2026-04-05 (Normalize-All Helper)
- Added a one-click helper to normalize every rotation in the selected piece.
- Bumped the repo version again to `2.1.31`.

## Additional Follow-Up - 2026-04-05 (Empty Rotation Cleanup)
- Added a one-click helper to remove empty rotations after confirmation.
- Bumped the repo version again to `2.1.32`.

## Additional Follow-Up - 2026-04-05 (Recent Share / Import History)
- Added a bounded recent-history panel that tracks imported payloads and generated share links in `localStorage`.
- Added quick load/copy actions so recent rulesets can be recalled without re-pasting payloads.
- Escaped imported names before rendering the history UI to avoid turning share metadata into injected markup.
- Bumped the repo version again to `2.1.33`.

## Additional Follow-Up - 2026-04-05 (Center-All Helper)
- Added a one-click helper to center every rotation in the selected piece.
- Reused the same centering logic for both single-rotation and full-set centering to keep geometry behavior consistent.
- Bumped the repo version again to `2.1.34`.

## Additional Follow-Up - 2026-04-05 (Recent Action Breadcrumbs)
- Added a bounded recent-action panel that tracks meaningful authoring operations like presets, imports, shares, geometry helpers, and cleanup actions.
- Intentionally left noisy navigation clicks out of the breadcrumb feed so it behaves like useful workflow memory instead of spam.
- Positioned this as lightweight undo-adjacent guidance rather than a fake full undo system.
- Bumped the repo version again to `2.1.35`.

## Additional Follow-Up - 2026-04-05 (Block Type / Color Controls + Pixi Filter Fix)
- Added focused block authoring controls for block names, primary colors, normal/garbage/filler usage flags, and primary block override assignment for the selected piece.
- Fixed the Pixi v8 custom filter resource shape to use `UniformGroup`, addressing the surfaced CRT startup crash path.
- Bumped the repo version again to `2.1.36`.

## Additional Follow-Up - 2026-04-05 (Deeper Block Rule Editing)
- Added a focused second-pass block authoring set with special color, special chance/frequency, flashing special, match-any-color, and counter-type controls.
- Expanded selected-block summary details so authored special behavior is visible without reopening every control cluster.
- Bumped the repo version again to `2.1.37`.

## Additional Follow-Up - 2026-04-05 (Richer Block Color Set Editing)
- Added clickable block palette swatches plus add/remove palette color controls so creators can author multi-color block sets directly in the editor.
- Reused the existing primary color control as the editor for the currently selected palette swatch to keep the richer color workflow compact.
- Bumped the repo version again to `2.1.38`.

## Additional Follow-Up - 2026-04-05 (DreamHost Frontend Deploy Freshness Fix)
- Confirmed the Bash deploy script's non-rsync fallback was nesting `dist/renderer/` under `~/bobsgame.com/renderer/` instead of copying its contents to `~/bobsgame.com/`.
- Fixed the tracked Bash deploy script to use tar-over-ssh content extraction for the non-rsync fallback path.
- Confirmed the public `bobsgame.com` site is currently served from the Hetzner nginx host, not DreamHost, based on live headers (`Server: nginx/1.24.0 (Ubuntu)`).
- Used the tracked Hetzner frontend upload path to refresh the actual public root and verified the live site now serves `assets/main-B8AxVX-p.js` and `assets/pixi-DddiEjlE.js` instead of the stale crash-era hashes.
- Bumped the repo version again to `2.1.39`.

## Additional Follow-Up - 2026-04-05 (Block Gameplay Hooks)
- Added reward-piece assignment plus focused chain-behavior toggles for selected blocks.
- Expanded block details and summary reporting so reward-piece and chain-behavior authoring is visible without reopening every control cluster.
- Bumped the repo version again to `2.1.40`.

## Additional Follow-Up - 2026-04-05 (Advanced Field-Effect Toggles)
- Added engine-backed field-effect toggles for ignoring move-down gravity, removing same-color field blocks on set, and diamond-color field swaps.
- Expanded block behavior reporting so field-wide consequences appear alongside the existing chain and reward hooks.
- Bumped the repo version again to `2.1.41`.

## Recommended Next Steps
1. If native becomes writable again, mirror the same recent-history workflow, center-all helper, action breadcrumbs, focused block controls, deeper block-rule editing, richer block color-set editing, block gameplay hooks, and field-effect toggles there after the lock clears.
2. Add compact presets for classic rule families once editor state persistence is richer.
3. Consider further block-rule depth like true conversion-chain editing and multi-step transformation graphs.
4. Consider true undo/redo later if the editor state model becomes structured enough to support it safely.
