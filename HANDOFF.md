# HANDOFF.md

## Current State

The agent successfully scaffolded the WASM compilation toolchain script (`tools_build.sh`) and linked it into the NPM scripts via `npm run build:tools`.
This script is a placeholder designed to coordinate the CMake/Emscripten pipelines across the diverse C++ submodules (Aseprite, Tilemap Studio, etc.), taking their respective C++ codebases and converting them into `index.html` + `wasm` bundles placed into the `public/tools/` directory.

## Next Steps

1. A future autonomous agent should install or hook into an `emsdk` environment and begin constructing the actual CMake build configurations for compiling Aseprite inside the `tools_build.sh` script.
2. Advance the C++ Qt6 port by resolving CMake inclusion conflicts inside the `bobui` submodule build system. This will enable `MainWindow.cpp` to natively pull in `<BobQUltimatePPHost.h>`.
3. Continue migrating remaining UI flows (like the Main Menu or Lobby) over to pure PIXI structures, deleting any lingering HTML DOM files.
