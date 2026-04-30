import { Texture as PIXITexture, Rectangle } from 'pixi.js';

export const FILTER_NEAREST = 'nearest';
export const FILTER_LINEAR = 'linear';

export type FilterMode = typeof FILTER_NEAREST | typeof FILTER_LINEAR;

export class Texture {
  readonly base: PIXITexture;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly textureWidth: number;
  readonly textureHeight: number;
  readonly widthRatio: number;
  readonly heightRatio: number;

  constructor(
    base: PIXITexture,
    imageWidth?: number,
    imageHeight?: number
  ) {
    this.base = base;
    this.textureWidth = base.width;
    this.textureHeight = base.height;
    this.imageWidth = imageWidth ?? base.width;
    this.imageHeight = imageHeight ?? base.height;
    this.widthRatio = this.imageWidth / this.textureWidth;
    this.heightRatio = this.imageHeight / this.textureHeight;
  }

  getRegion(x: number, y: number, width: number, height: number): PIXITexture {
    return new PIXITexture({
      source: this.base.source,
      frame: new Rectangle(x, y, width, height),
    });
  }

  get width(): number {
    return this.imageWidth;
  }

  get height(): number {
    return this.imageHeight;
  }

  destroy(): void {
    this.base.destroy();
  }

  static get EMPTY(): Texture {
    return new Texture(PIXITexture.EMPTY);
  }
}
