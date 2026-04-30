/**
 * CaptionManager — manages floating text labels with fade, position, and lifetime.
 *
 * Ported from okgame C++ Utility/CaptionManager.
 * Used for damage numbers, score popups, notifications, and HUD text.
 */
import { Container, Text, TextStyle } from 'pixi.js';

export enum CaptionPosition {
    FIXED = 0,
    ENTITY = 1,
    AREA = 2,
    SCREEN = 3,
}

export interface CaptionConfig {
    x: number;
    y: number;
    text: string;
    ticks?: number; // lifetime in ms, 0 = infinite
    fontSize?: number;
    color?: number;
    bgColor?: number;
    outline?: boolean;
    scale?: number;
    centerText?: boolean;
    width?: number;
    fadeColorTowardsTop?: boolean;
    position?: CaptionPosition;
}

export class Caption {
    x: number;
    y: number;
    text: string;
    maxTicks: number;
    ticksAlive = 0;
    toBeDeleted = false;
    scale: number;
    width: number;

    // Style
    fontSize: number;
    color: number;
    bgColor: number;
    outline: boolean;
    centerText: boolean;
    fadeColorTowardsTop: boolean;

    // PixiJS
    private pixiText: Text | null = null;
    private container: Container;

    constructor(config: CaptionConfig) {
        this.x = config.x;
        this.y = config.y;
        this.text = config.text;
        this.maxTicks = config.ticks ?? 3000;
        this.fontSize = config.fontSize ?? 8;
        this.color = config.color ?? 0x000000;
        this.bgColor = config.bgColor ?? 0x000000;
        this.outline = config.outline ?? false;
        this.scale = config.scale ?? 1;
        this.centerText = config.centerText ?? false;
        this.width = config.width ?? 0;
        this.fadeColorTowardsTop = config.fadeColorTowardsTop ?? false;

        this.container = new Container();
    }

    update(dt: number): void {
        if (this.toBeDeleted) return;

        this.ticksAlive += dt;

        if (this.maxTicks > 0 && this.ticksAlive >= this.maxTicks) {
            this.toBeDeleted = true;
        }
    }

    render(): Container {
        this.container.removeChildren();

        if (this.toBeDeleted) return this.container;

        // Calculate alpha based on lifetime
        let alpha = 1;
        if (this.maxTicks > 0) {
            const fadeOutStart = this.maxTicks * 0.7;
            if (this.ticksAlive > fadeOutStart) {
                alpha = 1 - (this.ticksAlive - fadeOutStart) / (this.maxTicks - fadeOutStart);
            }
        }

        const style = new TextStyle({
            fontFamily: this.outline ? 'Arial, sans-serif' : 'monospace',
            fontSize: this.fontSize * this.scale,
            fill: this.color,
            wordWrap: this.width > 0,
            wordWrapWidth: this.width,
            align: this.centerText ? 'center' : 'left',
        });

        this.pixiText = new Text({ text: this.text, style });
        this.pixiText.alpha = alpha;
        this.pixiText.position.set(this.x, this.y);
        this.container.addChild(this.pixiText);

        return this.container;
    }

    setText(text: string): void {
        this.text = text;
    }

    setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    setToBeDeletedImmediately(): void {
        this.toBeDeleted = true;
    }

    getProgress(): number {
        if (this.maxTicks <= 0) return 0;
        return this.ticksAlive / this.maxTicks;
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}

export class CaptionManager {
    private captions: Caption[] = [];
    private container: Container;

    constructor() {
        this.container = new Container();
    }

    /**
     * Create a new managed caption.
     */
    newCaption(config: CaptionConfig): Caption {
        const caption = new Caption(config);
        this.captions.push(caption);
        return caption;
    }

    /**
     * Convenience: floating damage/score number.
     */
    newFloatingText(x: number, y: number, text: string, color = 0xffff00, duration = 2000): Caption {
        return this.newCaption({
            x, y, text,
            ticks: duration,
            fontSize: 14,
            color,
            outline: true,
            scale: 1,
        });
    }

    /**
     * Convenience: screen-space notification.
     */
    newScreenText(x: number, y: number, text: string, color = 0xffffff, duration = 3000): Caption {
        return this.newCaption({
            x, y, text,
            ticks: duration,
            fontSize: 10,
            color,
            position: CaptionPosition.SCREEN,
        });
    }

    update(dt: number): void {
        for (let i = this.captions.length - 1; i >= 0; i--) {
            this.captions[i].update(dt);
            if (this.captions[i].toBeDeleted) {
                this.captions[i].destroy();
                this.captions.splice(i, 1);
            }
        }
    }

    render(): Container {
        this.container.removeChildren();
        for (const caption of this.captions) {
            this.container.addChild(caption.render());
        }
        return this.container;
    }

    getCaptions(): readonly Caption[] { return this.captions; }

    clear(): void {
        for (const c of this.captions) c.destroy();
        this.captions = [];
    }

    destroy(): void {
        this.clear();
        this.container.destroy({ children: true });
    }
}
