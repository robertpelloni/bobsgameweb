/**
 * CinematicsManager - Central manager for screen effects, fades, letterbox, etc.
 *
 * Ported from okgame C++ Engine/Engine/cinematics/CinematicsManager.
 * Provides high-level API for all cinematic effects.
 */
import { Container } from 'pixi.js';
import { ScreenOverlay } from './ScreenOverlay';
import { Letterbox } from './Letterbox';

export type RenderLayer = 'ground' | 'above' | 'aboveTop';

export class CinematicsManager {
    private container: Container;
    private width: number;
    private height: number;

    public letterbox: Letterbox;
    public screenOverlay: ScreenOverlay;
    public screenOverlayUnderLights: ScreenOverlay;
    public screenOverlayGroundLayer: ScreenOverlay;

    // Screen shake state
    private shakeIntensityX = 0;
    private shakeIntensityY = 0;
    private shakeTicksPerShake = 0;
    private shakeDurationRemaining = 0;
    private shakeStartTime = 0;
    private shakeConstant = false;

    // Game speed
    private gameSpeed = 1.0;

    // Post-processing flags
    private _8bitMode = false;
    private _invertedColors = false;
    private _blackAndWhite = false;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.container = new Container();
        this.container.label = 'cinematics';

        this.screenOverlayGroundLayer = new ScreenOverlay(width, height);
        this.screenOverlayUnderLights = new ScreenOverlay(width, height);
        this.letterbox = new Letterbox(width, height);
        this.screenOverlay = new ScreenOverlay(width, height);

        this.container.addChild(this.screenOverlayGroundLayer.getDisplayObject());
        this.container.addChild(this.screenOverlayUnderLights.getDisplayObject());
        this.container.addChild(this.letterbox.getDisplayObject());
        this.container.addChild(this.screenOverlay.getDisplayObject());
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    update(dt: number): void {
        const scaledDt = dt * this.gameSpeed;
        this.letterbox.update(scaledDt);
        this.screenOverlayGroundLayer.update();
        this.screenOverlayUnderLights.update();
        this.screenOverlay.update();

        // Update shake
        if (this.shakeDurationRemaining > 0) {
            this.shakeDurationRemaining -= scaledDt;
            if (this.shakeDurationRemaining <= 0 && !this.shakeConstant) {
                this.shakeIntensityX = 0;
                this.shakeIntensityY = 0;
            }
        }
    }

    render(layer: RenderLayer): void {
        switch (layer) {
            case 'ground':
                this.screenOverlayGroundLayer.render();
                break;
            case 'above':
                this.screenOverlayUnderLights.render();
                break;
            case 'aboveTop':
                this.letterbox.render();
                this.screenOverlay.render();
                break;
        }
    }

    /** Render all layers at once (simpler mode for web). */
    renderAll(): void {
        this.screenOverlayGroundLayer.render();
        this.screenOverlayUnderLights.render();
        this.letterbox.render();
        this.screenOverlay.render();
    }

    // ============================================================
    // Letterbox
    // ============================================================

    setLetterbox(on: boolean, slideDurationMs: number, sizeY?: number): void {
        if (on && sizeY !== undefined) {
            this.letterbox.setOn(slideDurationMs, sizeY);
        } else if (on) {
            this.letterbox.setOn(slideDurationMs, this.height * 0.15);
        } else {
            this.letterbox.setOff(slideDurationMs);
        }
    }

    // ============================================================
    // Fade Effects
    // ============================================================

    fadeToWhite(durationMs: number): void {
        this.screenOverlay.doTransition(255, 255, 255, 0, 1, durationMs);
    }

    fadeFromWhite(durationMs: number): void {
        this.screenOverlay.doTransition(255, 255, 255, 1, 0, durationMs);
    }

    fadeToBlack(durationMs: number): void {
        this.screenOverlay.doTransition(0, 0, 0, 0, 1, durationMs);
    }

    fadeFromBlack(durationMs: number): void {
        this.screenOverlay.doTransition(0, 0, 0, 1, 0, durationMs);
    }

    fadeColorFromCurrentAlpha(r: number, g: number, b: number, toAlpha: number, durationMs: number): void {
        this.screenOverlay.doTransition(r, g, b, -1, toAlpha, durationMs);
    }

