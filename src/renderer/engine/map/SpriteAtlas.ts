/**
 * SpriteAtlas — Loads the extracted sprite atlas for character rendering.
 * Uses the original game's animation sequence data for proper direction mapping.
 */
import { Texture, Sprite, Assets, AnimatedSprite, Rectangle } from 'pixi.js';
import { HQ2X } from '../shared/HQ2X';

export interface SpriteAtlasEntry {
  name: string;
  x: number;
  y: number;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  atlasFrames: number;
}

export interface AnimationSequence {
  name: string;
  frameStart: number;
  numFrames: number;
}

export class SpriteAtlas {
  private atlasTexture!: Texture;
  private entries: Map<string, SpriteAtlasEntry> = new Map();
  private animations: Map<string, Map<string, AnimationSequence>> = new Map();
  private frameCache: Map<string, Texture> = new Map();
  private hqCache: Map<string, Texture> = new Map();
  public useHQ2X: boolean = false;

  get loaded(): boolean { return !!this.atlasTexture && this.entries.size > 0; }

  async load(): Promise<void> {
    // Load atlas metadata
    const metaResp = await fetch('/sprites/sprite_atlas.json');
    const entries: SpriteAtlasEntry[] = await metaResp.json();
    for (const entry of entries) {
      this.entries.set(entry.name, entry);
    }

    // Load animation sequences from original game data
    try {
      const animResp = await fetch('/sprites/sprite_animations.json');
      const animData: Record<string, Record<string, number>> = await animResp.json();
      for (const [spriteName, anims] of Object.entries(animData)) {
        const animMap = new Map<string, AnimationSequence>();
        const sortedEntries = Object.entries(anims).sort((a, b) => a[1] - b[1]);
        for (let i = 0; i < sortedEntries.length; i++) {
          const [seqName, frameStart] = sortedEntries[i];
          // Calculate number of frames: from this start to the next start (or end of sprite)
          const nextStart = (i + 1 < sortedEntries.length) ? sortedEntries[i + 1][1] : (this.entries.get(spriteName)?.frames ?? 8);
          const numFrames = nextStart - frameStart;
          animMap.set(seqName, { name: seqName, frameStart, numFrames });
        }
        this.animations.set(spriteName, animMap);
      }
      console.log(`[SpriteAtlas] Loaded animations for ${this.animations.size} sprites`);
    } catch (e) {
      console.warn('[SpriteAtlas] Failed to load animation data, using defaults:', e);
    }

    // Load atlas texture
    this.atlasTexture = await Assets.load('/sprites/sprite_atlas.png') as Texture;
    if ((this.atlasTexture.source as any).style) {
      (this.atlasTexture.source as any).style.addressMode = 'clamp-to-edge';
    }
    (this.atlasTexture.source as any).scaleMode = 'nearest';

    console.log(`[SpriteAtlas] Loaded: ${entries.length} sprites, ${this.animations.size} with animation data`);
  }

  /** Get a single frame texture */
  getFrame(spriteName: string, frameIndex: number): Texture | null {
    const entry = this.entries.get(spriteName);
    if (!entry) return null;

    const maxFrame = Math.min(entry.frames, entry.atlasFrames * 4) - 1;
    const f = Math.max(0, Math.min(frameIndex, maxFrame));

    const cacheKey = `${spriteName}_${f}`;
    if (this.useHQ2X && this.hqCache.has(cacheKey)) return this.hqCache.get(cacheKey)!;
    if (!this.useHQ2X && this.frameCache.has(cacheKey)) return this.frameCache.get(cacheKey)!;

    const col = f % entry.atlasFrames;
    const row = Math.floor(f / entry.atlasFrames);

    const frameRect = {
      x: entry.x + col * entry.frameWidth,
      y: entry.y + row * entry.frameHeight,
      width: entry.frameWidth,
      height: entry.frameHeight,
    };

    const tex = new Texture({
      source: this.atlasTexture.source,
      frame: frameRect as any,
    });

    if (this.useHQ2X) {
        const hqTex = this.generateHQFrame(tex);
        this.hqCache.set(cacheKey, hqTex);
        return hqTex;
    }

    this.frameCache.set(cacheKey, tex);
    return tex;
  }

