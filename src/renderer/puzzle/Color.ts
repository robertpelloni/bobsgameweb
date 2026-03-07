export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export class Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly hex: number;
  readonly name: string;

  constructor(name: string, r: number, g: number, b: number) {
    this.name = name;
    this.r = Math.max(0, Math.min(255, r));
    this.g = Math.max(0, Math.min(255, g));
    this.b = Math.max(0, Math.min(255, b));
    this.hex = (this.r << 16) | (this.g << 8) | this.b;
  }

  static fromHex(name: string, hex: number): Color {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return new Color(name, r, g, b);
  }

  toHexString(): string {
    return `#${this.hex.toString(16).padStart(6, '0')}`;
  }

  toRGB(): ColorRGB {
    return { r: this.r, g: this.g, b: this.b };
  }

  lerp(other: Color, t: number): Color {
    const clampedT = Math.max(0, Math.min(1, t));
    return new Color(
      `${this.name}-${other.name}`,
      Math.round(this.r + (other.r - this.r) * clampedT),
      Math.round(this.g + (other.g - this.g) * clampedT),
      Math.round(this.b + (other.b - this.b) * clampedT)
    );
  }

  brighten(amount: number): Color {
    return new Color(
      this.name,
      Math.min(255, this.r + amount),
      Math.min(255, this.g + amount),
      Math.min(255, this.b + amount)
    );
  }

  darken(amount: number): Color {
    return new Color(
      this.name,
      Math.max(0, this.r - amount),
      Math.max(0, this.g - amount),
      Math.max(0, this.b - amount)
    );
  }

  equals(other: Color): boolean {
    return this.hex === other.hex;
  }
}

// ============================================================
// Standard Block Colors (from legacy bob's game)
// ============================================================

export const Colors = {
  RED: new Color('red', 255, 0, 0),
  ORANGE: new Color('orange', 255, 165, 0),
  YELLOW: new Color('yellow', 255, 255, 0),
  GREEN: new Color('green', 0, 255, 0),
  CYAN: new Color('cyan', 0, 255, 255),
  BLUE: new Color('blue', 0, 0, 255),
  PURPLE: new Color('purple', 128, 0, 128),
  MAGENTA: new Color('magenta', 255, 0, 255),
  PINK: new Color('pink', 255, 192, 203),
  WHITE: new Color('white', 255, 255, 255),
  GRAY: new Color('gray', 128, 128, 128),
  BLACK: new Color('black', 0, 0, 0),

  TETRIS_I: new Color('tetris-i', 0, 255, 255),
  TETRIS_O: new Color('tetris-o', 255, 255, 0),
  TETRIS_T: new Color('tetris-t', 128, 0, 128),
  TETRIS_S: new Color('tetris-s', 0, 255, 0),
  TETRIS_Z: new Color('tetris-z', 255, 0, 0),
  TETRIS_J: new Color('tetris-j', 0, 0, 255),
  TETRIS_L: new Color('tetris-l', 255, 165, 0),
} as const;

export const DEFAULT_BLOCK_COLORS: readonly Color[] = [
  Colors.RED,
  Colors.ORANGE,
  Colors.YELLOW,
  Colors.GREEN,
  Colors.CYAN,
  Colors.BLUE,
  Colors.PURPLE,
  Colors.MAGENTA,
];
