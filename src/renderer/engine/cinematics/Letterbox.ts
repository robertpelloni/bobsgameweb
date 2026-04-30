/**
 * Letterbox - Cinematic letterbox bars that slide in/out.
 *
 * Ported from okgame C++ Engine/Engine/cinematics/Letterbox.
 */
import { Graphics } from 'pixi.js';

export class Letterbox {
    private graphics: Graphics;
    private width: number;
    private height: number;

    private on = false;
    private targetY = 0;
    private currentY = 0;
    private slideSpeed = 0; // pixels per ms

    private color = 0x000000;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.graphics = new Graphics();
    }

    /** Slide letterbox on. sizeY = pixel height of bars, durationMs = slide time. */
    setOn(durationMs: number, sizeY: number): void;
    setOn(durationMs: number, sizePercent: number): void;
    setOn(durationMs: number, sizeOrPercent: number): void {
        this.on = true;
        this.targetY = sizeOrPercent > 1 ? sizeOrPercent : this.height * sizeOrPercent;
        this.slideSpeed = this.targetY / Math.max(durationMs, 1);
    }

    /** Slide letterbox off. */
    setOff(durationMs: number): void {
        this.on = false;
        this.slideSpeed = this.currentY / Math.max(durationMs, 1);
    }

    update(dt: number): void {
        const dtMs = dt; // dt is in ms
        if (this.on) {
            if (this.currentY < this.targetY) {
                this.currentY = Math.min(this.currentY + this.slideSpeed * dtMs, this.targetY);
            }
        } else {
            if (this.currentY > 0) {
                this.currentY = Math.max(this.currentY - this.slideSpeed * dtMs, 0);
            }
        }
    }

    render(): void {
        this.graphics.clear();
        if (this.currentY > 0.5) {
            // Top bar
            this.graphics.rect(0, 0, this.width, this.currentY);
            this.graphics.fill(this.color);
            // Bottom bar
            this.graphics.rect(0, this.height - this.currentY, this.width, this.currentY);
            this.graphics.fill(this.color);
        }
    }

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    getDisplayObject(): Graphics {
        return this.graphics;
    }

    isActive(): boolean {
        return this.currentY > 0.5;
    }
}
