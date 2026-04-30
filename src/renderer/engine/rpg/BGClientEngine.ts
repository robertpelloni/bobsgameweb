/**
 * BGClientEngine — main client engine orchestrator tying together all subsystems.
 *
 * Ported from okgame C++ Engine/rpg/BGClientEngine.
 * This is the central hub connecting: GUI, camera, player, clock, wallet,
 * friends, game save, notifications, puzzle (ND), and network.
 */
import { Container } from 'pixi.js';
import { GUIManager } from './gui/GUIManager';
import { Cameraman, type CameramanTarget } from '../entity/Cameraman';
import { Character, Direction } from '../entity/Character';
import { GameClock } from './Clock';
import { Wallet } from './Wallet';
import { FriendManager } from './FriendManager';
import { GameSave } from './save/GameSave';
import { StateManager } from '../state/StateManager';
import { SpriteManager } from '../entity/SpriteManager';
import { GameDataLoader } from '../shared/GameDataLoader';

export class BGClientEngine {
    private container: Container;
    private width: number;
    private height: number;

    // Core subsystems
    readonly gui: GUIManager;
    readonly camera: Cameraman;
    readonly clock: GameClock;
    readonly wallet: Wallet;
    readonly friends: FriendManager;
    readonly save: GameSave;
    readonly stateManager: StateManager;
    readonly dataLoader: GameDataLoader;

    // Player
    player: Character | null = null;
    controlsEnabled = true;
    playerExists = true;
    debugMode = false;

    // Game state
    private gameInitialized = false;
    private projectLoadEventID = -1;

    constructor(container: Container, width: number, height: number) {
        this.container = container;
        this.width = width;
        this.height = height;

        // Initialize all subsystems
        this.gui = new GUIManager(container, width, height);
        this.camera = new Cameraman();
        this.camera.setViewport(width, height);
        this.clock = new GameClock();
        this.wallet = new Wallet();
        this.friends = new FriendManager();
        this.save = new GameSave();
        this.stateManager = new StateManager(container);
        this.dataLoader = new GameDataLoader();

        // Wire up default player
        this.createPlayer('Player');
    }

    // ============================================================
    // Player
    // ============================================================

    createPlayer(name: string, x?: number, y?: number): Character {
        this.player = new Character({ name, x, y });
        this.playerExists = true;

        // Set camera to follow player
        const target: CameramanTarget = {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height,
            isMoving: false,
            isRunning: false,
        };
        this.camera.setTarget(target);

        return this.player;
    }

    getPlayer(): Character | null {
        return this.player;
    }

    setPlayerControlsEnabled(enabled: boolean): void {
        this.controlsEnabled = enabled;
    }

    // ============================================================
    // Update Loop
    // ============================================================

    update(dt: number): void {
        // Update clock
        this.clock.update(dt);

        // Update player
        if (this.player && this.playerExists) {
            this.player.update(dt);

            // Sync camera target with player
            this.camera.setTarget({
                x: this.player.x,
                y: this.player.y,
                width: this.player.width,
                height: this.player.height,
                isMoving: this.player.moved,
                isRunning: this.player.running,
            });
        }

        // Update camera
        this.camera.update(dt);

        // Update GUI
        this.gui.update(dt);

        // Update state
        this.stateManager.update(dt);

        // Update status bar from game state
        this.gui.statusBar.setClock(this.clock.hour, this.clock.minute);
        this.gui.statusBar.setDay(this.clock.day);
        this.gui.statusBar.setMoney(this.wallet.money);

        // Handle input
        if (this.controlsEnabled) {
            this.handleInput();
        }
    }

    private handleInput(): void {
        // Input handling is managed by the input system,
        // which calls player movement methods directly
    }

    // ============================================================
    // Menu Checks
    // ============================================================

    areAnyMenusOpen(): boolean {
        return this.gui.isAnyMenuOpen();
    }

    // ============================================================
    // Game Initialization
    // ============================================================

    async initializeFromSave(): Promise<void> {
        const saveData = GameSave.loadFromLocal(0);
        if (saveData) {
            this.wallet.money = saveData.money ?? 0;
        }
        this.gameInitialized = true;
    }

    saveGame(): void {
        GameSave.saveToLocal({
            slotIndex: 0,
            timestamp: Date.now(),
            playTimeSeconds: 0,
            playerName: this.player?.name ?? 'Player',
            currentMapID: 0,
            playerX: this.player?.x ?? 0,
            playerY: this.player?.y ?? 0,
            money: this.wallet.money,
            flags: [],
            skills: [],
            dialogues: [],
            strings: [],
            items: [],
            inventory: [],
            mapStates: [],
            gameDay: this.clock.day,
            gameHour: this.clock.hour,
            gameMinute: this.clock.minute,
            gameSecond: 0,
        });
    }

    isGameInitialized(): boolean {
        return this.gameInitialized;
    }

    // ============================================================
    // Network
    // ============================================================

    /**
     * Process a message received from the server.
     */
    handleServerMessage(message: string): void {
        try {
            const data = JSON.parse(message);
            const type = data.type as string;

            switch (type) {
                case 'notification':
                    this.gui.addNotification(data.text ?? '');
                    break;
                case 'friend_online':
                    this.friends.addFriend(data.userID ?? '');
                    break;
                case 'friend_offline':
                    this.friends.removeFriend(data.userID ?? '');
                    break;
                case 'game_challenge':
                    this.gui.addNotification(`Game challenge from ${data.from ?? 'Unknown'}!`);
                    break;
                default:
                    console.log('[BGClientEngine] Unhandled message:', type);
            }
        } catch {
            console.warn('[BGClientEngine] Invalid server message:', message);
        }
    }

    // ============================================================
    // Resize
    // ============================================================

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.camera.setViewport(width, height);
        this.gui.resize(width, height);
    }

    // ============================================================
    // Access
    // ============================================================

    getGUI(): GUIManager { return this.gui; }
    getCamera(): Cameraman { return this.camera; }
    getClock(): GameClock { return this.clock; }
    getWallet(): Wallet { return this.wallet; }
    getFriends(): FriendManager { return this.friends; }
    getSave(): GameSave { return this.save; }
    getStateManager(): StateManager { return this.stateManager; }
    getDataLoader(): GameDataLoader { return this.dataLoader; }
    getWidth(): number { return this.width; }
    getHeight(): number { return this.height; }
}
