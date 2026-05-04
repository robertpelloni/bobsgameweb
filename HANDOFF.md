# HANDOFF.md

## Current State

The agent successfully implemented the top-level generic IPC event listener inside `src/renderer/index.ts`. This listener securely intercepts `launch-external-tool` CustomEvents emitted anywhere from the PIXI rendering pipeline. It checks the deployment context (`isElectron`) to dynamically decide whether to trigger native OS-level IPC hooks (for tools like desktop Aseprite) or render generic fallback iframes for browser builds.
The Custom Game Editor successfully triggers these hooks now using standalone PIXI UI buttons.

## Next Steps

1. In the Web context, when a user attempts to launch "aseprite", build the actual Iframe overlay that opens a simulated or compiled WASM version of the editor inside the browser.
2. The `bobui` CMake configuration still requires an intricate build process repair. The next agent should focus deeply on fixing the `cmake/BobQSubmodules.cmake` bridging logic so `bgeditor` can actually compile the `#include <BobQUltimatePPHost.h>` directives natively into Qt.
3. Continue migrating remaining legacy DOM UI flows (like the Main Menu or Lobby) over to pure PIXI structures.
