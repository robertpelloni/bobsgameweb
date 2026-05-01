# HANDOFF.md

## Current State

The agent successfully advanced the C++ Qt6 port located in `cpp_port/` to mirror the new PIXI layouts of the `CustomGameEditor.ts`. The `MainWindow.cpp` now conceptually mocks the `CustomGameType` underlying state architecture and builds out identical `QGroupBox`, `QLineEdit`, `QComboBox`, `QCheckBox`, and `QPushButton` configurations representing the Unified Template Library, the Game Settings, Toggles, and Generative AI panels. The C++ project correctly links and builds cleanly using CMake.

## Next Steps

1. Start stripping away the underlying hidden HTML DOM inputs entirely from `CustomGameEditor.ts`, replacing the bridge logic with direct updates to the `this.currentGameType` state. (Note: Ensure this is done carefully to avoid breaking the extensive TS codebase. Strict mode must be preserved).
2. The generative AI buttons inside the Custom Game Editor (`Text-to-Sprite`, `Text-to-Tileset`) are currently hitting a simulated/local API at `http://localhost:8080/api/generate`. Implement the actual backend proxy or connect it to a real inference service.
3. Advance the C++ Qt6 port inside `cpp_port/` by actually utilizing the `bobui` Ultimate++ widgets rather than the native QWidgets used currently.
4. Continue moving down the roadmap to integrate external submodules/editors (e.g. hooking up Aseprite or Tilemap Studio to buttons inside our PIXI overlay).

## Important Note for Next Agent
If you make bulk search/replace operations with sed or similar tools, be extremely careful in `CustomGameEditor.ts`! A previous iteration removed all `return;` statements via a blanket sed script, which caused hundreds of TypeScript strict null check compilation errors. Use targeted JS script replacement with `code.replace('string', ...)` which targets only the first occurrence. Always use `git log` before checking out a file to make sure you aren't inadvertently overwriting a previous autonomous agent's valid commits.