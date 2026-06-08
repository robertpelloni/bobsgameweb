# Layer Rules — DO NOT CHANGE WITHOUT USER CONFIRMATION

These rules define how each map layer is rendered in the game.
They were established by examining the actual tile data and user feedback.

## SHADOW Layers — Solid black/dark tiles, rendered TRANSLUCENT

These layers contain shadow silhouettes of various shapes.
The black/dark pixels ARE the shadow content.

- **groundShadow** (layer 2, `_2` in Java):
  - Uses: **REAL atlas** (RGB(1,1,1) = opaque near-black)
  - Alpha: **0.5** (translucent)
  - Status: EMPTY in all 258 extracted maps (data may have been lost)
  - Java name: groundShadow

- **objectShadow** (layer 5, `_5` in Java):
  - Uses: **REAL atlas** (RGB(1,1,1) = opaque near-black)
  - Alpha: **0.75** (translucent)
  - Status: 187 maps have data, 150K+ tiles in outdoor maps
  - Contains: Shadow silhouettes of trees, buildings, objects
  - Java name: objectShadow

## OVERLAY Layers — Furniture detail, curtain bottoms, decorations

These layers contain colored content with RGB(1,1,1) border outlines.
The border outlines must be STRIPPED (made transparent) so only the
colored content remains visible.

- **spriteShadow** (layer 8, `_8` in Java):
  - Uses: **SHADOW atlas** (RGB(1,1,1) = transparent)
  - Alpha: **1.0** (opaque)
  - Contains: Floor-level overlay details (curtain feet, grass, etc.)
  - Renders ABOVE ground details at z-index 1.5
  - Java name: spriteShadow

- **objects2** (layer 4, `_4` in Java):
  - Uses: **SHADOW atlas** (RGB(1,1,1) = transparent)
  - Alpha: **1.0** (opaque)
  - Contains: Furniture overlay detail (bookcase fronts, curtain bottoms, etc.)
  - Renders ABOVE objects at z-index 3.5 (in objectDetailContainer)
  - Java name: objects2

## Z-Index Rendering Order (bottom to top)

| z-index | Layer | Atlas | Alpha | Purpose |
|---------|-------|-------|-------|---------|
| 0 | ground | real | 1.0 | Floor tiles |
| 1 | groundDetail | real | 1.0 | Floor decorations |
| 1.5 | spriteShadow | **shadow** | **1.0** | Overlay details (curtain feet) |
| 2 | groundShadow | real | **0.5** | Shadow silhouettes (floor) |
| 3 | objects | real | 1.0 | Walls, furniture, doors |
| 3.5 | objects2 | **shadow** | **1.0** | Overlay detail (curtain bottoms, bookcase fronts) |
| 4 | objectShadow | real | **0.75** | Shadow silhouettes (objects) |
| 50 | entities | — | 1.0 | Player, NPCs (Y-sorted) |
| 100 | above | real | 1.0 | Rooftops, ceilings |
| 101 | aboveDetail | real | 1.0 | Wall decorations |

## Key Principle

- RGB(1,1,1) in REAL atlas = opaque near-black → used when the black IS the content (shadows)
- RGB(1,1,1) in SHADOW atlas = transparent → used when the black is just a border outline (overlays)

## Tile Analysis Examples

objectShadow tile 35: 63 transparent + 1 RGB(1,1,1) = invisible in real atlas
  → This is a mostly-empty shadow tile, the 1 near-black pixel is a border artifact

objectShadow tile 1833: 44 transparent + 8 RGB(1,1,1) + 12 colored
  → Using real atlas: renders colored content + 8 black border pixels (correct for shadow)
  → Using shadow atlas: renders only 12 colored pixels (borders stripped, wrong for shadow)

spriteShadow tile 1268: 36 transparent + 19 RGB(1,1,1) + 9 colored
  → Using real atlas: renders colored content + 19 black border pixels (wrong for overlay)
  → Using shadow atlas: renders only 9 colored pixels (borders stripped, correct for overlay)

spriteShadow tile 1286: 15 transparent + 15 RGB(1,1,1) + 34 colored
  → Using shadow atlas: renders 34 colored pixels (grass, etc.) — correct for overlay
