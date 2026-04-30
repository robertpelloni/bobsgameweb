/**
 * Wheel — rotating game selector wheel for the n-dimensional menu.
 *
 * Ported from Java com.bobsgame.client.engine.game.nd.ndmenu.Wheel.
 * Displays games in a circular carousel with perspective rotation.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface WheelItem {
    name: string;
    color: number;
    icon?: string;
    gameType?: string;
}

export class Wheel {
    private container: Container;
    private items: WheelItem[] = [];
    private selectedIndex = 0;
    private targetAngle = 0;
    private currentAngle = 0;
    private rotationSpeed = 0.15;

    // Layout
    private x: number;
    private y: number;
    private radius = 120;
    private itemWidth = 100;
    private itemHeight = 30;

    // Animation
    private spinning = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.container = new Container();
    }

    addItem(item: WheelItem): void {
        this.items.push(item);
    }

    removeItem(index: number): void {
        this.items.splice(index, 1);
        if (this.selectedIndex >= this.items.length) {
            this.selectedIndex = Math.max(0, this.items.length - 1);
        }
    }

    getItems(): readonly WheelItem[] { return this.items; }

    // ============================================================
    // Navigation
    // ============================================================

    selectNext(): void {
        if (this.items.length === 0) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.targetAngle = -this.selectedIndex * (360 / this.items.length);
        this.spinning = true;
    }

    selectPrev(): void {
        if (this.items.length === 0) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        this.targetAngle = -this.selectedIndex * (360 / this.items.length);
        this.spinning = true;
    }

    getSelected(): WheelItem | undefined {
        return this.items[this.selectedIndex];
    }

    getSelectedIndex(): number { return this.selectedIndex; }

    setSelectedIndex(index: number): void {
        if (index >= 0 && index < this.items.length) {
            this.selectedIndex = index;
            this.targetAngle = -this.selectedIndex * (360 / this.items.length);
        }
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (this.spinning) {
            const diff = this.targetAngle - this.currentAngle;
            this.currentAngle += diff * this.rotationSpeed;

            if (Math.abs(diff) < 0.5) {
                this.currentAngle = this.targetAngle;
                this.spinning = false;
            }
        }
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        if (this.items.length === 0) return this.container;

        const g = new Graphics();
        const angleStep = 360 / this.items.length;

        // Draw items in 3D perspective
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const baseAngle = i * angleStep + this.currentAngle;
            const radians = (baseAngle * Math.PI) / 180;

            // 3D projection
            const y3d = Math.sin(radians) * this.radius;
            const z3d = Math.cos(radians) * this.radius;

            // Skip items behind the wheel
            if (z3d < 0) continue;

            // Scale based on z-depth
            const perspective = 600 / (600 + z3d);
            const screenY = this.y + y3d * perspective;
            const w = this.itemWidth * perspective;
            const h = this.itemHeight * perspective;

            // Alpha based on depth
            const alpha = 0.3 + 0.7 * (1 - z3d / (this.radius * 2));
            const isSelected = i === this.selectedIndex;

            // Item background
            g.roundRect(this.x - w / 2, screenY - h / 2, w, h, h / 4);
            g.fill({ color: item.color, alpha: alpha * 0.8 });
            if (isSelected) {
                g.roundRect(this.x - w / 2 - 2, screenY - h / 2 - 2, w + 4, h + 4, h / 4 + 2);
                g.stroke({ color: 0xffffff, width: 2, alpha });
            }

            // Label
            const fontSize = Math.max(8, Math.floor(16 * perspective));
            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize,
                fill: 0xffffff,
                fontWeight: isSelected ? 'bold' : 'normal',
            });
            const text = new Text({ text: item.name, style });
            text.anchor.set(0.5);
            text.position.set(this.x, screenY);
            text.alpha = alpha;
            this.container.addChild(text);
        }

        // Selection indicator
        const selStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10,
            fill: 0x00ffff,
        });
        const selText = new Text({ text: '◄ ►', style: selStyle });
        selText.anchor.set(0.5);
        selText.position.set(this.x, this.y + this.radius + 20);
        this.container.addChild(selText);

        this.container.addChild(g);
        return this.container;
    }

    isSpinning(): boolean { return this.spinning; }
    getContainer(): Container { return this.container; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
