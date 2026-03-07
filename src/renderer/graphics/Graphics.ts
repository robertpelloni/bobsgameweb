import { Graphics as PIXIGraphics, Container, GraphicsContext } from 'pixi.js';

export interface DrawStyle {
  fillColor?: number;
  fillAlpha?: number;
  lineColor?: number;
  lineAlpha?: number;
  lineWidth?: number;
}

export class Graphics extends Container {
  private gfx: PIXIGraphics;

  constructor() {
    super();
    this.gfx = new PIXIGraphics();
    this.addChild(this.gfx);
  }

  clear(): this {
    this.gfx.clear();
    return this;
  }

  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number = 0xffffff,
    alpha: number = 1
  ): this {
    this.gfx.rect(x, y, width, height);
    this.gfx.fill({ color, alpha });
    return this;
  }

  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number = 0xffffff,
    alpha: number = 1,
    lineWidth: number = 1
  ): this {
    this.gfx.rect(x, y, width, height);
    this.gfx.stroke({ color, alpha, width: lineWidth });
    return this;
  }

  drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: number = 0xffffff,
    alpha: number = 1,
    lineWidth: number = 1
  ): this {
    this.gfx.moveTo(x0, y0);
    this.gfx.lineTo(x1, y1);
    this.gfx.stroke({ color, alpha, width: lineWidth });
    return this;
  }

  drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number = 0x000000,
    fillAlpha: number = 0.5,
    lineColor: number = 0xffffff,
    lineAlpha: number = 1,
    lineWidth: number = 1
  ): this {
    this.gfx.rect(x, y, width, height);
    this.gfx.fill({ color: fillColor, alpha: fillAlpha });
    this.gfx.stroke({ color: lineColor, alpha: lineAlpha, width: lineWidth });
    return this;
  }

  fillCircle(
    x: number,
    y: number,
    radius: number,
    color: number = 0xffffff,
    alpha: number = 1
  ): this {
    this.gfx.circle(x, y, radius);
    this.gfx.fill({ color, alpha });
    return this;
  }

  strokeCircle(
    x: number,
    y: number,
    radius: number,
    color: number = 0xffffff,
    alpha: number = 1,
    lineWidth: number = 1
  ): this {
    this.gfx.circle(x, y, radius);
    this.gfx.stroke({ color, alpha, width: lineWidth });
    return this;
  }

  fillPolygon(
    points: number[],
    color: number = 0xffffff,
    alpha: number = 1
  ): this {
    this.gfx.poly(points);
    this.gfx.fill({ color, alpha });
    return this;
  }

  strokePolygon(
    points: number[],
    color: number = 0xffffff,
    alpha: number = 1,
    lineWidth: number = 1
  ): this {
    this.gfx.poly(points);
    this.gfx.stroke({ color, alpha, width: lineWidth });
    return this;
  }

  get raw(): PIXIGraphics {
    return this.gfx;
  }
}

export function rgba(r: number, g: number, b: number, _a: number = 1): number {
  return (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);
}

export function rgbaInt(r: number, g: number, b: number, _a: number = 255): number {
  return (r << 16) | (g << 8) | b;
}
