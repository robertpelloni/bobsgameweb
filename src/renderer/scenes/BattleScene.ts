import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { CombatComponent } from '../engine/ecs/components/CombatComponent';
import { AudioManager } from '../audio/AudioManager';

export interface BattleSceneConfig extends SceneConfig {
    player: CombatComponent;
    enemy: CombatComponent;
}

interface DamagePopup {
    text: Text;
    life: number;
    maxLife: number;
    vy: number;
}

export class BattleScene extends Scene<BattleSceneConfig> {
    private background!: Graphics;
    private logText!: Text;
    private turn: 'player' | 'enemy' | 'animating' = 'player';
    
    private playerSprite!: Sprite;
    private enemySprite!: Sprite;
    private playerHpBar!: Graphics;
    private enemyHpBar!: Graphics;
    private playerHpText!: Text;
    private enemyHpText!: Text;
    
    private actionMenu!: Container;
    private popups: DamagePopup[] = [];
    private shakeAmount: number = 0;
    
    private pOriginalX: number = 0;
    private pOriginalY: number = 0;
    private eOriginalX: number = 0;
    private eOriginalY: number = 0;

    constructor(config: BattleSceneConfig) {
        super(config);
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createSprites();
        this.createUI();
        this.updateHealthBars();
        this.logMessage(`A battle begins!`);
        this.playBattleMusic();
    }

    private createBackground(): void {
        this.background = new Graphics();
        
        // Draw a stylized battle background (gradient-like or striped)
        for (let i = 0; i < this.height; i += 20) {
            this.background.rect(0, i, this.width, 20);
            this.background.fill({ color: (i % 40 === 0) ? 0x221133 : 0x1a0a2a, alpha: 1.0 });
        }
        
        // Floor ellipse
        this.background.ellipse(this.width / 2, this.height / 2 + 100, 300, 80);
        this.background.fill({ color: 0x332244, alpha: 0.8 });
        
        this.container.addChild(this.background);
    }

    private createSprites(): void {
        // Player Sprite (Left)
        const pGfx = new Graphics();
        pGfx.rect(-32, -48, 64, 96);
        pGfx.fill(0x3366ff);
        pGfx.stroke({ color: 0xffffff, width: 2 });
        this.playerSprite = new Sprite(this.app.renderer.generateTexture(pGfx));
        this.playerSprite.anchor.set(0.5, 1.0);
        this.pOriginalX = this.width / 4;
        this.pOriginalY = this.height / 2 + 100;
        this.playerSprite.position.set(this.pOriginalX, this.pOriginalY);
        
        // Enemy Sprite (Right)
        const eGfx = new Graphics();
        eGfx.rect(-40, -60, 80, 120);
        eGfx.fill(0xaa0000);
        eGfx.stroke({ color: 0xffaa00, width: 3 });
        this.enemySprite = new Sprite(this.app.renderer.generateTexture(eGfx));
        this.enemySprite.anchor.set(0.5, 1.0);
        this.eOriginalX = this.width * 3 / 4;
        this.eOriginalY = this.height / 2 + 100;
        this.enemySprite.position.set(this.eOriginalX, this.eOriginalY);

        this.container.addChild(this.playerSprite, this.enemySprite);
    }

