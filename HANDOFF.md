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

## Additional Follow-Up - 2026-04-06 (Unified Template Library)
- Added a unified, filterable "Template Library" surface that combines built-in presets, user-saved slots, and import/share history into a single browsing experience.
- Refactored internal rendering to reuse summary cards and action hooks across all template sources.
- Preserved existing dedicated panels as fallback/secondary UI while positioning the Unified Library as the primary browsing workflow.
- Bumped the repo version again to `2.1.56`.

## Additional Follow-Up - 2026-04-06 (Template-to-Slot Shortcuts)
- Added direct save-to-slot actions on built-in template cards so curated starter templates can be banked into user preset slots without first overwriting the active draft.
- This is the first real bridge between the built-in template browser and the saved-slot workflow.
- Bumped the repo version again to `2.1.55`.

## Additional Follow-Up - 2026-04-06 (Template Browser)
- Added a browsable built-in template catalog with mode filters, summary cards, and one-click apply actions on top of the preset-family pass.
- The editor now exposes family, mode, grid, gravity/lock, preview, and chain summaries before applying a starter template.
- Bumped the repo version again to `2.1.54`.

## Additional Follow-Up - 2026-04-06 (Compact Preset Families)
- Reworked the flat preset strip into compact preset-family groupings for competitive drop, puzzle chainers, and arcade stackers.
- Added new curated starter templates: `Sprint Drop`, `Zen Garden`, and `Micro Stack`.
- Expanded preset application so those starters seed gravity, lock delay, and next-piece preview counts more deliberately instead of only toggling a few gameplay flags.
- Bumped the repo version again to `2.1.53`.

## Additional Follow-Up - 2026-04-06 (Maintenance Window Orchestrator Runbook)
- Added `MAINTENANCE_WINDOW_RUNBOOK.md` as the single top-level operator procedure for the future allowed backend restart window.
- The runbook stitches the toolkit into one ordered sequence: pre-restart snapshot, dry-run helper, explicit restart, post-restart comparison, strict backend verification, and strict full production verification.
- Linked the runbook from the existing backend deploy/recovery/checklist docs so the complete maintenance path is discoverable from the current ops surface area.
- Verified the current no-restart live state still passes drift-aware verification while the new runbook documents the future strict restart-window path.
- Bumped the repo version again to `2.1.52`.

## Additional Follow-Up - 2026-04-06 (Post-Restart Snapshot Comparison)
- Added `scripts/compare-backend-restart-snapshot.sh` to compare a saved pre-maintenance snapshot against the current live backend/frontend/service state.
- The comparison helper highlights runtime-version movement, frontend asset stability, service state, and PID changes, making post-restart verification much less manual.
- Verified it works safely in the current no-restart state by reporting warnings instead of pretending a restart happened.
- Bumped the repo version again to `2.1.51`.

## Additional Follow-Up - 2026-04-06 (Backend Restart Readiness Snapshot)
- Added `scripts/snapshot-backend-restart-readiness.sh` to capture a read-only baseline before any future allowed backend restart window.
- The snapshot bundles drift audit output, version-aware backend health output, remote service status, journal tail, and public frontend asset references into one repeatable pre-maintenance view.
- Updated backend runbooks/checklists so planned restarts now begin with snapshot capture, then dry-run maintenance, then eventual explicit restart if allowed.
- Verified the new helper remains read-only and does not restart anything.
- Bumped the repo version again to `2.1.50`.

## Additional Follow-Up - 2026-04-06 (Planned Backend Maintenance Restart Helper)
- Added `scripts/run-backend-maintenance-restart.sh` as a dry-run-first maintenance helper for the future allowed backend restart window.
- The helper performs pre-restart drift audit immediately, but only executes the actual `systemctl restart` when `EXECUTE_BACKEND_RESTART=1` is explicitly provided.
- It also codifies the desired post-restart sequence: strict backend version check, post-restart drift audit, and optional full production stack verification.
- Verified the helper stays in dry-run mode by default, which keeps the current session compliant with the no-process-kill rule.
- Bumped the repo version again to `2.1.49`.

## Additional Follow-Up - 2026-04-06 (Version-Aware Backend Runtime Checks)
- Upgraded `scripts/check-backend-host.sh` to support `EXPECTED_BACKEND_VERSION` plus `ALLOW_BACKEND_RUNTIME_DRIFT=1`, so backend checks can now explicitly enforce runtime version alignment or allow a documented mismatch during no-restart maintenance windows.
- Wired those optional controls through `scripts/verify-production-stack.sh` so full production verification can operate in drift-strict or drift-aware mode.
- Verified the current live backend behaves correctly under both modes:
  - strict mode fails because `/healthz` still reports `2.1.17`
  - drift-aware mode passes with a warning when runtime drift is intentionally tolerated
- Bumped the repo version again to `2.1.48`.

## Recommended Next Steps
1. Keep the current no-restart truth documented: backend disk state is aligned, runtime state is intentionally older until a planned restart window exists.
2. If/when restart is allowed, perform a controlled `bobsgameweb-server` restart and immediately rerun `audit-backend-drift.sh` plus `check-backend-host.sh EXPECTED_BACKEND_VERSION=2.1.52` to collapse runtime drift from `2.1.17` to `2.1.52`.
3. Use `MAINTENANCE_WINDOW_RUNBOOK.md` as the operator source of truth for that restart window rather than ad hoc command history.
4. If native becomes writable again, mirror the same recent-history workflow, center-all helper, action breadcrumbs, focused block controls, deeper block-rule editing, richer block color-set editing, block gameplay hooks, field-effect toggles, conversion-pair editing, and saved-template slot summaries there after the lock clears.
5. Consider true undo/redo later if the editor state model becomes structured enough to support it safely.
