/**
 * ScreenOverlay - Full-screen color overlay with fade transitions.
 *
 * Ported from okgame C++ Engine/Engine/cinematics/ScreenOverlay.
 * Supports one-way fades, round-trip (fade in then out), and instant overlay.
 */
import { Graphics } from 'pixi.js';

export type RGBA = { r: number; g: number; b: number; a: number };

/** Easing helper — matches the C++ Easing::easeInOutQuadratic */
function easeInOutQuadratic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
}

const TYPE_ONE_WAY = 0;
const TYPE_ROUNDTRIP = 1;
const TYPE_INSTANT = 2;

export class ScreenOverlay {
    private color: RGBA = { r: 0, g: 0, b: 0, a: 0 };
    private startAlpha = 0;
    private alpha = 0;
    private toAlpha = 0;

    private startTime = 0;
    private durationMs = 0;
    private transitionType = TYPE_INSTANT;

    private graphics: Graphics;
    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.graphics = new Graphics();
    }

    /** Start a one-way fade transition. Pass fromAlpha = -1 to use current alpha. */
    doTransition(r: number, g: number, b: number, fromAlpha: number, toAlpha: number, durationMs: number): void {
        this.color = { r, g, b, a: 0 };
        this.startTime = performance.now();
        this.startAlpha = fromAlpha !== -1 ? fromAlpha : this.alpha;
        this.alpha = this.startAlpha;
        this.toAlpha = toAlpha;
        this.durationMs = durationMs;
        this.transitionType = TYPE_ONE_WAY;
    }

    /** Fade from transparent → toAlpha → transparent over the total duration. */
    doToAndFromTransition(r: number, g: number, b: number, durationMs: number, toAlpha: number): void {
        this.color = { r, g, b, a: 0 };
        this.startTime = performance.now();
        this.alpha = 0;
        this.toAlpha = toAlpha;
        this.durationMs = durationMs;
        this.transitionType = TYPE_ROUNDTRIP;
    }

    /** Instantly set overlay color and alpha. */
    setInstantOverlay(r: number, g: number, b: number, alpha: number): void {
        this.color = { r, g, b, a: alpha };
        this.startTime = performance.now();
        this.alpha = alpha;
        this.toAlpha = alpha;
        this.durationMs = 0;
        this.transitionType = TYPE_INSTANT;
    }

    clearOverlay(): void {
        this.alpha = 0;
        this.toAlpha = 0;
        this.transitionType = TYPE_INSTANT;
        this.color = { r: 0, g: 0, b: 0, a: 0 };
    }

    update(): void {
        const elapsed = performance.now() - this.startTime;

        if (this.transitionType === TYPE_ONE_WAY) {
            if (elapsed < this.durationMs) {
                this.alpha = easeInOutQuadratic(elapsed, this.startAlpha, this.toAlpha - this.startAlpha, this.durationMs);
            } else {
                this.alpha = this.toAlpha;
            }
        } else if (this.transitionType === TYPE_ROUNDTRIP) {
            const half = this.durationMs / 2;
            if (elapsed < half) {
                this.alpha = easeInOutQuadratic(elapsed, 0, this.toAlpha, this.durationMs);
            } else if (elapsed < this.durationMs) {
                this.alpha = easeInOutQuadratic(elapsed, this.toAlpha, 0, this.durationMs);
            } else {
                this.alpha = 0;
            }
        }
        // TYPE_INSTANT — alpha already set
    }

    render(): void {
        this.graphics.clear();
        if (this.alpha > 0.001) {
            this.graphics.rect(0, 0, this.width, this.height);
            this.graphics.fill({
                r: this.color.r / 255,
                g: this.color.g / 255,
                b: this.color.b / 255,
                a: this.alpha,
            });
        }
    }

    /** Resize the overlay to match the viewport. */
    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    getDisplayObject(): Graphics {
        return this.graphics;
    }
}
