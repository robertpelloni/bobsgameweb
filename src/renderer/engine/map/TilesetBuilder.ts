/**
 * TilesetBuilder — generates a Tileset + Palette from legacy numeric tile IDs.
 *
 * The legacy maps use small integer tile IDs (0, 3, 6, 7, 16, etc.)
 * that correspond to tile types in the original Java game. Since we don't
 * yet have the original pixel-art tile data, this builder creates a
 * distinctive "interpretive" tileset that renders each tile type with
 * clear visual identity:
 *
 *   0  = void (empty / transparent)
 *   1  = floor (warm tan/wood)
 *   3  = wall (dark blue-gray bricks)
 *   6  = door (brown wood with golden handle)
 *   7  = floor variant (lighter tan, same as 1 for compatibility)
 *   16 = carpet (red ornate pattern)
 *
 * The builder also creates a visual "interior room" look with:
 *   - Walls that have a 3D depth effect (top face lighter)
 *   - Floors with subtle wood-grain patterns
 *   - Doors with visible frame and handle
 *   - Carpet with border pattern
 *
 * All tiles are 8x8 pixels at 1X, matching the engine's Tileset format.
 */

import { Tileset } from '../../../shared/Tileset';
import { Palette } from '../../../shared/Palette';
import { BobColor } from '../../../shared/BobColor';

/** Palette color indices for the legacy tileset */
const PAL = {
  TRANSPARENT: 0,
  // Floor colors (warm tan/wood)
  FLOOR_BASE: 1,
  FLOOR_LIGHT: 2,
  FLOOR_DARK: 3,
  FLOOR_GRAIN: 4,
  // Wall colors (blue-gray bricks)
  WALL_BASE: 5,
  WALL_TOP: 6,
  WALL_DARK: 7,
  WALL_MORTAR: 8,
  // Door colors (brown wood)
  DOOR_FRAME: 9,
  DOOR_PANEL: 10,
  DOOR_HANDLE: 11,
  DOOR_DARK: 12,
  // Carpet colors (red ornate)
  CARPET_BASE: 13,
  CARPET_BORDER: 14,
  CARPET_PATTERN: 15,
  CARPET_DARK: 16,
  // Void
  VOID_COLOR: 17,
  // Shadow
  SHADOW: 18,
  // Extra floor variant
  FLOOR_VARIANT: 19,
};

export class TilesetBuilder {

  /**
   * Build a complete Tileset + Palette for rendering legacy maps.
   * Returns both the tileset and palette ready for GameMap.render().
   */
  static build(): { tileset: Tileset; palette: Palette } {
    const tileset = new Tileset(256);
    const palette = new Palette(256);

    // ================================================================
    // Set up palette colors
    // ================================================================
    // 0 = transparent (already set by Palette constructor)

    // Floor: warm tan/wood tones
    palette.setColor(PAL.FLOOR_BASE, new BobColor(180, 150, 100));   // tan
    palette.setColor(PAL.FLOOR_LIGHT, new BobColor(200, 175, 125));  // lighter tan
    palette.setColor(PAL.FLOOR_DARK, new BobColor(155, 125, 80));    // darker tan
    palette.setColor(PAL.FLOOR_GRAIN, new BobColor(165, 135, 88));   // wood grain line
    palette.setColor(PAL.FLOOR_VARIANT, new BobColor(190, 165, 115));// variant

    // Wall: blue-gray brick
    palette.setColor(PAL.WALL_BASE, new BobColor(60, 65, 80));      // brick face
    palette.setColor(PAL.WALL_TOP, new BobColor(80, 90, 110));      // top edge (lighter)
    palette.setColor(PAL.WALL_DARK, new BobColor(40, 42, 55));      // shadow side
    palette.setColor(PAL.WALL_MORTAR, new BobColor(90, 95, 105));   // mortar lines

    // Door: brown wood
    palette.setColor(PAL.DOOR_FRAME, new BobColor(100, 70, 40));    // dark frame
    palette.setColor(PAL.DOOR_PANEL, new BobColor(140, 100, 60));   // wood panel
    palette.setColor(PAL.DOOR_HANDLE, new BobColor(220, 200, 80));  // golden handle
    palette.setColor(PAL.DOOR_DARK, new BobColor(80, 55, 30));      // darkest

    // Carpet: red ornate
    palette.setColor(PAL.CARPET_BASE, new BobColor(140, 30, 30));   // deep red
    palette.setColor(PAL.CARPET_BORDER, new BobColor(180, 50, 40)); // bright border
    palette.setColor(PAL.CARPET_PATTERN, new BobColor(160, 40, 35));// pattern
    palette.setColor(PAL.CARPET_DARK, new BobColor(100, 20, 20));   // dark accent

    // Void
    palette.setColor(PAL.VOID_COLOR, new BobColor(15, 15, 25));     // near-black
    palette.setColor(PAL.SHADOW, new BobColor(30, 30, 40));         // shadow

    // ================================================================
    // Build tiles
    // ================================================================

    // Tile 0: void (transparent — already blank by default)

    // Tile 1: floor (warm wood planks)
    TilesetBuilder.buildFloorTile(tileset, 1, PAL);

    // Tile 3: wall (3D brick block)
    TilesetBuilder.buildWallTile(tileset, 3, PAL);

    // Tile 6: door (wooden door with frame)
    TilesetBuilder.buildDoorTile(tileset, 6, PAL);

    // Tile 7: floor variant (same as 1 for backward compat)
    TilesetBuilder.buildFloorTile(tileset, 7, PAL);

    // Tile 16: carpet (red ornate)
    TilesetBuilder.buildCarpetTile(tileset, 16, PAL);

    return { tileset, palette };
  }

