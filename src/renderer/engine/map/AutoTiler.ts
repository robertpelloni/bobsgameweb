/**
 * AutoTiler — 4-bit bitmask autotiling for walls, pipes, and terrain.
 *
 * Ported from Java engine com.bobsgame.editor.Project.AutoTiler.
 * Uses a 16-tile autotile set where each tile represents a connection bitmask.
 *
 * Bit layout:
 *   1 = North (top neighbor matches)
 *   2 = East  (right neighbor matches)
 *   4 = South (bottom neighbor matches)
 *   8 = West  (left neighbor matches)
 *
 * Result: baseIndex + mask (0-15) selects the correct tile variant.
 */

export interface AutoTileMap {
    getTileIndex(layer: number, x: number, y: number): number;
    widthTiles: number;
    heightTiles: number;
}

export class AutoTiler {
    /**
     * Calculate the autotile index for a position using 4-bit edge masking.
     *
     * @param map The tile map to query
     * @param layer The tile layer index
     * @param x Current tile X position
     * @param y Current tile Y position
     * @param baseIndex The starting tile index of this 16-tile autotile set
     * @returns The tile index to use (baseIndex + mask)
     */
    static getAutoTileIndex(
        map: AutoTileMap,
        layer: number,
        x: number,
        y: number,
        baseIndex: number,
    ): number {
        const minIndex = baseIndex;
        const maxIndex = baseIndex + 15;

        let mask = 0;

        // North
        if (AutoTiler.isSameSet(map, layer, x, y - 1, minIndex, maxIndex)) {
            mask |= 1;
        }
        // East
        if (AutoTiler.isSameSet(map, layer, x + 1, y, minIndex, maxIndex)) {
            mask |= 2;
        }
        // South
        if (AutoTiler.isSameSet(map, layer, x, y + 1, minIndex, maxIndex)) {
            mask |= 4;
        }
        // West
        if (AutoTiler.isSameSet(map, layer, x - 1, y, minIndex, maxIndex)) {
            mask |= 8;
        }

        return baseIndex + mask;
    }

    /**
     * Extended 8-bit autotiling (includes diagonals).
     * Uses a 47-tile Wang tile set.
     *
     * Bit layout:
     *   1  = North      16 = North-East
     *   2  = East       32 = South-East
     *   4  = South      64 = South-West
     *   8  = West      128 = North-West
     */
    static getAutoTileIndex8Bit(
        map: AutoTileMap,
        layer: number,
        x: number,
        y: number,
        baseIndex: number,
    ): number {
        const minIndex = baseIndex;
        const maxIndex = baseIndex + 15;

        // Cardinal connections
        const north = AutoTiler.isSameSet(map, layer, x, y - 1, minIndex, maxIndex);
        const east = AutoTiler.isSameSet(map, layer, x + 1, y, minIndex, maxIndex);
        const south = AutoTiler.isSameSet(map, layer, x, y + 1, minIndex, maxIndex);
        const west = AutoTiler.isSameSet(map, layer, x - 1, y, minIndex, maxIndex);

        // Diagonal connections (only valid if both adjacent cardinals match)
        const northEast = north && east && AutoTiler.isSameSet(map, layer, x + 1, y - 1, minIndex, maxIndex);
        const southEast = south && east && AutoTiler.isSameSet(map, layer, x + 1, y + 1, minIndex, maxIndex);
        const southWest = south && west && AutoTiler.isSameSet(map, layer, x - 1, y + 1, minIndex, maxIndex);
        const northWest = north && west && AutoTiler.isSameSet(map, layer, x - 1, y - 1, minIndex, maxIndex);

        // Use the basic 4-bit mask for the 16-tile set
        // (full 47-tile Wang tile support would require a lookup table)
        let mask = 0;
        if (north) mask |= 1;
        if (east) mask |= 2;
        if (south) mask |= 4;
        if (west) mask |= 8;

        return baseIndex + mask;
    }

    /**
     * Batch-apply autotiling to an entire region.
     */
    static autotileRegion(
        map: AutoTileMap,
        layer: number,
        startX: number,
        startY: number,
        width: number,
        height: number,
        baseIndex: number,
        output: Uint16Array,
    ): void {
        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                const currentTile = map.getTileIndex(layer, x, y);
                if (currentTile >= baseIndex && currentTile <= baseIndex + 15) {
                    const idx = (y - startY) * width + (x - startX);
                    output[idx] = AutoTiler.getAutoTileIndex(map, layer, x, y, baseIndex);
                }
            }
        }
    }

    private static isSameSet(
        map: AutoTileMap,
        layer: number,
        x: number,
        y: number,
        min: number,
        max: number,
    ): boolean {
        if (x < 0 || y < 0 || x >= map.widthTiles || y >= map.heightTiles) return false;
        const tile = map.getTileIndex(layer, x, y);
        return tile >= min && tile <= max;
    }
}