    private createUI(): void {
        // Combat Log Box
        const logBox = new Graphics();
        logBox.rect(20, 20, this.width - 40, 80);
        logBox.fill({ color: 0x000000, alpha: 0.8 });
        logBox.stroke({ color: 0xffffff, width: 2 });
        this.container.addChild(logBox);

        const style = new TextStyle({ fill: '#ffffff', fontSize: 20, fontFamily: 'monospace' });
        this.logText = new Text({ text: '', style });
        this.logText.position.set(40, 40);
        this.container.addChild(this.logText);

        // Action Menu
        this.actionMenu = new Container();
        const menuBg = new Graphics();
        menuBg.rect(0, 0, 200, 120);
        menuBg.fill({ color: 0x000000, alpha: 0.8 });
        menuBg.stroke({ color: 0x00ff00, width: 2 });
        this.actionMenu.addChild(menuBg);
        
        const prompt = new Text({ text: '▶ ATTACK\n  FLEE (ESC)', style: { fill: '#00ff00', fontSize: 22, lineHeight: 40 } });
        prompt.position.set(20, 20);
        this.actionMenu.addChild(prompt);
        
        this.actionMenu.position.set(40, this.height - 160);
        this.container.addChild(this.actionMenu);

        // Health Bars
        this.playerHpBar = new Graphics();
        this.playerHpText = new Text({ text: 'HP', style: { fill: '#fff', fontSize: 16 } });
        this.playerHpBar.position.set(this.pOriginalX - 60, this.pOriginalY + 20);
        this.playerHpText.position.set(this.pOriginalX - 60, this.pOriginalY + 35);

        this.enemyHpBar = new Graphics();
        this.enemyHpText = new Text({ text: 'HP', style: { fill: '#fff', fontSize: 16 } });
        this.enemyHpBar.position.set(this.eOriginalX - 60, this.eOriginalY + 20);
        this.enemyHpText.position.set(this.eOriginalX - 60, this.eOriginalY + 35);

        this.container.addChild(this.playerHpBar, this.playerHpText, this.enemyHpBar, this.enemyHpText);
    }

    private updateHealthBars(): void {
        const p1 = this.config.player;
        const e1 = this.config.enemy;

        const drawBar = (g: Graphics, hp: number, max: number) => {
            g.clear();
            g.rect(0, 0, 120, 10);
            g.fill(0x550000);
            const pct = Math.max(0, Math.min(1, hp / max));
            if (pct > 0) {
                g.rect(0, 0, 120 * pct, 10);
                g.fill(pct > 0.5 ? 0x00ff00 : pct > 0.2 ? 0xffff00 : 0xff0000);
            }
            g.stroke({ color: 0xffffff, width: 1 });
        };

        drawBar(this.playerHpBar, p1.hp, p1.maxHp);
        this.playerHpText.text = `HP: ${Math.max(0, Math.floor(p1.hp))}/${p1.maxHp}`;
        
        drawBar(this.enemyHpBar, e1.hp, e1.maxHp);
        this.enemyHpText.text = `HP: ${Math.max(0, Math.floor(e1.hp))}/${e1.maxHp}`;
    }

    private logMessage(msg: string): void {
        this.logText.text = msg;
    }