  // ================================================================
  // Tile builders
  // ================================================================

  /** Build a warm wood plank floor tile */
  private static buildFloorTile(ts: Tileset, index: number, P: typeof PAL): void {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        let color: number;

        // Horizontal plank lines every 2 rows
        if (y === 1 || y === 4 || y === 7) {
          color = P.FLOOR_GRAIN;
        }
        // Subtle variation
        else if ((x + y) % 3 === 0) {
          color = P.FLOOR_LIGHT;
        }
        else if (x % 5 === 0) {
          color = P.FLOOR_DARK;
        }
        else {
          color = P.FLOOR_BASE;
        }

        ts.setPixel(index, x, y, color);
      }
    }
  }

  /** Build a 3D brick wall tile with top face */
  private static buildWallTile(ts: Tileset, index: number, P: typeof PAL): void {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        let color: number;

        // Top face (row 0-1): lighter, representing the top of the wall
        if (y <= 1) {
          if (x === 0 || y === 0) color = P.WALL_TOP;
          else color = P.WALL_MORTAR;
        }
        // Brick pattern rows 2-7
        else {
          const row = y - 2;
          // Mortar lines between bricks
          if (y === 4 || y === 6) {
            color = P.WALL_MORTAR;
          }
          // Staggered brick pattern
          else if (row % 4 < 2) {
            // Even brick row
            if (x === 3 || x === 7) color = P.WALL_MORTAR;
            else if (x === 0 && row >= 2) color = P.WALL_DARK;
            else color = P.WALL_BASE;
          } else {
            // Odd brick row (offset by 2)
            if (x === 1 || x === 5) color = P.WALL_MORTAR;
            else if (x === 0) color = P.WALL_DARK;
            else color = P.WALL_BASE;
          }
        }

        ts.setPixel(index, x, y, color);
      }
    }
  }

  /** Build a wooden door tile with frame and golden handle */
  private static buildDoorTile(ts: Tileset, index: number, P: typeof PAL): void {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        let color: number;

        // Door frame (1px border)
        if (x === 0 || x === 7 || y === 0 || y === 7) {
          color = P.DOOR_FRAME;
        }
        // Door handle (right-center)
        else if (x === 5 && y === 4) {
          color = P.DOOR_HANDLE;
        }
        // Door panels (inset rectangles)
        else if (x >= 2 && x <= 5 && (y === 2 || y === 5)) {
          color = P.DOOR_DARK;
        }
        else if (x === 1 || x === 6) {
          color = P.DOOR_DARK;
        }
        // Door face
        else {
          color = P.DOOR_PANEL;
        }

        ts.setPixel(index, x, y, color);
      }
    }
  }

  /** Build a red ornate carpet tile */
  private static buildCarpetTile(ts: Tileset, index: number, P: typeof PAL): void {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        let color: number;

        // Border (outer ring)
        if (x === 0 || x === 7 || y === 0 || y === 7) {
          color = P.CARPET_BORDER;
        }
        // Inner border
        else if (x === 1 || x === 6 || y === 1 || y === 6) {
          color = P.CARPET_PATTERN;
        }
        // Diamond pattern in center
        else if ((x + y) === 7 || (x - y + 7) === 7) {
          color = P.CARPET_PATTERN;
        }
        // Corner accents
        else if ((x === 2 || x === 5) && (y === 2 || y === 5)) {
          color = P.CARPET_DARK;
        }
        // Base fill
        else {
          color = P.CARPET_BASE;
        }

        ts.setPixel(index, x, y, color);
      }
    }
  }
}
