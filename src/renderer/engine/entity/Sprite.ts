/**
 * Sprite — loaded sprite with texture, animation sequences, and rendering.
 *
 * Ported from okgame C++ Engine/entity/Sprite.h.
 * Manages sprite texture, frame-based animation, and random character appearance channels.
 */
import { Container, Texture, Sprite as PixiSprite, Assets } from 'pixi.js';
import { SpriteData, type SpriteAnimationSequenceData } from './SpriteData';

export class Sprite {
    private data: SpriteData | null = null;
    private texture: Texture | null = null;
    private container: Container;
    private pixiSprite: PixiSprite | null = null;

    // State
    private _initialized = false;
    private currentFrame = 0;
    private currentAnimation: SpriteAnimationSequenceData | null = null;
    private animationTimer = 0;
    private animationSpeed = 100; // ms per frame

    // Appearance channels (for random characters)
    private eyeSet = 0;
    private skinSet = 0;
    private hairSet = 0;
    private shirtSet = 0;
    private pantsSet = 0;
    private shoeSet = 0;
    private carSet = 0;

    // Rendering
    private x = 0;
    private y = 0;
    private width = 0;
    private height = 0;
    private r = 1;
    private g = 1;
    private b = 1;
    private alpha = 1;
    private flipped = false;
    private useHQ2X = false;

    // Async loading
    private _textureLoaded = false;

    constructor() {
        this.container = new Container();
    }

    // ============================================================
    // Initialization
    // ============================================================

    initializeWithSpriteData(data: SpriteData): void {
        this.data = data;
        this._initialized = true;
        this.width = data.getWidthPixels();
        this.height = data.getHeightPixels();

        // Set first animation
        const animations = data.animationList;
        if (animations.length > 0) {
            this.currentAnimation = animations[0];
        }
    }

    /**
     * Load texture from URL.
     */
    async loadTexture(url: string): Promise<void> {
        try {
            this.texture = await Assets.load(url);
            this._textureLoaded = true;
        } catch {
            console.error(`[Sprite] Failed to load texture: ${url}`);
        }
    }

    // ============================================================
    // Animation
    // ============================================================

    getNumberOfAnimations(): number {
        return this.data?.animationList.length ?? 0;
    }

    getFirstAnimation(): SpriteAnimationSequenceData | null {
        const list = this.data?.animationList ?? [];
        return list[0] ?? null;
    }

    getAnimationByName(name: string): SpriteAnimationSequenceData | null {
        return this.data?.getAnimation(name) ?? null;
    }

    getAnimationByIndex(index: number): SpriteAnimationSequenceData | null {
        const list = this.data?.animationList ?? [];
        return list[index] ?? null;
    }

    getAnimationIndexByName(name: string): number {
        const list = this.data?.animationList ?? [];
        return list.findIndex((a: SpriteAnimationSequenceData) => a.name === name);
    }

    getAnimationNameByIndex(index: number): string {
        return this.getAnimationByIndex(index)?.name ?? '';
    }

    getAnimationNumFramesByName(name: string): number {
        // numFrames not stored per-sequence; return 1 as default
        return this.getAnimationByName(name) ? 1 : 0;
    }

    getAnimationNumFramesByIndex(index: number): number {
        return this.getAnimationByIndex(index) ? 1 : 0;
    }

    /**
     * Set current animation by name.
     */
    setAnimation(name: string): void {
        const anim = this.getAnimationByName(name);
        if (anim && anim !== this.currentAnimation) {
            this.currentAnimation = anim;
            this.currentFrame = 0;
            this.animationTimer = 0;
        }
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (!this.currentAnimation) return;

        this.animationTimer += dt;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer -= this.animationSpeed;
            this.currentFrame++;

            const numFrames = 1; // single frame per sequence
            if (this.currentFrame >= numFrames) {
                this.currentFrame = 0; // loop
            }
        }
    }

    // ============================================================
    // Rendering
    // ============================================================

    drawFrame(animationName: string, x: number, y: number, w: number, h: number): void {
        this.setAnimation(animationName);
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.draw();
    }

    draw(): void {
        this.container.removeChildren();

        if (!this.texture || !this._textureLoaded) return;

        const data = this.data;
        if (!data) return;

        const frameW = data.getWidthPixels();
        const frameH = data.getHeightPixels();
        if (frameW <= 0 || frameH <= 0) return;

        this.pixiSprite = new PixiSprite(this.texture);
        this.pixiSprite.position.set(this.x, this.y);
        this.pixiSprite.width = this.width || frameW;
        this.pixiSprite.height = this.height || frameH;
        this.pixiSprite.tint = ((this.r * 255) << 16) | ((this.g * 255) << 8) | (this.b * 255);
        this.pixiSprite.alpha = this.alpha;

        if (this.flipped) {
            this.pixiSprite.scale.x = -1;
            this.pixiSprite.anchor.x = 1;
        }

        this.container.addChild(this.pixiSprite);
    }

    getContainer(): Container { return this.container; }

    // ============================================================
    // Random Character Appearance
    // ============================================================

    setRandomAppearance(eye: number, skin: number, hair: number, shirt: number, pants: number, shoe: number, car: number): void {
        this.eyeSet = eye;
        this.skinSet = skin;
        this.hairSet = hair;
        this.shirtSet = shirt;
        this.pantsSet = pants;
        this.shoeSet = shoe;
        this.carSet = car;
    }

    // ============================================================
    // Accessors
    // ============================================================

    getData(): SpriteData | null { return this.data; }
    getID(): number { return this.data?.id ?? -1; }
    getName(): string { return this.data?.name ?? ''; }
    isInitialized(): boolean { return this._initialized; }
    isTextureLoaded(): boolean { return this._textureLoaded; }

    setPosition(x: number, y: number): void { this.x = x; this.y = y; }
    setSize(w: number, h: number): void { this.width = w; this.height = h; }
    setColor(r: number, g: number, b: number): void { this.r = r; this.g = g; this.b = b; }
    setAlpha(a: number): void { this.alpha = a; }
    setFlipped(f: boolean): void { this.flipped = f; }
    setHQ2X(enable: boolean): void { this.useHQ2X = enable; }
    setAnimationSpeed(ms: number): void { this.animationSpeed = ms; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
