# Changelog

All notable changes to this project will be documented in this file.

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
