import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { Button, ButtonStyle } from '../ui/Button';
import { HighScoreManager, HighScore, GameMode } from '../data/HighScoreManager';
import { SceneTransition } from '../state/SceneTransition';

export interface HighScoresSceneConfig extends SceneConfig {
    initialMode?: GameMode;
    onBack?: () => void;
}

export class HighScoresScene extends Scene {
    private sceneConfig: HighScoresSceneConfig;

    private background!: Graphics;
    private titleText!: Text;
    private modeButtons: Button[] = [];
    private scoreRows: Container[] = [];
    private currentMode: GameMode = 'marathon';
    private selectedModeIndex = 0;

    private readonly modes: GameMode[] = ['marathon', 'sprint', 'ultra'];
    private readonly modeLabels: Record<GameMode, string> = {
        marathon: 'Marathon',
        sprint: 'Sprint',
        ultra: 'Ultra',
    };

    constructor(config: HighScoresSceneConfig) {
        super(config);
        this.sceneConfig = config;
        this.currentMode = config.initialMode ?? 'marathon';
        this.selectedModeIndex = this.modes.indexOf(this.currentMode);
    }

    protected create(): void {
        this.createBackground();
        this.createTitle();
        this.createModeTabs();
        this.createScoreList();
        this.createBackButton();
    }

    public onUpdate(_dt: number): void {
        this.handleInput();
    }

