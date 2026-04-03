import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { QuestComponent } from '../engine/ecs/components/QuestComponent';

export interface QuestLogSceneConfig extends SceneConfig {
    quests: QuestComponent;
}

export class QuestLogScene extends Scene<QuestLogSceneConfig> {
    private background!: Graphics;
    private listContainer: Container;

    constructor(config: QuestLogSceneConfig) {
        super(config);
        this.listContainer = new Container();
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createTitle();
        this.renderQuests();
        this.container.addChild(this.listContainer);
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x111122, alpha: 0.95 });
        this.container.addChild(this.background);
    }

    private createTitle(): void {
        const style = new TextStyle({ fill: '#ffffff', fontSize: 32, fontWeight: 'bold' });
        const title = new Text({ text: 'QUEST LOG', style });
        title.anchor.set(0.5, 0);
        title.position.set(this.width / 2, 40);
        this.container.addChild(title);
    }

    private renderQuests(): void {
        this.listContainer.removeChildren();
        const activeQuests = this.config.quests.quests.filter(q => q.status !== 'inactive');
        
        if (activeQuests.length === 0) {
            const emptyText = new Text({ text: 'No active quests.', style: { fill: '#888888', fontSize: 18 } });
            emptyText.anchor.set(0.5);
            emptyText.position.set(this.width / 2, this.height / 2);
            this.listContainer.addChild(emptyText);
            return;
        }

        activeQuests.forEach((q, i) => {
            const row = new Container();
            row.position.set(100, 120 + i * 80);
            
            const title = new Text({ text: q.title, style: { fill: '#ffff00', fontSize: 20, fontWeight: 'bold' } });
            const desc = new Text({ text: q.description, style: { fill: '#cccccc', fontSize: 16 } });
            const status = new Text({ text: `Status: ${q.status.toUpperCase()}`, style: { fill: q.status === 'completed' ? '#00ff00' : '#ffaa00', fontSize: 14 } });
            
            desc.position.set(0, 25);
            status.position.set(0, 45);
            
            row.addChild(title, desc, status);
            this.listContainer.addChild(row);
        });
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isKeyPressed(Key.Escape) || InputManager.isKeyPressed(Key.Q)) {
            StateManager.pop();
        }
    }
}
