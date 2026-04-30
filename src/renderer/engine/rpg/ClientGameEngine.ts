/**
 * ClientGameEngine — the main game engine orchestrating all subsystems.
 *
 * Ported from Java com.bobsgame.client.engine.game.ClientGameEngine (1125 lines).
 * This is the central hub that initializes, updates, and renders all game systems:
 * Player, GUI, StatusBar, Wallet, Clock, FriendManager, ND (mini-games),
 * Stadium, MapManager, EventManager, AudioManager, and NetworkManager.
 */
import { Container } from "pixi.js";
// Import the main AudioManager (Howler-based) so we can sync volume settings
import { AudioManager } from "../../audio/AudioManager";
import { Logger } from "../debug/Logger";
import { MapLoader } from "../map/MapLoader";
// Map system — MapManager stores maps, MapLoader loads/generates them
import { MapManager } from "../map/MapManager";
import { GlobalSettings } from "../shared/GlobalSettings";
import { BGClientEngine } from "./BGClientEngine";
import { GameClock } from "./Clock";
import { DemoWorld } from "./DemoWorld";
// Event system — manages flags, skills, dialogues, events, conditions
import { EventManager } from "./event/EventManager";
import { FriendManager } from "./FriendManager";
import { GUIManager } from "./gui/GUIManager";
import { StatusBar, type StatusBarConfig } from "./gui/StatusBar";
import { Player } from "./Player";
import { GameSave, type SaveSlot } from "./save/GameSave";
import { NetworkGameSave } from "./save/NetworkGameSave";
import { Wallet } from "./Wallet";
import { DefaultEvents } from "./event/DefaultEvents";