  private generateHQFrame(tex: Texture): Texture {
    // Conceptual: In a real app we'd use a shared canvas to avoid GC pressure
    const canvas = document.createElement('canvas');
    canvas.width = tex.frame.width;
    canvas.height = tex.frame.height;

    // PixiJS v8 Texture to Canvas is complex without renderer,
    // so we'll use the source image and crop manually
    const source = this.atlasTexture.source.resource as HTMLImageElement;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, tex.frame.x, tex.frame.y, tex.frame.width, tex.frame.height, 0, 0, tex.frame.width, tex.frame.height);

    const hqCanvas = HQ2X.upscaleCanvas(canvas);
    return Texture.from(hqCanvas);
  }

  /** Get animation sequence by name */
  getAnimation(spriteName: string, animName: string): AnimationSequence | null {
    const anims = this.animations.get(spriteName);
    if (!anims) return null;
    return anims.get(animName) ?? null;
  }

  /** Get all animation names for a sprite */
  getAnimationNames(spriteName: string): string[] {
    const anims = this.animations.get(spriteName);
    if (!anims) return [];
    return Array.from(anims.keys());
  }

  /** Check if sprite has 8-direction animations */
  has8Directions(spriteName: string): boolean {
    const anims = this.animations.get(spriteName);
    if (!anims) return false;
    return anims.has('UpLeft') || anims.has('UpRight') || anims.has('DownLeft') || anims.has('DownRight');
  }

  /** Get animation frames for a named sequence */
  getAnimationFrames(spriteName: string, animName: string): Texture[] {
    const seq = this.getAnimation(spriteName, animName);
    if (!seq) {
      // Fallback: try to get 8 frames from the start
      const frames: Texture[] = [];
      for (let i = 0; i < 8; i++) {
        const tex = this.getFrame(spriteName, i);
        if (tex) frames.push(tex);
      }
      return frames;
    }

    const frames: Texture[] = [];
    for (let i = 0; i < seq.numFrames; i++) {
      const tex = this.getFrame(spriteName, seq.frameStart + i);
      if (tex) frames.push(tex);
    }
    return frames;
  }

  /** Create an animated sprite for a given direction */
  createAnimatedSprite(spriteName: string, animName: string = 'Down', speed: number = 0.15): AnimatedSprite | null {
    const entry = this.entries.get(spriteName);
    if (!entry) return null;

    const frames = this.getAnimationFrames(spriteName, animName);
    if (frames.length === 0) return null;

    const anim = new AnimatedSprite(frames);
    anim.anchor.set(0.5, 1.0);
    anim.animationSpeed = speed;
    return anim;
  }

  /** Create animated sprite, trying multiple animation names as fallback */
  createAnimatedSpriteWithFallback(spriteName: string, animNames: string[], speed: number = 0.1): AnimatedSprite | null {
    for (const name of animNames) {
      const anim = this.createAnimatedSprite(spriteName, name, speed);
      if (anim) return anim;
    }
    // Last resort: try first available animation
    const animNames2 = this.getAnimationNames(spriteName);
    if (animNames2.length > 0) {
      return this.createAnimatedSprite(spriteName, animNames2[0], speed);
    }
    return null;
  }

  createSprite(spriteName: string, frameIndex: number = 0): Sprite | null {
    const tex = this.getFrame(spriteName, frameIndex);
    if (!tex) return null;
    return new Sprite(tex);
  }

  getEntry(spriteName: string): SpriteAtlasEntry | undefined {
    return this.entries.get(spriteName);
  }

  getSpriteNames(): string[] {
    return Array.from(this.entries.keys());
  }

  destroy(): void {
    for (const t of this.frameCache.values()) t.destroy(true);
    this.frameCache.clear();
  }
}
