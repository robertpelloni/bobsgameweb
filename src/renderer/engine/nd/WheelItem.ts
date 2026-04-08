/**
 * WheelItem — individual game entry in the n-dimensional menu wheel.
 *
 * Ported from Java com.bobsgame.client.engine.game.nd.ndmenu.wheelitem.WheelItem.
 * Represents a game on the carousel with metadata, icon, and info panel.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface WheelItemData {
    name: string;
    description: string;
    color: number;
    iconChar: string;
    gameType: string;
    creator: string;
    rating: number;
    timesPlayed: number;
    isUnlocked: boolean;
    isNew: boolean;
}

export class WheelItem {
    data: WheelItemData;
    private container: Container;

    constructor(data: Partial<WheelItemData> = {}) {
        this.data = {
            name: data.name ?? 'Unknown',
            description: data.description ?? '',
            color: data.color ?? 0x4466aa,
            iconChar: data.iconChar ?? '?',
            gameType: data.gameType ?? 'custom',
            creator: data.creator ?? '',
            rating: data.rating ?? 0,
            timesPlayed: data.timesPlayed ?? 0,
            isUnlocked: data.isUnlocked ?? true,
            isNew: data.isNew ?? false,
        };
        this.container = new Container();
    }

    /**
     * Render the info panel for this game.
     */
    renderInfoPanel(width: number, height: number): Container {
        this.container.removeChildren();

        const g = new Graphics();

        // Background
        g.roundRect(0, 0, width, height, 6);
        g.fill({ color: 0x0a0a2a, alpha: 0.9 });
        g.stroke({ color: this.data.color, width: 1 });

        this.container.addChild(g);

        // Game name
        const nameStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: this.data.color,
            fontWeight: 'bold',
        });
        const nameText = new Text({ text: this.data.name, style: nameStyle });
        nameText.position.set(10, 8);
        this.container.addChild(nameText);

        // Description
        if (this.data.description) {
            const descStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 11,
                fill: 0x888899,
                wordWrap: true,
                wordWrapWidth: width - 20,
            });
            const descText = new Text({ text: this.data.description, style: descStyle });
            descText.position.set(10, 30);
            this.container.addChild(descText);
        }

        // Stats
        const statsStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x666677 });
        const rating = '★'.repeat(Math.round(this.data.rating)) + '☆'.repeat(5 - Math.round(this.data.rating));
        const statsText = new Text({
            text: `${rating}  Played: ${this.data.timesPlayed}x  By: ${this.data.creator}`,
            style: statsStyle,
        });
        statsText.position.set(10, height - 22);
        this.container.addChild(statsText);

        // NEW badge
        if (this.data.isNew) {
            const badgeG = new Graphics();
            badgeG.roundRect(width - 42, 4, 36, 16, 4);
            badgeG.fill({ color: 0xff4444 });
            this.container.addChild(badgeG);

            const badgeStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 9, fill: 0xffffff, fontWeight: 'bold' });
            const badgeText = new Text({ text: 'NEW', style: badgeStyle });
            badgeText.position.set(width - 38, 6);
            this.container.addChild(badgeText);
        }

        // Lock overlay
        if (!this.data.isUnlocked) {
            const lockG = new Graphics();
            lockG.rect(0, 0, width, height);
            lockG.fill({ color: 0x000000, alpha: 0.5 });
            this.container.addChild(lockG);

            const lockStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 24, fill: 0x888888 });
            const lockText = new Text({ text: '🔒', style: lockStyle });
            lockText.anchor.set(0.5);
            lockText.position.set(width / 2, height / 2);
            this.container.addChild(lockText);
        }

        return this.container;
    }

    getName(): string { return this.data.name; }
    getColor(): number { return this.data.color; }
    getIconChar(): string { return this.data.iconChar; }
    isUnlocked(): boolean { return this.data.isUnlocked; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
