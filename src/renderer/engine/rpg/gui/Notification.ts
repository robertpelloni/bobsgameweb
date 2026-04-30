/**
 * Notification — status bar notification with fade-in/out, progress bar, and scrolling.
 *
 * Ported from okgame C++ Engine/rpg/gui/statusbar/notification/Notification.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export class Notification {
    text: string;
    hasProgressBar = true;
    progress = 0;

    private container: Container;
    private bg: Graphics;
    private label: Text;
    private progressBar: Graphics;
    private _alpha = 0;
    private _fadeIn = true;
    private _fadeOut = false;
    private _scrolling = false;
    private _scrollX = 0;

    constructor(text: string, width = 300) {
        this.text = text;

        this.container = new Container();

        // Background
        this.bg = new Graphics();
        this.bg.roundRect(0, 0, width, 28, 4);
        this.bg.fill({ color: 0x1a1a2e, alpha: 0.9 });
        this.bg.stroke({ color: 0x4444aa, width: 1 });
        this.container.addChild(this.bg);

        // Text label
        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            fill: 0xffff88,
        });
        this.label = new Text({ text, style });
        this.label.position.set(8, 6);
        this.container.addChild(this.label);

        // Progress bar
        this.progressBar = new Graphics();
        this.container.addChild(this.progressBar);
    }

    // ============================================================
    // State
    // ============================================================

    setProgress(p: number): void {
        this.progress = Math.max(0, Math.min(1, p));
    }

    fadeOutAndDelete(): Notification {
        this._fadeOut = true;
        this._fadeIn = false;
        return this;
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        // Fade in
        if (this._fadeIn) {
            this._alpha += dt / 400;
            if (this._alpha >= 1) {
                this._alpha = 1;
                this._fadeIn = false;
            }
        }

        // Fade out
        if (this._fadeOut) {
            this._alpha -= dt / 300;
            if (this._alpha <= 0) {
                this._alpha = 0;
            }
        }

        this.container.alpha = this._alpha;

        // Update progress bar
        this.progressBar.clear();
        if (this.hasProgressBar && this.progress > 0) {
            const barWidth = 280 * this.progress;
            this.progressBar.rect(10, 22, barWidth, 3);
            this.progressBar.fill({ color: 0x44ff88, alpha: 0.8 });
        }
    }

    // ============================================================
    // Getters
    // ============================================================

    getAlpha(): number { return this._alpha; }
    isDone(): boolean { return this._fadeOut && this._alpha <= 0; }
    getContainer(): Container { return this.container; }

    setPosition(x: number, y: number): void {
        this.container.position.set(x, y);
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
