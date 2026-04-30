/**
 * MiniGameEngine — base class for mini-games (Ramio, Ping, etc.)
 * Provides common mini-game lifecycle: title screen, pause menu, shake effects.
 *
 * Ported from okgame C++ Engine/MiniGameEngine.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export enum MiniGameState {
    TITLE = 0,
    PLAYING = 1,
    PAUSED = 2,
    GAME_OVER = 3,
}

export interface MiniGameConfig {
    name: string;
    width: number;
    height: number;
}

export abstract class MiniGameEngine {
    readonly name: string;
    protected width: number;
    protected height: number;
    protected container: Container;

    protected state: MiniGameState = MiniGameState.TITLE;
    protected score = 0;
    protected level = 1;
    protected gameTime = 0;
    protected paused = false;

    // Title screen
    protected titleMenuShowing = true;
    protected titleMenuCursorPosition = 0;
    protected titleOptions: string[] = ['Start Game', 'Settings', 'Back'];

    // Pause screen
    protected pauseMenuShowing = false;
    protected pauseMenuCursorPosition = 0;
    protected pauseOptions: string[] = ['Resume', 'Restart', 'Quit'];

    // Screen shake
    private shakeX = 0;
    private shakeY = 0;
    private shakeDuration = 0;
    private shakeMaxX = 0;
    private shakeMaxY = 0;

    protected constructor(config: MiniGameConfig) {
        this.name = config.name;
        this.width = config.width;
        this.height = config.height;
        this.container = new Container();
    }

    // ============================================================
    // Abstract Methods (must implement)
    // ============================================================

    abstract init(): void;
    protected abstract onGameStart(): void;
    protected abstract onGameUpdate(dt: number): void;
    protected abstract onGameRender(): void;
    protected abstract onGameOver(): void;
    protected abstract onCleanup(): void;

    // ============================================================
    // Lifecycle
    // ============================================================

    start(): void {
        this.state = MiniGameState.PLAYING;
        this.score = 0;
        this.level = 1;
        this.gameTime = 0;
        this.titleMenuShowing = false;
        this.pauseMenuShowing = false;
        this.onGameStart();
    }

    update(dt: number): void {
        this.updateShake(dt);

        switch (this.state) {
            case MiniGameState.TITLE:
                // Title screen handled by menu
                break;
            case MiniGameState.PLAYING:
                if (!this.paused) {
                    this.gameTime += dt;
                    this.onGameUpdate(dt);
                }
                break;
            case MiniGameState.PAUSED:
                // Pause menu handled by menu
                break;
            case MiniGameState.GAME_OVER:
                // Game over screen
                break;
        }
    }

    render(): void {
        switch (this.state) {
            case MiniGameState.TITLE:
                this.renderTitleMenu();
                break;
            case MiniGameState.PLAYING:
            case MiniGameState.PAUSED:
                this.onGameRender();
                if (this.pauseMenuShowing) this.renderPauseMenu();
                break;
            case MiniGameState.GAME_OVER:
                this.onGameRender();
                this.renderGameOver();
                break;
        }
    }

    // ============================================================
    // Pause
    // ============================================================

    togglePause(): void {
        if (this.state === MiniGameState.PLAYING) {
            this.state = MiniGameState.PAUSED;
            this.pauseMenuShowing = true;
        } else if (this.state === MiniGameState.PAUSED) {
            this.state = MiniGameState.PLAYING;
            this.pauseMenuShowing = false;
        }
    }

    resume(): void {
        this.state = MiniGameState.PLAYING;
        this.pauseMenuShowing = false;
    }

    restart(): void {
        this.onCleanup();
        this.start();
    }

    quit(): void {
        this.onCleanup();
        this.state = MiniGameState.TITLE;
        this.titleMenuShowing = true;
    }

    gameOver(): void {
        this.state = MiniGameState.GAME_OVER;
        this.onGameOver();
    }

    // ============================================================
    // Menu Rendering
    // ============================================================

    protected renderTitleMenu(): void {
        // Simple title screen
        this.container.removeChildren();

        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x0a0a2a, alpha: 0.9 });
        this.container.addChild(bg);

        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 28,
            fill: 0xffff88,
            fontWeight: 'bold',
        });
        const title = new Text({ text: this.name, style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, this.height / 3);
        this.container.addChild(title);

        const optStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0xcccccc,
        });
        this.titleOptions.forEach((opt, i) => {
            const color = i === this.titleMenuCursorPosition ? 0xffff88 : 0x888888;
            const text = new Text({
                text: `${i === this.titleMenuCursorPosition ? '▸ ' : '  '}${opt}`,
                style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 16, fill: color }),
            });
            text.anchor.set(0.5);
            text.position.set(this.width / 2, this.height / 2 + i * 30);
            this.container.addChild(text);
        });
    }

    protected renderPauseMenu(): void {
        const overlay = new Graphics();
        overlay.rect(0, 0, this.width, this.height);
        overlay.fill({ color: 0x000000, alpha: 0.7 });
        this.container.addChild(overlay);

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 24,
            fill: 0xffff88,
            fontWeight: 'bold',
        });
        const title = new Text({ text: 'PAUSED', style });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, this.height / 3);
        this.container.addChild(title);

        this.pauseOptions.forEach((opt, i) => {
            const color = i === this.pauseMenuCursorPosition ? 0xffff88 : 0x888888;
            const text = new Text({
                text: `${i === this.pauseMenuCursorPosition ? '▸ ' : '  '}${opt}`,
                style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 16, fill: color }),
            });
            text.anchor.set(0.5);
            text.position.set(this.width / 2, this.height / 2 + i * 30);
            this.container.addChild(text);
        });
    }

    protected renderGameOver(): void {
        const overlay = new Graphics();
        overlay.rect(0, 0, this.width, this.height);
        overlay.fill({ color: 0x000000, alpha: 0.8 });
        this.container.addChild(overlay);

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 28,
            fill: 0xff4444,
            fontWeight: 'bold',
        });
        const text = new Text({ text: `GAME OVER\nScore: ${this.score}`, style });
        text.anchor.set(0.5);
        text.position.set(this.width / 2, this.height / 2);
        this.container.addChild(text);
    }

    // ============================================================
    // Screen Shake
    // ============================================================

    shakeSmall(): void { this.setShake(300, 2, 2); }
    shakeHard(): void { this.setShake(800, 6, 6); }

    private setShake(duration: number, maxX: number, maxY: number): void {
        this.shakeDuration = duration;
        this.shakeMaxX = maxX;
        this.shakeMaxY = maxY;
    }

    private updateShake(dt: number): void {
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            const progress = this.shakeDuration / 800;
            this.shakeX = (Math.random() * 2 - 1) * this.shakeMaxX * progress;
            this.shakeY = (Math.random() * 2 - 1) * this.shakeMaxY * progress;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    getShakeX(): number { return this.shakeX; }
    getShakeY(): number { return this.shakeY; }

    // ============================================================
    // Menu Navigation
    // ============================================================

    menuUp(): void {
        if (this.state === MiniGameState.TITLE) {
            this.titleMenuCursorPosition = Math.max(0, this.titleMenuCursorPosition - 1);
        } else if (this.state === MiniGameState.PAUSED) {
            this.pauseMenuCursorPosition = Math.max(0, this.pauseMenuCursorPosition - 1);
        }
    }

    menuDown(): void {
        if (this.state === MiniGameState.TITLE) {
            this.titleMenuCursorPosition = Math.min(this.titleOptions.length - 1, this.titleMenuCursorPosition + 1);
        } else if (this.state === MiniGameState.PAUSED) {
            this.pauseMenuCursorPosition = Math.min(this.pauseOptions.length - 1, this.pauseMenuCursorPosition + 1);
        }
    }

    menuSelect(): void {
        if (this.state === MiniGameState.TITLE) {
            switch (this.titleMenuCursorPosition) {
                case 0: this.start(); break;
                // case 1: settings; break;
                case 2: this.quit(); break;
            }
        } else if (this.state === MiniGameState.PAUSED) {
            switch (this.pauseMenuCursorPosition) {
                case 0: this.resume(); break;
                case 1: this.restart(); break;
                case 2: this.quit(); break;
            }
        }
    }

    // ============================================================
    // Accessors
    // ============================================================

    getContainer(): Container { return this.container; }
    getScore(): number { return this.score; }
    getLevel(): number { return this.level; }
    getGameTime(): number { return this.gameTime; }
    getState(): MiniGameState { return this.state; }
    isPaused(): boolean { return this.paused; }

    protected addScore(points: number): void {
        this.score += points;
    }

    destroy(): void {
        this.onCleanup();
        this.container.destroy({ children: true });
    }
}