    private createBackground(): void {
        this.background = new Graphics();
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const color = this.lerpColor(0x0a0a1a, 0x1a1a3a, ratio);
            this.background.rect(0, (this.height / steps) * i, this.width, this.height / steps + 1);
            this.background.fill(color);
        }
        this.container.addChild(this.background);
    }

    private createTitle(): void {
        const titleStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            fill: [0xffd700, 0xffaa00],
            stroke: { color: 0x442200, width: 4 },
            letterSpacing: 4,
        });

        this.titleText = new Text({ text: 'HIGH SCORES', style: titleStyle });
        this.titleText.anchor.set(0.5);
        this.titleText.x = this.centerX;
        this.titleText.y = this.height * 0.1;
        this.container.addChild(this.titleText);
    }

    private createModeTabs(): void {
        const tabStyle: ButtonStyle = {
            width: 120,
            height: 40,
            backgroundColor: 0x2a3a5a,
            backgroundColorHover: 0x3a4a6a,
            backgroundColorPressed: 0x1a2a4a,
            borderColor: 0x4a6a8a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 16,
            borderRadius: 6,
        };

        const startX = this.centerX - (this.modes.length * 130) / 2 + 60;
        const y = this.height * 0.18;

        for (let i = 0; i < this.modes.length; i++) {
            const mode = this.modes[i];
            const button = new Button(this.modeLabels[mode], tabStyle);
            button.setPosition(startX + i * 130, y);
            button.onClick(() => {
                this.selectMode(i);
                this.playMoveSound();
            });

            this.container.addChild(button.container);
            this.modeButtons.push(button);
        }

        this.updateModeTabs();
    }

    private createScoreList(): void {
        this.clearScoreRows();
        
        const scores = HighScoreManager.getScores(this.currentMode, 10);
        const startY = this.height * 0.28;
        const rowHeight = 36;

        const headerStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0x6688aa,
            letterSpacing: 2,
        });

        const headers = ['RANK', 'NAME', 'SCORE', 'LVL', 'LINES', 'TIME'];
        const headerX = [60, 140, 280, 380, 450, 540];

        for (let i = 0; i < headers.length; i++) {
            const headerText = new Text({ text: headers[i], style: headerStyle });
            headerText.x = this.centerX - 280 + headerX[i];
            headerText.y = startY;
            this.container.addChild(headerText);
        }

        if (scores.length === 0) {
            const emptyStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 18,
                fill: 0x667788,
                fontStyle: 'italic',
            });

            const emptyText = new Text({ text: 'No scores yet. Be the first!', style: emptyStyle });
            emptyText.anchor.set(0.5);
            emptyText.x = this.centerX;
            emptyText.y = startY + rowHeight * 3;
            this.container.addChild(emptyText);
            return;
        }

        for (let i = 0; i < scores.length; i++) {
            const score = scores[i];
            const row = this.createScoreRow(i + 1, score, startY + rowHeight * (i + 1.5));
            this.scoreRows.push(row);
            this.container.addChild(row);
        }
    }

    private createScoreRow(rank: number, score: HighScore, y: number): Container {
        const row = new Container();
        row.y = y;

        const isTopThree = rank <= 3;
        const rankColors = [0xffd700, 0xc0c0c0, 0xcd7f32];
        const textColor = isTopThree ? rankColors[rank - 1] : 0xaabbcc;

        const rankStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: isTopThree ? 20 : 16,
            fontWeight: 'bold',
            fill: textColor,
        });

        const valueStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0xffffff,
        });

        const baseX = this.centerX - 280;

        const rankText = new Text({ text: `${rank}`, style: rankStyle });
        rankText.x = baseX + 70;
        rankText.anchor.set(0.5, 0.5);
        row.addChild(rankText);

        const nameText = new Text({ text: score.name, style: valueStyle });
        nameText.x = baseX + 120;
        row.addChild(nameText);

        const scoreText = new Text({ text: score.score.toLocaleString(), style: valueStyle });
        scoreText.x = baseX + 250;
        row.addChild(scoreText);

        const levelText = new Text({ text: `${score.level}`, style: valueStyle });
        levelText.x = baseX + 380;
        row.addChild(levelText);

        const linesText = new Text({ text: `${score.lines}`, style: valueStyle });
        linesText.x = baseX + 450;
        row.addChild(linesText);

        const timeText = new Text({ text: this.formatTime(score.time), style: valueStyle });
        timeText.x = baseX + 530;
        row.addChild(timeText);

        return row;
    }

    private clearScoreRows(): void {
        for (const row of this.scoreRows) {
            row.destroy({ children: true });
        }
        this.scoreRows = [];
    }

    private createBackButton(): void {
        const buttonStyle: ButtonStyle = {
            width: 160,
            height: 46,
            backgroundColor: 0x1a2a4a,
            backgroundColorHover: 0x2a4a6a,
            backgroundColorPressed: 0x0a1a3a,
            borderColor: 0x4a6a8a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 20,
            borderRadius: 8,
        };

        const backButton = new Button('Back', buttonStyle);
        backButton.setPosition(this.centerX, this.height * 0.9);
        backButton.onClick(() => {
            this.playSelectSound();
            this.goBack();
        });

        this.container.addChild(backButton.container);
    }

    private updateModeTabs(): void {
        for (let i = 0; i < this.modeButtons.length; i++) {
            this.modeButtons[i].selected = i === this.selectedModeIndex;
        }
    }

    private handleInput(): void {
        if (InputManager.isKeyPressed(Key.Left) || InputManager.isKeyPressed(Key.A)) {
            this.selectMode(this.selectedModeIndex - 1);
        } else if (InputManager.isKeyPressed(Key.Right) || InputManager.isKeyPressed(Key.D)) {
            this.selectMode(this.selectedModeIndex + 1);
        }

        if (InputManager.isCancelPressed() || InputManager.isKeyPressed(Key.Escape)) {
            this.goBack();
        }
    }

    private selectMode(index: number): void {
        const newIndex = (index + this.modes.length) % this.modes.length;
        if (newIndex !== this.selectedModeIndex) {
            this.selectedModeIndex = newIndex;
            this.currentMode = this.modes[newIndex];
            this.updateModeTabs();
            this.createScoreList();
            this.playMoveSound();
        }
    }

    private goBack(): void {
        if (this.sceneConfig.onBack) {
            this.sceneConfig.onBack();
        } else {
            SceneTransition.popWithFade(this.app);
        }
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    private lerpColor(color1: number, color2: number, t: number): number {
        const r1 = (color1 >> 16) & 0xff, g1 = (color1 >> 8) & 0xff, b1 = color1 & 0xff;
        const r2 = (color2 >> 16) & 0xff, g2 = (color2 >> 8) & 0xff, b2 = color2 & 0xff;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return (r << 16) | (g << 8) | b;
    }
}
