import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { Button, ButtonStyle } from '../ui/Button';
import { GameType } from '../puzzle';
import { HighScoreManager, GameMode } from '../data/HighScoreManager';
import { SceneTransition } from '../state/SceneTransition';

export interface GameStats {
    score: number;
    level: number;
    lines: number;
    time: number;
    gameType: GameType;
    gameMode?: GameMode;
}

export interface GameOverSceneConfig extends SceneConfig {
    stats: GameStats;
    onReplay?: () => void;
    onMainMenu?: () => void;
}

interface MenuItem {
    label: string;
    action: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

export class GameOverScene extends Scene {
    private gameOverConfig: GameOverSceneConfig;

    private background!: Graphics;
    private titleText!: Text;
    private statsTexts: Text[] = [];
    private menuButtons: Button[] = [];
    private menuItems: MenuItem[] = [];
    private selectedIndex = 0;

    private animationTime = 0;

    private isHighScore = false;
    private nameEntry: string[] = ['A', 'A', 'A'];
    private nameIndex = 0;
    private nameTexts: Text[] = [];
    private nameEntryContainer!: Container;
    private nameEntryMode = false;
    private highScoreText!: Text;

    constructor(config: GameOverSceneConfig) {
        super(config);
        this.gameOverConfig = config;
    }

    public create(): void {
        const gameMode = this.gameOverConfig.stats.gameMode ?? 'marathon';
        this.isHighScore = HighScoreManager.isHighScore(
            this.gameOverConfig.stats.score,
            gameMode
        );

        this.createBackground();
        this.createTitle();
        this.createStats();

        if (this.isHighScore) {
            this.nameEntryMode = true;
            this.createNameEntry();
        } else {
            this.createMenu();
        }

        this.playGameOverSound();
    }

    public onUpdate(dt: number): void {
        this.animationTime += dt;
        this.updateAnimations();

        if (this.nameEntryMode) {
            this.handleNameEntryInput();
        } else {
            this.handleInput();
        }
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x000000, alpha: 0.85 });
        this.container.addChild(this.background);

