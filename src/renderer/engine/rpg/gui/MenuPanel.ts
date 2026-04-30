/**
 * MenuPanel — base class for all game menu panels with fade-in/out, scrolling, and activation.
 *
 * Ported from okgame C++ Engine/rpg/gui/MenuPanel.
 */
import { Container, Graphics } from 'pixi.js';

export class MenuPanel {
    protected activated = false;
    protected scrollingDown = false;
    protected scrolledUp = false;
    protected _enabled = true;

    ticksSinceTurnedOn = 0;
    ticksSinceTurnedOff = 0;
    screenY = 0;

    fadeInTime = 600; // ms
    fadeOutTime = 1000; // ms

    protected container: Container;
    protected overlay: Graphics;
    protected alpha = 0;

    constructor(width: number, height: number) {
        this.container = new Container();
        this.container.visible = false;

        this.overlay = new Graphics();
        this.overlay.rect(0, 0, width, height);
        this.overlay.fill({ color: 0x000000, alpha: 0.6 });
        this.container.addChild(this.overlay);
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    update(dt: number): void {
        if (this.activated) {
            this.ticksSinceTurnedOn += dt;
            this.ticksSinceTurnedOff = 0;
            this.alpha = Math.min(1, this.ticksSinceTurnedOn / this.fadeInTime);
        } else {
            this.ticksSinceTurnedOff += dt;
            this.ticksSinceTurnedOn = 0;
            this.alpha = Math.max(0, 1 - this.ticksSinceTurnedOff / this.fadeOutTime);
            if (this.alpha <= 0) {
                this.container.visible = false;
                return;
            }
        }

        this.container.alpha = this.alpha;
    }

    // ============================================================
    // Activation
    // ============================================================

    setActivated(b: boolean): void {
        if (this.activated === b) return;
        this.activated = b;
        if (b) {
            this.container.visible = true;
            this.ticksSinceTurnedOn = 0;
            this.ticksSinceTurnedOff = 0;
            this.alpha = 0;
        } else {
            this.ticksSinceTurnedOff = 0;
            this.ticksSinceTurnedOn = 0;
        }
    }

    toggleActivated(): void {
        this.setActivated(!this.activated);
    }

    getIsActivated(): boolean { return this.activated; }
    getEnabled(): boolean { return this._enabled; }
    setEnabled(b: boolean): void { this._enabled = b; }
    getIsScrollingDown(): boolean { return this.scrollingDown; }
    getIsScrolledUp(): boolean { return this.scrolledUp; }

    // ============================================================
    // Scrolling
    // ============================================================

    onScrolledUp(): void { this.scrolledUp = true; }
    scrollUp(): void { this.scrolledUp = true; }
    scrollDown(): void { this.scrolledUp = false; }

    // ============================================================
    // Rendering
    // ============================================================

    render(): void {
        // Override in subclasses for custom rendering
    }

    getContainer(): Container { return this.container; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
