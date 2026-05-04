# HANDOFF.md

## Current State

The agent successfully introduced the "External Tools" UI panel inside the PIXI `CustomGameEditor.ts`.
Buttons for launching Aseprite and Tilemap Studio were constructed natively using PIXI Components, and wired to dispatch standard DOM `CustomEvent` structures (`"launch-external-tool"`).
This serves as the foundation for the "omni-engine" vision. Because Aseprite does not natively compile to WASM straight out of the box (relying heavily on Skia via desktop), the actual invocation of these tools currently fires a bridged event meant to be caught by an Electron container, Qt wrapper, or a localized iframe wrapper built later.
The project builds completely cleanly on both Web and C++.

## Next Steps

1. Build an event listener in the top-level application root (e.g. `main.ts` or the Electron/Qt6 host wrapper) that catches the `"launch-external-tool"` event and executes the binary locally via Node `child_process` or displays a compiled WASM frame if available.
2. The `bobui` CMake configuration still requires an intricate build process repair. The next agent should focus deeply on fixing the `cmake/BobQSubmodules.cmake` bridging logic so `bgeditor` can actually compile the `#include <BobQUltimatePPHost.h>` directives natively into Qt.
3. Continue migrating remaining UI flows (like the Main Menu or Lobby) over to pure PIXI structures.
