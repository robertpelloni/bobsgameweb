# HANDOFF.md

## Current State

The agent successfully populated the `public/tools/` directory with mock `index.html` payloads for Aseprite and Tilemap Studio.
Now, when the generic `index.ts` Web IPC listener intercepts a submodule launch event, the Iframe correctly renders a mock environment instead of crashing with a 404 error.
This stabilizes the frontend UI bridge to the "omni-engine" architecture.

## Next Steps

1. Configure Emscripten/CMake pipelines inside `tools_build.sh` to compile Aseprite and replace the mock payload with an actual binary buffer payload.
2. Advance the C++ Qt6 port by resolving CMake inclusion conflicts inside the `bobui` submodule build system. This will enable `MainWindow.cpp` to natively pull in `<BobQUltimatePPHost.h>`.
3. Continue migrating remaining UI flows (like the Main Menu or Lobby) over to pure PIXI structures, as targeted in the Roadmap.