const log = new Logger("ClientGameEngine");

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

	// Containers (reserved for future map/GUI rendering layers)
	// private _mapContainer: Container;
	// private _guiContainer: Container;
	// private _overlayContainer: Container;

	// State
	controlsEnabled = true;
	playerExistsInMap = true;
	private initialized = false;
	// private _introMode = false;

	// Network state
	// private _initialGameSaveReceived = false;
	// private _gameSaveInitialized = false;
	private gameSaveCompleted = false;
	networkGameSave: NetworkGameSave;

	// Event system
	eventManager: EventManager;

	// Map system
	mapManager: MapManager;
	mapLoader: MapLoader;

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
	currentMapName = "";
	private pendingMapChange: { room: string; x: number; y: number } | null =
		null;

	constructor() {
		super(new Container(), 800, 600);
		this.clock = new GameClock();
		this.player = new Player();
		this.normalPlayer = this.player;

		const guiContainer = new Container();
		this.guiManager = new GUIManager(guiContainer, 800, 600);
		this.statusBar = new StatusBar({
			width: 800,
			height: 40,
		} as StatusBarConfig);
		this.wallet = new Wallet(19.99);
		this.friendManager = new FriendManager();
		this.settings = new GlobalSettings();
		this.networkGameSave = new NetworkGameSave();

		// Initialize map system — MapManager stores registered maps, MapLoader loads them
		this.mapManager = new MapManager();
		this.mapLoader = new MapLoader(this.mapManager);

		// Initialize event system — manages flags, skills, dialogues, and event scripts
		this.eventManager = new EventManager();

		// Register default game events (tutorial, NPC dialogues, area triggers)
		DefaultEvents.register(this.eventManager);
		log.info("Registered default game events");

		// Initialize demo world
		this.demoWorld = new DemoWorld({ width: 800, height: 600, eventManager: this.eventManager });
	}

	// ============================================================
	// Initialization
	// ============================================================

	async init(): Promise<void> {
		log.info("Initializing ClientGameEngine...");

		// Load local game save
		const localSave = GameSave.loadFromLocal(0);
		if (localSave) {
			this.applyLocalSave(localSave);
		}

		// Apply saved audio settings to the global AudioManager
		// This ensures the Howler-based audio system respects user preferences
		// for master, music, and SFX volume from the very first frame.
		this.syncAudioSettings();

		// Generate built-in maps so the world always has something to show.
		// In production, maps would also be loaded from the server.
		const builtinCount = this.mapLoader.generateBuiltinMaps();
		log.info(`Registered ${builtinCount} built-in maps`);

		// Load the town map into DemoWorld so the rendered tiles come from MapManager data
		const townMap = this.mapManager.getMapByName("TOWNYUU Downstairs");
		if (townMap) {
			this.demoWorld.loadFromMapData(townMap);
			log.info("Loaded town map into DemoWorld");
		}

		// Try loading maps from the server (non-blocking)
		this.loadServerMaps().catch((e) =>
			log.warn(`Server map load skipped: ${e}`),
		);

		// Try to load network save if logged in
		if (this.settings.get("autoLogin") && this.settings.get("username")) {
			await this.requestNetworkGameSave();
		}

		this.initialized = true;
		log.info("ClientGameEngine initialized");
	}

	/**
	 * Sync GlobalSettings audio levels to the Howler-based AudioManager singleton.
	 * Called on init and whenever the user changes audio settings at runtime.
	 */
	syncAudioSettings(): void {
		AudioManager.masterVolume = this.settings.getMasterVolume();
		AudioManager.musicVolume = this.settings.getMusicVolume();
		AudioManager.sfxVolume = this.settings.getSFXVolume();
		log.info(
			`Audio synced — master: ${AudioManager.masterVolume.toFixed(2)}, music: ${AudioManager.musicVolume.toFixed(2)}, sfx: ${AudioManager.sfxVolume.toFixed(2)}`,
		);
	}

	/**
	 * Attempt to load maps from the server API.
	 * Falls back silently if the server is unreachable.
	 */
	private async loadServerMaps(): Promise<void> {
		for (let id = 1; id <= 10; id++) {
			await this.mapLoader.loadFromServer(id);
		}
		log.info(`Server maps loaded: ${this.mapLoader.getLoadedCount()} total`);
	}

	private applyLocalSave(save: SaveSlot): void {
		this.wallet.money = save.money ?? 0;
	}

	private async requestNetworkGameSave(): Promise<void> {
		log.info("Requesting network game save...");
		// Network save retrieval will be implemented with Socket.io
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

		// Process active event scripts (dialogues, flags, conditions)
		this.eventManager.update();

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

	private saveCurrentMapState(_roomName: string, x: number, y: number): void {
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

	setInitialGameSaveReceived(_v: boolean): void {
		// Reserved for network game save integration
	}
	setGameSaveInitialized(_v: boolean): void {
		// Reserved for network game save integration
	}
	setGameSaveCompleted(v: boolean): void {
		this.gameSaveCompleted = v;
	}
	isGameSaveCompleted(): boolean {
		return this.gameSaveCompleted;
	}

	// ============================================================
	// Data Loading
	// ============================================================

	async loadPreCachedObjectData(): Promise<void> {
		log.info("Loading pre-cached object data...");
	}

	// ============================================================
	// Cleanup
	// ============================================================

	cleanup(): void {
		this.guiManager.destroy();
		log.info("ClientGameEngine cleaned up");
	}

	// ============================================================
	// Access
	// ============================================================

	getClock(): GameClock {
		return this.clock;
	}
	getPlayer(): Player {
		return this.player;
	}
	getGUIManager(): GUIManager {
		return this.guiManager;
	}
	getStatusBar(): StatusBar {
		return this.statusBar;
	}
	getWallet(): Wallet {
		return this.wallet;
	}
	getFriendManager(): FriendManager {
		return this.friendManager;
	}
	getSettings(): GlobalSettings {
		return this.settings;
	}
	getCurrentMapName(): string {
		return this.currentMapName;
	}
	isInitialized(): boolean {
		return this.initialized;
	}
	getMapManager(): MapManager {
		return this.mapManager;
	}
	getMapLoader(): MapLoader {
		return this.mapLoader;
	}
	getEventManager(): EventManager {
		return this.eventManager;
	}
	getDemoWorld(): DemoWorld {
		return this.demoWorld;
	}
}
