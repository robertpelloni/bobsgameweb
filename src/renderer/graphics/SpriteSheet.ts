import { Texture as PIXITexture, Rectangle } from 'pixi.js';
import { Texture } from './Texture';

export interface SpriteSheetConfig {
  frameWidth: number;
  frameHeight: number;
  totalFrames?: number;
  columns?: number;
  rows?: number;
  spacing?: number;
  margin?: number;
}

export class SpriteSheet {
  readonly texture: Texture;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly totalFrames: number;
  readonly spacing: number;
  readonly margin: number;

  private frameCache: Map<number, PIXITexture> = new Map();

  constructor(texture: Texture, config: SpriteSheetConfig) {
    this.texture = texture;
    this.frameWidth = config.frameWidth;
    this.frameHeight = config.frameHeight;
    this.spacing = config.spacing ?? 0;
    this.margin = config.margin ?? 0;

    const usableWidth = texture.textureWidth - this.margin * 2;
    const usableHeight = texture.textureHeight - this.margin * 2;

    this.columns = config.columns ?? Math.floor(
      (usableWidth + this.spacing) / (this.frameWidth + this.spacing)
    );
    this.rows = config.rows ?? Math.floor(
      (usableHeight + this.spacing) / (this.frameHeight + this.spacing)
    );

    this.totalFrames = config.totalFrames ?? this.columns * this.rows;
  }

  getFrame(index: number): PIXITexture {
    if (index < 0 || index >= this.totalFrames) {
      return PIXITexture.EMPTY;
    }

    const cached = this.frameCache.get(index);
    if (cached) return cached;

    const col = index % this.columns;
    const row = Math.floor(index / this.columns);

    const x = this.margin + col * (this.frameWidth + this.spacing);
    const y = this.margin + row * (this.frameHeight + this.spacing);

    const frame = new PIXITexture({
      source: this.texture.base.source,
      frame: new Rectangle(x, y, this.frameWidth, this.frameHeight),
    });

    this.frameCache.set(index, frame);
    return frame;
  }

  getFrameWithClip(index: number, clipPercent: number = 0.01): PIXITexture {
    if (index < 0 || index >= this.totalFrames) {
      return PIXITexture.EMPTY;
    }

    const col = index % this.columns;
    const row = Math.floor(index / this.columns);

    const baseX = this.margin + col * (this.frameWidth + this.spacing);
    const baseY = this.margin + row * (this.frameHeight + this.spacing);

    const clipX = this.frameWidth * clipPercent;
    const clipY = this.frameHeight * clipPercent;

    return new PIXITexture({
      source: this.texture.base.source,
      frame: new Rectangle(
        baseX + clipX,
        baseY + clipY,
        this.frameWidth - clipX * 2,
        this.frameHeight - clipY * 2
      ),
    });
  }

  getFramePosition(index: number): { x: number; y: number } {
    const col = index % this.columns;
    const row = Math.floor(index / this.columns);
    return {
      x: this.margin + col * (this.frameWidth + this.spacing),
      y: this.margin + row * (this.frameHeight + this.spacing),
    };
  }

  destroy(): void {
    for (const texture of this.frameCache.values()) {
      texture.destroy();
    }
    this.frameCache.clear();
  }
}
