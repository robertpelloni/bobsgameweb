import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { InventoryComponent } from '../engine/ecs/components/InventoryComponent';

export interface InventorySceneConfig extends SceneConfig {
    inventory: InventoryComponent;
}

export class InventoryScene extends Scene<InventorySceneConfig> {
    private background!: Graphics;
    private listContainer: Container;

    constructor(config: InventorySceneConfig) {
        super(config);
        this.listContainer = new Container();
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createTitle();
        this.renderItems();
        this.container.addChild(this.listContainer);
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x0a1a2a, alpha: 0.9 });
        this.container.addChild(this.background);
    }

    private createTitle(): void {
        const style = new TextStyle({ fill: '#ffffff', fontSize: 32, fontWeight: 'bold' });
        const title = new Text({ text: 'INVENTORY', style });
        title.anchor.set(0.5, 0);
        title.position.set(this.width / 2, 40);
        this.container.addChild(title);
        
        const goldText = new Text({ text: `GOLD: ${this.config.inventory.gold}`, style: { fill: '#ffd700', fontSize: 20 } });
        goldText.position.set(this.width - 200, 50);
        this.container.addChild(goldText);
    }

    private renderItems(): void {
        this.listContainer.removeChildren();
        
        if (this.config.inventory.items.length === 0) {
            const empty = new Text({ text: 'Your bag is empty.', style: { fill: '#888888', fontSize: 18 } });
            empty.anchor.set(0.5);
            empty.position.set(this.width / 2, this.height / 2);
            this.listContainer.addChild(empty);
            return;
        }

        this.config.inventory.items.forEach((item, i) => {
            const row = new Container();
            row.position.set(150, 120 + i * 40);
            
            const name = new Text({ text: `Item #${item.itemId}`, style: { fill: '#ffffff', fontSize: 18 } });
            const qty = new Text({ text: `x${item.quantity}`, style: { fill: '#aaaaaa', fontSize: 16 } });
            qty.position.set(300, 0);
            
            row.addChild(name, qty);
            this.listContainer.addChild(row);
        });
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isKeyPressed(Key.Escape) || InputManager.isKeyPressed(Key.I)) {
            StateManager.pop();
        }
    }
}
