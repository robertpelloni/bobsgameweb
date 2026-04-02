import { Palette } from './Palette';
import { BobColor } from './BobColor';

export class Tileset {
    public tilePaletteIndex: Uint8Array; // [index * 8 * 8 + y * 8 + x]
    public numTiles: number;
    public static readonly TILE_SIZE = 8;

    constructor(size: number = 5000) {
        this.numTiles = size;
        this.tilePaletteIndex = new Uint8Array(size * 8 * 8);
    }

    public setPixel(tileIndex: number, x: number, y: number, colorIndex: number): void {
        if (tileIndex >= this.numTiles) return;
        const index = (tileIndex * 64) + (y * 8) + x;
        this.tilePaletteIndex[index] = colorIndex;
    }

    public getPixel(tileIndex: number, x: number, y: number): number {
        if (tileIndex >= this.numTiles) return 0;
        const index = (tileIndex * 64) + (y * 8) + x;
        return this.tilePaletteIndex[index];
    }

    public isTileBlank(tileIndex: number): boolean {
        const start = tileIndex * 64;
        for (let i = 0; i < 64; i++) {
            if (this.tilePaletteIndex[start + i] !== 0) return false;
        }
        return true;
    }

    // Generate an RGBA buffer for a tile using a palette
    public getTileRGBA(tileIndex: number, palette: Palette, alpha: number = 255): Uint8ClampedArray {
        const rgba = new Uint8ClampedArray(8 * 8 * 4);
        const start = tileIndex * 64;
        for (let i = 0; i < 64; i++) {
            const colorIndex = this.tilePaletteIndex[start + i];
            const color = palette.getColor(colorIndex);
            const offset = i * 4;
            rgba[offset] = color.r;
            rgba[offset + 1] = color.g;
            rgba[offset + 2] = color.b;
            rgba[offset + 3] = colorIndex === 0 ? 0 : Math.min(color.a, alpha);
        }
        return rgba;
    }
}
