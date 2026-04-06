# Changelog

All notable changes to this project will be documented in this file.

## [2.1.54] - 2026-04-06

### Added
- **Template Browser:** `CustomGameEditor.ts` now renders a browsable built-in template catalog with mode filters, preset summaries, and one-click apply actions for the grouped preset families.

### Changed
- Preset browsing now surfaces family, mode, grid, gravity/lock, preview, and chain summaries directly in the editor instead of hiding that context behind a flat row of buttons.
- Bumped project version to `2.1.54`.

### Verified
- `npm run build` passes successfully after the template-browser pass.

## [2.1.53] - 2026-04-06

### Added
- **Compact Preset Families:** `CustomGameEditor.ts` now groups starter presets into compact family cards and adds curated new templates for `Sprint Drop`, `Zen Garden`, and `Micro Stack` alongside the existing classic presets.

### Changed
- Expanded preset authoring coverage so creators can jump between competitive drop, puzzle-chain, and arcade-stack starting points without treating presets like a flat unorganized button strip.
- Presets now also seed gravity, lock delay, and next-piece preview counts more explicitly for each family starter.
- Bumped project version to `2.1.53`.

### Verified
- `npm run build` passes successfully after the preset-family UX expansion.

## [2.1.52] - 2026-04-06

### Added
- **Maintenance Window Orchestrator Runbook:** added `MAINTENANCE_WINDOW_RUNBOOK.md`, a single top-level procedure that orders the future allowed backend restart into six explicit phases: pre-restart snapshot, dry-run helper, explicit restart, snapshot comparison, strict backend verification, and strict full production verification.

### Changed
- Linked the new runbook from `BACKEND_DEPLOY.md`, `BACKEND_RECOVERY.md`, `POST_DEPLOY_CHECKLIST.md`, and `OPS_CHEATSHEET.md` so the full maintenance-window path is discoverable from the existing ops docs.
- Bumped project version to `2.1.52`.

### Verified
- Confirmed the current live no-restart state still passes the drift-aware production verification flow while the new runbook documents the future strict restart-window path.

## [2.1.50] - 2026-04-06

### Added
- **Backend Restart Readiness Snapshot Helper:** added `scripts/snapshot-backend-restart-readiness.sh`, a read-only helper that captures backend drift, health, remote service state, journal tail, and public frontend asset references before a planned restart window.

### Changed
- Expanded backend recovery/deploy/post-deploy docs so planned restarts now begin with a captured baseline snapshot before any restart is considered.
- Bumped project version to `2.1.50`.

### Verified
- Confirmed the readiness helper runs in read-only mode and captures the intended pre-maintenance state without restarting the backend service.

## [2.1.49] - 2026-04-06

### Added
- **Planned Backend Maintenance Restart Helper:** added `scripts/run-backend-maintenance-restart.sh`, a dry-run-first helper that sequences pre-restart audit, restart, strict backend version verification, post-restart audit, and optional full production stack verification when a restart window is explicitly allowed.

### Changed
- Expanded backend docs/runbooks so maintenance restarts now have a tracked dry-run path instead of relying on ad hoc shell history.
- Bumped project version to `2.1.49`.

### Verified
- Confirmed the new helper remains dry-run by default and does not restart anything unless `EXECUTE_BACKEND_RESTART=1` is explicitly supplied.

## [2.1.48] - 2026-04-06

### Added
- **Version-Aware Backend Host Checks:** `scripts/check-backend-host.sh` now supports `EXPECTED_BACKEND_VERSION` plus `ALLOW_BACKEND_RUNTIME_DRIFT=1`, so backend health checks can explicitly enforce or temporarily tolerate runtime-version mismatch during no-restart maintenance windows.

### Changed
- `scripts/verify-production-stack.sh` now passes through optional backend-version expectations, allowing full production verification to operate in either drift-strict or drift-aware mode.
- Bumped project version to `2.1.48`.