    private spawnDamageNumber(x: number, y: number, amount: number, color: number = 0xffffff): void {
        const style = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 36,
            fontWeight: 'bold',
            fill: color,
            stroke: { color: 0x000000, width: 5 },
            dropShadow: { color: 0x000000, blur: 4, distance: 3 },
            align: 'center'
        });

        const text = new Text({ text: amount.toString(), style });
        text.anchor.set(0.5);
        text.position.set(x, y - 50);
        this.container.addChild(text);

        this.popups.push({ text, life: 1.0, maxLife: 1.0, vy: -100 });
    }

    private triggerShake(intensity: number): void {
        this.shakeAmount = intensity;
    }

    private playBattleMusic(): void {
        // Stop current music and play battle theme (using dummy asset logic)
        AudioManager.stopAllMusic();
        if (AudioManager.isLoaded('game_music')) {
            AudioManager.playMusic('game_music', { volume: 0.6 });
        }
    }

    protected onUpdate(dt: number): void {
        this.updatePopups(dt);
        this.updateShake(dt);

        if (this.turn === 'player') {
            this.actionMenu.alpha = 1.0;
            if (InputManager.isActionPressed()) {
                this.playerAttack();
            }
            if (InputManager.isKeyPressed(Key.Escape)) {
                this.flee();
            }
        } else if (this.turn === 'enemy') {
            this.actionMenu.alpha = 0.5;
            this.turn = 'animating';
            setTimeout(() => this.enemyAttack(), 1000);
        }
    }

    private updatePopups(dt: number): void {
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const p = this.popups[i];
            p.life -= dt;
            if (p.life <= 0) {
                p.text.destroy();
                this.popups.splice(i, 1);
            } else {
                p.vy += 400 * dt; // Gravity
                p.text.y += p.vy * dt;
                if (p.life < 0.3) p.text.alpha = p.life / 0.3;
            }
        }
    }

    private updateShake(dt: number): void {
        if (this.shakeAmount > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            this.container.position.set(sx, sy);
            this.shakeAmount -= 50 * dt;
            if (this.shakeAmount <= 0) {
                this.shakeAmount = 0;
                this.container.position.set(0, 0);
            }
        }
    }

    private animateLunge(sprite: Sprite, originalX: number, originalY: number, direction: number, onComplete: () => void): void {
        const lungeDist = 50 * direction;
        sprite.x = originalX + lungeDist;
        
        // Quick snap back
        const returnInterval = setInterval(() => {
            sprite.x -= lungeDist * 0.2;
            if (Math.abs(sprite.x - originalX) < 2) {
                sprite.x = originalX;
                clearInterval(returnInterval);
                onComplete();
            }
        }, 16);
    }

    private playerAttack(): void {
        this.turn = 'animating';
        this.logMessage(`You lunge forward!`);
        
        this.animateLunge(this.playerSprite, this.pOriginalX, this.pOriginalY, 1, () => {
            // Hit logic
            const dmg = Math.max(1, this.config.player.atk - this.config.enemy.def);
            const crit = Math.random() < 0.1;
            const finalDmg = crit ? dmg * 2 : dmg;
            
            this.config.enemy.hp -= finalDmg;
            
            // Visuals
            this.triggerShake(crit ? 15 : 8);
            this.spawnDamageNumber(this.eOriginalX, this.eOriginalY - 50, finalDmg, crit ? 0xffff00 : 0xffffff);
            if (AudioManager.isLoaded('puzzle_drop')) AudioManager.playSound('puzzle_drop');
            
            // Enemy Flash red
            this.enemySprite.tint = 0xff0000;
            setTimeout(() => this.enemySprite.tint = 0xffffff, 200);

            this.updateHealthBars();
            this.logMessage(crit ? `CRITICAL HIT! ${finalDmg} damage!` : `You deal ${finalDmg} damage!`);
            
            setTimeout(() => this.checkVictory(), 1000);
        });
    }

    private enemyAttack(): void {
        this.logMessage(`Enemy attacks!`);
        
        this.animateLunge(this.enemySprite, this.eOriginalX, this.eOriginalY, -1, () => {
            const dmg = Math.max(1, this.config.enemy.atk - this.config.player.def);
            this.config.player.hp -= dmg;
            
            this.triggerShake(10);
            this.spawnDamageNumber(this.pOriginalX, this.pOriginalY - 50, dmg, 0xff4444);
            if (AudioManager.isLoaded('puzzle_lock')) AudioManager.playSound('puzzle_lock');

            this.playerSprite.tint = 0xff0000;
            setTimeout(() => this.playerSprite.tint = 0xffffff, 200);

            this.updateHealthBars();
            this.logMessage(`Enemy deals ${dmg} damage!`);
            
            setTimeout(() => this.checkVictory(true), 1000);
        });
    }

    private checkVictory(wasEnemyTurn: boolean = false): void {
        if (this.config.enemy.hp <= 0) {
            this.logMessage("VICTORY! Enemy defeated.");
            this.enemySprite.alpha = 0.5;
            this.enemySprite.rotation = Math.PI / 2; // Fall over
            if (AudioManager.isLoaded('puzzle_levelup')) AudioManager.playSound('puzzle_levelup');
            setTimeout(() => this.exitBattle(), 2000);
        } else if (this.config.player.hp <= 0) {
            this.logMessage("DEFEAT... You collapse.");
            this.playerSprite.alpha = 0.5;
            this.playerSprite.rotation = -Math.PI / 2;
            if (AudioManager.isLoaded('puzzle_gameover')) AudioManager.playSound('puzzle_gameover');
            setTimeout(() => this.exitBattle(), 2000);
        } else {
            this.turn = wasEnemyTurn ? 'player' : 'enemy';
        }
    }

    private flee(): void {
        this.turn = 'animating';
        this.logMessage("Got away safely!");
        setTimeout(() => this.exitBattle(), 1000);
    }

    private exitBattle(): void {
        // Return to map music
        AudioManager.stopAllMusic();
        if (AudioManager.isLoaded('menu_music')) {
            AudioManager.playMusic('menu_music', { volume: 0.4 });
        }
        StateManager.pop();
    }
}
