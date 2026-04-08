/**
 * NDMenu — the n-dimensional game selector menu with wheel and info panels.
 *
 * Ported from Java com.bobsgame.client.engine.game.nd.ndmenu.NDMenu.
 * The main menu hub where players browse and select games from a rotating wheel.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Wheel } from './Wheel';
import { WheelItem } from './WheelItem';

export interface NDMenuConfig {
    width: number;
    height: number;
}

export class NDMenu {
    private container: Container;
    private wheel: Wheel;
    private items: WheelItem[] = [];

    private width: number;
    private height: number;
    private active = true;

    // State
    private showingInfoPanel = true;
    private animTimer = 0;

    // Callbacks
    onGameSelected?: (gameName: string) => void;
    onBack?: () => void;

    constructor(config: NDMenuConfig) {
        this.width = config.width;
        this.height = config.height;
        this.container = new Container();

        // Create wheel centered in the screen
        this.wheel = new Wheel(this.width / 2, this.height / 2 - 20);
    }

    // ============================================================
    // Game Management
    // ============================================================

    addGame(item: WheelItem): void {
        this.items.push(item);
        this.wheel.addItem({
            name: item.getName(),
            color: item.getColor(),
            icon: item.getIconChar(),
            gameType: 'custom',
        });
    }

    removeGame(index: number): void {
        this.items.splice(index, 1);
        this.wheel.removeItem(index);
    }

    getGameCount(): number { return this.items.length; }

    // ============================================================
    // Navigation
    // ============================================================

    navigateUp(): void { this.wheel.selectPrev(); }
    navigateDown(): void { this.wheel.selectNext(); }

    selectCurrent(): void {
        const selectedIdx = this.wheel.getSelectedIndex();
        if (selectedIdx >= 0 && selectedIdx < this.items.length) {
            this.onGameSelected?.(this.items[selectedIdx].getName());
        }
    }

    goBack(): void {
        this.onBack?.();
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (!this.active) return;
        this.animTimer += dt;
        this.wheel.update(dt);
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        // Background
        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x050510 });

        // Subtle grid
        bg.setStrokeStyle({ color: 0x0a0a20, width: 0.5 });
        for (let x = 0; x < this.width; x += 40) {
            bg.moveTo(x, 0);
            bg.lineTo(x, this.height);
        }
        for (let y = 0; y < this.height; y += 40) {
            bg.moveTo(0, y);
            bg.lineTo(this.width, y);
        }

        this.container.addChild(bg);

        // Title
        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 20,
            fill: 0x4466aa,
            fontWeight: 'bold',
        });
        const titleText = new Text({ text: "bob's game — Select a Game", style: titleStyle });
        titleText.position.set(16, 12);
        this.container.addChild(titleText);

        // Wheel
        this.container.addChild(this.wheel.render());

        // Info panel (right side)
        if (this.showingInfoPanel) {
            const selectedIdx = this.wheel.getSelectedIndex();
            if (selectedIdx >= 0 && selectedIdx < this.items.length) {
                const infoPanel = this.items[selectedIdx].renderInfoPanel(250, 180);
                infoPanel.position.set(this.width - 266, this.height / 2 - 90);
                this.container.addChild(infoPanel);
            }
        }

        // Instructions
        const instrStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            fill: 0x444466,
        });
        const instr = new Text({
            text: '↑↓ Navigate  ·  ENTER Select  ·  ESC Back',
            style: instrStyle,
        });
        instr.position.set(16, this.height - 24);
        this.container.addChild(instr);

        // Animated border glow
        const pulse = Math.sin(this.animTimer / 1000) * 0.3 + 0.7;
        const borderG = new Graphics();
        borderG.rect(0, 0, this.width, this.height);
        borderG.stroke({ color: 0x2244aa, width: 1, alpha: pulse });
        this.container.addChild(borderG);

        return this.container;
    }

    // ============================================================
    // State
    // ============================================================

    isActive(): boolean { return this.active; }
    setActive(v: boolean): void { this.active = v; }
    setShowingInfoPanel(v: boolean): void { this.showingInfoPanel = v; }
    getWheel(): Wheel { return this.wheel; }
    getContainer(): Container { return this.container; }

    destroy(): void {
        this.wheel.destroy();
        for (const item of this.items) item.destroy();
        this.container.destroy({ children: true });
    }
}
