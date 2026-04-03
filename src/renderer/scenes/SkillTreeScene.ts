import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { SkillTreeComponent, SkillNode } from '../engine/ecs/components/SkillTreeComponent';
import { InventoryComponent } from '../engine/ecs/components/InventoryComponent';

export interface SkillTreeSceneConfig extends SceneConfig {
    skillTree: SkillTreeComponent;
    playerInventory: InventoryComponent;
}

export class SkillTreeScene extends Scene<SkillTreeSceneConfig> {
    private background!: Graphics;
    private nodesContainer: Container;
    private infoText!: Text;

    constructor(config: SkillTreeSceneConfig) {
        super(config);
        this.nodesContainer = new Container();
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createUI();
        this.renderNodes();
        this.container.addChild(this.nodesContainer);
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x1a0a2a, alpha: 0.9 });
        this.container.addChild(this.background);
    }

    private createUI(): void {
        const style = new TextStyle({ fill: '#ffffff', fontSize: 28, fontWeight: 'bold' });
        const title = new Text({ text: 'SKILL TREE', style });
        title.anchor.set(0.5, 0);
        title.position.set(this.width / 2, 40);
        this.container.addChild(title);

        this.infoText = new Text({ text: `GOLD: ${this.config.playerInventory.gold}`, style: { fill: '#ffd700', fontSize: 20 } });
        this.infoText.position.set(this.width - 200, 50);
        this.container.addChild(this.infoText);
        
        const prompt = new Text({ text: 'Press A to Unlock | ESC to Exit', style: { fill: '#888888', fontSize: 16 } });
        prompt.anchor.set(0.5);
        prompt.position.set(this.width / 2, this.height - 50);
        this.container.addChild(prompt);
    }

    private renderNodes(): void {
        this.nodesContainer.removeChildren();
        
        this.config.skillTree.skills.forEach((skill, i) => {
            const node = new Container();
            node.position.set(this.width / 2 - 150, 150 + i * 80);
            
            const bg = new Graphics();
            bg.rect(0, 0, 300, 60);
            bg.fill({ color: skill.unlocked ? 0x004400 : 0x444444, alpha: 1.0 });
            bg.stroke({ color: 0xffffff, width: 2 });
            node.addChild(bg);

            const name = new Text({ text: skill.name, style: { fill: '#ffffff', fontSize: 18, fontWeight: 'bold' } });
            const cost = new Text({ text: `COST: ${skill.cost} G`, style: { fill: '#ffd700', fontSize: 14 } });
            const status = new Text({ text: skill.unlocked ? 'UNLOCKED' : 'LOCKED', style: { fill: skill.unlocked ? '#00ff00' : '#ff4444', fontSize: 14 } });
            
            name.position.set(10, 10);
            cost.position.set(10, 35);
            status.position.set(200, 20);
            
            node.addChild(name, cost, status);
            this.nodesContainer.addChild(node);
        });
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isActionPressed()) {
            this.unlockSkill(0); // Demo first skill
        }

        if (InputManager.isKeyPressed(Key.Escape) || InputManager.isKeyPressed(Key.K)) {
            StateManager.pop();
        }
    }

    private unlockSkill(index: number): void {
        const skill = this.config.skillTree.skills[index];
        if (skill.unlocked) return;
        
        if (this.config.playerInventory.gold >= skill.cost) {
            this.config.playerInventory.gold -= skill.cost;
            skill.unlocked = true;
            this.infoText.text = `GOLD: ${this.config.playerInventory.gold}`;
            this.renderNodes();
            alert(`Unlocked ${skill.name}!`);
        } else {
            alert("Not enough gold!");
        }
    }
}
