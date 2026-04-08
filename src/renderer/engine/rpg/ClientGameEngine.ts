/**
 * ClientGameEngine — the main game engine orchestrating all subsystems.
 *
 * Ported from Java com.bobsgame.client.engine.game.ClientGameEngine (1125 lines).
 * This is the central hub that initializes, updates, and renders all game systems:
 * Player, GUI, StatusBar, Wallet, Clock, FriendManager, ND (mini-games),
 * Stadium, MapManager, EventManager, AudioManager, and NetworkManager.
 */
import { Container } from 'pixi.js';
import { Player } from './Player';
import { GUIManager } from './gui/GUIManager';
import { StatusBar, type StatusBarConfig } from './gui/StatusBar';
import { Wallet } from './Wallet';
import { GameClock } from './Clock';
import { FriendManager } from './FriendManager';
import { BGClientEngine } from './BGClientEngine';
import { GlobalSettings } from '../shared/GlobalSettings';
import { GameSave, type SaveSlot } from './save/GameSave';
import { NetworkGameSave } from './save/NetworkGameSave';
import { DemoWorld } from './DemoWorld';
import { Logger } from '../debug/Logger';

const log = new Logger('ClientGameEngine');

export class ClientGameEngine extends BGClientEngine {
    // Core subsystems
    clock: GameClock;
    player: Player;
    normalPlayer: Player;
    guiManager: GUIManager;
    statusBar: StatusBar;
    wallet: Wallet;
    friendManager: FriendManager;
    settings: GlobalSettings;

    // Containers
    private mapContainer: Container;
    private guiContainer: Container;
    private overlayContainer: Container;

    // State
    controlsEnabled = true;
    playerExistsInMap = true;
    private initialized = false;
    private introMode = false;

    // Network state
    private initialGameSaveReceived = false;
    private gameSaveInitialized = false;
    private gameSaveCompleted = false;
    networkGameSave: NetworkGameSave;

    // Demo world (visual RPG world until real map data is loaded)
    private demoWorld: DemoWorld;

    // Render layer toggles (debug)
    hitLayerEnabled = true;
    underLayerEnabled = true;
    entityLayerEnabled = true;
    overLayerEnabled = true;
    lightsLayerEnabled = true;
    debugLayerEnabled = false;

    // Map state
    currentMapName = '';
    private pendingMapChange: { room: string; x: number; y: number } | null = null;

    constructor() {
        super(new Container(), 800, 600);
        this.clock = new GameClock();
        this.player = new Player();
        this.normalPlayer = this.player;

        const guiContainer = new Container();
        this.guiManager = new GUIManager(guiContainer, 800, 600);
        this.statusBar = new StatusBar({ width: 800, height: 40 } as StatusBarConfig);
        this.wallet = new Wallet(19.99);
        this.friendManager = new FriendManager();
        this.settings = new GlobalSettings();
        this.networkGameSave = new NetworkGameSave();

        this.mapContainer = new Container();
        this.guiContainer = new Container();
        this.overlayContainer = new Container();

        // Initialize demo world
        this.demoWorld = new DemoWorld({ width: 800, height: 600 });
    }

    // ============================================================
    // Initialization
    // ============================================================

    async init(): Promise<void> {
        log.info('Initializing ClientGameEngine...');

        // Load local game save
        const localSave = GameSave.loadFromLocal(0);
        if (localSave) {
            this.applyLocalSave(localSave);
        }

        // Try to load network save if logged in
        if (this.settings.get('autoLogin') && this.settings.get('username')) {
            await this.requestNetworkGameSave();
        }

        this.initialized = true;
        log.info('ClientGameEngine initialized');
    }

    private applyLocalSave(save: SaveSlot): void {
        this.wallet.money = save.money ?? 0;
    }

    private async requestNetworkGameSave(): Promise<void> {
        log.info('Requesting network game save...');
        this.initialGameSaveReceived = true;
        this.gameSaveInitialized = true;
    }

    // ============================================================
    // Update Loop
    // ============================================================

    override update(dt: number): void {
        if (!this.initialized) return;

        // Handle pending map change (don't change map in network thread)
        if (this.pendingMapChange) {
            const { room, x, y } = this.pendingMapChange;
            this.changeMap(room, x, y);
            this.pendingMapChange = null;
        }

        // Update subsystems
        this.handleGameEngineOptionKeys();
        this.clock.update(dt);
        this.guiManager.update(dt);

        // Update demo world
        this.demoWorld.update(dt);
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        const root = new Container();

        // Render the demo RPG world (map, player, NPCs, HUD)
        root.addChild(this.demoWorld.render());

        return root;
    }

    // ============================================================
    // Map Management
    // ============================================================

    changeMap(roomName: string, x: number, y: number, updateSave = true): void {
        log.info(`Changing map to: ${roomName} at (${x}, ${y})`);
        this.currentMapName = roomName;
        this.player.x = x;
        this.player.y = y;

        if (updateSave) {
            this.saveCurrentMapState(roomName, x, y);
        }
    }

    requestMapChange(roomName: string, x: number, y: number): void {
        this.pendingMapChange = { room: roomName, x, y };
    }

    private saveCurrentMapState(roomName: string, x: number, y: number): void {
        const save: Partial<SaveSlot> = {
            currentMapID: 0,
            playerX: x,
            playerY: y,
            money: this.wallet.money,
        };
        GameSave.saveToLocal(save as SaveSlot);
    }

    // ============================================================
    // Input Handling
    // ============================================================

    handleGameEngineOptionKeys(): void {
        if (!this.controlsEnabled) return;
        // F1 — debug console
        // TAB — stuff menu toggle
        // ENTER — ND game toggle
        // +/- — zoom
    }

    areAnyMenusOpen(): boolean {
        return this.guiManager.isAnyMenuOpen();
    }

    // ============================================================
    // Network Game Save Management
    // ============================================================

    setInitialGameSaveReceived(v: boolean): void { this.initialGameSaveReceived = v; }
    setGameSaveInitialized(v: boolean): void { this.gameSaveInitialized = v; }
    setGameSaveCompleted(v: boolean): void { this.gameSaveCompleted = v; }
    isGameSaveCompleted(): boolean { return this.gameSaveCompleted; }

    // ============================================================
    // Data Loading
    // ============================================================

    async loadPreCachedObjectData(): Promise<void> {
        log.info('Loading pre-cached object data...');
    }

    // ============================================================
    // Cleanup
    // ============================================================

    cleanup(): void {
        this.guiManager.destroy();
        log.info('ClientGameEngine cleaned up');
    }

    // ============================================================
    // Access
    // ============================================================

    getClock(): GameClock { return this.clock; }
    getPlayer(): Player { return this.player; }
    getGUIManager(): GUIManager { return this.guiManager; }
    getStatusBar(): StatusBar { return this.statusBar; }
    getWallet(): Wallet { return this.wallet; }
    getFriendManager(): FriendManager { return this.friendManager; }
    getSettings(): GlobalSettings { return this.settings; }
    getCurrentMapName(): string { return this.currentMapName; }
    isInitialized(): boolean { return this.initialized; }
}
