import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { CombatComponent } from '../engine/ecs/components/CombatComponent';

export interface BattleSceneConfig extends SceneConfig {
    player: CombatComponent;
    enemy: CombatComponent;
}

export class BattleScene extends Scene<BattleSceneConfig> {
    private background!: Graphics;
    private logText!: Text;
    private turn: 'player' | 'enemy' = 'player';

    constructor(config: BattleSceneConfig) {
        super(config);
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createUI();
        this.logMessage(`A battle begins! Your HP: ${this.config.player.hp} | Enemy HP: ${this.config.enemy.hp}`);
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x221133, alpha: 1.0 });
        this.container.addChild(this.background);
    }

    private createUI(): void {
        const style = new TextStyle({ fill: '#00ff00', fontSize: 18, fontFamily: 'monospace' });
        this.logText = new Text({ text: '', style });
        this.logText.position.set(50, this.height - 100);
        this.container.addChild(this.logText);

        const prompt = new Text({ text: 'Press A to Attack | ESC to Flee', style: { fill: '#ffffff', fontSize: 24 } });
        prompt.anchor.set(0.5);
        prompt.position.set(this.width / 2, this.height / 2);
        this.container.addChild(prompt);
    }

    private logMessage(msg: string): void {
        this.logText.text = msg;
    }

    protected onUpdate(dt: number): void {
        if (this.turn === 'player') {
            if (InputManager.isActionPressed()) {
                this.playerAttack();
            }
        } else {
            // Enemy turn (simulated delay)
            setTimeout(() => this.enemyAttack(), 1000);
            this.turn = 'player'; // Lock the turn transition
        }

        if (InputManager.isKeyPressed(Key.Escape)) {
            StateManager.pop();
        }
    }

    private playerAttack(): void {
        const dmg = Math.max(1, this.config.player.atk - this.config.enemy.def);
        this.config.enemy.hp -= dmg;
        this.logMessage(`You attack for ${dmg} damage! Enemy HP: ${this.config.enemy.hp}`);
        
        if (this.config.enemy.hp <= 0) {
            this.logMessage("VICTORY!");
            setTimeout(() => StateManager.pop(), 1500);
        } else {
            this.turn = 'enemy';
        }
    }

    private enemyAttack(): void {
        const dmg = Math.max(1, this.config.enemy.atk - this.config.player.def);
        this.config.player.hp -= dmg;
        this.logMessage(`Enemy attacks for ${dmg} damage! Your HP: ${this.config.player.hp}`);
        
        if (this.config.player.hp <= 0) {
            this.logMessage("DEFEAT...");
            setTimeout(() => StateManager.pop(), 1500);
        }
    }
}