    fadeColorFromAlpha(r: number, g: number, b: number, fromAlpha: number, toAlpha: number, durationMs: number): void {
        this.screenOverlay.doTransition(r, g, b, fromAlpha, toAlpha, durationMs);
    }

    /** Fade to alpha then back to transparent. */
    fadeColorToAlphaAndBack(r: number, g: number, b: number, durationMs: number, toAlpha: number): void {
        this.screenOverlay.doToAndFromTransition(r, g, b, durationMs, toAlpha);
    }

    setInstantOverlayColor(r: number, g: number, b: number, alpha: number): void {
        this.screenOverlay.setInstantOverlay(r, g, b, alpha);
    }

    clearOverlay(): void {
        this.screenOverlay.clearOverlay();
    }

    // ============================================================
    // Under-Lights Overlay
    // ============================================================

    fadeColorUnderLights(r: number, g: number, b: number, toAlpha: number, durationMs: number): void {
        this.screenOverlayUnderLights.doTransition(r, g, b, -1, toAlpha, durationMs);
    }

    setInstantOverlayColorUnderLights(r: number, g: number, b: number, alpha: number): void {
        this.screenOverlayUnderLights.setInstantOverlay(r, g, b, alpha);
    }

    clearOverlayUnderLights(): void {
        this.screenOverlayUnderLights.clearOverlay();
    }

    // ============================================================
    // Ground Layer Overlay
    // ============================================================

    fadeColorGroundLayer(r: number, g: number, b: number, toAlpha: number, durationMs: number): void {
        this.screenOverlayGroundLayer.doTransition(r, g, b, -1, toAlpha, durationMs);
    }

    setInstantOverlayColorGroundLayer(r: number, g: number, b: number, alpha: number): void {
        this.screenOverlayGroundLayer.setInstantOverlay(r, g, b, alpha);
    }

    clearOverlayGroundLayer(): void {
        this.screenOverlayGroundLayer.clearOverlay();
    }

    // ============================================================
    // Screen Shake
    // ============================================================

    getShakeOffset(): { x: number; y: number } {
        if (this.shakeIntensityX === 0 && this.shakeIntensityY === 0) {
            return { x: 0, y: 0 };
        }
        const t = performance.now();
        const phase = (t / Math.max(this.shakeTicksPerShake, 1)) * Math.PI * 2;
        return {
            x: Math.sin(phase) * this.shakeIntensityX,
            y: Math.cos(phase * 1.3) * this.shakeIntensityY,
        };
    }

    shakeScreen(durationMs: number, maxX: number, maxY: number, ticksPerShake: number): void {
        this.shakeIntensityX = maxX;
        this.shakeIntensityY = maxY;
        this.shakeTicksPerShake = ticksPerShake;
        this.shakeDurationRemaining = durationMs;
        this.shakeConstant = false;
        this.shakeStartTime = performance.now();
    }

    shakeScreenConstant(on: boolean, maxX: number, maxY: number, ticksPerShake: number): void {
        this.shakeConstant = on;
        if (on) {
            this.shakeIntensityX = maxX;
            this.shakeIntensityY = maxY;
            this.shakeTicksPerShake = ticksPerShake;
            this.shakeDurationRemaining = Infinity;
        } else {
            this.shakeIntensityX = 0;
            this.shakeIntensityY = 0;
            this.shakeDurationRemaining = 0;
        }
    }

    // ============================================================
    // Post-Processing Flags
    // ============================================================

    set8BitMode(b: boolean): void { this._8bitMode = b; }
    get8BitMode(): boolean { return this._8bitMode; }

    setInvertedColors(b: boolean): void { this._invertedColors = b; }
    getInvertedColors(): boolean { return this._invertedColors; }

    setBlackAndWhite(b: boolean): void { this._blackAndWhite = b; }
    getBlackAndWhite(): boolean { return this._blackAndWhite; }

    // ============================================================
    // Game Speed
    // ============================================================

    setGameSpeed(multiplier: number): void {
        this.gameSpeed = Math.max(0.1, Math.min(5, multiplier));
    }

    getGameSpeed(): number {
        return this.gameSpeed;
    }

    // ============================================================
    // Resize
    // ============================================================

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.letterbox.resize(width, height);
        this.screenOverlay.resize(width, height);
        this.screenOverlayUnderLights.resize(width, height);
        this.screenOverlayGroundLayer.resize(width, height);
    }

    getContainer(): Container {
        return this.container;
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
