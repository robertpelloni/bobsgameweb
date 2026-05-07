# HANDOFF.md

## Current State

The agent investigated migrating the `LobbyScene` chat UI entirely to native PIXI `TextInput` and `Panel` objects to replace the raw HTML `<div id="chatContainer">`.
However, the HTML DOM integration inside the networking handlers (e.g. appending span tags recursively to a scrolling div) is fundamentally incompatible with the existing PIXI text bounds logic without a massive TS refactor. The code modifications caused severe AST cascade errors in TypeScript, so the changes were safely reverted to preserve build stability.

## Next Steps

1. Configure Emscripten/CMake pipelines inside `tools_build.sh` to compile Aseprite and replace the mock payload with an actual binary buffer payload.
2. Advance the C++ Qt6 port by resolving CMake inclusion conflicts inside the `bobui` submodule build system. This will enable `MainWindow.cpp` to natively pull in `<BobQUltimatePPHost.h>`.
3. An agent with deep TS AST refactoring capability should return to `LobbyScene.ts` to finish decoupling the `chatContainer` into an array of scrolling PIXI elements.