### Verified
- Confirmed the current live backend reports `2.1.17` and causes a strict version-aware host check to fail as expected.
- Confirmed the same live backend passes the version-aware host check with a warning when `ALLOW_BACKEND_RUNTIME_DRIFT=1` is provided.

## [2.1.47] - 2026-04-06

### Added
- **Backend Drift Audit:** added `scripts/audit-backend-drift.sh` to compare local tracked backend source, remote Hetzner backend files, and the live running backend process version exposed by `/healthz`.

### Changed
- Synced `server/package.json` version metadata with the tracked backend runtime version so source-level backend version reporting is internally consistent again.
- Hardened `scripts/deploy-backend-vps.sh` with a tar-over-ssh fallback and a `BACKEND_FORCE_TAR=1` switch so no-restart backend file syncs remain usable even when `rsync` is present but broken in the current shell environment.
- Bumped project version to `2.1.47`.

### Verified
- Audited the live Hetzner backend and confirmed the exact current state:
  - local tracked backend files: `2.1.47`
  - remote backend files on disk: `2.1.47`
  - live running backend process from `/healthz`: `2.1.17`
- Confirmed the no-restart backend file sync aligned `/opt/bobsgameweb/server/index.js` and `/opt/bobsgameweb/server/package.json` on disk without touching the running process.

## [2.1.46] - 2026-04-06

### Added
- **Production Runtime Chunk Smoke Check:** added `scripts/check-production-runtime-chunks.sh` to verify that critical lazy-loaded scene chunk families like `CustomGameEditorScene`, `AchievementsScene`, `WorldScene`, `WorldEditorScene`, and `LobbyScene` are discoverable from the live production asset graph and fetch successfully.

### Changed
- `scripts/verify-production-stack.sh` now includes runtime chunk-family verification in addition to backend health, websocket polling, frontend asset discovery, backend-origin validation, and editor marker validation.
- Bumped project version to `2.1.46`.

### Verified
- The live public site passes the stricter verification flow, including lazy chunk discovery and fetch checks for the targeted scene families.

## [2.1.45] - 2026-04-06

### Added
- **Production Editor Smoke Check:** added `scripts/check-production-editor.sh` to verify that the live site contains expected custom-editor markers like saved-template slot UI and conversion-list authoring hooks.

### Changed
- `scripts/verify-production-stack.sh` now includes the production editor marker scan in addition to backend health, Socket.io polling, frontend asset discovery, and backend-origin validation.
- Bumped project version to `2.1.45`.

### Verified
- The live public site passes the stricter verification flow, including editor marker checks against the deployed JS bundles.

## [2.1.44] - 2026-04-06

### Fixed
- **Production Backend-Origin Safety:** changed the production `SERVER_URL` fallback in `src/shared/Config.ts` from `https://bobsgame.com` to `https://ws.bobsgame.com`, preventing generic production builds from silently targeting the wrong origin.
- **Deployment Verification Hardening:** upgraded `scripts/check-production-frontend.sh` so it now scans deployed asset bundles for the expected backend origin and fails verification if that origin is missing.

### Verified
- Rebuilt with `VITE_SERVER_URL=https://ws.bobsgame.com`.
- Redeployed the frontend to the live Hetzner origin at `/var/www/bobsgame.com/current`.
- Confirmed the public site now serves `assets/main-WfqiSzMA.js` and that the deployed bundle contains `https://ws.bobsgame.com`.
- `BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh` passes with the stricter backend-origin scan.

## [2.1.43] - 2026-04-06

### Added
- **Saved Template Slot Summaries:** `CustomGameEditor.ts` now renders a dedicated preset-slot status panel showing each slot's stored ruleset name, mode, piece count, rotation count, and most recent save time.

### Changed
- Preset slot saves now write lightweight metadata alongside the serialized `GameType`, keeping browser storage backward-compatible while making saved templates recognizable before loading.
- The custom editor now refreshes slot summaries after save/load so template status remains visible without guessing which numbered slot contains which ruleset.
- Bumped project version to `2.1.43`.

