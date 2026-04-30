/**
 * ItemsPanel — inventory display showing acquired items with descriptions.
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/subMenus/ItemsPanel.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SubPanel } from './SubPanel';
import type { Item } from '../Item';

export class ItemsPanel extends SubPanel {
    private items: Item[] = [];
    private itemSlots: Container[] = [];
    private selectedIndex = -1;
    private listContainer: Container;
    private detailContainer: Container;

    constructor() {
        super();

        this.listContainer = new Container();
        this.detailContainer = new Container();
        this.detailContainer.position.set(300, 0);

        this.container.addChild(this.listContainer);
        this.container.addChild(this.detailContainer);
    }

    setItems(items: Item[]): void {
        this.items = items;
        this.refreshList();
    }

    private refreshList(): void {
        // Clear old slots
        for (const slot of this.itemSlots) {
            this.listContainer.removeChild(slot);
            slot.destroy({ children: true });
        }
        this.itemSlots = [];

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            fill: 0xcccccc,
        });

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const slot = new Container();

            const bg = new Graphics();
            bg.rect(0, 0, 280, 28);
            bg.fill({ color: i % 2 === 0 ? 0x111133 : 0x0a0a2a, alpha: 0.8 });
            slot.addChild(bg);

            const name = new Text({
                text: item.name,
                style: new TextStyle({
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 12,
                    fill: item.acquired ? 0xffff88 : 0x666666,
                }),
            });
            name.position.set(8, 6);
            slot.addChild(name);

            slot.position.set(0, i * 30);
            slot.interactive = true;
            const idx = i;
            slot.on('pointerdown', () => this.selectItem(idx));

            this.listContainer.addChild(slot);
            this.itemSlots.push(slot);
        }
    }

    private selectItem(index: number): void {
        this.selectedIndex = index;

        // Clear detail
        this.detailContainer.removeChildren();

        if (index < 0 || index >= this.items.length) return;

        const item = this.items[index];
        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0xffffff,
            wordWrap: true,
            wordWrapWidth: 280,
        });

        const nameText = new Text({ text: item.name, style });
        this.detailContainer.addChild(nameText);

        const descText = new Text({
            text: `\n\n${item.description}`,
            style: new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                fill: 0xaaaaaa,
                wordWrap: true,
                wordWrapWidth: 280,
            }),
        });
        descText.position.set(0, 20);
        this.detailContainer.addChild(descText);

        const statusText = new Text({
            text: item.acquired ? '\n\n✓ Acquired' : '\n\n✗ Not acquired',
            style: new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                fill: item.acquired ? 0x44ff88 : 0xff4444,
            }),
        });
        statusText.position.set(0, 60);
        this.detailContainer.addChild(statusText);
    }

    override update(dt: number): void {
        void dt;
    }
}
