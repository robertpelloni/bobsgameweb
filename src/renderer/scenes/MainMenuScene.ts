import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { Button, ButtonStyle } from '../ui/Button';
import { PuzzleScene, PuzzleSceneConfig } from '../puzzle';
import { GameType, GameTypes } from '../puzzle';
import { Key } from '../input/InputManager';
import { OptionsScene } from './OptionsScene';
import { HighScoresScene } from './HighScoresScene';
import { GameMode } from '../data/HighScoreManager';
import { SceneTransition } from '../state/SceneTransition';

// ============================================================
// Types
// ============================================================

export interface MainMenuSceneConfig extends SceneConfig {
    onStartGame?: (gameType: GameType, gameMode: GameMode) => void;
    onOptions?: () => void;
}

interface MenuItem {
    label: string;
    action: () => void;
}

// ============================================================
// MainMenuScene
// ============================================================

export class MainMenuScene extends Scene {
    private menuConfig: MainMenuSceneConfig;
    
    private titleText!: Text;
    private subtitleText!: Text;
    private menuButtons: Button[] = [];
    private modeButtons: Button[] = [];
    private selectedIndex = 0;
    private selectedCategoryIndex = 0;
    
    private background!: Graphics;
    private particles: Particle[] = [];
    private particleContainer!: Container;
    
    private titleBounce = 0;
    private menuItems: MenuItem[] = [];

    private readonly categories: GameMode[] = ['marathon', 'sprint', 'ultra'];
    private readonly categoryLabels: Record<GameMode, string> = {
        marathon: 'MARATHON',
        sprint: 'SPRINT',
        ultra: 'ULTRA',
    };

    constructor(config: MainMenuSceneConfig) {
        super(config);
        this.menuConfig = config;
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    protected create(): void {
        this.createBackground();
        this.createParticles();
        this.createTitle();
        this.createCategorySelector();
        this.createMenu();
        this.playMenuMusic();
    }

    private createCategorySelector(): void {
        const tabStyle: ButtonStyle = {
            width: 120,
            height: 36,
            backgroundColor: 0x1a2a4a,
            backgroundColorHover: 0x2a4a6a,
            backgroundColorPressed: 0x0a1a3a,
            borderColor: 0x4a6a8a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 14,
            borderRadius: 18,
        };

        const startX = this.centerX - (this.categories.length * 130) / 2 + 65;
        const y = this.height * 0.38;

        for (let i = 0; i < this.categories.length; i++) {
            const mode = this.categories[i];
            const button = new Button(this.categoryLabels[mode], tabStyle);
            button.setPosition(startX + i * 130, y);
            button.onClick(() => {
                this.selectCategory(i);
                this.playMoveSound();
            });

            this.container.addChild(button.container);
            this.modeButtons.push(button);
        }

        this.updateCategoryVisuals();
    }

    private selectCategory(index: number): void {
        this.selectedCategoryIndex = index;
        this.updateCategoryVisuals();
    }

    private updateCategoryVisuals(): void {
        for (let i = 0; i < this.modeButtons.length; i++) {
            const isSelected = i === this.selectedCategoryIndex;
            this.modeButtons[i].selected = isSelected;
            this.modeButtons[i].container.alpha = isSelected ? 1.0 : 0.6;
        }
    }

    public onUpdate(dt: number): void {
        this.updateParticles(dt);
        this.updateTitleAnimation(dt);
        this.handleInput();
    }

    public async onExit(): Promise<void> {
        this.particles = [];
        await super.onExit();
    }

    // ============================================================
    // Background & Effects
    // ============================================================

    private createBackground(): void {
        this.background = new Graphics();
        this.drawBackground();
        this.container.addChild(this.background);
    }

    private drawBackground(): void {
        this.background.clear();
        
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const color = this.lerpColor(0x0a0a1a, 0x1a1a3a, ratio);
            this.background.rect(0, (this.height / steps) * i, this.width, this.height / steps + 1);
            this.background.fill(color);
        }
    }