### Verified
- `npm run build` passes successfully after the saved-template UX upgrade.

## [2.1.42] - 2026-04-05

### Added
- **Conversion-Pair Editing:** `CustomGameEditor.ts` now supports focused first-pass block conversion authoring with editable touching-block conversion pairs, visible conversion summaries, and add/remove pair controls.

### Changed
- Expanded block summary reporting so conversion-pair counts appear alongside reward, chain, palette, and field-effect data.
- Bumped project version to `2.1.42`.

### Verified
- `npm run build` passes successfully after the conversion-pair editing changes.

## [2.1.41] - 2026-04-05

### Added
- **Advanced Field-Effect Toggles:** `CustomGameEditor.ts` now exposes engine-backed field-effect toggles for ignoring move-down gravity, removing same-color field blocks on set, and diamond-color field swaps.

### Changed
- Expanded block behavior reporting so field-wide consequences appear alongside the existing chain and reward hooks.
- Bumped project version to `2.1.41`.

### Verified
- `npm run build` passes successfully after the advanced field-effect toggle changes.

## [2.1.40] - 2026-04-05

### Added
- **Block Gameplay Hooks:** `CustomGameEditor.ts` now exposes reward-piece assignment plus focused chain-behavior toggles for selected blocks, including clear-every-other-line, ignore-chain, required-in-chain, and exploding-chain-link hooks.

### Changed
- Expanded block details and summary reporting so reward-piece and chain-behavior authoring is visible without digging back through every control cluster.
- Bumped project version to `2.1.40`.

### Verified
- `npm run build` passes successfully after the block gameplay-hook changes.

## [2.1.39] - 2026-04-05

### Fixed
- **DreamHost Frontend Deploy Freshness:** corrected the Bash deploy script fallback so non-`rsync` uploads use tar-over-ssh content extraction instead of nesting `dist/renderer/` under `~/bobsgame.com/renderer/`, which had left the live site serving stale root assets.

### Changed
- Bumped project version to `2.1.39`.

### Verified
- Re-ran the tracked frontend deploy path after the fix.
- Confirmed the public site now serves the newer Hetzner-hosted asset pair `assets/main-B8AxVX-p.js` and `assets/pixi-DddiEjlE.js` instead of the stale `assets/main-BZgwYkC_.js` / `assets/pixi-B4hwJKJB.js` pair from the reported CRT crash.

## [2.1.38] - 2026-04-05

### Added
- **Richer Block Color Set Editing:** `CustomGameEditor.ts` now supports clickable block palette swatches plus add/remove palette color controls, letting creators author multi-color block sets directly in the editor.

### Changed
- Reused the existing primary color control as the editor for the currently selected palette swatch, keeping the richer palette workflow compact instead of exploding the form.
- Bumped project version to `2.1.38`.

### Verified
- `npm run build` passes successfully after the richer block color-set editing changes.

## [2.1.37] - 2026-04-05

### Added
- **Deeper Block Rule Editing:** `CustomGameEditor.ts` now exposes a focused second-pass block authoring set with special color, special chance/frequency, flashing special, match-any-color, and counter-type controls.

### Changed
- Expanded selected-block summary details so creators can see authored special behavior and spawning knobs at a glance.
- Bumped project version to `2.1.37`.

### Verified
- `npm run build` passes successfully after the deeper block-rule editing changes.

## [2.1.36] - 2026-04-05

### Added
- **Block Type / Color Controls:** `CustomGameEditor.ts` now exposes focused block authoring controls for block names, primary colors, normal/garbage/filler usage flags, and primary block override assignment for the selected piece.

### Fixed
- **Pixi v8 CRT Startup Crash:** corrected custom filter uniform resources to use Pixi v8 `UniformGroup` structure, addressing the runtime `Cannot create property 'name' on number '0'` crash path surfaced during startup.

