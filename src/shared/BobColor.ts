export class BobColor {
    public r: number;
    public g: number;
    public b: number;
    public a: number;
    public name: string = "";

    constructor(r: number, g: number, b: number, a: number = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    public static fromInt(rgb: number): BobColor {
        return new BobColor((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
    }

    public toInt(): number {
        return (this.a << 24) | (this.r << 16) | (this.g << 8) | this.b;
    }

    public rf(): number { return this.r / 255.0; }
    public gf(): number { return this.g / 255.0; }
    public bf(): number { return this.b / 255.0; }
    public af(): number { return this.a / 255.0; }

    public clone(): BobColor {
        const c = new BobColor(this.r, this.g, this.b, this.a);
        c.name = this.name;
        return c;
    }

    public copyFrom(other: BobColor): void {
        this.r = other.r; this.g = other.g; this.b = other.b; this.a = other.a; this.name = other.name;
    }

    public darker(ratio: number = 0.1): void {
        this.r = Math.floor(this.r * (1.0 - ratio));
        this.g = Math.floor(this.g * (1.0 - ratio));
        this.b = Math.floor(this.b * (1.0 - ratio));
    }

    public lighter(ratio: number = 0.1): void {
        this.r = Math.min(255, Math.floor(this.r * (1.0 + ratio)));
        this.g = Math.min(255, Math.floor(this.g * (1.0 + ratio)));
        this.b = Math.min(255, Math.floor(this.b * (1.0 + ratio)));
    }

    public static readonly clear = new BobColor(0, 0, 0, 0);
    public static readonly black = new BobColor(0, 0, 0);
    public static readonly white = new BobColor(255, 255, 255);
    public static readonly gray = new BobColor(128, 128, 128);
    public static readonly darkGray = new BobColor(64, 64, 64);
    public static readonly lightGray = new BobColor(192, 192, 192);
    public static readonly red = new BobColor(255, 0, 0);
    public static readonly green = new BobColor(0, 255, 0);
    public static readonly blue = new BobColor(0, 0, 255);
    public static readonly yellow = new BobColor(255, 255, 0);
    public static readonly magenta = new BobColor(255, 0, 255);
    public static readonly cyan = new BobColor(0, 255, 255);
    public static readonly orange = new BobColor(255, 165, 0);
    public static readonly pink = new BobColor(255, 192, 203);
    public static readonly purple = new BobColor(128, 0, 128);
}
