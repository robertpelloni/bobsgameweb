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

## Recommended Next Steps
1. Add named preset slots or import history for quick editor iteration.
2. If native becomes writable again, mirror the same rotation-overview and advanced-toggle UX there.
3. Consider richer per-rotation analytics like bounding-box size or symmetry hints.
4. Add more advanced rule categories like bag/randomizer and wall-kick options when the editor surface is ready.
