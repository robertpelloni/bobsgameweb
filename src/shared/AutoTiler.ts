import { MapData } from './MapData';

export class AutoTiler {
    /**
     * Calculates a 4-bit directional bitmask (North, East, South, West).
     * Returns an index 0-15 based on adjacent tiles of the same type.
     */
    public static getBitmask4(map: MapData, layer: number, x: number, y: number, targetTile: number): number {
        let mask = 0;
        
        // N = 1, E = 2, S = 4, W = 8
        if (this.isSameTile(map, layer, x, y - 1, targetTile)) mask |= 1;
        if (this.isSameTile(map, layer, x + 1, y, targetTile)) mask |= 2;
        if (this.isSameTile(map, layer, x, y + 1, targetTile)) mask |= 4;
        if (this.isSameTile(map, layer, x - 1, y, targetTile)) mask |= 8;
        
        return mask;
    }

    /**
     * Calculates an 8-bit directional bitmask (including diagonals).
     * Used for advanced RPG Maker/Tiled terrain rendering.
     */
    public static getBitmask8(map: MapData, layer: number, x: number, y: number, targetTile: number): number {
        let mask = 0;
        
        // N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128
        if (this.isSameTile(map, layer, x, y - 1, targetTile)) mask |= 1;
        if (this.isSameTile(map, layer, x + 1, y - 1, targetTile) && this.isSameTile(map, layer, x, y-1, targetTile) && this.isSameTile(map, layer, x+1, y, targetTile)) mask |= 2;
        if (this.isSameTile(map, layer, x + 1, y, targetTile)) mask |= 4;
        if (this.isSameTile(map, layer, x + 1, y + 1, targetTile) && this.isSameTile(map, layer, x+1, y, targetTile) && this.isSameTile(map, layer, x, y+1, targetTile)) mask |= 8;
        if (this.isSameTile(map, layer, x, y + 1, targetTile)) mask |= 16;
        if (this.isSameTile(map, layer, x - 1, y + 1, targetTile) && this.isSameTile(map, layer, x, y+1, targetTile) && this.isSameTile(map, layer, x-1, y, targetTile)) mask |= 32;
        if (this.isSameTile(map, layer, x - 1, y, targetTile)) mask |= 64;
        if (this.isSameTile(map, layer, x - 1, y - 1, targetTile) && this.isSameTile(map, layer, x-1, y, targetTile) && this.isSameTile(map, layer, x, y-1, targetTile)) mask |= 128;
        
        return mask;
    }

    private static isSameTile(map: MapData, layer: number, x: number, y: number, targetTile: number): boolean {
        // Out of bounds acts as "same tile" to allow maps to connect cleanly
        if (x < 0 || x >= map.widthTiles1X || y < 0 || y >= map.heightTiles1X) return true;
        const t = map.getTileIndex(layer, x, y);
        // For our specific 16-tile demo, targetTile is 100
        if (targetTile === 100) {
            return t >= 100 && t <= 115;
        }
        return t === targetTile;
    }
}