    private createParticles(): void {
        this.particleContainer = new Container();
        this.container.addChild(this.particleContainer);
        
        for (let i = 0; i < 50; i++) {
            const particle = new Particle(this.width, this.height);
            this.particleContainer.addChild(particle.graphics);
            this.particles.push(particle);
        }
    }

    private updateParticles(dt: number): void {
        for (const particle of this.particles) {
            particle.update(dt, this.height);
        }
    }

    // ============================================================
    // Title
    // ============================================================

    private createTitle(): void {
        const titleStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 72,
            fontWeight: 'bold',
            fill: [0xffffff, 0x00ffff],
            stroke: { color: 0x003366, width: 6 },
            dropShadow: {
                color: 0x000000,
                blur: 8,
                angle: Math.PI / 4,
                distance: 6,
            },
            letterSpacing: 4,
        });

        this.titleText = new Text({ text: "bob's game", style: titleStyle });
        this.titleText.anchor.set(0.5);
        this.titleText.x = this.centerX;
        this.titleText.y = this.height * 0.2;
        this.container.addChild(this.titleText);

        const subtitleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 24,
            fill: 0x88aacc,
            letterSpacing: 8,
        });

        this.subtitleText = new Text({ text: 'PUZZLE MODE', style: subtitleStyle });
        this.subtitleText.anchor.set(0.5);
        this.subtitleText.x = this.centerX;
        this.subtitleText.y = this.titleText.y + 60;
        this.container.addChild(this.subtitleText);
    }

    private updateTitleAnimation(dt: number): void {
        this.titleBounce += dt * 2;
        this.titleText.y = this.height * 0.2 + Math.sin(this.titleBounce) * 5;
        this.titleText.scale.set(1 + Math.sin(this.titleBounce * 0.5) * 0.02);
    }

    // ============================================================
    // Menu
    // ============================================================

    private createMenu(): void {
        this.menuItems = [
            { label: 'Classic', action: () => this.startGame(GameTypes.CLASSIC) },
            { label: 'Modern', action: () => this.startGame(GameTypes.MODERN) },
            { label: 'Puyo', action: () => this.startGame(GameTypes.PUYO) },
            { label: 'Columns', action: () => this.startGame(GameTypes.COLUMNS) },
            { label: 'High Scores', action: () => this.openHighScores() },
            { label: 'Options', action: () => this.openOptions() },
        ];

        const buttonStyle: ButtonStyle = {
            width: 240,
            height: 44,
            backgroundColor: 0x1a2a4a,
            backgroundColorHover: 0x2a4a6a,
            backgroundColorPressed: 0x0a1a3a,
            borderColor: 0x4a6a8a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 18,
            borderRadius: 8,
        };

        const startY = this.height * 0.48;
        const spacing = 58;

        for (let i = 0; i < this.menuItems.length; i++) {
            const item = this.menuItems[i];
            const button = new Button(item.label, buttonStyle);
            button.setPosition(this.centerX, startY + i * spacing);
            button.onClick(() => {
                this.playSelectSound();
                item.action();
            });
            
            this.container.addChild(button.container);
            this.menuButtons.push(button);
        }

        this.updateSelection();
    }

    private updateSelection(): void {
        for (let i = 0; i < this.menuButtons.length; i++) {
            this.menuButtons[i].selected = i === this.selectedIndex;
        }
    }

    // ============================================================
    // Input Handling
    // ============================================================

    private handleInput(): void {
        if (InputManager.isKeyPressed(Key.Up) || InputManager.isKeyPressed(Key.W)) {
            this.moveSelection(-1);
        } else if (InputManager.isKeyPressed(Key.Down) || InputManager.isKeyPressed(Key.S)) {
            this.moveSelection(1);
        }

        if (InputManager.isKeyPressed(Key.Left) || InputManager.isKeyPressed(Key.A)) {
            this.moveCategorySelection(-1);
        } else if (InputManager.isKeyPressed(Key.Right) || InputManager.isKeyPressed(Key.D)) {
            this.moveCategorySelection(1);
        }

        if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
            this.selectCurrentItem();
        }
    }

    private moveCategorySelection(delta: number): void {
        const prevIndex = this.selectedCategoryIndex;
        this.selectedCategoryIndex = (this.selectedCategoryIndex + delta + this.categories.length) % this.categories.length;
        
        if (prevIndex !== this.selectedCategoryIndex) {
            this.playMoveSound();
            this.updateCategoryVisuals();
        }
    }

    private moveSelection(delta: number): void {
        const prevIndex = this.selectedIndex;
        this.selectedIndex = (this.selectedIndex + delta + this.menuItems.length) % this.menuItems.length;
        
        if (prevIndex !== this.selectedIndex) {
            this.playMoveSound();
            this.updateSelection();
        }
    }

    private selectCurrentItem(): void {
        this.playSelectSound();
        this.menuItems[this.selectedIndex].action();
    }

    // ============================================================
    // Actions
    // ============================================================

    private startGame(gameType: GameType): void {
        const gameMode = this.categories[this.selectedCategoryIndex];
        
        if (this.menuConfig.onStartGame) {
            this.menuConfig.onStartGame(gameType, gameMode);
            return;
        }

        const puzzleConfig: PuzzleSceneConfig = {
            name: 'puzzle',
            app: this.app,
            gameType,
            gameMode,
            startLevel: 1,
        };

        const puzzleScene = new PuzzleScene(puzzleConfig);
        SceneTransition.pushWithFade(this.app, puzzleScene);
    }

    private openOptions(): void {
        if (this.menuConfig.onOptions) {
            this.menuConfig.onOptions();
            return;
        }
        const optionsScene = new OptionsScene({
            name: 'options',
            app: this.app,
        });
        SceneTransition.pushWithFade(this.app, optionsScene);
    }

    private openHighScores(): void {
        const highScoresScene = new HighScoresScene({
            name: 'high-scores',
            app: this.app,
            initialMode: this.categories[this.selectedCategoryIndex],
        });
        SceneTransition.pushWithFade(this.app, highScoresScene);
    }

    // ============================================================
    // Audio
    // ============================================================

    private playMenuMusic(): void {
        if (AudioManager.isLoaded('menu_music')) {
            AudioManager.playMusic('menu_music', { volume: 0.5, fadeIn: 1000 });
        }
    }

    private playMoveSound(): void {
        if (AudioManager.isLoaded('menu_move')) {
            AudioManager.playSound('menu_move', { volume: 0.5 });
        }
    }

    private playSelectSound(): void {
        if (AudioManager.isLoaded('menu_select')) {
            AudioManager.playSound('menu_select', { volume: 0.7 });
        }
    }

    // ============================================================
    // Utilities
    // ============================================================

    private lerpColor(color1: number, color2: number, t: number): number {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;

        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }
}

// ============================================================
// Particle Effect
// ============================================================

class Particle {
    public graphics: Graphics;
    private x: number;
    private y: number;
    private speed: number;
    private size: number;
    private alpha: number;
    private screenWidth: number;

    constructor(screenWidth: number, screenHeight: number) {
        this.screenWidth = screenWidth;
        this.x = Math.random() * screenWidth;
        this.y = Math.random() * screenHeight;
        this.speed = 20 + Math.random() * 40;
        this.size = 2 + Math.random() * 4;
        this.alpha = 0.2 + Math.random() * 0.4;

        this.graphics = new Graphics();
        this.draw();
    }

    private draw(): void {
        this.graphics.clear();
        this.graphics.circle(0, 0, this.size);
        this.graphics.fill({ color: 0x4a8aff, alpha: this.alpha });
        this.graphics.x = this.x;
        this.graphics.y = this.y;
    }

    public update(dt: number, screenHeight: number): void {
        this.y -= this.speed * dt;
        
        if (this.y < -this.size) {
            this.y = screenHeight + this.size;
            this.x = Math.random() * this.screenWidth;
        }

        this.graphics.y = this.y;
        this.graphics.x = this.x;
        this.x += Math.sin(this.y * 0.01) * 0.5;
    }
}
