import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { ShopComponent } from '../engine/ecs/components/ShopComponent';
import { InventoryComponent } from '../engine/ecs/components/InventoryComponent';

export interface ShopSceneConfig extends SceneConfig {
    shop: ShopComponent;
    playerInventory: InventoryComponent;
}

export class ShopScene extends Scene<ShopSceneConfig> {
    private background!: Graphics;
    private listContainer: Container;
    private infoText!: Text;

    constructor(config: ShopSceneConfig) {
        super(config);
        this.listContainer = new Container();
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createUI();
        this.renderItems();
        this.container.addChild(this.listContainer);
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x1a1a1a, alpha: 0.9 });
        this.container.addChild(this.background);
    }

    private createUI(): void {
        const style = new TextStyle({ fill: '#ffffff', fontSize: 28, fontWeight: 'bold' });
        const title = new Text({ text: this.config.shop.shopName, style });
        title.anchor.set(0.5, 0);
        title.position.set(this.width / 2, 40);
        this.container.addChild(title);

        this.infoText = new Text({ text: `YOUR GOLD: ${this.config.playerInventory.gold}`, style: { fill: '#ffd700', fontSize: 20 } });
        this.infoText.position.set(this.width / 2 - 100, 100);
        this.container.addChild(this.infoText);
        
        const prompt = new Text({ text: 'Press A to Buy | ESC to Exit', style: { fill: '#888888', fontSize: 16 } });
        prompt.anchor.set(0.5);
        prompt.position.set(this.width / 2, this.height - 50);
        this.container.addChild(prompt);
    }

    private renderItems(): void {
        this.listContainer.removeChildren();
        
        this.config.shop.inventory.forEach((item, i) => {
            const row = new Container();
            row.position.set(this.width / 2 - 200, 150 + i * 40);
            
            const name = new Text({ text: `Item #${item.itemId}`, style: { fill: '#ffffff', fontSize: 18 } });
            const price = new Text({ text: `${item.priceOverride || 50} G`, style: { fill: '#ffd700', fontSize: 18 } });
            price.position.set(300, 0);
            
            row.addChild(name, price);
            this.listContainer.addChild(row);
        });
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isActionPressed()) {
            this.buyItem(0); // Buy first item for demo
        }

        if (InputManager.isKeyPressed(Key.Escape)) {
            StateManager.pop();
        }
    }

    private buyItem(index: number): void {
        const item = this.config.shop.inventory[index];
        const cost = item.priceOverride || 50;
        
        if (this.config.playerInventory.gold >= cost) {
            this.config.playerInventory.gold -= cost;
            this.config.playerInventory.items.push({ id: Date.now(), itemId: item.itemId, quantity: 1 });
            this.infoText.text = `YOUR GOLD: ${this.config.playerInventory.gold}`;
            alert("Purchased!");
        } else {
            alert("Not enough gold!");
        }
    }
}
