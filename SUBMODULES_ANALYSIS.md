# Submodule Analysis and Integration Status

This document tracks the analysis of submodules within the `okgame` project. The goal is to identify functionality, ensure full implementation/parity in the main engine, and remove redundant submodules.

## Categorization Criteria
- **Library**: Essential runtime dependency. Keep as submodule.
- **Reference**: External tool or code used for logic parity/restoration.
- **Redundant**: Superseded by engine implementation or better tools. Remove.

## Submodule Status Tracker

| Submodule Path | Features/Functionality | Integration Status | Category | Action |
|----------------|-----------------------|--------------------|----------|--------|
| submodules/aseprite | Pixel art editor. | UI has button to launch as external tool. | Reference | Remove (External) |
| submodules/sprite-studio-64 | Animation tool. | No direct code usage found. Reference for 64-frame anims. | Reference | Remove |
| submodules/stipple-effect | Pixel art editor. | No direct code usage found. | Reference | Remove |
| submodules/Raylib-Examples | Graphics examples. | No direct code usage found. | Reference | Remove |
| submodules/csprite | C-based sprite editor. | No direct code usage found. | Reference | Remove |
| submodules/raster-master | Sprite/Tile editor. | No direct code usage found. | Reference | Remove |
| submodules/Tile-Studio | Tilemap editor. | No direct code usage found. | Reference | Remove |
| submodules/voidsprite | Sprite editor. | No direct code usage found. | Reference | Remove |
| submodules/GrowTools | Utility tools. | No direct code usage found. | Reference | Remove |
| submodules/retro-game-editor | Sprite/Tile editor. | No direct code usage found. | Reference | Remove |
| submodules/SpeedEd | Tile editor. | No direct code usage found. | Reference | Remove |
| submodules/aseprite-guide | Documentation. | No direct code usage found. | Reference | Remove |
| submodules/tilemap-studio | Tilemap editor. | UI has button to launch as external tool. | Reference | Remove (External) |
| submodules/tilemap-editor | Tilemap editor. | No direct code usage found. | Reference | Remove |
| submodules/tactile | Input handling reference. | No direct code usage found. | Reference | Remove |
| submodules/Simple-Sprite-Tile-2D | Sprite/Tile system. | No direct code usage found. | Reference | Remove |
| submodules/bottled-up-tilemap | Tile system. | No direct code usage found. | Reference | Remove |
| submodules/DTile | Tile system. | No direct code usage found. | Reference | Remove |
| submodules/Pixelorama | GDScript pixel art editor. | No direct code usage found. | Reference | Remove |
| submodules/PixiEditor | .NET PixiJS-friendly editor. | No direct code usage found. | Reference | Remove |
| submodules/LibreSprite | FOSS Aseprite fork. | No direct code usage found. | Reference | Remove |
| submodules/rx | Reactive extensions ref. | `rx` string matches local variables in TournamentScene. | Reference | Remove |
| submodules/piskel | Web-based pixel editor. | No direct code usage found. | Reference | Remove |
| submodules/blockbench | Low-poly 3D/2D editor. | No direct code usage found. | Reference | Remove |
| submodules/Cytopia | City builder engine. | No direct code usage found. | Reference | Remove |
| submodules/goxel | Voxel editor. | No direct code usage found. | Reference | Remove |
| submodules/tiled | Industry standard map editor. | No direct code usage found. | Reference | Remove |
| submodules/OgmoEditor3-CE | Tilemap editor. | No direct code usage found. | Reference | Remove |
| submodules/grafx2 | Legacy palette/pixel editor. | No direct code usage found. | Reference | Remove |
| submodules/grafx2-dos | DOS-version of GrafX2. | No direct code usage found. | Reference | Remove |
| submodules/PyxleOS | Pixel art OS/tool. | No direct code usage found. | Reference | Remove |
| submodules/bobui | Robert Pelloni's UI library. | C++ UI framework. No direct TS usage. Part of larger ecosystem. | Library | Keep |

## Summary of Analysis
Most submodules are standalone graphics tools or reference projects written in C, C++, C#, Godot, or GDScript. They are not compiled or imported into the `okgame` TypeScript codebase. The engine implements its own `MapEditor`, `CustomGameEditor`, and `WorldEditor` within `src/renderer/editor/`, which provide built-in versions of many of these tools' features.

The `aseprite` and `tilemap-studio` submodules are "referenced" by UI buttons intended to launch them as external tools in an Electron context, but they do not need to be submodules for this functionality; a system path or user-specified binary is preferred.

`bobui` is a core architectural piece of the larger project ecosystem (Robert Pelloni's C++ UI framework) and should remain as a library reference for future C++/TypeScript synchronization.