### Changed
- Bumped project version to `2.1.36`.

### Verified
- `npm run build` passes successfully after the block-authoring and Pixi filter resource fixes.

## [2.1.35] - 2026-04-05

### Added
- **Recent Action Breadcrumbs:** `CustomGameEditor.ts` now shows a bounded recent-action panel that tracks meaningful authoring operations like presets, imports, shares, piece/rotation edits, and cleanup helpers.

### Changed
- Kept the breadcrumb feed intentionally focused on meaningful edits rather than noisy navigation clicks, making it useful as lightweight workflow memory without pretending to be full undo.
- Bumped project version to `2.1.35`.

### Verified
- `npm run build` passes successfully after the recent-action breadcrumb changes.

## [2.1.34] - 2026-04-05

### Added
- **Center-All Helper:** `CustomGameEditor.ts` now provides a one-click helper to center every rotation in the selected piece, making full-set layout cleanup faster after import, duplication, and normalize-all passes.

### Changed
- Reused a shared centering helper so single-rotation and full-set centering follow the same geometry logic.
- Bumped project version to `2.1.34`.

### Verified
- `npm run build` passes successfully after the center-all helper changes.

## [2.1.33] - 2026-04-05

### Added
- **Recent Share / Import History:** `CustomGameEditor.ts` now keeps a bounded recent-history list in `localStorage`, recording imported payloads and generated share links with quick load/copy actions.

### Changed
- Hardened history rendering by escaping imported ruleset names before injecting the history UI.
- Bumped project version to `2.1.33`.

### Verified
- `npm run build` passes successfully after the recent-history workflow changes.

## [2.1.32] - 2026-04-05

### Added
- **Empty Rotation Cleanup:** `CustomGameEditor.ts` now provides a one-click helper to remove empty rotations after confirmation, making cleanup easier after experimentation and duplication.

### Changed
- Bumped project version to `2.1.32`.

### Verified
- `npm run build` passes successfully after the empty-rotation cleanup changes.

## [2.1.31] - 2026-04-05

### Added
- **Normalize-All Helper:** `CustomGameEditor.ts` now provides a one-click helper to normalize every rotation in the selected piece, making full-set cleanup much faster after rapid experimentation.

### Changed
- Bumped project version to `2.1.31`.

### Verified
- `npm run build` passes successfully after the normalize-all helper changes.

## [2.1.30] - 2026-04-05

### Added
- **Duplicate Cleanup Helper:** `CustomGameEditor.ts` now provides a one-click duplicate-rotation cleanup action that removes redundant rotations after confirmation.

### Changed
- Bumped project version to `2.1.30`.

### Verified
- `npm run build` passes successfully after the duplicate-cleanup helper changes.

## [2.1.29] - 2026-04-05

### Added
- **Normalize / Center Helpers:** `CustomGameEditor.ts` now provides one-click normalize and center helpers for the current rotation, speeding up cleanup of custom piece layouts inside the 4x4 editor grid.

### Changed
- Bumped project version to `2.1.29`.

### Verified
- `npm run build` passes successfully after the normalize/center helper changes.

## [2.1.28] - 2026-04-05

### Added
- **Symmetry & Duplicate Warnings:** `CustomGameEditor.ts` now reports current-rotation symmetry and flags duplicate rotations directly in the overview cards, giving authors immediate feedback about redundant rotation states.

### Changed
- Bumped project version to `2.1.28`.

### Verified
- `npm run build` passes successfully after the symmetry/duplicate analytics changes.

## [2.1.27] - 2026-04-05

### Added
- **Rotation Analytics Hints:** `CustomGameEditor.ts` now reports current rotation bounding-box size plus unique-vs-duplicate rotation counts for the selected piece, and the rotation cards show block count plus bounding-box info.

### Changed
- Bumped project version to `2.1.27`.

### Verified
- `npm run build` passes successfully after the rotation analytics changes.

