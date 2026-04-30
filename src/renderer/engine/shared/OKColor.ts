/**
 * OKColor — RGBA color with named constants and utility methods.
 *
 * Ported from okgame C++ Utility/OKColor.
 * Provides a complete color palette for the game engine.
 */

export class OKColor {
    name = '';
    r = 0;
    g = 0;
    b = 0;
    a = 255;

    constructor(r = 0, g = 0, b = 0, a = 255, name = '') {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this.name = name;
    }

    // ============================================================
    // Conversion
    // ============================================================

    toHex(): number {
        return (this.r << 16) | (this.g << 8) | this.b;
    }

    toCSS(): string {
        if (this.a === 255) {
            return `rgb(${this.r}, ${this.g}, ${this.b})`;
        }
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})`;
    }

    toHexString(): string {
        return '#' + this.toHex().toString(16).padStart(6, '0');
    }

    static fromHex(hex: number, a = 255): OKColor {
        return new OKColor((hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF, a);
    }

    static fromCSS(css: string): OKColor {
        const m = css.match(/(\d+)/g);
        if (!m) return OKColor.black;
        return new OKColor(+m[0], +m[1], +m[2], m[3] ? +m[3] : 255);
    }

    // ============================================================
    // Operations
    // ============================================================

    clone(): OKColor {
        return new OKColor(this.r, this.g, this.b, this.a, this.name);
    }

    equals(c: OKColor): boolean {
        return this.r === c.r && this.g === c.g && this.b === c.b && this.a === c.a;
    }

    lerp(target: OKColor, t: number): OKColor {
        return new OKColor(
            Math.round(this.r + (target.r - this.r) * t),
            Math.round(this.g + (target.g - this.g) * t),
            Math.round(this.b + (target.b - this.b) * t),
            Math.round(this.a + (target.a - this.a) * t),
        );
    }

    brighten(amount: number): OKColor {
        return new OKColor(
            Math.min(255, this.r + amount),
            Math.min(255, this.g + amount),
            Math.min(255, this.b + amount),
            this.a,
        );
    }

    withAlpha(a: number): OKColor {
        return new OKColor(this.r, this.g, this.b, a, this.name);
    }

    // ============================================================
    // Named Colors
    // ============================================================

    static readonly clear = new OKColor(0, 0, 0, 0, 'clear');
    static readonly transparent = new OKColor(0, 0, 0, 0, 'transparent');
    static readonly black = new OKColor(0, 0, 0, 255, 'black');

    static readonly darkerGray = new OKColor(32, 32, 32, 255, 'darkerGray');
    static readonly darkGray = new OKColor(64, 64, 64, 255, 'darkGray');
    static readonly gray = new OKColor(128, 128, 128, 255, 'gray');
    static readonly lightGray = new OKColor(192, 192, 192, 255, 'lightGray');
    static readonly lighterGray = new OKColor(224, 224, 224, 255, 'lighterGray');

    static readonly white = new OKColor(255, 255, 255, 255, 'white');

    static readonly cyan = new OKColor(0, 255, 255, 255, 'cyan');
    static readonly lightCyan = new OKColor(150, 255, 255, 255, 'lightCyan');
    static readonly lighterCyan = new OKColor(200, 255, 255, 255, 'lighterCyan');
    static readonly darkCyan = new OKColor(0, 220, 220, 255, 'darkCyan');
    static readonly darkerCyan = new OKColor(0, 180, 180, 255, 'darkerCyan');

    static readonly magenta = new OKColor(255, 0, 255, 255, 'magenta');
    static readonly lightMagenta = new OKColor(255, 120, 255, 255, 'lightMagenta');
    static readonly darkMagenta = new OKColor(150, 0, 150, 255, 'darkMagenta');

    static readonly yellow = new OKColor(255, 255, 0, 255, 'yellow');
    static readonly lightYellow = new OKColor(255, 255, 127, 255, 'lightYellow');
    static readonly darkYellow = new OKColor(200, 200, 0, 255, 'darkYellow');
    static readonly darkerYellow = new OKColor(127, 127, 0, 255, 'darkerYellow');

    static readonly orange = new OKColor(255, 165, 0, 255, 'orange');
    static readonly lightOrange = new OKColor(255, 190, 110, 255, 'lightOrange');
    static readonly darkOrange = new OKColor(220, 115, 0, 255, 'darkOrange');
    static readonly darkerOrange = new OKColor(150, 90, 0, 255, 'darkerOrange');

    static readonly red = new OKColor(255, 0, 0, 255, 'red');
    static readonly lightRed = new OKColor(255, 127, 127, 255, 'lightRed');
    static readonly darkRed = new OKColor(127, 0, 0, 255, 'darkRed');
    static readonly darkerRed = new OKColor(64, 0, 0, 255, 'darkerRed');

    static readonly pink = new OKColor(255, 105, 180, 255, 'pink');
    static readonly lightPink = new OKColor(255, 127, 255, 255, 'lightPink');
    static readonly darkPink = new OKColor(127, 0, 127, 255, 'darkPink');

    static readonly purple = new OKColor(127, 0, 255, 255, 'purple');
    static readonly lightPurple = new OKColor(159, 63, 255, 255, 'lightPurple');
    static readonly darkPurple = new OKColor(63, 0, 127, 255, 'darkPurple');

    static readonly blue = new OKColor(0, 0, 255, 255, 'blue');
    static readonly lightBlue = new OKColor(150, 150, 255, 255, 'lightBlue');
    static readonly darkBlue = new OKColor(0, 0, 150, 255, 'darkBlue');
    static readonly darkerBlue = new OKColor(0, 0, 64, 255, 'darkerBlue');

    static readonly green = new OKColor(0, 255, 0, 255, 'green');
    static readonly lightGreen = new OKColor(127, 255, 127, 255, 'lightGreen');
    static readonly darkGreen = new OKColor(0, 127, 0, 255, 'darkGreen');
    static readonly darkerGreen = new OKColor(0, 64, 0, 255, 'darkerGreen');

    static readonly aqua = new OKColor(0, 255, 255, 255, 'aqua');
    static readonly turquoise = new OKColor(64, 224, 208, 255, 'turquoise');
    static readonly olive = new OKColor(128, 128, 0, 255, 'olive');

    /** Get a color by name */
    static getColorByName(name: string): OKColor {
        const colors: Record<string, OKColor> = {
            clear: OKColor.clear, black: OKColor.black, white: OKColor.white,
            red: OKColor.red, green: OKColor.green, blue: OKColor.blue,
            yellow: OKColor.yellow, cyan: OKColor.cyan, magenta: OKColor.magenta,
            orange: OKColor.orange, pink: OKColor.pink, purple: OKColor.purple,
            gray: OKColor.gray, darkGray: OKColor.darkGray, lightGray: OKColor.lightGray,
            darkRed: OKColor.darkRed, darkGreen: OKColor.darkGreen, darkBlue: OKColor.darkBlue,
            lightRed: OKColor.lightRed, lightGreen: OKColor.lightGreen, lightBlue: OKColor.lightBlue,
        };
        return colors[name] ?? OKColor.white;
    }
}
