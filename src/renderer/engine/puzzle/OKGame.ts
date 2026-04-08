/**
 * OKGame — main puzzle game engine.
 *
 * Ported from okgame C++ Puzzle/OKGame.h + Puzzle/BobsGame.h.
 * The primary puzzle game class managing game logic, players, menus, rooms,
 * and the complete game flow from title screen to gameplay to results.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MiniGameEngine, MiniGameState, type MiniGameConfig } from '../nd/MiniGameEngine';
import type { PuzzlePlayer } from '../puzzle/PuzzlePlayer';
import type { GameLogic } from '../puzzle/GameLogic';
import type { BobsGameRoom } from '../network/BobsGameRoom';

export enum OKGameState {
    START_SCREEN = 0,
    GETTING_GAMES = 1,
    SELECT_GAME_TYPE = 2,
    SELECT_DIFFICULTY = 3,
    SELECT_CONTROLLER = 4,
    MULTIPLAYER_JOIN = 5,
    NETWORK_LOBBY = 6,
    COUNTDOWN = 7,
    PLAYING = 8,
    PAUSED = 9,
    GAME_OVER = 10,
    RESULTS = 11,
    LOGIN = 12,
    CREATE_ACCOUNT = 13,
}

export enum DifficultyType {
    BEGINNER = 0,
    CASUAL = 1,
    NORMAL = 2,
    ADVANCED = 3,
    EXPERT = 4,
    MASTER = 5,
    INSANE = 6,
}

export const DIFFICULTY_NAMES: Record<DifficultyType, string> = {
    [DifficultyType.BEGINNER]: 'Beginner',
    [DifficultyType.CASUAL]: 'Casual',
    [DifficultyType.NORMAL]: 'Normal',
    [DifficultyType.ADVANCED]: 'Advanced',
    [DifficultyType.EXPERT]: 'Expert',
    [DifficultyType.MASTER]: 'Master',
    [DifficultyType.INSANE]: 'Insane',
};

export class OKGame extends MiniGameEngine {
    private gameState: OKGameState = OKGameState.START_SCREEN;
    protected players: PuzzlePlayer[] = [];
    protected gameLogics: GameLogic[] = [];
    protected room: BobsGameRoom | null = null;

    // Menu state
    private menuCursorPosition = 0;
    private startScreenOptions = ['Play Single Player', 'Play Local Multiplayer', 'Play Online', 'Settings', 'Quit'];
    private difficultyOptions = Object.values(DIFFICULTY_NAMES);
    protected selectedDifficulty: DifficultyType = DifficultyType.NORMAL;

    // Game state
    protected countdown = 3;
    protected countdownTimer = 0;
    private gameOverTimer = 0;
    protected isMultiplayerGame = false;
    protected isNetworkGame = false;

    // Stats
    private gamesPlayed = 0;
    private gamesWon = 0;

    constructor() {
        const config: MiniGameConfig = { name: "bob's game", width: 640, height: 480 };
        super(config);
        this.container = new Container();
    }

    override init(): void {
        this.gameState = OKGameState.START_SCREEN;
    }

    protected override onGameStart(): void {
        this.gameState = OKGameState.COUNTDOWN;
        this.countdown = 3;
        this.countdownTimer = 0;
    }

    // ============================================================
    // Game Flow
    // ============================================================

    startSinglePlayer(difficulty: DifficultyType): void {
        this.selectedDifficulty = difficulty;
        this.isMultiplayerGame = false;
        this.isNetworkGame = false;
        this.gameState = OKGameState.COUNTDOWN;
        this.countdown = 3;
        this.state = MiniGameState.PLAYING;
    }

    startLocalMultiplayer(): void {
        this.isMultiplayerGame = true;
        this.isNetworkGame = false;
        this.gameState = OKGameState.MULTIPLAYER_JOIN;
    }

    startNetworkGame(room: BobsGameRoom): void {
        this.room = room;
        this.isMultiplayerGame = true;
        this.isNetworkGame = true;
        this.gameState = OKGameState.NETWORK_LOBBY;
    }

    // ============================================================
    // Update
    // ============================================================

    protected override onGameUpdate(dt: number): void {
        switch (this.gameState) {
            case OKGameState.COUNTDOWN:
                this.countdownTimer += dt;
                if (this.countdownTimer >= 1000) {
                    this.countdownTimer = 0;
                    this.countdown--;
                    if (this.countdown <= 0) {
                        this.gameState = OKGameState.PLAYING;
                    }
                }
                break;

            case OKGameState.PLAYING:
                // Update game logics
                for (const logic of this.gameLogics) {
                    // logic.update(dt);
                }
                break;

            case OKGameState.PAUSED:
                // Wait for input
                break;

            case OKGameState.GAME_OVER:
                this.gameOverTimer += dt;
                break;
        }
    }

    protected override onGameRender(): void {
        // Handled by render()
    }

    protected override onGameOver(): void {
        this.gameState = OKGameState.GAME_OVER;
        this.gameOverTimer = 0;
    }

    protected override onCleanup(): void {
        this.gameLogics = [];
        this.players = [];
    }

    // ============================================================
    // Render
    // ============================================================

    override render(): void {
        this.container.removeChildren();

        switch (this.gameState) {
            case OKGameState.START_SCREEN:
                this.renderStartScreen();
                break;
            case OKGameState.SELECT_DIFFICULTY:
                this.renderDifficultySelect();
                break;
            case OKGameState.COUNTDOWN:
                this.renderCountdown();
                break;
            case OKGameState.PLAYING:
                this.renderPlaying();
                break;
            case OKGameState.GAME_OVER:
                this.renderGameOverScreen();
                break;
            case OKGameState.RESULTS:
                this.renderResults();
                break;
            default:
                this.renderStartScreen();
        }

    }

    private renderStartScreen(): void {
        const g = new Graphics();
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: 0x0a0a1a });
        this.container.addChild(g);

        // Title
        const titleStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 32, fill: 0x00ffff, fontWeight: 'bold' });
        const title = new Text({ text: "bob's game", style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, 80);
        this.container.addChild(title);

        // Subtitle
        const subStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0x888888 });
        const sub = new Text({ text: 'The Ultimate Puzzle Game', style: subStyle });
        sub.anchor.set(0.5);
        sub.position.set(this.width / 2, 120);
        this.container.addChild(sub);

        // Menu options
        for (let i = 0; i < this.startScreenOptions.length; i++) {
            const isSelected = i === this.menuCursorPosition;
            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 18,
                fill: isSelected ? 0x00ffff : 0x666688,
                fontWeight: isSelected ? 'bold' : 'normal',
            });
            const text = new Text({ text: this.startScreenOptions[i], style });
            text.anchor.set(0.5);
            text.position.set(this.width / 2, 200 + i * 36);
            this.container.addChild(text);
        }
    }

    private renderDifficultySelect(): void {
        const g = new Graphics();
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: 0x0a0a1a });
        this.container.addChild(g);

        const titleStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 24, fill: 0xffffff, fontWeight: 'bold' });
        const title = new Text({ text: 'Select Difficulty', style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, 60);
        this.container.addChild(title);

        const colors = [0x44ff44, 0x88ff44, 0xffff44, 0xff8844, 0xff4444, 0xff00ff, 0x8800ff];
        for (let i = 0; i < this.difficultyOptions.length; i++) {
            const isSelected = i === this.menuCursorPosition;
            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 20,
                fill: isSelected ? colors[i] : 0x444444,
                fontWeight: isSelected ? 'bold' : 'normal',
            });
            const text = new Text({ text: this.difficultyOptions[i], style });
            text.anchor.set(0.5);
            text.position.set(this.width / 2, 120 + i * 40);
            this.container.addChild(text);
        }
    }

    private renderCountdown(): void {
        const g = new Graphics();
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: 0x0a0a1a });
        this.container.addChild(g);

        const style = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 72, fill: 0xffffff, fontWeight: 'bold' });
        const text = new Text({ text: `${this.countdown}`, style });
        text.anchor.set(0.5);
        text.position.set(this.width / 2, this.height / 2);
        this.container.addChild(text);

        if (this.countdown === 0) {
            const goStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 48, fill: 0x00ff00, fontWeight: 'bold' });
            const go = new Text({ text: 'GO!', style: goStyle });
            go.anchor.set(0.5);
            go.position.set(this.width / 2, this.height / 2);
            this.container.addChild(go);
        }
    }

    private renderPlaying(): void {
        const g = new Graphics();
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: 0x000008 });
        this.container.addChild(g);

        // Game area placeholder
        const gameStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0x444444 });
        const gameText = new Text({ text: `Playing — ${DIFFICULTY_NAMES[this.selectedDifficulty]}`, style: gameStyle });
        gameText.position.set(10, 10);
        this.container.addChild(gameText);

        if (this.isMultiplayerGame) {
            const mpStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0x888888 });
            const mpText = new Text({ text: `Multiplayer (${this.isNetworkGame ? 'Online' : 'Local'})`, style: mpStyle });
            mpText.position.set(10, 30);
            this.container.addChild(mpText);
        }
    }

    private renderGameOverScreen(): void {
        const g = new Graphics();
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: 0x0a0a0a });
        this.container.addChild(g);

        const style = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 36, fill: 0xff4444, fontWeight: 'bold' });
        const text = new Text({ text: 'GAME OVER', style });
        text.anchor.set(0.5);
        text.position.set(this.width / 2, this.height / 2 - 40);
        this.container.addChild(text);

        const subStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 16, fill: 0x888888 });
        const sub = new Text({ text: 'Press ENTER to continue', style: subStyle });
        sub.anchor.set(0.5);
        sub.position.set(this.width / 2, this.height / 2 + 20);
        this.container.addChild(sub);
    }

    private renderResults(): void {
        const g = new Graphics();
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: 0x0a0a1a });
        this.container.addChild(g);

        const style = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 24, fill: 0x00ff00, fontWeight: 'bold' });
        const text = new Text({ text: 'RESULTS', style });
        text.anchor.set(0.5);
        text.position.set(this.width / 2, this.height / 2 - 40);
        this.container.addChild(text);

        const statStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0xaaaacc });
        const stats = new Text({ text: `Games: ${this.gamesPlayed}  Wins: ${this.gamesWon}`, style: statStyle });
        stats.anchor.set(0.5);
        stats.position.set(this.width / 2, this.height / 2 + 20);
        this.container.addChild(stats);
    }

    // ============================================================
    // Input
    // ============================================================

    handleMenuUp(): void {
        const maxIdx = this.gameState === OKGameState.START_SCREEN
            ? this.startScreenOptions.length
            : this.difficultyOptions.length;
        this.menuCursorPosition = (this.menuCursorPosition - 1 + maxIdx) % maxIdx;
    }

    handleMenuDown(): void {
        const maxIdx = this.gameState === OKGameState.START_SCREEN
            ? this.startScreenOptions.length
            : this.difficultyOptions.length;
        this.menuCursorPosition = (this.menuCursorPosition + 1) % maxIdx;
    }

    handleMenuSelect(): void {
        switch (this.gameState) {
            case OKGameState.START_SCREEN:
                if (this.menuCursorPosition === 0) {
                    this.gameState = OKGameState.SELECT_DIFFICULTY;
                    this.menuCursorPosition = this.selectedDifficulty;
                } else if (this.menuCursorPosition === 1) {
                    this.startLocalMultiplayer();
                } else if (this.menuCursorPosition === 2) {
                    this.gameState = OKGameState.NETWORK_LOBBY;
                }
                break;
            case OKGameState.SELECT_DIFFICULTY:
                this.startSinglePlayer(this.menuCursorPosition as DifficultyType);
                break;
            case OKGameState.GAME_OVER:
                this.gameState = OKGameState.START_SCREEN;
                this.menuCursorPosition = 0;
                break;
        }
    }

    // ============================================================
    // Access
    // ============================================================

    getGameState(): OKGameState { return this.gameState; }
    getDifficulty(): DifficultyType { return this.selectedDifficulty; }
    isMultiplayer(): boolean { return this.isMultiplayerGame; }
    isOnline(): boolean { return this.isNetworkGame; }
    getPlayers(): PuzzlePlayer[] { return this.players; }
    getGameLogics(): GameLogic[] { return this.gameLogics; }
    getRoom(): BobsGameRoom | null { return this.room; }
}
