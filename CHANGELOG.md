# Changelog

All notable changes to this project will be documented in this file.

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