## [2.1.26] - 2026-04-05

### Added
- **Preset Shortcut Buttons:** `CustomGameEditor.ts` now includes one-click classic preset buttons for Classic Drop, Cascade Puzzle, and Stack Arcade, layered on top of the preset-slot workflow.

### Changed
- Bumped project version to `2.1.26`.

### Verified
- `npm run build` passes successfully after the preset-shortcut changes.

## [2.1.25] - 2026-04-05

### Added
- **Preset Slots:** `CustomGameEditor.ts` now supports quick save/load preset slots backed by localStorage so multiple custom rulesets can be iterated on quickly without replacing the primary working draft.

### Changed
- Bumped project version to `2.1.25`.

### Verified
- `npm run build` passes successfully after the preset-slot workflow changes.

## [2.1.24] - 2026-04-05

### Added
- **Movement / Randomizer Toggles:** `CustomGameEditor.ts` now exposes next-piece, hold-piece, bag-randomizer, hard-drop punch-through, and multiple movement / kick toggles alongside the earlier gravity and chain controls.

### Changed
- The web editor summary now includes enabled movement/randomizer rules together with the earlier advanced rule set.
- Bumped project version to `2.1.24`.

### Verified
- `npm run build` passes successfully after the movement/randomizer toggle changes.

## [2.1.23] - 2026-04-05

### Added
- **Advanced Rule Toggles:** `CustomGameEditor.ts` now exposes gameplay-rule checkboxes for cascade gravity, disconnected-only gravity, row/column/diagonal chain checks, and recursive chain search.

### Changed
- The web editor summary now reports enabled advanced rules explicitly.
- Bumped project version to `2.1.23`.

### Verified
- `npm run build` passes successfully after the advanced-rule toggle changes.

## [2.1.22] - 2026-04-05

### Added
- **Rotation Overview:** `CustomGameEditor.ts` now renders clickable mini rotation preview cards with per-rotation occupied-cell counts so authors can jump directly to any rotation state.

### Changed
- Bumped project version to `2.1.22`.

### Verified
- `npm run build` passes successfully after the rotation overview changes.

## [2.1.21] - 2026-04-05

### Added
- **Duplication Workflow:** `CustomGameEditor.ts` now supports duplicating the selected piece and duplicating the selected rotation for faster custom-rule iteration.

### Changed
- Bumped project version to `2.1.21`.

### Verified
- `npm run build` passes successfully after the duplication workflow changes.

## [2.1.20] - 2026-04-05

### Changed
- **Safer Deletes:** Piece and rotation removals in `CustomGameEditor.ts` now require explicit confirmation before destructive edits are applied.
- Bumped project version to `2.1.20`.

### Verified
- `npm run build` passes successfully after the delete-confirmation changes.

## [2.1.19] - 2026-04-05

### Added
- **Share-Link Import:** `CustomGameEditor.ts` can now import a full shared URL or raw `#play=` payload back into the editor, hydrating a playable custom rule set from the compressed BobNet export format.

### Changed
- **Safer Piece Editing:** Added remove-piece and remove-rotation controls with selection recovery so the editor remains usable after deleting content.
- Bumped project version to `2.1.19`.

### Verified
- `npm run build` passes successfully after the import/remove editor changes.

## [2.1.18] - 2026-04-05

### Added
- **Custom Game Rules Summary:** `src/renderer/editor/CustomGameEditor.ts` now shows a live rules summary panel with current mode, grid, gravity, lock delay, chain settings, piece counts, rotation counts, filled-cell counts, and encoded share payload size.
- **Web Editor Feedback:** The piece editor now updates the selected-piece display and summary state while you edit rotations, improving visibility into what will actually be saved/shared/tested.

### Changed
- Bumped project version to `2.1.18`.
- The custom game editor summary now reflects the in-progress form draft, not only the last saved local-storage snapshot.

### Verified
- `npm run build` passes successfully after the custom editor changes.
