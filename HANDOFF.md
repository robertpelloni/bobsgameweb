# HANDOFF.md

## Current State

The agent successfully ported the `SettingsScene` and `WorldScene` developer console interfaces out of the legacy raw HTML DOM wrappers, migrating them to entirely standalone WebGL elements via the new native `TextInput` PIXI abstraction.
The `MainMenuScene` was verified to already be entirely 100% PIXI.
Project compiles seamlessly on Web (Vite/TS) and C++ (Qt6).

## Next Steps

1. Configure Emscripten/CMake pipelines inside `tools_build.sh` to compile Aseprite and replace the mock payload with an actual binary buffer payload.
2. Advance the C++ Qt6 port by resolving CMake inclusion conflicts inside the `bobui` submodule build system. This will enable `MainWindow.cpp` to natively pull in `<BobQUltimatePPHost.h>`.
3. Continue migrating remaining massive UI flows (like the `LobbyScene` and `EventSheetEditor`) over to pure PIXI structures, as targeted in the Roadmap.
