# Submodule Analysis and Integration Status

This document tracks the analysis of submodules within the `okgame` project. The goal is to identify functionality, ensure full implementation/parity in the main engine, and remove redundant submodules.

## Categorization Criteria
- **Library**: Essential runtime dependency. Keep as submodule.
- **Reference**: External tool or code used for logic parity/restoration. Removed once parity is confirmed.
- **Redundant**: Superseded by engine implementation or better tools. Removed.

## Ported Functionality Reference
The following features from removed submodules are now natively implemented in the TypeScript engine:

- **Aseprite/LibreSprite**: .ase/.aseprite binary parsing, frame tag extraction, and cel layering.
  - *Implementation:* `src/renderer/engine/map/AsepriteParser.ts`
- **Tiled/Ogmo/Tilemap Studio**: Multi-layer tile mapping, collision metadata (HIT layer), and object-based warp/door triggers.
  - *Implementation:* `src/renderer/engine/map/GameMap.ts`, `src/shared/MapData.ts`, `src/renderer/editor/MapEditor.ts`
- **GrafX2**: Palette-indexed rendering, 256-color cycling, and legacy .PAL format support.
  - *Implementation:* `src/shared/Palette.ts`, `src/shared/Tileset.ts`
- **Sprite Studio 64**: 8-directional animation frame indexing and walk-cycle bobbing.
  - *Implementation:* `src/renderer/engine/rpg/DemoWorld.ts`, `src/renderer/engine/map/SpriteAtlas.ts`
- **Tactile**: Key-rebinding, gamepad axis normalization, and touch-to-virtual-joystick conversion.
  - *Implementation:* `src/renderer/input/InputManager.ts`, `src/renderer/ui/TouchControls.ts`

## Submodule Status Tracker

| Submodule Path | Remote URL | Branch / Commit | Category | Status | Rationale |
|----------------|------------|-----------------|----------|--------|-----------|
| `submodules/bobui` | `https://github.com/robertpelloni/bqt.git` | `main` @ `92bb40654b` (`v1.2.60`) | Library | **RETAINED** | Robert Pelloni's cross-platform BQt (C++ BobQ/OmniUI + Go `MeshNode` runtime kernel) framework. |
| `submodules/bobui/submodules/juce` | `https://github.com/juce-framework/JUCE` | `master` @ `d60b7a78030661574a615b586d9325ba7a7fa7dd` (`9.0.5`) | Nested Library | **RETAINED** | Audio/DSP & component UI framework bridged via `BobQJuceHost` inside `bobui`. |
| `submodules/bobui/submodules/ultimatepp` | `https://github.com/ultimatepp/ultimatepp` | `master` @ `1a56dd3a4a02112563eb9e16f62f17bba8a0edd1` | Nested Library | **RETAINED** | Rapid C++ GUI framework bridged via `BobQUppComponentRegistry` inside `bobui`. |
| submodules/aseprite | — | — | Reference | Removed | Ported to AsepriteParser.ts. |
| submodules/sprite-studio-64 | — | — | Reference | Removed | Ported to SpriteAtlas.ts. |
| submodules/tiled | — | — | Reference | Removed | Ported to MapData.ts. |
| submodules/grafx2 | — | — | Reference | Removed | Ported to Palette.ts. |
| submodules/tilemap-studio | — | — | Reference | Removed | Ported to MapEditor.ts. |
| submodules/LibreSprite | — | — | Reference | Removed | Redundant with AsepriteParser. |
| submodules/piskel | — | — | Reference | Removed | Superseded by SpriteEditorScene. |
| submodules/blockbench | — | — | Reference | Removed | Superseded by YuuEntity logic. |
| submodules/tactile | — | — | Reference | Removed | Ported to InputManager.ts. |
| submodules/voidsprite | — | — | Reference | Removed | Legacy reference, parity achieved. |
| submodules/retro-game-editor | — | — | Reference | Removed | Superseded by CustomGameEditor.ts. |
| *And 20+ other minor refs* | — | — | Redundant | Removed | No code usage; strictly for reference. |

## Integration Verification
Parity was verified using the `src/__tests__/` suite, specifically:
- `legacy-import.test.ts`: Confirms tile mapping and warp conversion parity.
- `audio-mapping.test.ts`: Confirms legacy SFX ID restoration.
- `visual-systems.test.ts`: Confirms palette and tileset rendering parity.
