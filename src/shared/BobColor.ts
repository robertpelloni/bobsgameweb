export class BobColor {
    public r: number;
    public g: number;
    public b: number;
    public a: number;

    constructor(r: number, g: number, b: number, a: number = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    public static fromFloat(r: number, g: number, b: number, a: number = 1.0): BobColor {
        return new BobColor(Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255), Math.floor(a * 255));
    }

    public toInt(): number {
        return (this.r << 16) | (this.g << 8) | this.b;
    }

    public static white = new BobColor(255, 255, 255);
    public static black = new BobColor(0, 0, 0);
    public static gray = new BobColor(128, 128, 128);
    public static darkGray = new BobColor(64, 64, 64);
    public static clear = new BobColor(0, 0, 0, 0);
}
