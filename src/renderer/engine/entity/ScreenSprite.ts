/**
 * ScreenSprite — screen-space sprite for UI overlays (percent/absolute positioning).
 *
 * Ported from okgame C++ Engine/entity/ScreenSprite.
 */
import { Container, Sprite, Texture } from 'pixi.js';

export class ScreenSprite {
    private container: Container;
    private sprite: Sprite | null = null;
    private texture: Texture | null = null;

    // Positioning
    screenX = 0;
    screenY = 0;
    useXPercent = false;
    useYPercent = false;
    screenXPercent = 0;
    screenYPercent = 0;
    centerX = false;
    centerY = false;

    private viewportWidth = 800;
    private viewportHeight = 600;

    constructor(texture?: Texture) {
        this.container = new Container();
        if (texture) {
            this.setTexture(texture);
        }
    }

    setTexture(texture: Texture): void {
        this.texture = texture;
        if (this.sprite) {
            this.sprite.texture = texture;
        } else {
            this.sprite = new Sprite(texture);
            this.container.addChild(this.sprite);
        }
        this.updatePosition();
    }

    setViewportSize(width: number, height: number): void {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.updatePosition();
    }

    setScreenPosition(x: number, y: number): void {
        this.screenX = x;
        this.screenY = y;
        this.useXPercent = false;
        this.useYPercent = false;
        this.updatePosition();
    }

    setScreenPercent(xPercent: number, yPercent: number): void {
        this.screenXPercent = xPercent;
        this.screenYPercent = yPercent;
        this.useXPercent = true;
        this.useYPercent = true;
        this.updatePosition();
    }

    setCenter(centerX: boolean, centerY: boolean): void {
        this.centerX = centerX;
        this.centerY = centerY;
        this.updatePosition();
    }

    private updatePosition(): void {
        let x = this.useXPercent ? this.screenXPercent * this.viewportWidth : this.screenX;
        let y = this.useYPercent ? this.screenYPercent * this.viewportHeight : this.screenY;

        if (this.centerX && this.sprite) {
            x -= this.sprite.width / 2;
        }
        if (this.centerY && this.sprite) {
            y -= this.sprite.height / 2;
        }

        this.container.position.set(x, y);
    }

    setAlpha(alpha: number): void {
        this.container.alpha = alpha;
    }

    setVisible(visible: boolean): void {
        this.container.visible = visible;
    }

    getContainer(): Container { return this.container; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
