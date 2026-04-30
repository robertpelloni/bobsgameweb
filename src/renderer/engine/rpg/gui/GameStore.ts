/**
 * GameStore — in-game store for purchasing items and unlocks.
 *
 * Ported from okgame C++ Engine/rpg/gui/gameStore/GameStore + GameStoreButton.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { MenuPanel } from './MenuPanel';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    purchased: boolean;
    icon?: string;
}

export class GameStore extends MenuPanel {
    private items: StoreItem[] = [];
    private money = 0;
    private listContainer: Container;
    private detailContainer: Container;
    private selectedId: string | null = null;
    private onPurchase?: (item: StoreItem) => void;

    constructor(width: number, height: number, onPurchase?: (item: StoreItem) => void) {
        super(width, height);
        this.onPurchase = onPurchase;

        this.listContainer = new Container();
        this.detailContainer = new Container();
        this.detailContainer.position.set(320, 10);

        this.container.addChild(this.listContainer);
        this.container.addChild(this.detailContainer);
    }

    setItems(items: StoreItem[]): void {
        this.items = items;
        this.refreshList();
    }

    setMoney(amount: number): void {
        this.money = amount;
    }

    private refreshList(): void {
        this.listContainer.removeChildren();

        const headerStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0xffff88,
            fontWeight: 'bold',
        });

        const header = new Text({ text: 'Game Store', style: headerStyle });
        header.position.set(10, 10);
        this.listContainer.addChild(header);

        let y = 40;
        for (const item of this.items) {
            const row = new Container();

            const bg = new Graphics();
            bg.rect(0, 0, 300, 36);
            bg.fill({ color: item.purchased ? 0x0a1a0a : 0x111133, alpha: 0.8 });
            row.addChild(bg);

            const nameStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                fill: item.purchased ? 0x44ff88 : 0xccccff,
            });
            const name = new Text({ text: item.name, style: nameStyle });
            name.position.set(8, 2);
            row.addChild(name);

            const priceStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 11,
                fill: item.purchased ? 0x228822 : 0xffaa44,
            });
            const price = new Text({
                text: item.purchased ? '✓ Owned' : `$${item.price}`,
                style: priceStyle,
            });
            price.position.set(8, 18);
            row.addChild(price);

            row.position.set(10, y);
            row.interactive = true;
            const id = item.id;
            row.on('pointerdown', () => this.selectItem(id));

            this.listContainer.addChild(row);
            y += 40;
        }
    }

    private selectItem(id: string): void {
        this.selectedId = id;
        this.refreshDetail();
    }

    private refreshDetail(): void {
        this.detailContainer.removeChildren();
        const item = this.items.find(i => i.id === this.selectedId);
        if (!item) return;

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0xffffff,
            wordWrap: true,
            wordWrapWidth: 260,
        });

        const name = new Text({ text: item.name, style });
        this.detailContainer.addChild(name);

        const desc = new Text({
            text: `\n${item.description}`,
            style: new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                fill: 0xaaaaaa,
                wordWrap: true,
                wordWrapWidth: 260,
            }),
        });
        desc.position.set(0, 22);
        this.detailContainer.addChild(desc);

        if (!item.purchased) {
            const buyBtn = new Container();
            const buyBg = new Graphics();
            buyBg.roundRect(0, 70, 100, 30, 4);
            buyBg.fill({ color: this.money >= item.price ? 0x44ff88 : 0x444444 });
            buyBtn.addChild(buyBg);

            const buyText = new Text({
                text: `Buy $${item.price}`,
                style: new TextStyle({
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 12,
                    fill: this.money >= item.price ? 0x000000 : 0x666666,
                }),
            });
            buyText.position.set(10, 8);
            buyBtn.addChild(buyText);

            buyBtn.interactive = this.money >= item.price;
            if (this.money >= item.price) {
                buyBtn.on('pointerdown', () => {
                    item.purchased = true;
                    if (this.onPurchase) this.onPurchase(item);
                    this.refreshList();
                    this.refreshDetail();
                });
            }

            this.detailContainer.addChild(buyBtn);
        }
    }
}
