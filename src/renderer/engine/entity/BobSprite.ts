/**
 * BobSprite — loaded sprite asset with texture management, animation lookup, and rendering.
 *
 * Ported from okgame C++ Engine/entity/BobSprite.
 * Wraps SpriteData with loaded texture and animation state.
 */
import { SpriteData, type SpriteAnimationSequenceData } from './SpriteData';
import { SpriteAnimation } from './SpriteAnimation';
import { Texture, Container, Sprite as PixiSprite, Rectangle } from 'pixi.js';

export class BobSprite {
    private data: SpriteData | null = null;
    private animation: SpriteAnimation;
    private texture: Texture | null = null;
    private initialized = false;

    constructor(data?: SpriteData) {
        this.animation = new SpriteAnimation();
        if (data) {
            this.initializeWithData(data);
        }
    }

    /**
     * Initialize with sprite data and build animation sequences.
     */
    initializeWithData(data: SpriteData): void {
        this.data = data;
        this.initialized = true;

        // Build animation sequences from sprite data
        if (data.animationList.length > 0) {
            let frameOffset = 0;
            for (const animData of data.animationList) {
                // Estimate frame count from the animation list structure
                const frames = Math.max(1, data.frames);
                this.animation.addSequence({
                    name: animData.name,
                    frames: Array.from({ length: frames }, (_, i) => ({
                        tileIndex: animData.frameStart + i,
                        duration: 160,
                    })),
                    loop: true,
                });
                frameOffset += frames;
            }
        } else if (data.frames > 0) {
            // Single default animation
            this.animation.addSequence({
                name: 'default',
                frames: Array.from({ length: data.frames }, (_, i) => ({
                    tileIndex: i,
                    duration: 160,
                })),
                loop: true,
            });
            this.animation.play('default');
        }
    }

    // ============================================================
    // Rendering
    // ============================================================

    /**
     * Draw a specific frame at the given coordinates.
     */
    drawFrame(container: Container, x: number, y: number, frame?: number): PixiSprite | null {
        if (!this.texture) return null;
        const sprite = new PixiSprite(this.texture);
        sprite.position.set(x, y);

        if (frame !== undefined && this.data) {
            const w = this.data.widthPixels;
            const h = this.data.heightPixels;
            const cols = Math.floor((this.texture.width) / w);
            const col = frame % cols;
            const row = Math.floor(frame / cols);
            const src = this.texture.source;
            const frameRect = new Rectangle(col * w, row * h, w, h);
            sprite.texture = new Texture({ source: src, frame: frameRect });
        }

        container.addChild(sprite);
        return sprite;
    }

    // ============================================================
    // Animation Lookup
    // ============================================================

    getAnimationByName(name: string): SpriteAnimationSequenceData | undefined {
        return this.data?.getAnimation(name);
    }

    getAnimationByFrame(frame: number): SpriteAnimationSequenceData | undefined {
        if (!this.data) return undefined;
        for (const anim of this.data.animationList) {
            const frames = this.data.frames || 1;
            if (frame >= anim.frameStart && frame < anim.frameStart + frames) {
                return anim;
            }
        }
        return undefined;
    }

    getNumberOfAnimations(): number {
        return this.data?.animationList.length ?? 0;
    }

    getFirstAnimation(): SpriteAnimationSequenceData | undefined {
        return this.data?.animationList[0];
    }

    getAnimationIndexByName(name: string): number {
        if (!this.data) return -1;
        return this.data.animationList.findIndex(a => a.name === name);
    }

    getAnimationNameByIndex(index: number): string {
        return this.data?.animationList[index]?.name ?? '';
    }

    getNumFrames(): number {
        return this.data?.frames ?? 1;
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        this.animation.update(dt);
    }

    getCurrentTileIndex(): number {
        return this.animation.getCurrentTileIndex();
    }

    playAnimation(name: string): void {
        this.animation.play(name);
    }

    // ============================================================
    // Accessors
    // ============================================================

    getData(): SpriteData | null { return this.data; }
    getID(): number { return this.data?.id ?? -1; }
    getName(): string { return this.data?.name ?? 'none'; }
    getDisplayName(): string { return this.data?.displayName ?? ''; }
    getWidth(): number { return this.data?.widthPixels ?? 0; }
    getHeight(): number { return this.data?.heightPixels ?? 0; }
    getIsNPC(): boolean { return this.data?.isNPC ?? false; }
    getHasShadow(): boolean { return this.data?.hasShadow ?? false; }
    getIsRandom(): boolean { return this.data?.isRandom ?? false; }
    getIsDoor(): boolean { return this.data?.isDoor ?? false; }
    getIsGame(): boolean { return this.data?.isGame ?? false; }
    getIsItem(): boolean { return this.data?.isItem ?? false; }
    getGamePrice(): number { return this.data?.gamePrice ?? 0; }
    getUtilityOffsetX(): number { return this.data?.utilityOffsetX ?? 0; }
    getUtilityOffsetY(): number { return this.data?.utilityOffsetY ?? 0; }

    isInitialized(): boolean { return this.initialized; }

    setTexture(texture: Texture): void {
        this.texture = texture;
    }

    getTexture(): Texture | null {
        return this.texture;
    }
}
