import { Sprite as PIXISprite, Container, Texture as PIXITexture, Rectangle } from 'pixi.js';
import { Texture } from './Texture';

export interface AnimationSequence {
  name: string;
  frameStart: number;
  hitBoxLeft?: number;
  hitBoxRight?: number;
  hitBoxTop?: number;
  hitBoxBottom?: number;
  frameCount?: number;
}

export interface SpriteData {
  name: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  animations: AnimationSequence[];
}

export class Sprite extends Container {
  private texture: Texture;
  private frameWidth: number;
  private frameHeight: number;
  private totalFrames: number;
  private framesPerRow: number;
  private animations: Map<string, AnimationSequence> = new Map();
  private currentFrame: number = 0;
  private currentAnimation: AnimationSequence | null = null;
  private pixiSprite: PIXISprite;

  constructor(texture: Texture, data: SpriteData) {
    super();
    this.texture = texture;
    this.frameWidth = data.frameWidth;
    this.frameHeight = data.frameHeight;
    this.totalFrames = data.totalFrames;
    this.framesPerRow = Math.floor(texture.textureWidth / this.frameWidth);

    for (const anim of data.animations) {
      this.animations.set(anim.name, anim);
    }
    this.computeAnimationFrameCounts();

    this.pixiSprite = new PIXISprite();
    this.addChild(this.pixiSprite);
    this.setFrame(0);
  }

  private computeAnimationFrameCounts(): void {
    const sortedAnims = Array.from(this.animations.values())
      .sort((a, b) => a.frameStart - b.frameStart);

    for (let i = 0; i < sortedAnims.length; i++) {
      const anim = sortedAnims[i];
      if (anim.frameCount === undefined) {
        const nextStart = i + 1 < sortedAnims.length
          ? sortedAnims[i + 1].frameStart
          : this.totalFrames;
        anim.frameCount = nextStart - anim.frameStart;
      }
    }
  }

  setFrame(frame: number): void {
    if (frame < 0 || frame >= this.totalFrames) return;
    this.currentFrame = frame;
    this.updateSpriteTexture();
  }

  private updateSpriteTexture(): void {
    const col = this.currentFrame % this.framesPerRow;
    const row = Math.floor(this.currentFrame / this.framesPerRow);
    const x = col * this.frameWidth;
    const y = row * this.frameHeight;

    const borderClip = 0.01;
    const clipX = this.frameWidth * borderClip;
    const clipY = this.frameHeight * borderClip;

    const region = new Rectangle(
      x + clipX,
      y + clipY,
      this.frameWidth - clipX * 2,
      this.frameHeight - clipY * 2
    );

    this.pixiSprite.texture = new PIXITexture({
      source: this.texture.base.source,
      frame: region,
    });
  }

  setAnimation(name: string): boolean {
    const anim = this.animations.get(name);
    if (!anim) return false;
    this.currentAnimation = anim;
    this.setFrame(anim.frameStart);
    return true;
  }

  getAnimation(name: string): AnimationSequence | undefined {
    return this.animations.get(name);
  }

  getAnimationByFrame(frame: number): AnimationSequence | null {
    let result: AnimationSequence | null = null;
    for (const anim of this.animations.values()) {
      if (anim.frameStart <= frame) {
        if (!result || anim.frameStart > result.frameStart) {
          result = anim;
        }
      }
    }
    return result;
  }

  getAnimationNames(): string[] {
    return Array.from(this.animations.keys());
  }

  getAnimationFrameCount(name: string): number {
    const anim = this.animations.get(name);
    return anim?.frameCount ?? 0;
  }

  get frame(): number {
    return this.currentFrame;
  }

  get animation(): AnimationSequence | null {
    return this.currentAnimation;
  }

  get spriteWidth(): number {
    return this.frameWidth;
  }

  get spriteHeight(): number {
    return this.frameHeight;
  }

  setTint(r: number, g: number, b: number): void {
    this.pixiSprite.tint = (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);
  }

  setAlpha(a: number): void {
    this.pixiSprite.alpha = a;
  }

  drawAt(x: number, y: number): void {
    this.position.set(x, y);
  }

  drawAtBounds(x0: number, y0: number, x1: number, y1: number): void {
    this.position.set(x0, y0);
    this.pixiSprite.width = x1 - x0;
    this.pixiSprite.height = y1 - y0;
  }
}
