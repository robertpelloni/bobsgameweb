import { BobColor } from './BobColor';

export class Palette {
    public colors: BobColor[] = [];
    public numColors: number = 256;

    constructor(numColors: number = 256) {
        this.numColors = numColors;
        for (let i = 0; i < numColors; i++) {
            this.colors.push(new BobColor(0, 0, 0, 255));
        }
        // Color 0 is usually transparent/background
        this.colors[0] = new BobColor(0, 0, 0, 0);
    }

    public getColor(index: number): BobColor {
        return this.colors[index] || this.colors[0];
    }

    public setColor(index: number, color: BobColor): void {
        if (index >= 0 && index < this.numColors) {
            this.colors[index] = color;
        }
    }

    public getColorInt(index: number): number {
        return this.getColor(index).toInt();
    }

    // Ported from Java: get color if exists or add it
    public getColorIfExistsOrAddColor(r: number, g: number, b: number, a: number = 255): number {
        for (let i = 1; i < this.numColors; i++) {
            const c = this.colors[i];
            if (c.r === r && c.g === g && c.b === b && c.a === a) {
                return i;
            }
        }
        // Not found, find first "empty" color (assuming black/0 alpha or something)
        // In the original, it used a 'used' array. Let's just append for now if possible.
        // Simplified for web port.
        return -1;
    }

    public findNearestColor(color: BobColor): number {
        let minDistance = Infinity;
        let nearestIndex = 0;
        // Start from index 1 to avoid transparent/background color at index 0
        for (let i = 1; i < this.numColors; i++) {
            const c = this.colors[i];
            const dr = c.r - color.r;
            const dg = c.g - color.g;
            const db = c.b - color.b;
            const dist = dr * dr + dg * dg + db * db;
            if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = i;
            }
        }
        return nearestIndex;
    }
}
