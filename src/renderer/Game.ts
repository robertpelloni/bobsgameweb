import { Application, Ticker, Container } from 'pixi.js';
import { EventEmitter } from 'eventemitter3';
import { Camera } from './graphics/Camera';
import { StateManager } from './state/StateManager';
import { InputManager } from './input/InputManager';
import { AudioManager } from './audio/AudioManager';
import { MainMenuScene } from './scenes/MainMenuScene';

export interface GameConfig {
    skipMenu?: boolean;
}

export interface GameEvents {
    'scene:change': (sceneName: string) => void;
    'game:pause': () => void;
    'game:resume': () => void;
}

export class Game extends EventEmitter<GameEvents> {
    private app: Application;
    private config: GameConfig;
    private isRunning = false;
    private isPaused = false;

    private _camera: Camera;
    private worldContainer: Container;
    private mainMenuScene: MainMenuScene | null = null;
    
    constructor(app: Application, config: GameConfig = {}) {
        super();
        this.app = app;
        this.config = config;
        
        this.worldContainer = new Container();
        this.app.stage.addChild(this.worldContainer);
        
        this._camera = new Camera(this.worldContainer, {
            viewportWidth: app.screen.width,
            viewportHeight: app.screen.height,
            defaultZoom: 1.0,
            minZoom: 0.5,
            maxZoom: 4.0,
        });
        
    // Store main menu scene - create and store it once
    private mainMenuScene: MainMenuScene | null = null;
    
    constructor(app: Application, config: GameConfig = {}) {
        super();
        this.app = app;
        this.config = config;
        
        this.worldContainer = new Container();
        this.app.stage.addChild(this.worldContainer);
        
        this._camera = new Camera(this.worldContainer, {
            viewportWidth: app.screen.width,
            viewportHeight: app.screen.height,
            defaultZoom: 1.0,
            minZoom: 0.5,
            maxZoom: 4.0,
        });
    }

    private async createMainMenuScene(): Promise<void> {
        // Only create if not already created
        if (this.mainMenuScene !== null) {
            return;
        }
        
        this.mainMenuScene = new MainMenuScene({
            name: 'main-menu',
            app: this.app,
        });
        await this.mainMenuScene.create();
    }

    private showMain(): void {
        this.showMainMenu();
    }

    async init(): Promise<void> {
        console.log('Game initializing...');
        InputManager.init();
        
        this.app.ticker.add(this.update, this);
        this.app.ticker.stop();
        
        if (!this.config.skipMenu) {
            await this.createMainMenuScene();
            this.showMainMenu();
        }
        
        this.isRunning = true;
        console.log('Game initialized');
    }

    private createMainMenuScene(): void {
        this.mainMenuScene.create();
    }

    private showMainMenu(): void {
        if (this.isPaused) return;
        this.isPaused = true;
        this.emit('game:pause');
    }
    
    async init(): Promise<void> {
        console.log('Game initializing...');
        InputManager.init();
        
        this.app.ticker.add(this.update, this);
        this.app.ticker.stop();
        
        this.createMainMenuScene();
        
        await this.loadAudioAssets();
        
        this.showMainMenu();
        
        console.log('Game initialized');
    }

    async init(): Promise<void> {
        console.log('Game initializing...');
        InputManager.init();
        
        this.app.ticker.add(this.update, this);
        this.app.ticker.stop();
        
        if (!this.config.skipMenu) {
            const menuScene = new MainMenuScene({
                name: 'main-menu',
                app: this.app,
            });
            await menuScene.create();
            StateManager.push(menuScene);
        }
        
        console.log('Game initialized');
    }

        console.log('Game initialized');
    }

    private async loadAudioAssets(): Promise<void> {
        const soundAssets = [
            { name: 'menu_move', src: '/audio/sfx/menu_move.wav' },
            { name: 'menu_select', src: '/audio/sfx/menu_select.wav' },
            { name: 'pause', src: '/audio/sfx/pause.wav' },
            { name: 'piece_move', src: '/audio/sfx/piece_move.wav' },
            { name: 'piece_rotate', src: '/audio/sfx/piece_rotate.wav' },
            { name: 'piece_drop', src: '/audio/sfx/piece_drop.wav' },
            { name: 'piece_lock', src: '/audio/sfx/piece_lock.wav' },
            { name: 'line_clear', src: '/audio/sfx/line_clear.wav' },
            { name: 'tetris', src: '/audio/sfx/tetris.wav' },
            { name: 'level_up', src: '/audio/sfx/level_up.wav' },
            { name: 'game_over', src: '/audio/sfx/game_over.wav' },
        ];

        const musicAssets = [
            { name: 'menu_music', src: '/audio/music/menu.mp3' },
            { name: 'game_music', src: '/audio/music/game.mp3' },
        ];

        for (const asset of [...soundAssets, ...musicAssets]) {
            try {
                AudioManager.load(asset.name, asset.src);
            } catch {
                console.warn(`Audio asset not found: ${asset.src}`);
            }
        }
    }

    private showMain(): void {
        if (this.isPaused) return;
        this.isPaused = true;
        this.emit('game:pause');
    }

    private showMainMenu(): void {
        const menuScene = new MainMenuScene({
            name: 'main-menu',
            app: this.app,
        });
        await menuScene.create();
        StateManager.push(menuScene);
        this.isPaused = false;
        this.emit('game:resume');
    }

    async init(): Promise<void> {
        console.log('Game initializing...');
        InputManager.init();
        
        this.app.ticker.add(this.update, this);
        this.app.ticker.stop();
        
        if (!this.config.skipMenu) {
            await this.createMainMenuScene();
        }
        
        this.isRunning = true;
        console.log('Game initialized');
    }

    private async createMainMenuScene(): Promise<void> {
        this.mainMenuScene = new MainMenuScene({
            name: 'main-menu',
            app: this.app,
        });
        await this.mainMenuScene.create();
    }

    start(): void {
        if (this.isRunning) return;
        console.log('Game starting...');
        this.isRunning = true;
        this.app.ticker.start();
    }

    stop(): void {
        if (!this.isRunning) return;
        console.log('Game stopping...');
        this.isRunning = false;
        this.app.ticker.stop();
    }

    pause(): void {
        if (this.isPaused) return;
        this.isPaused = true;
        this.emit('game:pause');
    }

    resume(): void {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.emit('game:resume');
    }

    private update(ticker: Ticker): void {
        if (this.isPaused) return;
        const dt = ticker.deltaMS / 1000;

        InputManager.update();
        StateManager.update(dt);

        this._camera.update(ticker.deltaMS);
    }

    resize(width: number, height: number): void {
        this.app.renderer.resize(width, height);
        this._camera.resize(width, height);
    }

    get width(): number {
        return this.app.screen.width;
    }

    get height(): number {
        return this.app.screen.height;
    }

    get stage(): Container {
        return this.app.stage;
    }

    get camera(): Camera {
        return this._camera;
    }

    get world(): Container {
        return this.worldContainer;
    }

    get pixi(): Application {
        return this.app;
    }
}