        const panel = new Graphics();
        const panelWidth = 400;
        const panelHeight = this.isHighScore ? 500 : 450;
        const panelX = (this.width - panelWidth) / 2;
        const panelY = (this.height - panelHeight) / 2;
        panel.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
        panel.fill(0x1a2a4a);
        panel.stroke({ color: 0x4a6a8a, width: 3 });
        this.container.addChild(panel);
    }

    private createTitle(): void {
        const titleStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            fill: this.isHighScore ? [0xffd700, 0xffaa00] : [0xff4444, 0xff8888],
            stroke: { color: this.isHighScore ? 0x442200 : 0x440000, width: 4 },
            letterSpacing: 4,
        });

        this.titleText = new Text({
            text: this.isHighScore ? 'NEW HIGH SCORE!' : 'GAME OVER',
            style: titleStyle
        });
        this.titleText.anchor.set(0.5);
        this.titleText.x = this.centerX;
        this.titleText.y = this.height * 0.25;
        this.container.addChild(this.titleText);
    }

    private createStats(): void {
        const stats = this.gameOverConfig.stats;
        const statLines = [
            { label: 'SCORE', value: stats.score.toLocaleString() },
            { label: 'LEVEL', value: stats.level.toString() },
            { label: 'LINES', value: stats.lines.toString() },
            { label: 'TIME', value: this.formatTime(stats.time) },
        ];

        const labelStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 18,
            fill: 0x88aacc,
            letterSpacing: 2,
        });

        const valueStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 28,
            fontWeight: 'bold',
            fill: 0xffffff,
        });

        const startY = this.height * 0.34;
        const spacing = 45;

        for (let i = 0; i < statLines.length; i++) {
            const stat = statLines[i];

            const labelText = new Text({ text: stat.label, style: labelStyle });
            labelText.anchor.set(0, 0.5);
            labelText.x = this.centerX - 120;
            labelText.y = startY + i * spacing;
            this.container.addChild(labelText);
            this.statsTexts.push(labelText);

            const valueText = new Text({ text: stat.value, style: valueStyle });
            valueText.anchor.set(1, 0.5);
            valueText.x = this.centerX + 120;
            valueText.y = startY + i * spacing;
            this.container.addChild(valueText);
            this.statsTexts.push(valueText);
        }
    }

    private createNameEntry(): void {
        this.nameEntryContainer = new Container();
        this.container.addChild(this.nameEntryContainer);

        const promptStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 20,
            fill: 0xffd700,
            letterSpacing: 2,
        });

        const promptText = new Text({ text: 'ENTER YOUR NAME', style: promptStyle });
        promptText.anchor.set(0.5);
        promptText.x = this.centerX;
        promptText.y = this.height * 0.58;
        this.nameEntryContainer.addChild(promptText);

        const letterStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 48,
            fontWeight: 'bold',
            fill: 0xffffff,
        });

        const letterSpacing = 60;
        const startX = this.centerX - letterSpacing;

        for (let i = 0; i < 3; i++) {
            const letterText = new Text({ text: this.nameEntry[i], style: letterStyle });
            letterText.anchor.set(0.5);
            letterText.x = startX + i * letterSpacing;
            letterText.y = this.height * 0.66;
            this.nameEntryContainer.addChild(letterText);
            this.nameTexts.push(letterText);

            const underline = new Graphics();
            underline.rect(startX + i * letterSpacing - 20, this.height * 0.71, 40, 4);
            underline.fill(i === this.nameIndex ? 0xffd700 : 0x4a6a8a);
            this.nameEntryContainer.addChild(underline);
        }

        const hintStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0x6688aa,
        });

        const hintText = new Text({
            text: '↑↓ Change Letter   ←→ Move   Enter to Confirm',
            style: hintStyle
        });
        hintText.anchor.set(0.5);
        hintText.x = this.centerX;
        hintText.y = this.height * 0.76;
        this.nameEntryContainer.addChild(hintText);

        this.updateNameEntryVisuals();
    }

    private updateNameEntryVisuals(): void {
        for (let i = 0; i < this.nameTexts.length; i++) {
            this.nameTexts[i].text = this.nameEntry[i];
            this.nameTexts[i].style.fill = i === this.nameIndex ? 0xffd700 : 0xffffff;
            this.nameTexts[i].scale.set(i === this.nameIndex ? 1.1 : 1.0);
        }
    }

    private handleNameEntryInput(): void {
        if (InputManager.isKeyPressed(Key.Up) || InputManager.isKeyPressed(Key.W)) {
            this.changeNameLetter(1);
        } else if (InputManager.isKeyPressed(Key.Down) || InputManager.isKeyPressed(Key.S)) {
            this.changeNameLetter(-1);
        } else if (InputManager.isKeyPressed(Key.Left) || InputManager.isKeyPressed(Key.A)) {
            this.moveNameCursor(-1);
        } else if (InputManager.isKeyPressed(Key.Right) || InputManager.isKeyPressed(Key.D)) {
            this.moveNameCursor(1);
        } else if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
            this.confirmName();
        }
    }

    private changeNameLetter(delta: number): void {
        const currentIndex = ALPHABET.indexOf(this.nameEntry[this.nameIndex]);
        const newIndex = (currentIndex + delta + ALPHABET.length) % ALPHABET.length;
        this.nameEntry[this.nameIndex] = ALPHABET[newIndex];
        this.updateNameEntryVisuals();
        this.playMoveSound();
    }

    private moveNameCursor(delta: number): void {
        const newIndex = this.nameIndex + delta;
        if (newIndex >= 0 && newIndex < 3) {
            this.nameIndex = newIndex;
            this.updateNameEntryVisuals();
            this.playMoveSound();
        }
    }

    private confirmName(): void {
        const name = this.nameEntry.join('').trim() || 'AAA';
        const stats = this.gameOverConfig.stats;
        const gameMode = stats.gameMode ?? 'marathon';

        HighScoreManager.addScore(
            name,
            stats.score,
            stats.level,
            stats.lines,
            stats.time,
            stats.gameType,
            gameMode
        );

        this.playSelectSound();
        this.nameEntryMode = false;
        this.nameEntryContainer.visible = false;
        this.createMenu();
    }

    private createMenu(): void {
        this.menuItems = [
            { label: 'Play Again', action: () => this.replay() },
            { label: 'Main Menu', action: () => this.goToMainMenu() },
        ];

        const buttonStyle: ButtonStyle = {
            width: 180,
            height: 46,
            backgroundColor: 0x2a4a6a,
            backgroundColorHover: 0x3a5a7a,
            backgroundColorPressed: 0x1a3a5a,
            borderColor: 0x5a7a9a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 20,
            borderRadius: 8,
        };

        const startY = this.isHighScore ? this.height * 0.78 : this.height * 0.72;
        const spacing = 55;

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
            const button = this.menuButtons[i];
            const isSelected = i === this.selectedIndex;

            button.container.scale.set(isSelected ? 1.08 : 1.0);
            button.container.alpha = isSelected ? 1.0 : 0.7;
        }
    }

    private updateAnimations(): void {
        this.titleText.scale.set(1 + Math.sin(this.animationTime * 2) * 0.03);

        if (this.nameEntryMode && this.nameTexts[this.nameIndex]) {
            const pulse = 1.1 + Math.sin(this.animationTime * 4) * 0.05;
            this.nameTexts[this.nameIndex].scale.set(pulse);
        }
    }

    private handleInput(): void {
        if (InputManager.isKeyPressed(Key.Up) || InputManager.isKeyPressed(Key.W)) {
            this.moveSelection(-1);
        } else if (InputManager.isKeyPressed(Key.Down) || InputManager.isKeyPressed(Key.S)) {
            this.moveSelection(1);
        }

        if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
            this.selectCurrentItem();
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

    private replay(): void {
        if (this.gameOverConfig.onReplay) {
            this.gameOverConfig.onReplay();
        } else {
            SceneTransition.popWithFade(this.app);
        }
    }

    private goToMainMenu(): void {
        if (this.gameOverConfig.onMainMenu) {
            this.gameOverConfig.onMainMenu();
        } else {
            StateManager.clear();
        }
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private playGameOverSound(): void {
        if (AudioManager.isLoaded('game_over')) {
            AudioManager.playSound('game_over', { volume: 0.8 });
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
}
