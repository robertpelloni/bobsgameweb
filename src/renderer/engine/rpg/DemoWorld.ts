// @ts-nocheck
/**
 * DemoWorld — generates a visual demo RPG world for the ClientGameEngine.
 *
 * Creates a test map with terrain tiles, a walkable player character,
 * NPCs, decorative elements, and a HUD overlay. This serves as the
 * visual representation of the RPG world until real map data is loaded.
 *
 * The map is a procedurally generated town scene with:
 * - Grass, paths, water, trees, buildings
 * - Player character (arrow keys to move)
 * - NPCs standing at fixed positions
 * - HUD showing clock, wallet, location
 */
import { Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { AudioUtils } from "../audio/AudioUtils";
import { CutsceneEngine } from "../cinematics/CutsceneEngine";
import { Logger } from "../debug/Logger";
import {
	type ParticleEmitter,
	ParticlePresets,
} from "../graphics/ParticleSystem";
import { NetworkManager } from "../network/NetworkManager";
import { TileBatcher } from "../core/TileBatcher";
import { WeatherRenderer, type WeatherType } from "../graphics/WeatherRenderer";
import { EventTrigger } from "./event/BobEvent";
import { AudioManager } from "../../audio/AudioManager";

const log = new Logger("DemoWorld");

// Tile types for the demo map
enum Tile {
	GRASS = 0x2d5a1e,
	PATH = 0xc4a35a,
	WATER = 0x2244aa,
	TREE = 0x1a4a0e,
	BUILDING = 0x664422,
	ROOF = 0x882222,
	FLOWER = 0x44aa22,
	DOOR = 0x553311,
	FENCE = 0x8b7355,
	BRIDGE = 0x9b8355,
	CHEST = 0xb8860b,
	SAND = 0xd2b48c,
}

const TILE_SIZE = 32;
const MAP_W = 30;
const MAP_H = 22;

export interface DemoWorldConfig {
	width: number;
	height: number;
	eventManager?: import("./event/EventManager").EventManager;
	onMapTransitionRequest?: (mapName: string, spawnX: number, spawnY: number) => void;
}

interface LoadedMapDoor {
	name: string;
	x: number;
	y: number;
	destinationMapName: string;
	destinationX: number;
	destinationY: number;
}

interface LoadedMapWarp {
	name: string;
	comment?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	destinationMapName: string;
	destinationX: number;
	destinationY: number;
}

export class DemoWorld {
	private container: Container;
	private mapContainer: Container;
	private tileBatcher: TileBatcher | null = null;
	private weatherRenderer: WeatherRenderer | null = null;
	private currentWeather: WeatherType = "clear";
	private entityContainer: Container;
	private hudContainer: Container;
	private touchControls: import("../../ui/TouchControls").TouchControls | null = null;

	// Smooth camera (lerped toward player)
	private camX = 0;
	private camY = 0;
	private camTargetX = 0;
	private camTargetY = 0;
	private readonly CAM_LERP = 0.08;
	private eventManager: import("./event/EventManager").EventManager | null = null;
	private onMapTransitionRequest: ((mapName: string, spawnX: number, spawnY: number) => void) | null = null;
	private loadedMapDoors: LoadedMapDoor[] = [];
	private loadedMapWarps: LoadedMapWarp[] = [];
	private usingLoadedMapData = false;
	private loadedMapTransitionCooldown = 0;
	private lastTileX = -1;
	private lastTileY = -1;
	private mapEntered = false;

	private width: number;
	private height: number;

	// Player state
	playerX = 15 * TILE_SIZE;
	playerY = 10 * TILE_SIZE;
	playerSpeed = 120; // pixels per second

	// Screen effects
	private screenShakeAmount = 0;
	private screenShakeDuration = 0;
	private screenFlashColor = 0;
	private screenFlashAlpha = 0;
	private screenFlashDuration = 0;
	/**
	 * playerDir: 0=D, 1=DL, 2=L, 3=UL, 4=U, 5=UR, 6=R, 7=DR
	 */
	playerDir = 0;

	// NPCs
	private npcs: {
		x: number;
		y: number;
		color: number;
		name: string;
		dir: number;
		dialogue: string[];
	}[] = [];

	// Clock
	private gameTime = 0;

	// Dialogue state
	private showDialogue = false;
	private dialogueLines: string[] = [];
	private dialogueIndex = 0;
	private dialogueNPC = "";
	private dialogueWriter: TypedTextWriter | null = null;
	private readonly DIALOGUE_SPEED = 30; // chars per second
	private dialogueChoices: string[] = [];
	private dialogueChoiceIndex = 0;
	private dialogueChoiceCallback: ((choice: number) => void) | null = null;
	private dialogueWaitingChoice = false;

	// Building interiors
	private insideBuilding: string | null = null;
	private buildingTiles: number[][] = [];
	private buildingW = 12;
	private buildingH = 9;
	private readonly BUILDING_DEFS: {
		doorTX: number;
		doorTY: number;
		name: string;
		interiorColor: number;
		items: string[];
	}[] = [
		{
			doorTX: 5,
			doorTY: 3,
			name: "Cafe",
			interiorColor: 0x3d2b1f,
			items: ["Coffee", "Espresso", "Cake"],
		},
		{
			doorTX: 12,
			doorTY: 3,
			name: "Shop",
			interiorColor: 0x2d3d2f,
			items: ["Potion", "Key", "Map"],
		},
		{
			doorTX: 22,
			doorTY: 3,
			name: "Stadium",
			interiorColor: 0x2d2d3d,
			items: ["Ticket", "Trophy"],
		},
	];

	// Map data (simple 2D array)
	private tiles: number[][] = [];

	// Day/night cycle
	private dayNightPhase = 0; // 0-1 (0=dawn, 0.25=day, 0.5=dusk, 0.75=night)
	private dayNightSpeed = 0.008; // Full cycle in ~125 seconds
	private dayNightOverlay: Graphics | null = null;

	// Parallax background layers
	private bgStars: { x: number; y: number; size: number; alpha: number }[] = [];
	private bgClouds: {
		x: number;
		y: number;
		w: number;
		h: number;
		speed: number;
		alpha: number;
	}[] = [];

	// Minimap
	private minimapSize = 120;
	private minimapScale = this.minimapSize / (MAP_W * TILE_SIZE);
	private playerTrail: { x: number; y: number }[] = [];
	private trailTimer = 0;

	// Floating notifications
	private notifications: {
		text: string;
		x: number;
		y: number;
		age: number;
		maxAge: number;
		color: number;
	}[] = [];

	// Footstep particles
	private stepTimer = 0;
	private readonly STEP_INTERVAL = 0.2;
	private stepParticles: {
		x: number;
		y: number;
		age: number;
		maxAge: number;
	}[] = [];

	// Weather system
	private weatherType: "clear" | "rain" | "snow" | "storm" = "clear";
	private weatherParticles: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		alpha: number;
	}[] = [];
	private weatherTimer = 0;
	private weatherCycleDuration = 60; // seconds between weather changes
	private lightningTimer = 0;
	private lightningAlpha = 0;
	private readonly MAX_WEATHER_PARTICLES = 200;

	// NPC wandering
	private npcWanderTimers: number[] = [];
	private npcOriginalPositions: { x: number; y: number }[] = [];

	// Player inventory
	private inventory: { name: string; count: number; icon: number }[] = [];
	private showInventory = false;

	// Equipment system
	private equipment: {
		slot: string;
		item: string | null;
		bonus: number;
		stat: string;
	}[] = [
		{ slot: "Weapon", item: null, bonus: 0, stat: "attack" },
		{ slot: "Armor", item: null, bonus: 0, stat: "defense" },
		{ slot: "Accessory", item: null, bonus: 0, stat: "speed" },
	];
	private defense = 0; // Reduces damage taken

	// Quest system
	private quests: {
		id: string;
		name: string;
		desc: string;
		goal: number;
		progress: number;
		reward: number;
		complete: boolean;
	}[] = [
		{
			id: "catch_3_fish",
			name: "Angler Apprentice",
			desc: "Catch 3 fish",
			goal: 3,
			progress: 0,
			reward: 15,
			complete: false,
		},
		{
			id: "win_5_battles",
			name: "Battle Hardened",
			desc: "Win 5 battles",
			goal: 5,
			progress: 0,
			reward: 20,
			complete: false,
		},
		{
			id: "reach_level_3",
			name: "Rising Star",
			desc: "Reach level 3",
			goal: 3,
			progress: 0,
			reward: 25,
			complete: false,
		},
		{
			id: "visit_all_areas",
			name: "World Explorer",
			desc: "Visit all 3 areas",
			goal: 3,
			progress: 0,
			reward: 30,
			complete: false,
		},
		{
			id: "open_3_chests",
			name: "Treasure Hunter",
			desc: "Open 3 treasure chests",
			goal: 3,
			progress: 0,
			reward: 20,
			complete: false,
		},
		{
			id: "earn_50_gold",
			name: "Gold Hoarder",
			desc: "Earn 50 gold total",
			goal: 50,
			progress: 0,
			reward: 25,
			complete: false,
		},
	];
	private totalGoldEarned = 0;
	private visitedAreas = new Set<string>(["town"]);
	private showQuests = false;
	private questScrollOffset = 0;

	// Shop system
	private showShop = false;
	private shopCursorPos = 0;

	// Cafe system
	private showCafe = false;
	private cafeCursorPos = 0;
	private readonly CAFE_ITEMS = [
		{
			name: "Coffee",
			price: 5,
			icon: 0x6b3a1f,
			effect: "energy",
			desc: "+Speed 30s",
		},
		{
			name: "Espresso",
			price: 8,
			icon: 0x3d1f0a,
			effect: "energy2",
			desc: "+Speed +ATK 30s",
		},
		{
			name: "Cake",
			price: 12,
			icon: 0xffccaa,
			effect: "heal",
			desc: "Full HP restore",
		},
		{
			name: "Tea",
			price: 3,
			icon: 0x44aa44,
			effect: "calm",
			desc: "-50% encounters 60s",
		},
	];
	private buffTimers: { name: string; remaining: number }[] = [];
	private readonly SHOP_ITEMS = [
		{ name: "Health Potion", price: 10, icon: 0xff4444, effect: "heal" },
		{ name: "Attack Boost", price: 25, icon: 0xff8844, effect: "attack" },
		{ name: "Max HP Up", price: 30, icon: 0x44ff44, effect: "maxhp" },
		{ name: "Lucky Charm", price: 20, icon: 0xffcc00, effect: "luck" },
		{ name: "Speed Boots", price: 15, icon: 0x4488ff, effect: "speed" },
	];

	// Encounter system
	private encounterTimer = 0;
	private encounterInterval = 20; // Average seconds between encounters
	private currentEnemy: {
		name: string;
		hp: number;
		maxHp: number;
		attack: number;
		icon: number;
	} | null = null;
	private playerHp = 100;
	private playerMaxHp = 100;
	private playerAttack = 15;
	private showCombat = false;
	private combatLog: string[] = [];
	private combatTimer = 0;
	private combatWins = 0;

	// Leveling system
	private playerLevel = 1;
	private playerXp = 0;
	private playerXpToNext = 50; // XP needed for next level

	// Achievements
	private achievements: {
		id: string;
		name: string;
		desc: string;
		unlocked: boolean;
	}[] = [
		{
			id: "first_fish",
			name: "Gone Fishing",
			desc: "Catch your first fish",
			unlocked: false,
		},
		{
			id: "first_battle",
			name: "Battle Initiate",
			desc: "Win your first battle",
			unlocked: false,
		},
		{ id: "five_fish", name: "Angler", desc: "Catch 5 fish", unlocked: false },
		{
			id: "ten_battles",
			name: "Warrior",
			desc: "Win 10 battles",
			unlocked: false,
		},
		{ id: "level_5", name: "Veteran", desc: "Reach level 5", unlocked: false },
		{
			id: "explorer",
			name: "Explorer",
			desc: "Visit all 3 buildings",
			unlocked: false,
		},
		{
			id: "treasure_hunter",
			name: "Treasure Hunter",
			desc: "Open 3 chests",
			unlocked: false,
		},
		{ id: "rich", name: "Wealthy", desc: "Have 50+ gold", unlocked: false },
	];
	private visitedBuildings = new Set<string>();
	private buildingsVisitedCount = 0;

	// Multiplayer presence
	private networkManager: NetworkManager | null = null;
	private otherPlayers: {
		id: string;
		name: string;
		x: number;
		y: number;
		color: number;
		dir: number;
	}[] = [];
	private chatMessages: { from: string; text: string; age: number }[] = [];
	private showChat = false;
	private chatInput = "";
	private isOnline = false;
	private playerCount = 0;
	private readonly ENEMY_TYPES = [
		{ name: "Slime", hp: 30, attack: 5, icon: 0x44cc44 },
		{ name: "Bat", hp: 20, attack: 8, icon: 0x8844aa },
		{ name: "Goblin", hp: 45, attack: 10, icon: 0x44aa44 },
		{ name: "Ghost", hp: 25, attack: 12, icon: 0xaaaacc },
		{ name: "Mushroom", hp: 35, attack: 6, icon: 0xcc4444 },
	];

	// Grass sway animation
	private grassSwayTime = 0;

	// Input state
	private keys: Record<string, boolean> = {};

	// Pause menu
	private isPaused = false;
	private pauseCursorPos = 0;
	private readonly pauseOptions = [
		"Resume",
		"Inventory",
		"Quests",
		"Equipment",
		"Achievements",
		"Save Game",
		"Quit to Menu",
	];

	// Celebration particles (level-up, achievement)
	private celebrationParticles: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		color: number;
		age: number;
		maxAge: number;
	}[] = [];
	private particleEmitters: ParticleEmitter[] = [];

	// Physics objects (cannonballs, etc.)
	private physicsObjects: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		radius: number;
		color: number;
		age: number;
	}[] = [];

	// Cutscene
	private cutsceneEngine: CutsceneEngine | null = null;
	private introPlayed = false;

	constructor(config: DemoWorldConfig) {
		this.width = config.width;
		this.height = config.height;
		this.eventManager = config.eventManager ?? null;
		this.onMapTransitionRequest = config.onMapTransitionRequest ?? null;

		// Wire event manager → DemoWorld dialogue display
		if (this.eventManager) {
			this.eventManager.setShowMessageCallback((text: string) => {
				this.initDialogue(text, "");
			});
		}
		this.container = new Container();
		this.mapContainer = new Container();
		this.tileBatcher = new TileBatcher(TILE_SIZE);
		this.weatherRenderer = new WeatherRenderer(this.container, this.width, this.height);
		this.entityContainer = new Container();
		this.hudContainer = new Container();

		this.container.addChild(this.mapContainer);
		this.container.addChild(this.entityContainer);
		this.container.addChild(this.hudContainer);

		// Touch controls for mobile (auto-hides on non-touch devices)
		import("../../ui/TouchControls").then(({ TouchControls }) => {
			this.touchControls = new TouchControls(config.width, config.height);
			this.container.addChild(this.touchControls!);
		});

		this.generateMap();
		this.setupInput();
		this.placeNPCs();
		this.placeChests();

		// Store NPC original positions for wandering
		for (const npc of this.npcs) {
			this.npcOriginalPositions.push({ x: npc.x, y: npc.y });
			this.npcWanderTimers.push(Math.random() * 5); // Stagger wander timing
		}

		// Start with random weather
		this.weatherType = ["clear", "rain", "snow", "storm"][
			Math.floor(Math.random() * 4)
		] as any;
		this.weatherTimer = Math.random() * this.weatherCycleDuration;

		// Starting inventory
		this.inventory = [
			{ name: "nD Console", count: 1, icon: 0x3366ff },
			{ name: "Wallet", count: 1, icon: 0x44aa44 },
			{ name: "Keys", count: 1, icon: 0xccaa00 },
		];

		// Generate procedural SFX buffers
		this.initAudio();

		// Generate parallax background elements
		for (let i = 0; i < 60; i++) {
			this.bgStars.push({
				x: Math.random() * MAP_W * TILE_SIZE,
				y: Math.random() * MAP_H * TILE_SIZE * 0.6,
				size: 0.5 + Math.random() * 1.5,
				alpha: 0.2 + Math.random() * 0.5,
			});
		}
		for (let i = 0; i < 8; i++) {
			this.bgClouds.push({
				x: Math.random() * MAP_W * TILE_SIZE,
				y: 30 + Math.random() * MAP_H * TILE_SIZE * 0.3,
				w: 60 + Math.random() * 120,
				h: 20 + Math.random() * 40,
				speed: 5 + Math.random() * 15,
				alpha: 0.05 + Math.random() * 0.1,
			});
		}

		// Try connecting to multiplayer server
		this.initNetwork();

		// Play intro cutscene (only first time)
		if (!this.introPlayed && !localStorage.getItem("bobsgame_intro_played")) {
			this.playIntroCutscene();
		}

		log.info("DemoWorld created");
	}

	// Audio

	private audioInitialized = false;

	private initAudio(): void {
		try {
			AudioUtils.init();
			// Generate procedural SFX
			const stepBuf = AudioUtils.generateTone(200, 0.05);
			if (stepBuf) AudioUtils.storeBuffer("step", stepBuf);
			const hitBuf = AudioUtils.generateTone(300, 0.1);
			if (hitBuf) AudioUtils.storeBuffer("hit", hitBuf);
			const coinBuf = AudioUtils.generateTone(800, 0.15);
			if (coinBuf) AudioUtils.storeBuffer("coin", coinBuf);
			const fishBuf = AudioUtils.generateTone(500, 0.2);
			if (fishBuf) AudioUtils.storeBuffer("fish", fishBuf);
			const chestBuf = AudioUtils.generateTone(600, 0.3);
			if (chestBuf) AudioUtils.storeBuffer("chest", chestBuf);
			const lvlBuf = AudioUtils.generateTone(1000, 0.4);
			if (lvlBuf) AudioUtils.storeBuffer("levelup", lvlBuf);
			this.audioInitialized = true;
		} catch {
			log.warn("Audio not available");
		}
	}

	private playSound(name: string, volume = 0.3): void {
		if (!this.audioInitialized) return;
		AudioUtils.playSFX(name, volume);
	}

	// Network / Multiplayer Presence

	private initNetwork(): void {
		try {
			this.networkManager = new NetworkManager();
			const wsURL =
				window.location.hostname === "localhost"
					? "http://localhost:3001"
					: "https://ws.bobsgame.com";

			this.networkManager.on("connected", () => {
				this.isOnline = true;
				log.info("Connected to multiplayer server");
				this.notifications.push({
					text: "🟢 Online!",
					x: this.playerX,
					y: this.playerY - 20,
					age: 0,
					maxAge: 2.0,
					color: 0x44ff44,
				});
			});

			this.networkManager.on("disconnected", () => {
				this.isOnline = false;
				this.otherPlayers = [];
				log.info("Disconnected from multiplayer server");
			});

			this.networkManager.on("player_joined", (data: unknown) => {
				const d = data as { name?: string };
				this.notifications.push({
					text: `${d.name || "Someone"} joined`,
					x: this.playerX,
					y: this.playerY - 20,
					age: 0,
					maxAge: 2.0,
					color: 0x44aaff,
				});
			});

			this.networkManager.on("chat", (data: unknown) => {
				const d = data as { from: string; message: string };
				this.chatMessages.push({ from: d.from, text: d.message, age: 0 });
				if (this.chatMessages.length > 50) this.chatMessages.shift();
			});

			this.networkManager.on("game_state", (data: unknown) => {
				// Update other player positions
				const d = data as {
					players?: {
						id: string;
						name: string;
						x: number;
						y: number;
						color: number;
						dir: number;
					}[];
				};
				if (d.players) {
					this.otherPlayers = d.players;
					this.playerCount = d.players.length;
				}
			});

			this.networkManager.connect(wsURL);
		} catch {
			log.warn("Network not available — offline mode");
		}
	}

	private broadcastPosition(): void {
		if (!this.networkManager || !this.isOnline) return;
		this.networkManager.sendFrame(
			JSON.stringify({
				x: this.playerX,
				y: this.playerY,
				dir: this.playerDir,
				level: this.playerLevel,
				hp: this.playerHp,
			}),
		);
	}

	private sendChatMessage(text: string): void {
		if (!this.networkManager || !this.isOnline) return;
		this.networkManager.sendChat(text);
		this.chatMessages.push({ from: "You", text, age: 0 });
	}

	// Map Generation

	private generateMap(): void {
		// Fill with grass
		for (let y = 0; y < MAP_H; y++) {
			this.tiles[y] = [];
			for (let x = 0; x < MAP_W; x++) {
				this.tiles[y][x] = Tile.GRASS;
			}
		}

		// River (horizontal, rows 8-9)
		for (let x = 0; x < MAP_W; x++) {
			this.tiles[8][x] = Tile.WATER;
			this.tiles[9][x] = Tile.WATER;
		}

		// Bridge at column 15
		this.tiles[8][15] = Tile.BRIDGE;
		this.tiles[9][15] = Tile.BRIDGE;

		// Main path (horizontal)
		for (let x = 3; x < MAP_W - 3; x++) {
			this.tiles[5][x] = Tile.PATH;
			this.tiles[6][x] = Tile.PATH;
		}

		// Path going south from bridge
		for (let y = 6; y < 8; y++) {
			this.tiles[y][15] = Tile.PATH;
		}

		// Buildings (north side)
		this.fillRect(3, 1, 5, 3, Tile.BUILDING);
		this.fillRect(3, 0, 5, 1, Tile.ROOF);
		this.tiles[3][5] = Tile.DOOR; // Cafe door

		this.fillRect(10, 1, 5, 3, Tile.BUILDING);
		this.fillRect(10, 0, 5, 1, Tile.ROOF);
		this.tiles[3][12] = Tile.DOOR; // Shop door

		this.fillRect(20, 1, 5, 3, Tile.BUILDING);
		this.fillRect(20, 0, 5, 1, Tile.ROOF);
		this.tiles[3][22] = Tile.DOOR; // Stadium door

		// Trees scattered
		const treePositions = [
			[0, 0],
			[1, 6],
			[2, 12],
			[0, 15],
			[1, 20],
			[0, 25],
			[11, 4],
			[11, 8],
			[11, 12],
			[MAP_H - 1, 2],
			[MAP_H - 1, 8],
			[MAP_H - 1, 14],
			[MAP_H - 2, 5],
			[MAP_H - 2, 18],
			[MAP_H - 1, 22],
			[MAP_H - 1, 26],
			[MAP_H - 2, 28],
		];
		for (const [ty, tx] of treePositions) {
			if (ty < MAP_H && tx < MAP_W && this.tiles[ty][tx] === Tile.GRASS) {
				this.tiles[ty][tx] = Tile.TREE;
			}
		}

		// Flowers
		const flowerPositions = [
			[4, 7],
			[4, 8],
			[4, 14],
			[4, 20],
			[12, 3],
			[12, 10],
			[12, 25],
		];
		for (const [fy, fx] of flowerPositions) {
			if (fy < MAP_H && fx < MAP_W && this.tiles[fy][fx] === Tile.GRASS) {
				this.tiles[fy][fx] = Tile.FLOWER;
			}
		}

		// Fence along south area
		for (let x = 2; x < MAP_W - 2; x++) {
			if (this.tiles[MAP_H - 3][x] === Tile.GRASS) {
				this.tiles[MAP_H - 3][x] = Tile.FENCE;
			}
		}

		// Sand patches near river
		for (let x = 0; x < MAP_W; x++) {
			if (this.tiles[7][x] === Tile.GRASS) this.tiles[7][x] = Tile.SAND;
			if (this.tiles[10][x] === Tile.GRASS) this.tiles[10][x] = Tile.SAND;
		}
		// Extra sand clusters
		this.fillRect(0, 6, 4, 1, Tile.SAND);
		this.fillRect(26, 6, 4, 1, Tile.SAND);
	}

	// Equipment System

	private tryEquip(itemName: string): void {
		const equipMap: Record<
			string,
			{ slot: string; bonus: number; stat: string }
		> = {
			"Attack Boost": { slot: "Weapon", bonus: 5, stat: "attack" },
			"Lucky Charm": { slot: "Accessory", bonus: 3, stat: "speed" },
			"Speed Boots": { slot: "Accessory", bonus: 5, stat: "speed" },
		};
		const eq = equipMap[itemName];
		if (!eq) return;
		const slot = this.equipment.find((e) => e.slot === eq.slot);
		if (!slot || slot.item === itemName) return;

		// Remove old bonus
		if (slot.item) {
			this.applyEquipBonus(slot.stat, -slot.bonus);
		}

		// Equip new
		slot.item = itemName;
		slot.bonus = eq.bonus;
		slot.stat = eq.stat;
		this.applyEquipBonus(eq.stat, eq.bonus);

		this.notifications.push({
			text: `Equipped ${itemName} (${eq.stat} +${eq.bonus})`,
			x: this.playerX,
			y: this.playerY - 30,
			age: 0,
			maxAge: 2.0,
			color: 0x44aaff,
		});
	}

	private applyEquipBonus(stat: string, amount: number): void {
		switch (stat) {
			case "attack":
				this.playerAttack += amount;
				break;
			case "defense":
				this.defense += amount;
				break;
			case "speed":
				this.playerSpeed += amount;
				break;
		}
	}

	// Intro Cutscene

	private playIntroCutscene(): void {
		this.introPlayed = true;
		localStorage.setItem("bobsgame_intro_played", "1");

		this.cutsceneEngine = new CutsceneEngine(this.width, this.height);
		this.cutsceneEngine.addCharacter({
			id: "player",
			name: "Hero",
			color: 0x44aaff,
			x: this.playerX,
			y: this.playerY,
			speed: 100,
			visible: true,
		});
		this.cutsceneEngine.addCharacter({
			id: "npc",
			name: "Old Man",
			color: 0xffaa44,
			x: this.playerX + 60,
			y: this.playerY - 40,
			speed: 80,
			visible: true,
		});

		this.cutsceneEngine.loadScript([
			{ type: "fade", params: { alpha: 1, speed: 0.5 } },
			{
				type: "dialogue",
				params: { speaker: "???", text: "... ... ...", color: 0x888888 },
			},
			{ type: "fade", params: { alpha: 0, speed: 0.5 } },
			{
				type: "dialogue",
				params: {
					speaker: "Old Man",
					text: "Hey! You finally woke up!",
					color: 0xffaa44,
				},
			},
			{
				type: "dialogue",
				params: {
					speaker: "Old Man",
					text: "Welcome to bob's game — the ultimate omni-engine!",
				},
			},
			{
				type: "dialogue",
				params: {
					speaker: "Old Man",
					text: "You can explore, fish, fight monsters, find treasure, and more.",
				},
			},
			{
				type: "dialogue",
				params: {
					speaker: "Old Man",
					text: "Talk to NPCs with SPACE, open inventory with I, check quests with Q.",
				},
			},
			{
				type: "dialogue",
				params: {
					speaker: "Old Man",
					text: "Press F near water to fish, and press T to throw things!",
				},
			},
			{
				type: "dialogue",
				params: {
					speaker: "Old Man",
					text: "Good luck out there, hero! The world awaits!",
				},
			},
			{ type: "shake", params: { amount: 3, duration: 0.3 } },
			{
				type: "dialogue",
				params: {
					speaker: "",
					text: "* And so your adventure begins... *",
					color: 0xaaddff,
				},
			},
			{ type: "end", params: {} },
		]);

		this.cutsceneEngine.setCallbacks({
			onPlaySFX: (name: string) => this.playSound(name, 0.3),
		});

		this.cutsceneEngine.play(() => {
			this.cutsceneEngine = null;
		});
	}

	// Save / Load

	private autoSaveTimer = 0;
	private positionBroadcastTimer = 0;
	private readonly AUTO_SAVE_INTERVAL = 30; // Auto-save every 30s

	private quickSave(): void {
		const saveData = {
			playerX: this.playerX,
			playerY: this.playerY,
			playerDir: this.playerDir,
			playerHp: this.playerHp,
			playerMaxHp: this.playerMaxHp,
			playerAttack: this.playerAttack,
			playerLevel: this.playerLevel,
			playerXp: this.playerXp,
			playerSpeed: this.playerSpeed,
			defense: this.defense,
			inventory: this.inventory,
			equipment: this.equipment,
			quests: this.quests,
			fishCaught: this.fishCaught,
			openedChests: [...this.openedChests],
			visitedAreas: [...this.visitedAreas],
			totalGoldEarned: this.totalGoldEarned,
			weatherType: this.weatherType,
			dayNightPhase: this.dayNightPhase,
			currentAreaID: this.currentAreaID,
			gameTime: this.gameTime,
			combatWins: this.combatWins,
			eventData: this.eventManager?.getSaveData(),
			timestamp: Date.now(),
		};
		localStorage.setItem("bobsgame_quicksave", JSON.stringify(saveData));
		this.notifications.push({
			text: "💾 Game Saved!",
			x: this.playerX,
			y: this.playerY - 30,
			age: 0,
			maxAge: 1.5,
			color: 0x44ff44,
		});
	}

	private quickLoad(): void {
		const raw = localStorage.getItem("bobsgame_quicksave");
		if (!raw) {
			this.notifications.push({
				text: "No save found!",
				x: this.playerX,
				y: this.playerY - 30,
				age: 0,
				maxAge: 1.5,
				color: 0xff4444,
			});
			return;
		}
		try {
			const data = JSON.parse(raw);
			this.playerX = data.playerX;
			this.playerY = data.playerY;
			this.playerDir = data.playerDir;
			this.playerHp = data.playerHp;
			this.playerMaxHp = data.playerMaxHp;
			this.playerAttack = data.playerAttack;
			this.playerLevel = data.playerLevel ?? 1;
			this.playerXp = data.playerXp ?? 0;
			this.playerSpeed = data.playerSpeed ?? 120;
			this.defense = data.defense ?? 0;
			this.inventory = data.inventory;
			this.equipment = data.equipment ?? this.equipment;
			this.quests = data.quests ?? this.quests;
			this.fishCaught = data.fishCaught;
			this.openedChests = new Set(data.openedChests);
			this.visitedAreas = new Set(data.visitedAreas ?? ["town"]);
			this.totalGoldEarned = data.totalGoldEarned ?? 0;
			this.weatherType = data.weatherType;
			this.dayNightPhase = data.dayNightPhase;
			this.gameTime = data.gameTime;
			this.currentAreaID = data.currentAreaID ?? "town";
			this.combatWins = data.combatWins ?? 0;

			// Restore event manager state (flags, skills, dialogues)
			if (data.eventData && this.eventManager) {
				this.eventManager.loadFromSave(data.eventData);
			}

			this.notifications.push({
				text: "📂 Game Loaded!",
				x: this.playerX,
				y: this.playerY - 30,
				age: 0,
				maxAge: 1.5,
				color: 0x44aaff,
			});
		} catch {
			this.notifications.push({
				text: "Save data corrupted!",
				x: this.playerX,
				y: this.playerY - 30,
				age: 0,
				maxAge: 1.5,
				color: 0xff4444,
			});
		}
	}

	private autoSaveCheck(dt: number): void {
		this.autoSaveTimer += dt;
		if (this.autoSaveTimer >= this.AUTO_SAVE_INTERVAL) {
			this.autoSaveTimer = 0;
			// Silent auto-save
			const saveData = {
				playerX: this.playerX,
				playerY: this.playerY,
				playerDir: this.playerDir,
				playerHp: this.playerHp,
				playerMaxHp: this.playerMaxHp,
				playerAttack: this.playerAttack,
				inventory: this.inventory,
				fishCaught: this.fishCaught,
				openedChests: [...this.openedChests],
				weatherType: this.weatherType,
				dayNightPhase: this.dayNightPhase,
				gameTime: this.gameTime,
				timestamp: Date.now(),
			};
			localStorage.setItem("bobsgame_autosave", JSON.stringify(saveData));
		}
	}

	// Level Up & Achievements

	// Skill points system
	private skillPoints = 0;
	private skills: Record<string, number> = {
		strength: 0,
		vitality: 0,
		agility: 0,
		luck: 0,
	};

	private checkLevelUp(): void {
		while (this.playerXp >= this.playerXpToNext) {
			this.playerXp -= this.playerXpToNext;
			this.playerLevel++;
			this.skillPoints += 2;
			this.playerXpToNext = Math.floor(this.playerXpToNext * 1.5);
			// Stat increases
			this.playerMaxHp += 10;
			this.playerHp = this.playerMaxHp;
			this.playerAttack += 3;
			this.playSound("levelup", 0.4);
			this.spawnCelebration(this.width / 2, this.height / 2, 40);
			this.notifications.push({
				text: `⬆️ Level ${this.playerLevel}! HP+10 ATK+3 (+2 Skill Points)`,
				x: this.playerX,
				y: this.playerY - 50,
				age: 0,
				maxAge: 3.0,
				color: 0xffdd44,
			});
			this.checkAchievement("level_5", this.playerLevel >= 5);
			this.updateQuestProgress("reach_level_3", this.playerLevel);
			this.triggerScreenFlash(0x44ff44, 0.3);
			this.triggerScreenShake(3, 0.2);

			// Auto-allocate skill points based on playstyle
			if (this.skillPoints > 0 && this.playerLevel % 3 === 0) {
				this.autoAllocateSkill();
			}
		}
	}

	private autoAllocateSkill(): void {
		// Prioritize strength for combat-focused, vitality otherwise
		if (this.combatWins > 3) {
			this.skills.strength++;
			this.playerAttack += 2;
		} else if (this.fishCaught > 5) {
			this.skills.luck++;
		} else {
			this.skills.vitality++;
			this.playerMaxHp += 5;
			this.playerHp = Math.min(this.playerHp + 5, this.playerMaxHp);
		}
		this.skillPoints--;
	}

	private checkAchievement(id: string, condition: boolean): void {
		if (!condition) return;
		const ach = this.achievements.find((a) => a.id === id);
		if (!ach || ach.unlocked) return;
		ach.unlocked = true;
		this.spawnCelebration(this.width / 2, this.height / 2 - 30, 25);
		this.notifications.push({
			text: `\u2b50 ${ach.name}!`,
			x: this.playerX,
			y: this.playerY - 60,
			age: 0,
			maxAge: 3.0,
			color: 0xffcc00,
		});
	}

	private updateQuestProgress(questId: string, currentProgress: number): void {
		const quest = this.quests.find((q) => q.id === questId);
		if (!quest || quest.complete) return;
		quest.progress = Math.min(quest.goal, currentProgress);
		if (quest.progress >= quest.goal && !quest.complete) {
			quest.complete = true;
			// Award gold
			const gold = this.inventory.find((i) => i.name === "Gold Coin");
			if (gold) gold.count += quest.reward;
			else
				this.inventory.push({
					name: "Gold Coin",
					count: quest.reward,
					icon: 0xffcc00,
				});
			this.totalGoldEarned += quest.reward;
			this.notifications.push({
				text: `Quest: ${quest.name}! +${quest.reward}g`,
				x: this.playerX,
				y: this.playerY - 50,
				age: 0,
				maxAge: 3.0,
				color: 0xffcc00,
			});
			this.spawnCelebration(this.width / 2, this.height / 2 - 20, 20);
			this.playSound("coin", 0.4);
		}
	}

	// Treasure Chests

	private openedChests = new Set<string>(); // 'x,y' keys
	private chestItems = new Map<string, { name: string; icon: number }>([
		["3,18", { name: "Gold Coin", icon: 0xffcc00 }],
		["26,5", { name: "Health Potion", icon: 0xff4444 }],
		["8,14", { name: "Old Map", icon: 0xb8860b }],
		["24,18", { name: "Silver Ring", icon: 0xccccee }],
		["1,12", { name: "Emerald", icon: 0x44cc44 }],
	]);

	private placeChests(): void {
		for (const [key] of this.chestItems) {
			const [x, y] = key.split(",").map(Number);
			if (y < MAP_H && x < MAP_W) {
				this.tiles[y][x] = Tile.CHEST;
			}
		}
	}

	private tryOpenChest(): void {
		const ptx = Math.floor(this.playerX / TILE_SIZE);
		const pty = Math.floor(this.playerY / TILE_SIZE);
		const key = `${ptx},${pty}`;

		if (this.tiles[pty]?.[ptx] === Tile.CHEST && !this.openedChests.has(key)) {
			this.openedChests.add(key);
			this.triggerScreenFlash(0xffff00, 0.2);
			this.triggerScreenShake(2, 0.15);
			this.checkAchievement("treasure_hunter", this.openedChests.size >= 3);
			this.updateQuestProgress("open_3_chests", this.openedChests.size);
			const item = this.chestItems.get(key);
			if (item) {
				const existing = this.inventory.find((i) => i.name === item.name);
				if (existing) {
					existing.count++;
				} else {
					this.inventory.push({ name: item.name, count: 1, icon: item.icon });
				}
				this.notifications.push({
					text: `Found: ${item.name}!`,
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 2.0,
					color: 0xffcc44,
				});
				this.playSound("chest", 0.4);
			}
		}
	}

	// Area Transitions

	private generateMountainArea(): void {
		// Fill with rocky terrain (reuse GRASS for base, trees for rocks)
		for (let y = 0; y < MAP_H; y++) {
			for (let x = 0; x < MAP_W; x++) {
				this.tiles[y][x] = Tile.GRASS;
			}
		}

		// Mountain paths (winding)
		const pathPoints = [
			[MAP_H - 1, 15],
			[MAP_H - 2, 15],
			[MAP_H - 3, 14],
			[MAP_H - 4, 14],
			[MAP_H - 5, 13],
			[MAP_H - 6, 13],
			[MAP_H - 7, 12],
			[MAP_H - 8, 12],
			[MAP_H - 9, 11],
			[MAP_H - 10, 11],
			[MAP_H - 11, 10],
			[MAP_H - 12, 10],
			[MAP_H - 13, 9],
			[MAP_H - 14, 9],
			[MAP_H - 15, 8],
			[MAP_H - 16, 8],
			[MAP_H - 17, 7],
			[MAP_H - 18, 7],
			[MAP_H - 19, 6],
			[MAP_H - 20, 6],
			[MAP_H - 21, 5],
		];
		for (const [py, px] of pathPoints) {
			if (py >= 0 && py < MAP_H && px >= 0 && px < MAP_W) {
				this.tiles[py][px] = Tile.PATH;
				// Widen path
				if (px + 1 < MAP_W) this.tiles[py][px + 1] = Tile.PATH;
			}
		}

		// Scattered rocks (trees = rocks in this area)
		for (let i = 0; i < 40; i++) {
			const rx = Math.floor(Math.random() * MAP_W);
			const ry = Math.floor(Math.random() * MAP_H);
			if (this.tiles[ry][rx] === Tile.GRASS) {
				this.tiles[ry][rx] = Tile.TREE;
			}
		}

		// Snow patches at top
		for (let x = 0; x < MAP_W; x++) {
			if (this.tiles[0][x] === Tile.GRASS) this.tiles[0][x] = Tile.SAND;
			if (this.tiles[1][x] === Tile.GRASS) this.tiles[1][x] = Tile.SAND;
			if (this.tiles[2][x] === Tile.GRASS && Math.random() > 0.5)
				this.tiles[2][x] = Tile.SAND;
		}

		// Treasure chest at the peak
		this.tiles[4][6] = Tile.CHEST;

		// Flowers
		for (let i = 0; i < 8; i++) {
			const fx = Math.floor(Math.random() * MAP_W);
			const fy = Math.floor(Math.random() * MAP_H);
			if (this.tiles[fy][fx] === Tile.GRASS) this.tiles[fy][fx] = Tile.FLOWER;
		}
	}

	private generateBeachArea(): void {
		// Beach — sand + water + palm trees
		for (let y = 0; y < MAP_H; y++) {
			for (let x = 0; x < MAP_W; x++) {
				// Southern half is ocean
				if (y >= MAP_H - 5) {
					this.tiles[y][x] = Tile.WATER;
				} else if (y >= MAP_H - 8) {
					this.tiles[y][x] = Tile.SAND;
				} else {
					this.tiles[y][x] = Tile.GRASS;
				}
			}
		}

		// Boardwalk (path along the beach)
		for (let x = 2; x < MAP_W - 2; x++) {
			this.tiles[MAP_H - 9][x] = Tile.PATH;
		}

		// Pier extending into water
		for (let y = MAP_H - 8; y < MAP_H; y++) {
			this.tiles[y][10] = Tile.BRIDGE;
			this.tiles[y][11] = Tile.BRIDGE;
		}

		// Palm trees (trees on sand near beach)
		const palmPositions = [
			[MAP_H - 10, 3],
			[MAP_H - 10, 8],
			[MAP_H - 10, 16],
			[MAP_H - 10, 22],
			[MAP_H - 10, 27],
			[MAP_H - 11, 5],
			[MAP_H - 11, 20],
		];
		for (const [py, px] of palmPositions) {
			if (py >= 0 && py < MAP_H && px < MAP_W) {
				this.tiles[py][px] = Tile.TREE;
			}
		}

		// Beach hut
		this.fillRect(18, 3, 5, 3, Tile.BUILDING);
		this.fillRect(18, 2, 5, 1, Tile.ROOF);
		this.tiles[5][20] = Tile.DOOR;

		// Flowers (tropical)
		for (let i = 0; i < 10; i++) {
			const fx = Math.floor(Math.random() * MAP_W);
			const fy = Math.floor(Math.random() * (MAP_H - 10));
			if (this.tiles[fy][fx] === Tile.GRASS) this.tiles[fy][fx] = Tile.FLOWER;
		}

		// Treasure chest buried in sand
		this.tiles[MAP_H - 8][25] = Tile.CHEST;
	}

	private transitionToArea(areaID: "town" | "mountains" | "beach"): void {
		this.currentAreaID = areaID;
		this.visitedAreas.add(areaID);
		this.updateQuestProgress("visit_all_areas", this.visitedAreas.size);
		this.playerTrail = []; // Clear trail on area change
		this.openedChests = new Set(); // Reset chests per area

		switch (areaID) {
			case "town":
				this.currentMapName = "TOWNYUU Downstairs";
				this.generateMap();
				this.placeChests();
				this.playerX = 15 * TILE_SIZE;
				this.playerY = 1 * TILE_SIZE; // Enter from north
				break;
			case "mountains":
				this.currentMapName = "North Mountains";
				this.generateMountainArea();
				this.playerX = 15 * TILE_SIZE;
				this.playerY = (MAP_H - 2) * TILE_SIZE; // Enter from south
				break;
			case "beach":
				this.currentMapName = "South Beach";
				this.generateBeachArea();
				this.playerX = 15 * TILE_SIZE;
				this.playerY = 1 * TILE_SIZE; // Enter from north
				break;
		}

		this.notifications.push({
			text: `Entered: ${this.currentMapName}`,
			x: this.playerX,
			y: this.playerY - 30,
			age: 0,
			maxAge: 2.0,
			color: 0x88aaff,
		});

		// Audio crossfade on area change
		try {
			AudioUtils.fadeSFX(0.1, 0.5);
			setTimeout(() => AudioUtils.fadeSFX(0.3, 0.5), 600);
		} catch {
			/* audio not available */
		}
	}

	private fillRect(
		x: number,
		y: number,
		w: number,
		h: number,
		tile: number,
	): void {
		for (let dy = 0; dy < h; dy++) {
			for (let dx = 0; dx < w; dx++) {
				if (y + dy < MAP_H && x + dx < MAP_W) {
					this.tiles[y + dy][x + dx] = tile;
				}
			}
		}
	}

	// Map Data Loading (bridge from MapLoader/MapManager)

	/**
	 * MapTile enum values from MapLoader → DemoWorld Tile color enum.
	 * This bridges the procedural map data pipeline into the existing
	 * DemoWorld rendering system without refactoring the render loop.
	 */
	private static readonly MAP_TILE_COLORS: Record<number, number> = {
		0: Tile.GRASS, // EMPTY → grass
		1: Tile.GRASS, // GRASS
		2: Tile.PATH, // PATH
		3: Tile.BUILDING, // WALL
		4: Tile.WATER, // WATER
		5: Tile.TREE, // TREE
		6: Tile.DOOR, // DOOR
		7: 0x665544, // FLOOR
		8: Tile.ROOF, // ROOF
		9: Tile.SAND, // SAND
		10: Tile.FLOWER, // FLOWER
		11: Tile.BRIDGE, // BRIDGE
		12: 0x888899, // STONE
		13: Tile.CHEST, // CHEST
		14: 0x997744, // SIGN
		15: 0x554466, // STAIRS_DOWN
		16: 0x665577, // STAIRS_UP
	};

	/**
	 * Load tile data from a MapData object (from MapManager/MapLoader).
	 * Replaces the procedural DemoWorld map with server/loaded map data.
	 * Resizes the tile grid to match the map dimensions.
	 */
	loadFromMapData(mapData: {
		name?: string;
		width: number;
		height: number;
		tiles: number[][];
		defaultSpawnX?: number;
		defaultSpawnY?: number;
		doors?: Array<Record<string, unknown>>;
		warps?: Array<Record<string, unknown>>;
	}, options?: { spawnX?: number; spawnY?: number }): void {
		const mapW = Math.min(mapData.width, 200); // Safety cap
		const mapH = Math.min(mapData.height, 200);

		this.tiles = [];
		for (let y = 0; y < mapH; y++) {
			this.tiles[y] = [];
			for (let x = 0; x < mapW; x++) {
				const mapTileId = mapData.tiles[y]?.[x] ?? 0;
				this.tiles[y][x] = DemoWorld.MAP_TILE_COLORS[mapTileId] ?? Tile.GRASS;
			}
		}

		(this as any)._mapW = mapW;
		(this as any)._mapH = mapH;
		this.usingLoadedMapData = true;
		this.loadedMapDoors = (mapData.doors ?? []).map((door) => ({
			name: String(door.name ?? door.id ?? 'door'),
			x: Number(door.x ?? 0),
			y: Number(door.y ?? 0),
			destinationMapName: String(door.destinationMapName ?? ''),
			destinationX: Number(door.destinationX ?? 0),
			destinationY: Number(door.destinationY ?? 0),
		})).filter((door) => door.destinationMapName.length > 0);
		this.loadedMapWarps = (mapData.warps ?? []).map((warp) => ({
			name: String(warp.name ?? warp.id ?? 'warp'),
			comment: typeof warp.comment === 'string' ? warp.comment : undefined,
			x: Number(warp.x ?? 0),
			y: Number(warp.y ?? 0),
			width: Math.max(1, Number(warp.width ?? 1)),
			height: Math.max(1, Number(warp.height ?? 1)),
			destinationMapName: String(warp.destinationMapName ?? ''),
			destinationX: Number(warp.destinationX ?? 0),
			destinationY: Number(warp.destinationY ?? 0),
		})).filter((warp) => warp.destinationMapName.length > 0);
		this.currentMapName = mapData.name ?? this.currentMapName;
		this.mapEntered = false;
		this.loadedMapTransitionCooldown = 0.35;
		this.lastTileX = -1;
		this.lastTileY = -1;
		this.insideBuilding = null;
		this.npcs = [];
		this.npcOriginalPositions = [];
		this.npcWanderTimers = [];
		this.playerTrail = [];

		const spawnX = options?.spawnX ?? mapData.defaultSpawnX;
		const spawnY = options?.spawnY ?? mapData.defaultSpawnY;
		if (Number.isFinite(spawnX) && Number.isFinite(spawnY)) {
			this.playerX = Number(spawnX) * TILE_SIZE;
			this.playerY = Number(spawnY) * TILE_SIZE;
		}

		log.info(`Loaded map data: ${this.currentMapName} (${mapW}x${mapH} tiles, doors=${this.loadedMapDoors.length}, warps=${this.loadedMapWarps.length})`);
	}

	private tryUseLoadedMapDoor(): boolean {
		if (!this.usingLoadedMapData || !this.onMapTransitionRequest || this.loadedMapTransitionCooldown > 0) return false;

		const playerTileX = Math.floor(this.playerX / TILE_SIZE);
		const playerTileY = Math.floor(this.playerY / TILE_SIZE);
		const door = this.loadedMapDoors.find((entry) => entry.x === playerTileX && entry.y === playerTileY);
		if (!door) return false;

		// Play door sound
		if (AudioManager.isLoaded("menu_select")) {
			AudioManager.playSound("menu_select", { volume: 0.2, pitch: 0.8 });
		}

		this.notifications.push({
			text: `Entering ${door.destinationMapName}...`,
			x: this.playerX,
			y: this.playerY - 20,
			age: 0,
			maxAge: 1.0,
			color: 0xffaa44,
		});
		this.loadedMapTransitionCooldown = 0.35;
		this.onMapTransitionRequest(door.destinationMapName, door.destinationX, door.destinationY);
		return true;
	}

	private checkLoadedMapWarpTransition(): void {
		if (!this.usingLoadedMapData || !this.onMapTransitionRequest || this.loadedMapTransitionCooldown > 0) return;

		const playerTileX = Math.floor(this.playerX / TILE_SIZE);
		const playerTileY = Math.floor(this.playerY / TILE_SIZE);
		const warp = this.loadedMapWarps.find((entry) => (
			playerTileX >= entry.x &&
			playerTileX < entry.x + entry.width &&
			playerTileY >= entry.y &&
			playerTileY < entry.y + entry.height
		));
		if (!warp) return;

		this.notifications.push({
			text: `Transition: ${warp.destinationMapName}`,
			x: this.playerX,
			y: this.playerY - 20,
			age: 0,
			maxAge: 1.0,
			color: 0x88aaff,
		});
		this.loadedMapTransitionCooldown = 0.35;
		this.onMapTransitionRequest(warp.destinationMapName, warp.destinationX, warp.destinationY);
	}

	/** Get the dynamic map width (may differ from const MAP_W after loadFromMapData) */
	getMapWidth(): number {
		return (this as any)._mapW ?? MAP_W;
	}
	/** Get the dynamic map height (may differ from const MAP_H after loadFromMapData) */
	getMapHeight(): number {
		return (this as any)._mapH ?? MAP_H;
	}

	// NPCs

	private placeNPCs(): void {
		this.npcs = [
			{
				x: 6 * TILE_SIZE,
				y: 5 * TILE_SIZE,
				color: 0xff6644,
				name: "Barista",
				dir: 0,
				dialogue: [
					"Welcome to the Cafe!",
					"We have the best coffee in town.",
					"Have you tried the nD yet? Press ENTER to open it!",
				],
			},
			{
				x: 13 * TILE_SIZE,
				y: 5 * TILE_SIZE,
				color: 0x44aaff,
				name: "Shopkeep",
				dir: 0,
				dialogue: [
					"Welcome to my shop!",
					"I sell all kinds of items for your adventure.",
					"The puzzle tournament starts soon at the Stadium!",
				],
			},
			{
				x: 15 * TILE_SIZE,
				y: 7 * TILE_SIZE,
				color: 0x44ff88,
				name: "Fisherman",
				dir: 0,
				dialogue: [
					"I've been fishing here all day...",
					"The fish aren't biting, but the view is nice.",
					"Did you know this river flows all the way to the ocean?",
				],
			},
			{
				x: 22 * TILE_SIZE,
				y: 5 * TILE_SIZE,
				color: 0xffaa44,
				name: "Coach",
				dir: 0,
				dialogue: [
					"The Stadium is closed for renovations.",
					"But you can still play on your nD!",
					"Press ENTER to open it and start playing!",
				],
			},
			{
				x: 15 * TILE_SIZE,
				y: 15 * TILE_SIZE,
				color: 0xff44aa,
				name: "Villager",
				dir: 3,
				dialogue: [
					"Nice day for a walk, isn't it?",
					"I heard there's a new puzzle game type coming soon.",
				],
			},
			{
				x: 8 * TILE_SIZE,
				y: 18 * TILE_SIZE,
				color: 0xaa44ff,
				name: "Gamer",
				dir: 2,
				dialogue: [
					"I'm practicing my speedrun strats!",
					"My best time on Master difficulty is 2:34.",
					"You should try the online multiplayer — it's intense!",
				],
			},
		];
	}

	// Input

	private setupInput(): void {
		window.addEventListener("keydown", (e) => {
			this.keys[e.key] = true;
		});
		window.addEventListener("keyup", (e) => {
			this.keys[e.key] = false;
		});
	}

	// Update

	update(dt: number): void {
		this.gameTime += dt;
		if (this.loadedMapTransitionCooldown > 0) {
			this.loadedMapTransitionCooldown = Math.max(0, this.loadedMapTransitionCooldown - dt);
		}

		// Weather cycling — changes based on game time
		if (this.weatherRenderer && !this.insideBuilding) {
			const hour = Math.floor((this.gameTime / 4) % 24);
			let targetWeather: WeatherType = "clear";
			if (hour >= 6 && hour < 10) targetWeather = "fog";
			else if (hour >= 14 && hour < 17) targetWeather = "rain";
			else if (hour >= 22 || hour < 4) targetWeather = "snow";

			if (targetWeather !== this.currentWeather) {
				this.currentWeather = targetWeather;
				this.weatherRenderer.setWeather(targetWeather, 0.6);
			}
			this.weatherRenderer.update(dt);
		} else if (this.weatherRenderer) {
			if (this.currentWeather !== "clear") {
				this.currentWeather = "clear";
				this.weatherRenderer.setWeather("clear");
			}
		}

		// Fire OnMapEnter event once on first update
		if (!this.mapEntered && this.eventManager) {
			this.mapEntered = true;
			this.eventManager.triggerEvents(EventTrigger.ENTER_AREA);
		}

		// Fire OnTileStep when player moves to a new tile
		if (this.eventManager) {
			const tileX = Math.floor(this.playerX / TILE_SIZE);
			const tileY = Math.floor(this.playerY / TILE_SIZE);
			if (tileX !== this.lastTileX || tileY !== this.lastTileY) {
				if (this.lastTileX >= 0) {
					this.eventManager.triggerEvents(EventTrigger.TOUCH);
				}
				this.lastTileX = tileX;
				this.lastTileY = tileY;
			}
		}

		// Cutscene takes priority over everything
		if (this.cutsceneEngine?.active) {
			this.cutsceneEngine.update(dt);
			return;
		}

		// If dialogue is showing, only handle dialogue input
		if (this.showDialogue) {
			this.dialogueTimer += dt;

			// Advance text
			if (this.dialogueIndex < this.dialogueLines.length) {
				const line = this.dialogueLines[this.dialogueIndex];
				const prevIndex = this.dialogueCharIndex;
				this.dialogueCharIndex = Math.min(
					line.length,
					Math.floor(this.dialogueTimer * this.DIALOGUE_SPEED),
				);

				// Play 'blah' sound when new characters appear
				if (this.dialogueCharIndex > prevIndex) {
					if (AudioManager.isLoaded("piece_move")) {
						// Randomize pitch slightly to simulate the 14 different "blah" sounds
						// Note: We use the 'pitch' option which AudioManager supports
						AudioManager.playSound("piece_move", { volume: 0.1, pitch: 0.8 + Math.random() * 0.4 });
					}
				}
			}

			// Choice navigation
			if (this.dialogueWaitingChoice && this.dialogueChoices.length > 0) {
				if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"]) {
					this.keys["ArrowUp"] = false;
					this.keys["w"] = false;
					this.keys["W"] = false;
					this.dialogueChoiceIndex = Math.max(0, this.dialogueChoiceIndex - 1);
				}
				if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"]) {
					this.keys["ArrowDown"] = false;
					this.keys["s"] = false;
					this.keys["S"] = false;
					this.dialogueChoiceIndex = Math.min(
						this.dialogueChoices.length - 1,
						this.dialogueChoiceIndex + 1,
					);
				}
				if (this.keys[" "] || this.keys["Enter"]) {
					this.keys[" "] = false;
					this.keys["Enter"] = false;
					const choice = this.dialogueChoiceIndex;
					this.dialogueWaitingChoice = false;
					this.dialogueChoices = [];
					this.dialogueChoiceIndex = 0;
					if (this.dialogueChoiceCallback) {
						this.dialogueChoiceCallback(choice);
						this.dialogueChoiceCallback = null;
					}
				}
				return;
			}

			// Space/Enter advances dialogue
			if (this.keys[" "] || this.keys["Enter"]) {
				this.keys[" "] = false;
				this.keys["Enter"] = false;

				if (this.dialogueWriter && !this.dialogueWriter.isComplete()) {
					// Show full line immediately
					this.dialogueWriter.skip();
				} else {
					// Next line or close
					this.dialogueIndex++;
					if (this.dialogueIndex >= this.dialogueLines.length) {
						if (this.dialogueChoices.length > 0) {
							this.dialogueWaitingChoice = true;
							this.dialogueWriter = null;
						} else {
							this.showDialogue = false;
							this.dialogueWriter = null;
						}
					} else {
						this.createDialogueWriter();
					}
				}
			}
			return;
		}

		// Space advances cutscene
		if (this.cutsceneEngine?.active) {
			if (this.keys[" "] || this.keys["Enter"]) {
				this.keys[" "] = false;
				this.keys["Enter"] = false;
				this.cutsceneEngine.advance();
			}
			return;
		}

		// Escape key — pause menu
		if (this.keys["Escape"]) {
			this.keys["Escape"] = false;
			this.isPaused = !this.isPaused;
			this.pauseCursorPos = 0;
		}

		// Quick-access scene keys (only when not paused/dialogue/cutscene)
		if (!this.isPaused && !this.showDialogue && !this.showCutscene) {
			if (this.keys["i"] || this.keys["I"]) {
				this.keys["i"] = false;
				this.keys["I"] = false;
				this.openScene("InventoryScene");
			}
			if (this.keys["q"] || this.keys["Q"]) {
				this.keys["q"] = false;
				this.keys["Q"] = false;
				this.openScene("QuestLogScene");
			}
			if (this.keys["k"] || this.keys["K"]) {
				this.keys["k"] = false;
				this.keys["K"] = false;
				this.openScene("SkillTreeScene");
			}
			if (this.keys["p"] || this.keys["P"]) {
				this.keys["p"] = false;
				this.keys["P"] = false;
				this.openScene("PartyScene");
			}
		}

		// If paused, only handle pause menu input
		if (this.isPaused) {
			if (this.keys["ArrowUp"] || this.keys["w"]) {
				this.keys["ArrowUp"] = false;
				this.keys["w"] = false;
				this.pauseCursorPos = Math.max(0, this.pauseCursorPos - 1);
			}
			if (this.keys["ArrowDown"] || this.keys["s"]) {
				this.keys["ArrowDown"] = false;
				this.keys["s"] = false;
				this.pauseCursorPos = Math.min(
					this.pauseOptions.length - 1,
					this.pauseCursorPos + 1,
				);
			}
			if (this.keys[" "] || this.keys["Enter"]) {
				this.keys[" "] = false;
				this.keys["Enter"] = false;
				this.handlePauseOption();
			}
			return;
		}

		// Shop navigation (inside Shop building)
		if (this.showShop) {
			if (this.keys["ArrowUp"] || this.keys["w"]) {
				this.keys["ArrowUp"] = false;
				this.keys["w"] = false;
				this.shopCursorPos = Math.max(0, this.shopCursorPos - 1);
			}
			if (this.keys["ArrowDown"] || this.keys["s"]) {
				this.keys["ArrowDown"] = false;
				this.keys["s"] = false;
				this.shopCursorPos = Math.min(
					this.SHOP_ITEMS.length,
					this.shopCursorPos + 1,
				);
			}
			return;
		}

		// Cafe navigation
		if (this.showCafe) {
			if (this.keys["ArrowUp"] || this.keys["w"]) {
				this.keys["ArrowUp"] = false;
				this.keys["w"] = false;
				this.cafeCursorPos = Math.max(0, this.cafeCursorPos - 1);
			}
			if (this.keys["ArrowDown"] || this.keys["s"]) {
				this.keys["ArrowDown"] = false;
				this.keys["s"] = false;
				this.cafeCursorPos = Math.min(
					this.CAFE_ITEMS.length,
					this.cafeCursorPos + 1,
				);
			}
			return;
		}

		// Player movement (disabled inside buildings)
		if (this.insideBuilding) return;
		let dx = 0,
			dy = 0;
		if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"]) dy = -1;
		if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"]) dy = 1;
		if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) dx = -1;
		if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) dx = 1;

		// Gamepad input (left stick + D-pad)
		const gamepads = navigator.getGamepads();
		const gp = gamepads[0];
		if (gp) {
			const deadzone = 0.25;
			const lx = Math.abs(gp.axes[0] ?? 0) > deadzone ? gp.axes[0]! : 0;
			const ly = Math.abs(gp.axes[1] ?? 0) > deadzone ? gp.axes[1]! : 0;
			if (lx !== 0) dx = Math.sign(lx);
			if (ly !== 0) dy = Math.sign(ly);
			// D-pad
			if (gp.buttons[12]?.pressed) dy = -1;
			if (gp.buttons[13]?.pressed) dy = 1;
			if (gp.buttons[14]?.pressed) dx = -1;
			if (gp.buttons[15]?.pressed) dx = 1;
			// A button = interact/confirm
			if (gp.buttons[0]?.pressed) this.keys[" "] = true;
			// B button = cancel/back
			if (gp.buttons[1]?.pressed) this.keys["Escape"] = true;
		}

		// Update player direction (8-way)
		if (dx !== 0 || dy !== 0) {
			if (dx === 0 && dy > 0) this.playerDir = 0; // Down
			else if (dx < 0 && dy > 0) this.playerDir = 1; // Down-Left
			else if (dx < 0 && dy === 0) this.playerDir = 2; // Left
			else if (dx < 0 && dy < 0) this.playerDir = 3; // Up-Left
			else if (dx === 0 && dy < 0) this.playerDir = 4; // Up
			else if (dx > 0 && dy < 0) this.playerDir = 5; // Up-Right
			else if (dx > 0 && dy === 0) this.playerDir = 6; // Right
			else if (dx > 0 && dy > 0) this.playerDir = 7; // Down-Right
		}

		// Space / E to interact
		if (this.keys[" "] || this.keys["e"] || this.keys["E"]) {
			this.keys[" "] = false;
			this.keys["e"] = false;
			this.keys["E"] = false;

			if (this.insideBuilding) {
				if (this.showShop) {
					this.buyShopItem();
				} else if (this.showCafe) {
					this.buyCafeItem();
				} else if (this.insideBuilding === "Shop") {
					this.showShop = true;
					this.shopCursorPos = 0;
				} else if (this.insideBuilding === "Cafe") {
					this.showCafe = true;
					this.cafeCursorPos = 0;
				} else {
					this.insideBuilding = null;
					this.notifications.push({
						text: "Left building",
						x: this.playerX,
						y: this.playerY - 20,
						age: 0,
						maxAge: 1.0,
						color: 0x88aaff,
					});
				}
			} else {
				// Try NPC interaction first, then legacy loaded-map doors, then fallback demo buildings
				if (!this.tryInteractNPC() && !this.tryUseLoadedMapDoor()) {
					this.tryEnterBuilding();
				}
			}
		}

		// I key toggles inventory
		if (this.keys["i"] || this.keys["I"]) {
			this.keys["i"] = false;
			this.keys["I"] = false;
			this.showInventory = !this.showInventory;
		}

		// Q key toggles quest log
		if (this.keys["q"] || this.keys["Q"]) {
			this.keys["q"] = false;
			this.keys["Q"] = false;
			this.showQuests = !this.showQuests;
			this.questScrollOffset = 0;
		}

		// T key — throw physics object in facing direction
		if (this.keys["t"] || this.keys["T"]) {
			this.keys["t"] = false;
			this.keys["T"] = false;
			const dirX = [1, 0.707, 0, -0.707, -1, -0.707, 0, 0.707][this.playerDir];
			const dirY = [0, 0.707, 1, 0.707, 0, -0.707, -1, -0.707][this.playerDir];
			this.physicsObjects.push({
				x: this.playerX,
				y: this.playerY,
				vx: dirX * 250 + (Math.random() - 0.5) * 30,
				vy: dirY * 250 - 100, // slight upward arc
				radius: 4,
				color: [0xff4444, 0x4444ff, 0x44ff44, 0xffff44, 0xff44ff][
					Math.floor(Math.random() * 5)
				],
				age: 0,
			});
			this.triggerScreenShake(1, 0.05);
			this.playSound("hit", 0.2);
		}

		// F5 key — quick save
		if (this.keys["F5"]) {
			this.keys["F5"] = false;
			this.quickSave();
		}
		// F9 key — quick load
		if (this.keys["F9"]) {
			this.keys["F9"] = false;
			this.quickLoad();
		}

		// F key — fish near water
		if (this.keys["f"] || this.keys["F"]) {
			this.keys["f"] = false;
			this.keys["F"] = false;
			this.tryFish();
		}

		// Normalize diagonal
		if (dx !== 0 && dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy);
			dx /= len;
			dy /= len;
		}

		const mapW = this.getMapWidth();
		const mapH = this.getMapHeight();
		const newX = this.playerX + dx * this.playerSpeed * dt;
		const newY = this.playerY + dy * this.playerSpeed * dt;

		// Collision check (can't walk on water, trees, buildings, fences)
		const tileX = Math.floor(newX / TILE_SIZE);
		const tileY = Math.floor(newY / TILE_SIZE);
		if (tileX >= 0 && tileX < mapW && tileY >= 0 && tileY < mapH) {
			const tile = this.tiles[tileY][tileX];
			if (
				tile !== Tile.WATER &&
				tile !== Tile.TREE &&
				tile !== Tile.BUILDING &&
				tile !== Tile.ROOF &&
				tile !== Tile.FENCE
			) {
				this.playerX = Math.max(0, Math.min((mapW - 1) * TILE_SIZE, newX));
				this.playerY = Math.max(0, Math.min((mapH - 1) * TILE_SIZE, newY));
				if (tile === Tile.CHEST) this.tryOpenChest();
			}
		}

		if (this.usingLoadedMapData) {
			if (this.playerX <= 0 && dx < 0) this.playerX = 1;
			if (this.playerX >= (mapW - 1) * TILE_SIZE && dx > 0) {
				this.playerX = (mapW - 1) * TILE_SIZE - 1;
			}
			if (this.playerY <= 0 && dy < 0) this.playerY = 1;
			if (this.playerY >= (mapH - 1) * TILE_SIZE && dy > 0) {
				this.playerY = (mapH - 1) * TILE_SIZE - 1;
			}
			this.checkLoadedMapWarpTransition();
		} else {
			// Edge-of-map detection — area transition
			if (this.playerX <= 0 && dx < 0) {
				this.notifications.push({
					text: "← West Field (coming soon)",
					x: this.playerX,
					y: this.playerY - 20,
					age: 0,
					maxAge: 1.5,
					color: 0x88aaff,
				});
				this.playerX = 1;
			} else if (this.playerX >= (mapW - 1) * TILE_SIZE && dx > 0) {
				this.notifications.push({
					text: "East Forest → (coming soon)",
					x: this.playerX,
					y: this.playerY - 20,
					age: 0,
					maxAge: 1.5,
					color: 0x88aaff,
				});
				this.playerX = (mapW - 1) * TILE_SIZE - 1;
			}
			if (this.playerY <= 0 && dy < 0) {
				if (this.currentAreaID === "town") {
					this.transitionToArea("mountains");
				} else if (this.currentAreaID === "beach") {
					this.transitionToArea("town");
				} else {
					this.notifications.push({
						text: "\u2191 Nothing beyond...",
						x: this.playerX,
						y: this.playerY - 20,
						age: 0,
						maxAge: 1.5,
						color: 0x88aaff,
					});
					this.playerY = 1;
				}
			} else if (this.playerY >= (mapH - 1) * TILE_SIZE && dy > 0) {
				if (this.currentAreaID === "mountains") {
					this.transitionToArea("town");
				} else if (this.currentAreaID === "town") {
					this.transitionToArea("beach");
				} else {
					this.notifications.push({
						text: "Nothing beyond...",
						x: this.playerX,
						y: this.playerY - 20,
						age: 0,
						maxAge: 1.5,
						color: 0x88aaff,
					});
					this.playerY = (mapH - 1) * TILE_SIZE - 1;
				}
			}
		}

		// Footstep particles when moving
		if (dx !== 0 || dy !== 0) {
			this.stepTimer += dt;
			if (this.stepTimer >= this.STEP_INTERVAL) {
				this.stepTimer = 0;
				this.stepParticles.push({
					x: this.playerX + TILE_SIZE / 2 + (Math.random() - 0.5) * 6,
					y: this.playerY + TILE_SIZE - 2,
					age: 0,
					maxAge: 0.4,
				});

				// Play footstep sound
				if (AudioManager.isLoaded("piece_move")) {
					AudioManager.playSound("piece_move", {
						volume: 0.03,
						pitch: 0.5 + Math.random() * 0.2,
					});
				}
			}
		} else {
			this.stepTimer = this.STEP_INTERVAL; // Ready to emit on next step
		}

		// Day/night cycle
		this.dayNightPhase = (this.dayNightPhase + dt * this.dayNightSpeed) % 1.0;

		// Fishing
		this.updateFishing(dt);

		// Random encounters (only when walking on grass, not inside buildings)
		if ((!this.insideBuilding && dx !== 0) || dy !== 0) {
			const ptx = Math.floor(this.playerX / TILE_SIZE);
			const pty = Math.floor(this.playerY / TILE_SIZE);
			const mapW = this.getMapWidth();
			const mapH = this.getMapHeight();
			if (
				ptx >= 0 &&
				ptx < mapW &&
				pty >= 0 &&
				pty < mapH &&
				this.tiles[pty][ptx] === Tile.GRASS
			) {
				this.encounterTimer += dt;
				if (
					this.encounterTimer >
					this.encounterInterval * (0.5 + Math.random())
				) {
					this.encounterTimer = 0;
					this.startEncounter();
				}
			}
		}

		// Combat auto-attack
		if (this.showCombat && this.currentEnemy) {
			this.combatTimer += dt;
			if (this.combatTimer > 0.8) {
				this.combatTimer = 0;
				this.combatStep();
			}
		}

		// Grass sway
		this.grassSwayTime += dt;

		// Drift parallax clouds
		for (const cloud of this.bgClouds) {
			cloud.x += cloud.speed * dt;
			if (cloud.x > MAP_W * TILE_SIZE + cloud.w) {
				cloud.x = -cloud.w;
				cloud.y = 30 + Math.random() * MAP_H * TILE_SIZE * 0.3;
			}
		}

		// Screen effects
		this.updateScreenEffects(dt);

		// Record player trail for minimap
		this.trailTimer += dt;
		if (this.trailTimer > 0.5) {
			this.trailTimer = 0;
			this.playerTrail.push({ x: this.playerX, y: this.playerY });
			if (this.playerTrail.length > 200) this.playerTrail.shift();
		}

		// Auto-save
		this.autoSaveCheck(dt);

		// Tick buff timers
		for (let i = this.buffTimers.length - 1; i >= 0; i--) {
			this.buffTimers[i].remaining -= dt;
			if (this.buffTimers[i].remaining <= 0) {
				this.notifications.push({
					text: `${this.buffTimers[i].name} expired`,
					x: this.playerX,
					y: this.playerY - 20,
					age: 0,
					maxAge: 1.5,
					color: 0xaa6644,
				});
				// Reset buffs
				if (
					this.buffTimers[i].name.includes("Speed") ||
					this.buffTimers[i].name.includes("Espresso")
				) {
					this.playerSpeed = 120; // Reset to base
				}
				if (this.buffTimers[i].name.includes("Espresso")) {
					this.playerAttack = Math.max(15, this.playerAttack - 5);
				}
				if (this.buffTimers[i].name.includes("Calm")) {
					this.encounterInterval = 20; // Reset to base
				}
				this.buffTimers.splice(i, 1);
			}
		}

		// Broadcast position every ~0.5s
		this.positionBroadcastTimer += dt;
		if (this.positionBroadcastTimer >= 0.5) {
			this.positionBroadcastTimer = 0;
			this.broadcastPosition();
		}

		// Update chat message ages
		for (let i = this.chatMessages.length - 1; i >= 0; i--) {
			this.chatMessages[i].age += dt;
			if (this.chatMessages[i].age > 10) this.chatMessages.splice(i, 1);
		}

		// Weather cycle
		this.weatherTimer += dt;
		if (this.weatherTimer >= this.weatherCycleDuration) {
			this.weatherTimer = 0;
			const types: ("clear" | "rain" | "snow" | "storm")[] = [
				"clear",
				"rain",
				"snow",
				"storm",
			];
			this.weatherType = types[Math.floor(Math.random() * types.length)];
			this.weatherParticles = [];
		}

		// Spawn weather particles
		if (this.weatherType !== "clear") {
			const spawnRate =
				this.weatherType === "storm" ? 8 : this.weatherType === "rain" ? 4 : 2;
			for (let i = 0; i < spawnRate; i++) {
				if (this.weatherParticles.length < this.MAX_WEATHER_PARTICLES) {
					const windX =
						this.weatherType === "storm"
							? (Math.random() - 0.3) * 200
							: (Math.random() - 0.5) * 30;
					this.weatherParticles.push({
						x: Math.random() * this.width,
						y: -10,
						vx: windX,
						vy:
							this.weatherType === "snow"
								? 30 + Math.random() * 40
								: 200 + Math.random() * 100,
						size: this.weatherType === "snow" ? 2 + Math.random() * 3 : 1,
						alpha: 0.3 + Math.random() * 0.5,
					});
				}
			}
		}

		// Update weather particles
		for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
			const p = this.weatherParticles[i];
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.y > this.height + 10 || p.x < -20 || p.x > this.width + 20) {
				this.weatherParticles.splice(i, 1);
			}
		}

		// Lightning (storm only)
		if (this.weatherType === "storm") {
			this.lightningTimer += dt;
			if (this.lightningTimer > 3 + Math.random() * 5) {
				this.lightningTimer = 0;
				this.lightningAlpha = 0.8;
			}
			if (this.lightningAlpha > 0) {
				this.lightningAlpha -= dt * 4;
			}
		} else {
			this.lightningAlpha = 0;
		}

		// NPC wandering (smooth movement)
		for (let i = 0; i < this.npcs.length; i++) {
			this.npcWanderTimers[i] += dt;
			const npc = this.npcs[i];
			const orig = this.npcOriginalPositions[i];

			// Pick new wander target periodically
			if (this.npcWanderTimers[i] > 3 + Math.random() * 4) {
				this.npcWanderTimers[i] = 0;
				const wanderRange = TILE_SIZE * 2;
				const targetX = orig.x + (Math.random() - 0.5) * wanderRange;
				const targetY = orig.y + (Math.random() - 0.5) * wanderRange;
				(npc as any)._targetX = targetX;
				(npc as any)._targetY = targetY;
				(npc as any)._wandering = true;
			}

			// Smoothly walk toward target
			if ((npc as any)._wandering) {
				const speed = 30; // pixels/sec (slow walk)
				const targetX = (npc as any)._targetX ?? npc.x;
				const targetY = (npc as any)._targetY ?? npc.y;
				const ddx = targetX - npc.x;
				const ddy = targetY - npc.y;
				const dist = Math.sqrt(ddx * ddx + ddy * ddy);

				if (dist < 2) {
					(npc as any)._wandering = false;
				} else {
					const step = Math.min(speed * dt, dist);
					npc.x += (ddx / dist) * step;
					npc.y += (ddy / dist) * step;

					// Face movement direction
					if (Math.abs(ddx) > Math.abs(ddy)) {
						npc.dir = ddx > 0 ? 2 : 1; // right : left
					} else {
						npc.dir = ddy > 0 ? 0 : 3; // down : up
					}
				}
			}
		}

		// Update notifications
		for (let i = this.notifications.length - 1; i >= 0; i--) {
			this.notifications[i].age += dt;
			if (this.notifications[i].age >= this.notifications[i].maxAge) {
				this.notifications.splice(i, 1);
			}
		}

		// Update step particles
		for (let i = this.stepParticles.length - 1; i >= 0; i--) {
			this.stepParticles[i].age += dt;
			if (this.stepParticles[i].age >= this.stepParticles[i].maxAge) {
				this.stepParticles.splice(i, 1);
			}
		}

		// Update physics objects (simple projectile motion + gravity)
		for (let i = this.physicsObjects.length - 1; i >= 0; i--) {
			const obj = this.physicsObjects[i];
			obj.vy += 300 * dt; // gravity
			obj.x += obj.vx * dt;
			obj.y += obj.vy * dt;
			obj.age += dt;
			// Remove when off-screen or old
			if (obj.age > 3 || obj.y > MAP_H * TILE_SIZE + 100) {
				this.physicsObjects.splice(i, 1);
			}
		}
	}

	// NPC Interaction

	private initDialogue(lines: string | string[], npcName: string): void {
		this.showDialogue = true;
		this.dialogueLines = Array.isArray(lines) ? lines : [lines];
		this.dialogueIndex = 0;
		this.dialogueNPC = npcName;
		this.dialogueChoices = [];
		this.dialogueWaitingChoice = false;
		this.dialogueChoiceCallback = null;

		this.createDialogueWriter();
	}

	private createDialogueWriter(): void {
		if (this.dialogueIndex < this.dialogueLines.length) {
			const line = this.dialogueLines[this.dialogueIndex]!;
			this.dialogueWriter = new TypedTextWriter(line, {
				style: new TextStyle({
					fontFamily: "Arial, sans-serif",
					fontSize: 14,
					fill: 0xddddee,
					wordWrap: true,
					wordWrapWidth: this.width - 72,
				}),
				speed: this.DIALOGUE_SPEED,
			});
		}
	}

	private tryInteractNPC(): boolean {
		if (this.insideBuilding) return false;
		const interactDist = TILE_SIZE * 1.5;
		for (const npc of this.npcs) {
			const dx = this.playerX - npc.x;
			const dy = this.playerY - npc.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < interactDist) {
				// Fire TALK event trigger
				if (this.eventManager) {
					this.eventManager.triggerEvents(EventTrigger.TALK);
				}

				this.initDialogue(npc.dialogue, npc.name);

				// Special NPC interactions with choices
				if (npc.name === "Barista") {
					this.dialogueChoices = [
						"Buy Coffee (5g)",
						"Buy Espresso (8g)",
						"Just chatting",
					];
					this.dialogueChoiceCallback = (choice: number) => {
						this.showDialogue = false;
						if (choice === 0) this.buyCafeItem(0);
						else if (choice === 1) this.buyCafeItem(1);
					};
				} else if (npc.name === "Shopkeep") {
					this.dialogueChoices = ["Open Shop", "No thanks"];
					this.dialogueChoiceCallback = (choice: number) => {
						this.showDialogue = false;
						if (choice === 0) this.showShop = true;
					};
				} else if (npc.name === "Fisherman") {
					this.dialogueChoices = ["Tell me about fishing", "Goodbye"];
					this.dialogueChoiceCallback = (choice: number) => {
						if (choice === 0) {
							this.dialogueLines = [
								"Go near water and press F to cast your line!",
								"Wait for a bite, then you will catch something.",
								"There are 6 different fish to discover. Good luck!",
							];
							this.dialogueIndex = 0;
							this.dialogueTimer = 0;
							this.dialogueCharIndex = 0;
							this.dialogueChoices = [];
						} else {
							this.showDialogue = false;
						}
					};
				}
				this.notifications.push({
					text: `Talking to ${npc.name}...`,
					x: this.playerX,
					y: this.playerY - 40,
					age: 0,
					maxAge: 1.5,
					color: 0x44aaff,
				});
				return true;
			}
		}
		return false;
	}

	// Pause Menu

	private handlePauseOption(): void {
		const option = this.pauseOptions[this.pauseCursorPos];
		switch (option) {
			case "Resume":
				this.isPaused = false;
				break;
			case "Inventory":
				this.isPaused = false;
				this.showInventory = true;
				break;
			case "Quests":
				this.isPaused = false;
				this.showQuests = true;
				break;
			case "Equipment":
				this.isPaused = false;
				this.showInventory = true;
				break;
			case "Achievements":
				this.isPaused = false;
				// Achievement display happens in HUD
				this.notifications.push({
					text: `🏆 ${this.achievements.filter((a) => a.unlocked).length}/${this.achievements.length} Achievements`,
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 3.0,
					color: 0xffcc00,
				});
				break;
			case "Save Game":
				this.isPaused = false;
				this.quickSave();
				break;
			case "Quit to Menu":
				// Handled by EngineScene
				break;
		}
	}

	get paused(): boolean {
		return this.isPaused;
	}
	get wantsQuit(): boolean {
		return (
			this.isPaused && this.pauseOptions[this.pauseCursorPos] === "Quit to Menu"
		);
	}

	// Building Entry

	private tryEnterBuilding(): void {
		const playerTileX = Math.floor(this.playerX / TILE_SIZE);
		const playerTileY = Math.floor(this.playerY / TILE_SIZE);

		for (const def of this.BUILDING_DEFS) {
			if (playerTileX === def.doorTX && playerTileY === def.doorTY) {
				this.insideBuilding = def.name;
				this.visitedBuildings.add(def.name);
				this.checkAchievement("explorer", this.visitedBuildings.size >= 3);
				this.notifications.push({
					text: `Entering ${def.name}...`,
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 1.0,
					color: 0xffaa44,
				});
				// Generate interior
				this.generateBuildingInterior(def);
				return;
			}
		}
	}

	// Fishing

	private fishingState: "idle" | "casting" | "waiting" | "caught" = "idle";
	private fishingTimer = 0;
	private fishCaught: string[] = [];

	// Combat / Encounters

	private startEncounter(): void {
		const template =
			this.ENEMY_TYPES[Math.floor(Math.random() * this.ENEMY_TYPES.length)];

		// Launch turn-based BattleScene
		import("../../scenes/BattleScene").then(({ BattleScene }) => {
			import("../ecs/components/CombatComponent").then(({ CombatComponent }) => {
				const app = (this as any).app;
				if (!app) {
					// Fallback to auto-combat if no app reference
					this.startLegacyEncounter(template);
					return;
				}

				const playerCombat = new CombatComponent({
					hp: this.playerHp,
					maxHp: this.playerMaxHp,
					atk: this.playerAttack,
					def: this.defense,
					level: this.playerLevel,
				});

				const enemyCombat = new CombatComponent({
					hp: template.hp,
					maxHp: template.hp,
					atk: template.attack,
					def: Math.floor(template.attack * 0.3),
					level: Math.max(1, this.playerLevel - 1 + Math.floor(Math.random() * 3)),
				});

				const battleScene = new BattleScene({
					name: "battle",
					app,
					player: playerCombat,
					enemy: enemyCombat,
				});

				// Push battle scene
				const { StateManager } = require("../../state/StateManager");
				StateManager.push(battleScene);

				// Track encounter
				this.currentEnemy = { ...template, maxHp: template.hp };
				this.notifications.push({
					text: `Enemy: ${template.name}!`,
					x: this.playerX,
					y: this.playerY - 40,
					age: 0,
					maxAge: 1.5,
					color: 0xff4444,
				});
			});
		});
	}

	private startLegacyEncounter(template: typeof this.ENEMY_TYPES[0]): void {
		this.currentEnemy = { ...template, maxHp: template.hp };
		this.showCombat = true;
		this.combatLog = [`A wild ${template.name} appeared!`];
		this.combatTimer = 0;
		this.notifications.push({
			text: `Enemy: ${template.name}!`,
			x: this.playerX,
			y: this.playerY - 40,
			age: 0,
			maxAge: 1.5,
			color: 0xff4444,
		});
	}

	private combatStep(): void {
		if (!this.currentEnemy) return;

		// Player attacks
		const dmg = Math.floor(this.playerAttack * (0.8 + Math.random() * 0.4));
		this.currentEnemy.hp -= dmg;
		this.triggerScreenShake(2, 0.1);
		this.combatLog.push(`You deal ${dmg} damage!`);
		this.playSound("hit", 0.4);

		if (this.currentEnemy.hp <= 0) {
			this.combatLog.push(`${this.currentEnemy.name} defeated!`);
			// Reward
			const goldReward = 5 + Math.floor(Math.random() * 15);
			const existingGold = this.inventory.find((i) => i.name === "Gold Coin");
			if (existingGold) {
				existingGold.count += goldReward;
			} else {
				this.inventory.push({
					name: "Gold Coin",
					count: goldReward,
					icon: 0xffcc00,
				});
			}
			this.combatLog.push(`+${goldReward} Gold`);
			this.totalGoldEarned += goldReward;
			this.updateQuestProgress("earn_50_gold", this.totalGoldEarned);
			this.playSound("coin", 0.3);
			// XP reward
			const xpReward = 10 + Math.floor(Math.random() * 20);
			this.playerXp += xpReward;
			this.combatLog.push(`+${xpReward} XP`);
			this.checkLevelUp();
			// Track wins
			this.combatWins++;
			this.updateQuestProgress("win_5_battles", this.combatWins);
			this.checkAchievement("first_battle", this.combatWins >= 1);
			this.checkAchievement("ten_battles", this.combatWins >= 10);
			this.checkAchievement("rich", (existingGold?.count ?? goldReward) >= 50);
			// Heal a bit
			this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 10);
			// End combat after a moment
			setTimeout(() => {
				this.showCombat = false;
				this.currentEnemy = null;
				this.combatLog = [];
			}, 1500);
			return;
		}

		// Enemy attacks back
		const eDmg = Math.floor(
			this.currentEnemy.attack * (0.7 + Math.random() * 0.6),
		);
		const actualDmg = Math.max(1, eDmg - this.defense);
		this.playerHp -= actualDmg;
		this.triggerScreenShake(4, 0.2);
		this.triggerScreenFlash(0xff0000, 0.15);
		this.combatLog.push(`${this.currentEnemy.name} deals ${actualDmg} damage!`);
		this.playSound("hit", 0.2);

		if (this.playerHp <= 0) {
			this.playerHp = 0;
			this.combatLog.push("You fainted! Healing...");
			setTimeout(() => {
				this.playerHp = this.playerMaxHp;
				this.showCombat = false;
				this.currentEnemy = null;
				this.combatLog = [];
			}, 2000);
		}
	}

	// Chat & Online Status

	private renderChat(_camX: number, _camY: number): void {
		if (this.chatMessages.length === 0) return;

		// Show last 5 messages in bottom-left
		const recent = this.chatMessages.slice(-5);
		let yOffset = this.height - 80;
		for (let i = recent.length - 1; i >= 0; i--) {
			const msg = recent[i];
			const alpha = Math.max(0, 1 - msg.age / 10);
			if (alpha <= 0) continue;

			const style = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 12,
				fill: msg.from === "You" ? 0x44aaff : 0xaabbcc,
			});
			const text = new Text({
				text: `${msg.from}: ${msg.text}`,
				style,
			});
			text.alpha = alpha;
			text.position.set(8, yOffset);
			this.container.addChild(text);
			yOffset -= 18;
		}
	}

	private renderOnlineStatus(): void {
		// Small indicator in top-left corner (below HUD)
		const statusColor = this.isOnline ? 0x44ff44 : 0xff4444;
		const statusText = this.isOnline
			? `Online (${this.playerCount + 1})`
			: "Offline";

		const dot = new Graphics();
		dot.circle(15, 50, 4);
		dot.fill({ color: statusColor });
		this.container.addChild(dot);

		const style = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: statusColor,
		});
		const text = new Text({ text: statusText, style });
		text.position.set(24, 44);
		this.container.addChild(text);
	}

	// Pause Menu

	private renderPauseMenu(): void {
		// Dark overlay
		const overlay = new Graphics();
		overlay.rect(0, 0, this.width, this.height);
		overlay.fill({ color: 0x000000, alpha: 0.7 });
		this.container.addChild(overlay);

		// Menu panel
		const panelW = 260;
		const panelH = 40 + this.pauseOptions.length * 36 + 50;
		const panelX = (this.width - panelW) / 2;
		const panelY = (this.height - panelH) / 2;

		const panel = new Graphics();
		panel.roundRect(panelX, panelY, panelW, panelH, 12);
		panel.fill({ color: 0x0a0a2a, alpha: 0.95 });
		panel.stroke({ color: 0x4466aa, width: 2 });
		this.container.addChild(panel);

		// Title
		const titleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 20,
			fill: 0x44aaff,
			fontWeight: "bold",
		});
		const title = new Text({ text: "PAUSED", style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(this.width / 2, panelY + 25);
		this.container.addChild(title);

		// Separator
		const sep = new Graphics();
		sep.moveTo(panelX + 15, panelY + 45);
		sep.lineTo(panelX + panelW - 15, panelY + 45);
		sep.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(sep);

		// Options
		this.pauseOptions.forEach((opt, i) => {
			const selected = i === this.pauseCursorPos;
			const optStyle = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 16,
				fill: selected ? 0xffff88 : 0x8888aa,
			});
			const optText = new Text({
				text: `${selected ? "\u25b8 " : "  "}${opt}`,
				style: optStyle,
			});
			optText.anchor.set(0.5);
			optText.position.set(this.width / 2, panelY + 60 + i * 36);
			this.container.addChild(optText);
		});

		// Player stats at bottom
		const statsStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0x556677,
		});
		const stats = new Text({
			text: `Lv${this.playerLevel} | HP ${this.playerHp}/${this.playerMaxHp} | ATK ${this.playerAttack} | DEF ${this.defense} | XP ${this.playerXp}/${this.playerXpToNext} | Wins ${this.combatWins}`,
			style: statsStyle,
		});
		stats.anchor.set(0.5);
		stats.position.set(this.width / 2, panelY + panelH - 20);
		this.container.addChild(stats);
	}

	// Celebration Particles

	private renderCelebrationParticles(): void {
		// Legacy celebration particles
		for (let i = this.celebrationParticles.length - 1; i >= 0; i--) {
			const p = this.celebrationParticles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.vy += 0.15;
			p.age += 0.016;
			if (p.age >= p.maxAge) {
				this.celebrationParticles.splice(i, 1);
				continue;
			}
			const alpha = 1 - p.age / p.maxAge;
			const g = new Graphics();
			g.circle(p.x, p.y, 3 - p.age);
			g.fill({ color: p.color, alpha });
			this.container.addChild(g);
		}

		// New particle emitter system
		for (const emitter of this.particleEmitters) {
			emitter.update(0.016);
			emitter.render();
		}
	}

	// Screen Effects

	private triggerScreenShake(amount: number, duration: number): void {
		this.screenShakeAmount = amount;
		this.screenShakeDuration = duration;
	}

	private triggerScreenFlash(color: number, duration: number): void {
		this.screenFlashColor = color;
		this.screenFlashAlpha = 0.5;
		this.screenFlashDuration = duration;
	}

	private updateScreenEffects(dt: number): void {
		if (this.screenShakeDuration > 0) {
			this.screenShakeDuration -= dt;
			if (this.screenShakeDuration <= 0) {
				this.screenShakeAmount = 0;
				this.screenShakeDuration = 0;
			}
		}
		if (this.screenFlashDuration > 0) {
			this.screenFlashDuration -= dt;
			this.screenFlashAlpha = Math.max(
				0,
				0.5 * (this.screenFlashDuration / 0.3),
			);
			if (this.screenFlashDuration <= 0) {
				this.screenFlashAlpha = 0;
			}
		}
	}

	private renderScreenEffects(): void {
		// Screen shake offset
		if (this.screenShakeAmount > 0 && this.screenShakeDuration > 0) {
			const dx = (Math.random() - 0.5) * this.screenShakeAmount * 2;
			const dy = (Math.random() - 0.5) * this.screenShakeAmount * 2;
			this.container.position.set(dx, dy);
		} else {
			this.container.position.set(0, 0);
		}

		// Screen flash overlay
		if (this.screenFlashAlpha > 0.01) {
			const flash = new Graphics();
			flash.rect(0, 0, this.width, this.height);
			flash.fill({
				color: this.screenFlashColor,
				alpha: this.screenFlashAlpha,
			});
			this.hudContainer.addChild(flash);
		}
	}

	private spawnCelebration(cx: number, cy: number, count = 30): void {
		const emitter = ParticlePresets.confetti(cx, cy, count);
		this.particleEmitters.push(emitter);
		this.container.addChild(emitter.container);
		// Auto-remove after particles die
		setTimeout(() => {
			const idx = this.particleEmitters.indexOf(emitter);
			if (idx >= 0) this.particleEmitters.splice(idx, 1);
			emitter.destroy();
		}, 3000);
	}

	private renderCombat(): void {
		if (!this.showCombat || !this.currentEnemy) return;

		const boxW = 280;
		const boxH = 200;
		const boxX = (this.width - boxW) / 2;
		const boxY = (this.height - boxH) / 2;

		// Background
		const bg = new Graphics();
		bg.roundRect(boxX, boxY, boxW, boxH, 8);
		bg.fill({ color: 0x1a0a0a, alpha: 0.95 });
		bg.stroke({ color: 0xaa4444, width: 2 });
		this.container.addChild(bg);

		// Enemy info
		const enemy = this.currentEnemy;
		const titleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 14,
			fill: 0xff6644,
			fontWeight: "bold",
		});
		const title = new Text({ text: `⚔️ ${enemy.name}`, style: titleStyle });
		title.position.set(boxX + 12, boxY + 10);
		this.container.addChild(title);

		// Enemy HP bar
		const hpBarW = boxW - 24;
		const hpPct = enemy.hp / enemy.maxHp;
		const hpBg = new Graphics();
		hpBg.roundRect(boxX + 12, boxY + 32, hpBarW, 12, 3);
		hpBg.fill({ color: 0x330000 });
		this.container.addChild(hpBg);
		const hpFill = new Graphics();
		hpFill.roundRect(boxX + 12, boxY + 32, hpBarW * hpPct, 12, 3);
		hpFill.fill({
			color: hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xcccc44 : 0xcc4444,
		});
		this.container.addChild(hpFill);

		const hpStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0xdddddd,
		});
		const hpText = new Text({
			text: `HP: ${enemy.hp}/${enemy.maxHp}`,
			style: hpStyle,
		});
		hpText.position.set(boxX + 14, boxY + 34);
		this.container.addChild(hpText);

		// Enemy sprite (simple colored circle)
		const enemyGfx = new Graphics();
		enemyGfx.circle(boxX + boxW - 50, boxY + 45, 20);
		enemyGfx.fill({ color: enemy.icon });
		enemyGfx.circle(boxX + boxW - 50, boxY + 45, 14);
		enemyGfx.fill({ color: 0x000000, alpha: 0.3 });
		// Eyes
		enemyGfx.circle(boxX + boxW - 55, boxY + 40, 3);
		enemyGfx.fill({ color: 0xffffff });
		enemyGfx.circle(boxX + boxW - 45, boxY + 40, 3);
		enemyGfx.fill({ color: 0xffffff });
		enemyGfx.circle(boxX + boxW - 55, boxY + 40, 1.5);
		enemyGfx.fill({ color: 0x000000 });
		enemyGfx.circle(boxX + boxW - 45, boxY + 40, 1.5);
		enemyGfx.fill({ color: 0x000000 });
		this.container.addChild(enemyGfx);

		// Player HP
		const playerHpPct = this.playerHp / this.playerMaxHp;
		const pStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 12,
			fill: 0x44aaff,
		});
		const pText = new Text({
			text: `You: ${this.playerHp}/${this.playerMaxHp} HP`,
			style: pStyle,
		});
		pText.position.set(boxX + 12, boxY + 55);
		this.container.addChild(pText);

		// Player HP bar
		const phpBg = new Graphics();
		phpBg.roundRect(boxX + 12, boxY + 74, hpBarW, 10, 3);
		phpBg.fill({ color: 0x003300 });
		this.container.addChild(phpBg);
		const phpFill = new Graphics();
		phpFill.roundRect(boxX + 12, boxY + 74, hpBarW * playerHpPct, 10, 3);
		phpFill.fill({
			color:
				playerHpPct > 0.5 ? 0x44cc44 : playerHpPct > 0.25 ? 0xcccc44 : 0xcc4444,
		});
		this.container.addChild(phpFill);

		// Combat log (last 4 lines)
		const logStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0xccccaa,
		});
		const recentLog = this.combatLog.slice(-4);
		for (let i = 0; i < recentLog.length; i++) {
			const logText = new Text({ text: recentLog[i], style: logStyle });
			logText.position.set(boxX + 12, boxY + 95 + i * 16);
			this.container.addChild(logText);
		}

		// Separator
		const sep = new Graphics();
		sep.moveTo(boxX + 10, boxY + 90);
		sep.lineTo(boxX + boxW - 10, boxY + 90);
		sep.stroke({ color: 0x553333, width: 1 });
		this.container.addChild(sep);
	}

	private tryFish(): void {
		if (this.insideBuilding) return;
		if (this.fishingState !== "idle") {
			this.fishingState = "idle";
			return;
		}

		// Check if near water
		const ptx = Math.floor(this.playerX / TILE_SIZE);
		const pty = Math.floor(this.playerY / TILE_SIZE);
		let nearWater = false;
		const mapW = this.getMapWidth();
		const mapH = this.getMapHeight();
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const tx = ptx + dx;
				const ty = pty + dy;
				if (
					tx >= 0 &&
					tx < mapW &&
					ty >= 0 &&
					ty < mapH &&
					this.tiles[ty][tx] === Tile.WATER
				) {
					nearWater = true;
				}
			}
		}

		if (nearWater) {
			this.fishingState = "casting";
			this.fishingTimer = 0;
			this.notifications.push({
				text: "Casting line...",
				x: this.playerX,
				y: this.playerY - 30,
				age: 0,
				maxAge: 1.0,
				color: 0x44aaff,
			});
		} else {
			this.notifications.push({
				text: "No water nearby!",
				x: this.playerX,
				y: this.playerY - 30,
				age: 0,
				maxAge: 1.0,
				color: 0xff6644,
			});
		}
	}

	private updateFishing(dt: number): void {
		if (this.fishingState === "idle") return;

		this.fishingTimer += dt;

		if (this.fishingState === "casting" && this.fishingTimer > 0.5) {
			this.fishingState = "waiting";
			this.fishingTimer = 0;
		}

		if (this.fishingState === "waiting") {
			// Random catch after 1-4 seconds
			const catchTime = 1 + Math.random() * 3;
			if (this.fishingTimer > catchTime) {
				this.fishingState = "caught";
				this.fishingTimer = 0;
				const fishTypes = [
					"Trout",
					"Bass",
					"Salmon",
					"Catfish",
					"Gold Fish",
					"Eel",
				];
				const fish = fishTypes[Math.floor(Math.random() * fishTypes.length)];
				this.fishCaught.push(fish);
				// Add to inventory
				const existing = this.inventory.find((i) => i.name === fish);
				if (existing) {
					existing.count++;
				} else {
					this.inventory.push({ name: fish, count: 1, icon: 0x4488cc });
				}
				this.notifications.push({
					text: `Caught a ${fish}!`,
					x: this.playerX,
					y: this.playerY - 40,
					age: 0,
					maxAge: 2.0,
					color: 0x44ffaa,
				});
				// Fishing achievements
				this.checkAchievement("first_fish", true);
				this.checkAchievement("five_fish", this.fishCaught.length >= 5);
				this.playSound("fish", 0.3);
				this.updateQuestProgress("catch_3_fish", this.fishCaught.length);
			}
		}

		if (this.fishingState === "caught" && this.fishingTimer > 1.5) {
			this.fishingState = "idle";
		}
	}

	private generateBuildingInterior(def: {
		name: string;
		interiorColor: number;
		items: string[];
	}): void {
		this.buildingTiles = [];
		for (let y = 0; y < this.buildingH; y++) {
			this.buildingTiles[y] = [];
			for (let x = 0; x < this.buildingW; x++) {
				// Floor
				this.buildingTiles[y][x] = def.interiorColor;
				// Walls
				if (
					y === 0 ||
					y === this.buildingH - 1 ||
					x === 0 ||
					x === this.buildingW - 1
				) {
					this.buildingTiles[y][x] = 0x554433; // Wall color
				}
			}
		}
		// Door (bottom center)
		this.buildingTiles[this.buildingH - 1][Math.floor(this.buildingW / 2)] =
			def.interiorColor;
		// Counter/table in middle
		for (let x = 3; x < this.buildingW - 3; x++) {
			this.buildingTiles[4][x] = 0x665544;
		}
	}

	// Render

	render(): Container {
		this.container.removeChildren();

		// If inside a building, render interior instead of world map
		if (this.insideBuilding) {
			return this.renderBuildingInterior();
		}

		const mapW = this.getMapWidth();
		const mapH = this.getMapHeight();

		// Camera offset (smooth lerp toward player)
		this.camTargetX = Math.max(
			0,
			Math.min(mapW * TILE_SIZE - this.width, this.playerX - this.width / 2),
		);
		this.camTargetY = Math.max(
			0,
			Math.min(mapH * TILE_SIZE - this.height, this.playerY - this.height / 2),
		);
		// Smooth camera interpolation
		this.camX += (this.camTargetX - this.camX) * this.CAM_LERP;
		this.camY += (this.camTargetY - this.camY) * this.CAM_LERP;
		const camX = this.camX;
		const camY = this.camY;

		// Parallax background layers (scroll at 0.3x camera speed)
		this.renderParallaxBackground(camX, camY);

		// Render map tiles (batched for performance)
		this.mapContainer.removeChildren();
		const startTileX = Math.floor(camX / TILE_SIZE);
		const startTileY = Math.floor(camY / TILE_SIZE);
		const endTileX = Math.min(
			mapW,
			startTileX + Math.ceil(this.width / TILE_SIZE) + 1,
		);
		const endTileY = Math.min(
			mapH,
			startTileY + Math.ceil(this.height / TILE_SIZE) + 1,
		);

		// Phase 1: Batch base tile colors into a single draw call
		this.tileBatcher?.begin();
		const detailTiles: { tx: number; ty: number; tile: number }[] = [];
		for (let ty = startTileY; ty < endTileY; ty++) {
			for (let tx = startTileX; tx < endTileX; tx++) {
				if (ty < 0 || tx < 0 || ty >= mapH || tx >= mapW) continue;
				const tile = this.tiles[ty][tx];
				this.tileBatcher?.addTile(tx, ty, tile);
				// Collect tiles that need extra detail
				if (tile === Tile.WATER || tile === Tile.TREE || tile === Tile.FLOWER || tile === Tile.CHEST) {
					detailTiles.push({ tx, ty, tile });
				}
			}
		}
		this.tileBatcher?.end();
		if (this.tileBatcher) {
			this.mapContainer.addChild(this.tileBatcher.getGraphics());
		}

		// Phase 2: Render detail overlays (water animation, tree tops, etc.)
		const detailG = new Graphics();
		for (const { tx, ty, tile } of detailTiles) {
			const px = tx * TILE_SIZE;
			const py = ty * TILE_SIZE;

			if (tile === Tile.WATER) {
				const flow = Math.sin(this.gameTime * 1.5 + tx * 0.8 + ty * 0.4) * 0.2;
				detailG.rect(px, py, TILE_SIZE, TILE_SIZE);
				detailG.fill({ color: 0x3366cc, alpha: 0.25 + flow });
				const waveY1 = py + TILE_SIZE * 0.3 + Math.sin(this.gameTime * 2 + tx) * 3;
				const waveY2 = py + TILE_SIZE * 0.65 + Math.sin(this.gameTime * 2.5 + tx + 1) * 3;
				detailG.moveTo(px, waveY1);
				detailG.quadraticCurveTo(px + TILE_SIZE / 2, waveY1 + 4, px + TILE_SIZE, waveY1);
				detailG.stroke({ color: 0x5588dd, width: 1, alpha: 0.3 + flow });
				detailG.moveTo(px, waveY2);
				detailG.quadraticCurveTo(px + TILE_SIZE / 2, waveY2 - 3, px + TILE_SIZE, waveY2);
				detailG.stroke({ color: 0x5588dd, width: 1, alpha: 0.25 + flow });
				const sparkle = Math.sin(this.gameTime * 3 + tx * 2.1 + ty * 1.7);
				if (sparkle > 0.85) {
					detailG.circle(px + TILE_SIZE * 0.5, py + TILE_SIZE * 0.4, 1.5);
					detailG.fill({ color: 0xffffff, alpha: sparkle - 0.7 });
				}
			} else if (tile === Tile.TREE) {
				detailG.rect(px + TILE_SIZE * 0.3, py + TILE_SIZE * 0.6, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
				detailG.fill(0x8b4513);
				detailG.circle(px + TILE_SIZE * 0.5, py + TILE_SIZE * 0.35, TILE_SIZE * 0.45);
				detailG.fill(0x228b22);
				detailG.circle(px + TILE_SIZE * 0.35, py + TILE_SIZE * 0.3, TILE_SIZE * 0.25);
				detailG.fill(0x2ea22e);
			} else if (tile === Tile.FLOWER) {
				const sway = Math.sin(this.gameTime * 2 + tx * 1.3) * 2;
				detailG.circle(px + TILE_SIZE * 0.5 + sway, py + TILE_SIZE * 0.4, 3);
				detailG.fill(0xff6688);
				detailG.rect(px + TILE_SIZE * 0.48, py + TILE_SIZE * 0.5, 2, TILE_SIZE * 0.3);
				detailG.fill(0x44aa44);
			} else if (tile === Tile.CHEST) {
				detailG.rect(px + 2, py + 4, TILE_SIZE - 4, TILE_SIZE - 6);
				detailG.fill(0x8b6914);
				detailG.rect(px + TILE_SIZE * 0.3, py + TILE_SIZE * 0.3, TILE_SIZE * 0.4, TILE_SIZE * 0.3);
				detailG.fill(0xffd700);
			}
					// Tree trunk
					g.rect(
						TILE_SIZE * 0.3,
						TILE_SIZE * 0.6,
						TILE_SIZE * 0.4,
						TILE_SIZE * 0.4,
					);
							}
		detailG.position.set(-camX, -camY);
		this.mapContainer.addChild(detailG);

		// Offset the batched base tiles
		if (this.tileBatcher) {
			this.tileBatcher.getGraphics().position.set(-camX, -camY);
		}

		this.container.addChild(this.mapContainer);

		// Render entities (NPCs + Player)
		this.entityContainer.removeChildren();

		// Sort entities by Y for proper overlap
		const entities: { y: number; render: () => Container }[] = [];

		// NPCs
		for (const npc of this.npcs) {
			entities.push({
				y: npc.y,
				render: () =>
					this.renderCharacter(
						npc.x - camX,
						npc.y - camY,
						npc.color,
						npc.dir,
						npc.name,
					),
			});
		}

		// Player (always rendered)
		entities.push({
			y: this.playerY,
			render: () => this.renderPlayer(this.playerX - camX, this.playerY - camY),
		});

		// Other players from network
		for (const op of this.otherPlayers) {
			entities.push({
				y: op.y,
				render: () =>
					this.renderCharacter(
						op.x - camX,
						op.y - camY,
						op.color,
						op.dir,
						op.name,
					),
			});
		}

		// Sort by Y and render
		entities.sort((a, b) => a.y - b.y);
		for (const ent of entities) {
			this.entityContainer.addChild(ent.render());
		}

		this.container.addChild(this.entityContainer);

		// Day/night overlay
		this.renderDayNight();

		// Weather particles (rain/snow/storm)
		this.renderWeather();

		// Lightning flash
		if (this.lightningAlpha > 0) {
			const flash = new Graphics();
			flash.rect(0, 0, this.width, this.height);
			flash.fill({ color: 0xffffff, alpha: this.lightningAlpha });
			this.container.addChild(flash);
		}

		// HUD
		this.renderHUD();

		// Dialogue box
		if (this.showDialogue) {
			this.renderDialogueBox();
		}

		// Fishing indicator
		if (this.fishingState !== "idle") {
			this.renderFishingIndicator();
		}

		// Combat overlay
		if (this.showCombat) {
			this.renderCombat();
		}

		// Chat overlay
		this.renderChat(camX, camY);

		// Online indicator
		this.renderOnlineStatus();

		// Pause menu overlay
		if (this.isPaused) {
			this.renderPauseMenu();
			return this.container;
		}

		// Celebration particles
		this.renderCelebrationParticles();

		// Inventory overlay
		if (this.showInventory) {
			this.renderInventory();
		}

		// Quest log overlay
		if (this.showQuests) {
			this.renderQuestLog();
		}

		// Floating notifications
		this.renderNotifications(camX, camY);

		// Footstep particles
		this.renderStepParticles(camX, camY);

		// Minimap
		this.renderMinimap();

		// Screen effects (shake + flash) — rendered last on HUD
		this.renderScreenEffects();

		// Cutscene overlay (on top of everything)
		if (this.cutsceneEngine?.active) {
			this.cutsceneEngine.update(0.016);
			this.cutsceneEngine.render();
			this.container.addChild(this.cutsceneEngine.container);
		}

		return this.container;
	}

	// Building Interior Rendering

	// Parallax Background

	private renderParallaxBackground(camX: number, camY: number): void {
		const parallaxFactor = 0.3; // Stars/clouds scroll at 30% of camera speed
		const pxCamX = camX * parallaxFactor;
		const pxCamY = camY * parallaxFactor;

		// Stars (far layer, barely move)
		const starG = new Graphics();
		for (const star of this.bgStars) {
			const sx = star.x - pxCamX * 0.5;
			const sy = star.y - pxCamY * 0.5;
			// Twinkle
			const twinkle = Math.sin(this.gameTime * 2 + star.x * 0.1) * 0.2 + 0.8;
			starG.circle(sx, sy, star.size);
			starG.fill({ color: 0xffffff, alpha: star.alpha * twinkle });
		}
		this.container.addChild(starG);

		// Clouds (mid layer, drift + parallax)
		const cloudG = new Graphics();
		for (const cloud of this.bgClouds) {
			const cx = cloud.x - pxCamX;
			const cy = cloud.y - pxCamY * 0.7;
			cloudG.ellipse(cx, cy, cloud.w / 2, cloud.h / 2);
			cloudG.fill({ color: 0xffffff, alpha: cloud.alpha });
		}
		this.container.addChild(cloudG);

		// Distant mountain silhouette (far background, very slow parallax)
		const mtG = new Graphics();
		const mtOffset = -pxCamX * 0.15;
		mtG.moveTo(mtOffset, this.height);
		const mtSegments = 20;
		const mtWidth = MAP_W * TILE_SIZE * 0.5;
		for (let i = 0; i <= mtSegments; i++) {
			const mx = mtOffset + (i / mtSegments) * mtWidth;
			const my =
				this.height - 60 - Math.sin(i * 0.8 + 2) * 40 - Math.sin(i * 1.7) * 20;
			mtG.lineTo(mx, my);
		}
		mtG.lineTo(mtOffset + mtWidth, this.height);
		mtG.fill({ color: 0x1a2a3a, alpha: 0.3 });
		this.container.addChild(mtG);
	}

	private renderBuildingInterior(): Container {
		const def = this.BUILDING_DEFS.find((d) => d.name === this.insideBuilding);
		if (!def) {
			this.insideBuilding = null;
			return this.container;
		}

		const tileSize = 48; // Larger tiles indoors
		const offsetX = (this.width - this.buildingW * tileSize) / 2;
		const offsetY = (this.height - this.buildingH * tileSize) / 2;

		// Background (darken outside building)
		const bg = new Graphics();
		bg.rect(0, 0, this.width, this.height);
		bg.fill({ color: 0x000000, alpha: 0.8 });
		this.container.addChild(bg);

		// Interior tiles
		for (let ty = 0; ty < this.buildingH; ty++) {
			for (let tx = 0; tx < this.buildingW; tx++) {
				const tile = this.buildingTiles[ty][tx];
				const g = new Graphics();
				g.rect(0, 0, tileSize, tileSize);
				g.fill({ color: tile });

				// Wall detail
				if (
					ty === 0 ||
					ty === this.buildingH - 1 ||
					tx === 0 ||
					tx === this.buildingW - 1
				) {
					if (tile === 0x554433) {
						// Brick pattern
						g.setStrokeStyle({ color: 0x443322, width: 0.5 });
						g.moveTo(0, tileSize / 2);
						g.lineTo(tileSize, tileSize / 2);
						g.stroke();
					}
				}

				// Table items
				if (tile === 0x665544 && tx >= 3 && tx < 3 + def.items.length) {
					const itemIdx = tx - 3;
					g.circle(tileSize / 2, tileSize / 2, 8);
					g.fill({ color: 0xffaa44 });

					const itemStyle = new TextStyle({
						fontFamily: "monospace",
						fontSize: 8,
						fill: 0xffffff,
					});
					const itemText = new Text({
						text: def.items[itemIdx],
						style: itemStyle,
					});
					itemText.anchor.set(0.5);
					itemText.position.set(tileSize / 2, tileSize / 2 + 14);
					g.addChild(itemText);
				}

				// Door indicator (bottom center)
				if (
					ty === this.buildingH - 1 &&
					tx === Math.floor(this.buildingW / 2)
				) {
					g.rect(
						tileSize * 0.2,
						tileSize * 0.3,
						tileSize * 0.6,
						tileSize * 0.7,
					);
					g.fill({ color: 0x443311 });
					g.circle(tileSize * 0.65, tileSize * 0.65, 2);
					g.fill({ color: 0xccaa00 });
				}

				g.position.set(offsetX + tx * tileSize, offsetY + ty * tileSize);
				this.container.addChild(g);
			}
		}

		// Building name banner
		const bannerBg = new Graphics();
		bannerBg.roundRect(offsetX, offsetY - 30, this.buildingW * tileSize, 24, 4);
		bannerBg.fill({ color: 0x1a1a2e, alpha: 0.9 });
		bannerBg.stroke({ color: 0x4466aa, width: 1 });
		this.container.addChild(bannerBg);

		const nameStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 16,
			fill: 0x44aaff,
			fontWeight: "bold",
		});
		const nameText = new Text({ text: def.name, style: nameStyle });
		nameText.anchor.set(0.5);
		nameText.position.set(this.width / 2, offsetY - 18);
		this.container.addChild(nameText);

		// Items on display
		const itemsStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 12,
			fill: 0xaabbcc,
		});
		const itemsLabel = new Text({
			text: `Items: ${def.items.join(" · ")}`,
			style: itemsStyle,
		});
		itemsLabel.anchor.set(0.5);
		itemsLabel.position.set(
			this.width / 2,
			offsetY + this.buildingH * tileSize + 20,
		);
		this.container.addChild(itemsLabel);

		// Exit hint
		const hintStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 11,
			fill: 0x556677,
		});
		const hintText =
			this.insideBuilding === "Shop"
				? "Press SPACE to browse shop"
				: this.insideBuilding === "Cafe"
					? "Press SPACE to order"
					: "Press SPACE to exit";
		const hint = new Text({ text: hintText, style: hintStyle });
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, offsetY + this.buildingH * tileSize + 40);
		this.container.addChild(hint);

		// Shop overlay (only inside Shop)
		if (this.insideBuilding === "Shop" && this.showShop) {
			this.renderShopOverlay();
		}

		// Cafe overlay (only inside Cafe)
		if (this.insideBuilding === "Cafe" && this.showCafe) {
			this.renderCafeOverlay();
		}

		return this.container;
	}

	// Shop System

	private renderShopOverlay(): void {
		const boxW = 320;
		const boxH = 60 + (this.SHOP_ITEMS.length + 1) * 32; // +1 for Exit option
		const boxX = (this.width - boxW) / 2;
		const boxY = (this.height - boxH) / 2;

		// Background
		const bg = new Graphics();
		bg.roundRect(boxX, boxY, boxW, boxH, 10);
		bg.fill({ color: 0x0a1a0a, alpha: 0.95 });
		bg.stroke({ color: 0x44aa44, width: 2 });
		this.container.addChild(bg);

		// Title
		const titleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 18,
			fill: 0x44ff44,
			fontWeight: "bold",
		});
		const title = new Text({ text: "SHOP", style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(this.width / 2, boxY + 20);
		this.container.addChild(title);

		// Gold display
		const gold = this.inventory.find((i) => i.name === "Gold Coin");
		const goldCount = gold?.count ?? 0;
		const goldStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 12,
			fill: 0xffcc00,
		});
		const goldText = new Text({ text: `Gold: ${goldCount}`, style: goldStyle });
		goldText.position.set(boxX + boxW - 90, boxY + 10);
		this.container.addChild(goldText);

		// Separator
		const sep = new Graphics();
		sep.moveTo(boxX + 10, boxY + 38);
		sep.lineTo(boxX + boxW - 10, boxY + 38);
		sep.stroke({ color: 0x336633, width: 1 });
		this.container.addChild(sep);

		// Items
		for (let i = 0; i < this.SHOP_ITEMS.length; i++) {
			const item = this.SHOP_ITEMS[i];
			const selected = i === this.shopCursorPos;
			const canAfford = goldCount >= item.price;
			const itemY = boxY + 46 + i * 32;

			// Row background
			const rowBg = new Graphics();
			rowBg.rect(boxX + 8, itemY, boxW - 16, 28);
			rowBg.fill({ color: selected ? 0x1a3a1a : 0x0a1a0a });
			this.container.addChild(rowBg);

			// Icon
			const icon = new Graphics();
			icon.roundRect(boxX + 14, itemY + 5, 16, 16, 3);
			icon.fill({ color: item.icon });
			this.container.addChild(icon);

			// Name + price
			const nameStyle = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 13,
				fill: canAfford ? 0xdddddd : 0x664444,
			});
			const nameText = new Text({
				text: `${selected ? "\u25b8 " : "  "}${item.name}  -  ${item.price}g`,
				style: nameStyle,
			});
			nameText.position.set(boxX + 36, itemY + 6);
			this.container.addChild(nameText);

			// "BUY" indicator
			if (selected && canAfford) {
				const buyStyle = new TextStyle({
					fontFamily: "monospace",
					fontSize: 10,
					fill: 0x44ff44,
				});
				const buyText = new Text({ text: "[SPACE]", style: buyStyle });
				buyText.position.set(boxX + boxW - 70, itemY + 8);
				this.container.addChild(buyText);
			}
		}

		// Exit option
		const exitIdx = this.SHOP_ITEMS.length;
		const exitSelected = exitIdx === this.shopCursorPos;
		const exitY = boxY + 46 + exitIdx * 32;
		const exitStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 13,
			fill: exitSelected ? 0xffff88 : 0x888888,
		});
		const exitText = new Text({
			text: `${exitSelected ? "\u25b8 " : "  "}Exit Shop`,
			style: exitStyle,
		});
		exitText.position.set(boxX + 36, exitY + 6);
		this.container.addChild(exitText);
	}

	// Cafe Overlay

	private renderCafeOverlay(): void {
		const boxW = 300;
		const boxH = 60 + (this.CAFE_ITEMS.length + 1) * 36;
		const boxX = (this.width - boxW) / 2;
		const boxY = (this.height - boxH) / 2;

		const bg = new Graphics();
		bg.roundRect(boxX, boxY, boxW, boxH, 10);
		bg.fill({ color: 0x1a0f05, alpha: 0.95 });
		bg.stroke({ color: 0xaa7744, width: 2 });
		this.container.addChild(bg);

		const titleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 18,
			fill: 0xffcc88,
			fontWeight: "bold",
		});
		const title = new Text({ text: "CAFE", style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(this.width / 2, boxY + 20);
		this.container.addChild(title);

		const gold = this.inventory.find((i) => i.name === "Gold Coin");
		const goldCount = gold?.count ?? 0;
		const goldStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 12,
			fill: 0xffcc00,
		});
		const goldText = new Text({ text: `Gold: ${goldCount}`, style: goldStyle });
		goldText.position.set(boxX + boxW - 90, boxY + 10);
		this.container.addChild(goldText);

		const sep = new Graphics();
		sep.moveTo(boxX + 10, boxY + 38);
		sep.lineTo(boxX + boxW - 10, boxY + 38);
		sep.stroke({ color: 0x664422, width: 1 });
		this.container.addChild(sep);

		for (let i = 0; i < this.CAFE_ITEMS.length; i++) {
			const item = this.CAFE_ITEMS[i];
			const selected = i === this.cafeCursorPos;
			const canAfford = goldCount >= item.price;
			const itemY = boxY + 46 + i * 36;

			const rowBg = new Graphics();
			rowBg.rect(boxX + 8, itemY, boxW - 16, 32);
			rowBg.fill({ color: selected ? 0x2a1a0a : 0x1a0f05 });
			this.container.addChild(rowBg);

			const icon = new Graphics();
			icon.roundRect(boxX + 14, itemY + 7, 16, 16, 3);
			icon.fill({ color: item.icon });
			this.container.addChild(icon);

			const nameStyle = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 12,
				fill: canAfford ? 0xddddcc : 0x664444,
			});
			const nameText = new Text({
				text: `${selected ? "\u25b8 " : "  "}${item.name}  -  ${item.price}g`,
				style: nameStyle,
			});
			nameText.position.set(boxX + 36, itemY + 4);
			this.container.addChild(nameText);

			// Description
			const descStyle = new TextStyle({
				fontFamily: "monospace",
				fontSize: 9,
				fill: 0x887766,
			});
			const descText = new Text({ text: item.desc, style: descStyle });
			descText.position.set(boxX + 38, itemY + 19);
			this.container.addChild(descText);

			if (selected && canAfford) {
				const buyStyle = new TextStyle({
					fontFamily: "monospace",
					fontSize: 10,
					fill: 0x44ff44,
				});
				const buyText = new Text({ text: "[SPACE]", style: buyStyle });
				buyText.position.set(boxX + boxW - 70, itemY + 10);
				this.container.addChild(buyText);
			}
		}

		// Exit option
		const exitIdx = this.CAFE_ITEMS.length;
		const exitSelected = exitIdx === this.cafeCursorPos;
		const exitY = boxY + 46 + exitIdx * 36;
		const exitStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 13,
			fill: exitSelected ? 0xffff88 : 0x888866,
		});
		const exitText = new Text({
			text: `${exitSelected ? "\u25b8 " : "  "}Exit Cafe`,
			style: exitStyle,
		});
		exitText.position.set(boxX + 36, exitY + 6);
		this.container.addChild(exitText);

		// Active buffs display
		if (this.buffTimers.length > 0) {
			const buffStyle = new TextStyle({
				fontFamily: "monospace",
				fontSize: 9,
				fill: 0xaa8866,
			});
			const buffText = new Text({
				text:
					"Active: " +
					this.buffTimers
						.map((b) => `${b.name} (${Math.ceil(b.remaining)}s)`)
						.join(", "),
				style: buffStyle,
			});
			buffText.anchor.set(0.5);
			buffText.position.set(this.width / 2, boxY + boxH - 12);
			this.container.addChild(buffText);
		}
	}

	private buyShopItem(): void {
		if (this.shopCursorPos >= this.SHOP_ITEMS.length) {
			// Exit
			this.showShop = false;
			return;
		}

		const item = this.SHOP_ITEMS[this.shopCursorPos];
		const gold = this.inventory.find((i) => i.name === "Gold Coin");
		if (!gold || gold.count < item.price) {
			this.notifications.push({
				text: "Not enough gold!",
				x: this.playerX,
				y: this.playerY - 20,
				age: 0,
				maxAge: 1.5,
				color: 0xff4444,
			});
			this.playSound("hit", 0.2);
			return;
		}

		// Purchase
		gold.count -= item.price;

		// Apply effect
		switch (item.effect) {
			case "heal":
				this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 50);
				break;
			case "attack":
				this.playerAttack += 5;
				break;
			case "maxhp":
				this.playerMaxHp += 20;
				this.playerHp = this.playerMaxHp;
				break;
			case "luck":
				this.encounterInterval *= 1.5; // Less frequent encounters
				break;
			case "speed":
				this.playerSpeed += 20;
				break;
		}

		// Add to inventory
		const existing = this.inventory.find((i) => i.name === item.name);
		if (existing) {
			existing.count++;
		} else {
			this.inventory.push({ name: item.name, count: 1, icon: item.icon });
		}

		this.notifications.push({
			text: `Bought ${item.name}!`,
			x: this.playerX,
			y: this.playerY - 30,
			age: 0,
			maxAge: 2.0,
			color: 0x44ff44,
		});
		this.playSound("coin", 0.4);
		this.tryEquip(item.name);
	}

	// Cafe System

	private buyCafeItem(itemIndex?: number): void {
		const idx = itemIndex ?? this.cafeCursorPos;
		if (idx >= this.CAFE_ITEMS.length) {
			this.showCafe = false;
			return;
		}

		const item = this.CAFE_ITEMS[idx];
		const gold = this.inventory.find((i) => i.name === "Gold Coin");
		if (!gold || gold.count < item.price) {
			this.notifications.push({
				text: "Not enough gold!",
				x: this.playerX,
				y: this.playerY - 20,
				age: 0,
				maxAge: 1.5,
				color: 0xff4444,
			});
			this.playSound("hit", 0.2);
			return;
		}

		gold.count -= item.price;

		switch (item.effect) {
			case "heal":
				this.playerHp = this.playerMaxHp;
				this.notifications.push({
					text: "Fully healed!",
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 2.0,
					color: 0x44ff44,
				});
				break;
			case "energy":
				this.playerSpeed += 30;
				this.buffTimers.push({ name: "Coffee Speed", remaining: 30 });
				this.notifications.push({
					text: "Speed boost! (30s)",
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 2.0,
					color: 0xffaa44,
				});
				break;
			case "energy2":
				this.playerSpeed += 30;
				this.playerAttack += 5;
				this.buffTimers.push({ name: "Espresso Power", remaining: 30 });
				this.notifications.push({
					text: "Speed + ATK boost! (30s)",
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 2.0,
					color: 0xff44ff,
				});
				break;
			case "calm":
				this.encounterInterval *= 2;
				this.buffTimers.push({ name: "Calm Tea", remaining: 60 });
				this.notifications.push({
					text: "Encounters reduced! (60s)",
					x: this.playerX,
					y: this.playerY - 30,
					age: 0,
					maxAge: 2.0,
					color: 0x44aa44,
				});
				break;
		}

		const existing = this.inventory.find((i) => i.name === item.name);
		if (existing) existing.count++;
		else this.inventory.push({ name: item.name, count: 1, icon: item.icon });

		this.playSound("coin", 0.3);
	}

	private renderCharacter(
		x: number,
		y: number,
		color: number,
		dir: number,
		name: string,
	): Container {
		const c = new Container();

		// Shadow
		const shadow = new Graphics();
		shadow.ellipse(0, 0, 10, 4);
		shadow.fill({ color: 0x000000, alpha: 0.3 });
		shadow.position.set(x + TILE_SIZE / 2, y + TILE_SIZE - 2);
		c.addChild(shadow);

		// Body
		const body = new Graphics();
		body.roundRect(-8, -20, 16, 18, 3);
		body.fill({ color: color });
		c.position.set(x + TILE_SIZE / 2, y + TILE_SIZE);
		c.addChild(body);

		// Head
		const head = new Graphics();
		head.circle(0, -24, 7);
		head.fill({ color: 0xffddbb }); // Skin
		c.addChild(head);

		// Eyes (direction-based)
		// playerDir: 0=D, 1=DL, 2=L, 3=UL, 4=U, 5=UR, 6=R, 7=DR
		const eyeOffsets: Record<number, { ex: number; ey: number }[]> = {
			0: [{ ex: -3, ey: -25 }, { ex: 3, ey: -25 }], // down
			1: [{ ex: -4, ey: -25 }, { ex: 1, ey: -25 }], // down-left
			2: [{ ex: -4, ey: -25 }], // left
			3: [{ ex: -3, ey: -25 }], // up-left
			4: [], // up (no eyes visible)
			5: [{ ex: 3, ey: -25 }], // up-right
			6: [{ ex: 4, ey: -25 }], // right
			7: [{ ex: -1, ey: -25 }, { ex: 4, ey: -25 }], // down-right
		};
		const eyes = eyeOffsets[dir] ?? eyeOffsets[0];
		for (const eye of eyes) {
			const eyeG = new Graphics();
			eyeG.circle(eye.ex, eye.ey, 1.5);
			eyeG.fill({ color: 0x222222 });
			c.addChild(eyeG);
		}

		// Name label
		const nameStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 9,
			fill: 0xffffff,
			fontWeight: "bold",
		});
		const nameText = new Text({ text: name, style: nameStyle });
		nameText.anchor.set(0.5);
		nameText.position.set(0, -34);
		c.addChild(nameText);

		return c;
	}

	private renderPlayer(x: number, y: number): Container {
		const c = this.renderCharacter(x, y, 0x3366ff, this.playerDir, "You");
		// Add a small indicator above player
		const indicator = new Graphics();
		const bob = Math.sin(this.gameTime * 3) * 3;
		indicator.circle(0, -40 + bob, 3);
		indicator.fill({ color: 0x00ff00 });
		c.addChild(indicator);
		return c;
	}

	private renderHUD(): void {
		this.hudContainer.removeChildren();

		// Semi-transparent HUD background at top
		const hudBg = new Graphics();
		hudBg.rect(0, 0, this.width, 36);
		hudBg.fill({ color: 0x000000, alpha: 0.6 });
		this.hudContainer.addChild(hudBg);

		const style = new TextStyle({
			fontFamily: "monospace",
			fontSize: 12,
			fill: 0xccccdd,
		});

		// Location
		const locText = new Text({
			text: `📍 ${this.currentMapName || "TOWNYUU Downstairs"}`,
			style,
		});
		locText.position.set(8, 10);
		this.hudContainer.addChild(locText);

		// Clock
		const hours = Math.floor((this.gameTime / 4) % 24);
		const mins = Math.floor((this.gameTime % 4) * 15);
		const timeText = new Text({
			text: `🕐 ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`,
			style,
		});
		timeText.position.set(this.width / 2 - 40, 10);
		this.hudContainer.addChild(timeText);

		// Wallet
		const moneyText = new Text({
			text: `💰 $19.99`,
			style: new TextStyle({
				fontFamily: "monospace",
				fontSize: 12,
				fill: 0x44ff44,
			}),
		});
		moneyText.position.set(this.width - 100, 10);
		this.hudContainer.addChild(moneyText);

		// HP bar (small, below wallet)
		const hpBarX = this.width - 100;
		const hpBarY = 24;
		const hpBarW = 80;
		const hpPct = this.playerHp / this.playerMaxHp;
		const hpBgG = new Graphics();
		hpBgG.rect(hpBarX, hpBarY, hpBarW, 6);
		hpBgG.fill({ color: 0x330000 });
		this.hudContainer.addChild(hpBgG);
		const hpFillG = new Graphics();
		hpFillG.rect(hpBarX, hpBarY, hpBarW * hpPct, 6);
		hpFillG.fill({
			color: hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xcccc44 : 0xcc4444,
		});
		this.hudContainer.addChild(hpFillG);
		const hpStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 8,
			fill: 0xdddddd,
		});
		const hpText = new Text({
			text: `HP ${this.playerHp}/${this.playerMaxHp}`,
			style: hpStyle,
		});
		hpText.position.set(hpBarX, hpBarY - 1);
		this.hudContainer.addChild(hpText);

		// Level display
		const lvlStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0xffdd44,
			fontWeight: "bold",
		});
		const lvlText = new Text({
			text: `Lv${this.playerLevel}`,
			style: lvlStyle,
		});
		lvlText.position.set(hpBarX, hpBarY + 8);
		this.hudContainer.addChild(lvlText);

		// XP bar
		const xpBarY2 = hpBarY + 20;
		const xpPct = this.playerXp / this.playerXpToNext;
		const xpBg = new Graphics();
		xpBg.rect(hpBarX, xpBarY2, hpBarW, 4);
		xpBg.fill({ color: 0x222233 });
		this.hudContainer.addChild(xpBg);
		const xpFill = new Graphics();
		xpFill.rect(hpBarX, xpBarY2, hpBarW * xpPct, 4);
		xpFill.fill({ color: 0x4488ff });
		this.hudContainer.addChild(xpFill);

		// Achievements count
		const unlocked = this.achievements.filter((a) => a.unlocked).length;
		const achStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 8,
			fill: 0xaa8844,
		});
		const achText = new Text({
			text: `🏆 ${unlocked}/${this.achievements.length}`,
			style: achStyle,
		});
		achText.position.set(hpBarX, xpBarY2 + 6);
		this.hudContainer.addChild(achText);

		// Active buff indicators
		if (this.buffTimers.length > 0) {
			const buffStyle = new TextStyle({
				fontFamily: "monospace",
				fontSize: 8,
				fill: 0xffaa44,
			});
			const buffText = new Text({
				text: this.buffTimers
					.map((b) => `${b.name.split(" ")[0]} ${Math.ceil(b.remaining)}s`)
					.join(" | "),
				style: buffStyle,
			});
			buffText.position.set(hpBarX, xpBarY2 + 16);
			this.hudContainer.addChild(buffText);
		}

		// Bottom hint bar
		const hintBg = new Graphics();
		hintBg.rect(0, this.height - 28, this.width, 28);
		hintBg.fill({ color: 0x000000, alpha: 0.5 });
		this.hudContainer.addChild(hintBg);

		const hintStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 11,
			fill: 0x666688,
		});
		const hint = new Text({
			text: "Arrows: Move · Space/E: Talk · I: Items · Q: Quests · T: Throw · F: Fish · F5/F9: Save",
			style: hintStyle,
		});
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, this.height - 14);
		this.hudContainer.addChild(hint);
	}

	// Dialogue Box

	private renderDialogueBox(): void {
		const boxW = this.width - 40;
		const boxH = 120;
		const boxX = 20;
		const boxY = this.height - boxH - 40;

		// Background
		const bg = new Graphics();
		bg.roundRect(boxX, boxY, boxW, boxH, 8);
		bg.fill({ color: 0x0a0a2a, alpha: 0.95 });
		bg.stroke({ color: 0x4466aa, width: 2 });
		this.hudContainer.addChild(bg);

		// NPC name
		const nameStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 14,
			fill: 0x44aaff,
			fontWeight: "bold",
		});
		const nameText = new Text({ text: this.dialogueNPC, style: nameStyle });
		nameText.position.set(boxX + 16, boxY + 10);
		this.hudContainer.addChild(nameText);

		// Separator line
		const sep = new Graphics();
		sep.moveTo(boxX + 10, boxY + 30);
		sep.lineTo(boxX + boxW - 10, boxY + 30);
		sep.stroke({ color: 0x334466, width: 1 });
		this.hudContainer.addChild(sep);

		// Dialogue text (typewriter effect)
		if (this.dialogueWriter) {
			const textObj = this.dialogueWriter.getDisplayObject();
			textObj.position.set(boxX + 16, boxY + 38);
			this.hudContainer.addChild(textObj);

			// Advance indicator (blinking triangle)
			if (this.dialogueWriter.isComplete()) {
				const blink = Math.sin(this.gameTime * 5) > 0;
				if (blink) {
					const indicatorStyle = new TextStyle({
						fontFamily: "Arial, sans-serif",
						fontSize: 16,
						fill: 0x4466aa,
					});
					const isLast = this.dialogueIndex >= this.dialogueLines.length - 1;
					const indicator = new Text({
						text: isLast ? "▼ END" : "▼",
						style: indicatorStyle,
					});
					indicator.position.set(boxX + boxW - 60, boxY + boxH - 25);
					this.hudContainer.addChild(indicator);
				}
			}
		}

		// Page indicator
		const pageStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0x445566,
		});
		const page = new Text({
			text: `${this.dialogueIndex + 1}/${this.dialogueLines.length}`,
			style: pageStyle,
		});
		page.position.set(boxX + boxW - 40, boxY + 10);
		this.hudContainer.addChild(page);

		// Dialogue choices
		if (this.dialogueWaitingChoice && this.dialogueChoices.length > 0) {
			const choiceY = boxY + boxH + 5;
			const choiceBoxH = 10 + this.dialogueChoices.length * 24;
			const choiceBg = new Graphics();
			choiceBg.roundRect(boxX + 40, choiceY, boxW - 80, choiceBoxH, 6);
			choiceBg.fill({ color: 0x0a0a3a, alpha: 0.95 });
			choiceBg.stroke({ color: 0x6688cc, width: 1 });
			this.hudContainer.addChild(choiceBg);

			for (let i = 0; i < this.dialogueChoices.length; i++) {
				const selected = i === this.dialogueChoiceIndex;
				const cStyle = new TextStyle({
					fontFamily: "Arial, sans-serif",
					fontSize: 13,
					fill: selected ? 0xffff88 : 0xaaaacc,
				});
				const cText = new Text({
					text: `${selected ? "\u25b8 " : "  "}${this.dialogueChoices[i]}`,
					style: cStyle,
				});
				cText.position.set(boxX + 56, choiceY + 6 + i * 24);
				this.hudContainer.addChild(cText);
			}
		}
	}

	// Access

	getContainer(): Container {
		return this.container;
	}
	getPlayerX(): number {
		return this.playerX;
	}
	getPlayerY(): number {
		return this.playerY;
	}
	getMapName(): string {
		return this.currentMapName || "TOWNYUU Downstairs";
	}

	private currentMapName = "TOWNYUU Downstairs";
	private currentAreaID: "town" | "mountains" | "beach" = "town";

	setMapName(name: string): void {
		this.currentMapName = name;
	}

	// Footstep Particles

	private renderStepParticles(camX: number, camY: number): void {
		for (const p of this.stepParticles) {
			const progress = p.age / p.maxAge;
			const alpha = 0.6 * (1 - progress);
			const expand = progress * 6;
			const pg = new Graphics();
			pg.circle(p.x - camX, p.y - camY, 2 + expand);
			pg.fill({ color: 0xaa9977, alpha });
			this.container.addChild(pg);
		}

		// Physics objects (cannonballs etc)
		for (const obj of this.physicsObjects) {
			const alpha = Math.max(0, 1 - obj.age * 0.3);
			const og = new Graphics();
			og.circle(obj.x - camX, obj.y - camY, obj.radius);
			og.fill({ color: obj.color, alpha });
			this.container.addChild(og);
		}
	}

	// Fishing Indicator Rendering

	// Quest Log Rendering

	private renderQuestLog(): void {
		const boxW = 360;
		const boxH = 60 + this.quests.length * 52;
		const boxX = (this.width - boxW) / 2;
		const boxY = Math.max(10, (this.height - boxH) / 2);

		const bg = new Graphics();
		bg.roundRect(boxX, boxY, boxW, boxH, 10);
		bg.fill({ color: 0x0a0a1a, alpha: 0.95 });
		bg.stroke({ color: 0x886622, width: 2 });
		this.container.addChild(bg);

		const titleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 18,
			fill: 0xffcc44,
			fontWeight: "bold",
		});
		const title = new Text({ text: "QUEST LOG", style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(this.width / 2, boxY + 20);
		this.container.addChild(title);

		const sep = new Graphics();
		sep.moveTo(boxX + 10, boxY + 38);
		sep.lineTo(boxX + boxW - 10, boxY + 38);
		sep.stroke({ color: 0x554422, width: 1 });
		this.container.addChild(sep);

		for (let i = 0; i < this.quests.length; i++) {
			const quest = this.quests[i];
			const questY = boxY + 46 + i * 52;

			// Quest name
			const nameStyle = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 13,
				fill: quest.complete ? 0x446644 : 0xddcc88,
			});
			const name = new Text({
				text: `${quest.complete ? "\u2713" : "\u25cb"} ${quest.name}`,
				style: nameStyle,
			});
			name.position.set(boxX + 14, questY);
			this.container.addChild(name);

			// Description
			const descStyle = new TextStyle({
				fontFamily: "monospace",
				fontSize: 10,
				fill: 0x887766,
			});
			const desc = new Text({ text: quest.desc, style: descStyle });
			desc.position.set(boxX + 30, questY + 16);
			this.container.addChild(desc);

			// Progress bar
			const barW = boxW - 80;
			const barY = questY + 32;
			const pct = quest.goal > 0 ? Math.min(1, quest.progress / quest.goal) : 0;

			const barBg = new Graphics();
			barBg.roundRect(boxX + 14, barY, barW, 8, 3);
			barBg.fill({ color: 0x1a1a2a });
			this.container.addChild(barBg);

			const barFill = new Graphics();
			barFill.roundRect(boxX + 14, barY, barW * pct, 8, 3);
			barFill.fill({ color: quest.complete ? 0x44aa44 : 0xaa8833 });
			this.container.addChild(barFill);

			const progStyle = new TextStyle({
				fontFamily: "monospace",
				fontSize: 9,
				fill: 0xaabb99,
			});
			const prog = new Text({
				text: `${quest.progress}/${quest.goal}`,
				style: progStyle,
			});
			prog.position.set(boxX + 18 + barW, barY - 1);
			this.container.addChild(prog);

			// Reward
			if (!quest.complete) {
				const rewStyle = new TextStyle({
					fontFamily: "monospace",
					fontSize: 9,
					fill: 0xffcc00,
				});
				const rew = new Text({ text: `${quest.reward}g`, style: rewStyle });
				rew.position.set(boxX + boxW - 40, questY + 2);
				this.container.addChild(rew);
			}
		}

		// Close hint
		const hintStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0x445544,
		});
		const hint = new Text({ text: "Press Q to close", style: hintStyle });
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, boxY + boxH - 14);
		this.container.addChild(hint);
	}

	private renderFishingIndicator(): void {
		// Position above center of screen (player is always near center)
		const px = this.width / 2;
		const py = this.height / 2 - 60;

		const bg = new Graphics();
		bg.roundRect(px - 40, py, 80, 20, 4);
		bg.fill({ color: 0x0a1a3a, alpha: 0.9 });
		bg.stroke({ color: 0x4488cc, width: 1 });
		this.container.addChild(bg);

		const labels: Record<string, string> = {
			casting: "Casting...",
			waiting: "Waiting...",
			caught: "🐟 Got one!",
		};
		const colors: Record<string, number> = {
			casting: 0x88bbdd,
			waiting: 0xaaaacc,
			caught: 0x44ffaa,
		};
		const state = this.fishingState;
		const style = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: colors[state] || 0xffffff,
		});
		const txt = new Text({ text: labels[state] || "...", style });
		txt.anchor.set(0.5);
		txt.position.set(px, py + 10);
		this.container.addChild(txt);

		// Bobber animation when waiting
		if (this.fishingState === "waiting") {
			const bob = Math.sin(this.gameTime * 4) * 3;
			const bobberX = px + 25;
			const bobberY = py + 22 + bob;
			const bobber = new Graphics();
			bobber.circle(bobberX, bobberY, 3);
			bobber.fill({ color: 0xff4444 });
			this.container.addChild(bobber);
		}
	}

	// Weather Rendering

	private renderWeather(): void {
		if (this.weatherType === "clear" || this.weatherParticles.length === 0)
			return;

		const isSnow = this.weatherType === "snow";
		const g = new Graphics();

		for (const p of this.weatherParticles) {
			if (isSnow) {
				// Snow: white circles, slight wobble
				const wobble = Math.sin(this.gameTime * 2 + p.x * 0.1) * 2;
				g.circle(p.x + wobble, p.y, p.size);
				g.fill({ color: 0xffffff, alpha: p.alpha });
			} else {
				// Rain/storm: streaks
				const len = this.weatherType === "storm" ? 12 : 8;
				g.moveTo(p.x, p.y);
				g.lineTo(p.x + p.vx * 0.02, p.y + len);
				g.stroke({ color: 0x8899bb, width: 1, alpha: p.alpha });
			}
		}
		this.container.addChild(g);

		// Weather indicator in HUD area
		const weatherNames: Record<string, string> = {
			clear: "",
			rain: "🌧️ Rain",
			snow: "❄️ Snow",
			storm: "⛈️ Storm",
		};
		const indicatorStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0x556677,
		});
		const indicator = new Text({
			text: weatherNames[this.weatherType] || "",
			style: indicatorStyle,
		});
		indicator.position.set(this.width / 2 - 30, this.height - 50);
		this.container.addChild(indicator);
	}

	// Inventory Rendering

	private renderInventory(): void {
		const boxW = 340;
		const itemsCount = this.inventory.length;
		const equipCount = this.equipment.length;
		const totalRows = Math.max(itemsCount, equipCount) + 3;
		const boxH = Math.max(220, 50 + totalRows * 26);
		const boxX = (this.width - boxW) / 2;
		const boxY = (this.height - boxH) / 2;

		// Background
		const bg = new Graphics();
		bg.roundRect(boxX, boxY, boxW, boxH, 8);
		bg.fill({ color: 0x0a0a2a, alpha: 0.95 });
		bg.stroke({ color: 0x4466aa, width: 2 });
		this.container.addChild(bg);

		// Title
		const titleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 16,
			fill: 0x44aaff,
			fontWeight: "bold",
		});
		const title = new Text({
			text: "INVENTORY & EQUIPMENT",
			style: titleStyle,
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, boxY + 20);
		this.container.addChild(title);

		// Separator
		const sep = new Graphics();
		sep.moveTo(boxX + 10, boxY + 38);
		sep.lineTo(boxX + boxW - 10, boxY + 38);
		sep.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(sep);

		// Equipment section
		const eqLabel = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 11,
			fill: 0x88aacc,
			fontWeight: "bold",
		});
		const eqText = new Text({ text: "EQUIPMENT", style: eqLabel });
		eqText.position.set(boxX + 14, boxY + 44);
		this.container.addChild(eqText);

		for (let i = 0; i < this.equipment.length; i++) {
			const eq = this.equipment[i];
			const itemY = boxY + 62 + i * 22;

			const slotStyle = new TextStyle({
				fontFamily: "monospace",
				fontSize: 11,
				fill: 0x667788,
			});
			const slotText = new Text({ text: `${eq.slot}:`, style: slotStyle });
			slotText.position.set(boxX + 16, itemY);
			this.container.addChild(slotText);

			if (eq.item) {
				const valStyle = new TextStyle({
					fontFamily: "Arial, sans-serif",
					fontSize: 11,
					fill: 0x44ff88,
				});
				const valText = new Text({
					text: `${eq.item} (${eq.stat} +${eq.bonus})`,
					style: valStyle,
				});
				valText.position.set(boxX + 80, itemY);
				this.container.addChild(valText);
			} else {
				const emptyStyle = new TextStyle({
					fontFamily: "monospace",
					fontSize: 11,
					fill: 0x333344,
				});
				const emptyText = new Text({
					text: "--- empty ---",
					style: emptyStyle,
				});
				emptyText.position.set(boxX + 80, itemY);
				this.container.addChild(emptyText);
			}
		}

		// Items separator
		const itemSep = new Graphics();
		itemSep.moveTo(boxX + 10, boxY + 64 + this.equipment.length * 22);
		itemSep.lineTo(boxX + boxW - 10, boxY + 64 + this.equipment.length * 22);
		itemSep.stroke({ color: 0x223344, width: 1 });
		this.container.addChild(itemSep);

		// Items section
		const itemLabel = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 11,
			fill: 0x88aacc,
			fontWeight: "bold",
		});
		const itemLabelText = new Text({ text: "ITEMS", style: itemLabel });
		itemLabelText.position.set(
			boxX + 14,
			boxY + 68 + this.equipment.length * 22,
		);
		this.container.addChild(itemLabelText);

		const itemStartY = boxY + 86 + this.equipment.length * 22;
		for (let i = 0; i < this.inventory.length; i++) {
			const item = this.inventory[i];
			const itemY = itemStartY + i * 24;
			if (itemY > boxY + boxH - 30) break; // Scrollable limit

			const icon = new Graphics();
			icon.roundRect(boxX + 16, itemY, 16, 16, 3);
			icon.fill({ color: item.icon });
			this.container.addChild(icon);

			const style = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 12,
				fill: 0xddddee,
			});
			const text = new Text({ text: `${item.name} x${item.count}`, style });
			text.position.set(boxX + 38, itemY + 1);
			this.container.addChild(text);
		}

		// Close hint
		const hintStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 10,
			fill: 0x445566,
		});
		const hint = new Text({ text: "I: Close  |  Q: Quests", style: hintStyle });
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, boxY + boxH - 14);
		this.container.addChild(hint);
	}

	// Day/Night Cycle

	private renderDayNight(): void {
		if (this.dayNightOverlay) {
			this.dayNightOverlay.destroy();
		}
		this.dayNightOverlay = new Graphics();
		this.dayNightOverlay.rect(0, 0, this.width, this.height);

		// Phase: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
		let alpha = 0;
		let color = 0x000033;

		if (this.dayNightPhase < 0.2) {
			// Dawn — warm orange fading to clear
			const t = this.dayNightPhase / 0.2;
			color = 0xff8844;
			alpha = 0.15 * (1 - t);
		} else if (this.dayNightPhase < 0.45) {
			// Day — clear
			alpha = 0;
		} else if (this.dayNightPhase < 0.55) {
			// Dusk — warm orange
			const t = (this.dayNightPhase - 0.45) / 0.1;
			color = 0xff6622;
			alpha = 0.2 * t;
		} else if (this.dayNightPhase < 0.8) {
			// Night — dark blue
			const t = (this.dayNightPhase - 0.55) / 0.25;
			color = 0x000033;
			alpha = 0.15 + 0.25 * t;
		} else {
			// Late night → dawn
			const t = (this.dayNightPhase - 0.8) / 0.2;
			color = 0x000044;
			alpha = 0.4 * (1 - t);
		}

		if (alpha > 0.01) {
			this.dayNightOverlay.fill({ color, alpha });
			this.container.addChild(this.dayNightOverlay);

			// Torch light glow around player at night
			if (alpha > 0.15) {
				const torchGlow = new Graphics();
				const flicker =
					Math.sin(this.gameTime * 8) * 10 + Math.sin(this.gameTime * 13) * 5;
				const radius = 80 + flicker;
				torchGlow.circle(this.width / 2, this.height / 2, radius);
				torchGlow.fill({ color: 0xffaa44, alpha: alpha * 0.3 });
				torchGlow.circle(this.width / 2, this.height / 2, radius * 0.5);
				torchGlow.fill({ color: 0xffcc66, alpha: alpha * 0.2 });
				this.container.addChild(torchGlow);
			}
		}
	}

	// Floating Notifications

	private renderNotifications(camX: number, camY: number): void {
		for (const notif of this.notifications) {
			const progress = notif.age / notif.maxAge;
			const alpha = 1 - progress;
			const yOffset = progress * 30; // Float upward

			const style = new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 12,
				fill: notif.color,
			});
			const text = new Text({ text: notif.text, style });
			text.alpha = alpha;
			text.anchor.set(0.5);
			text.position.set(notif.x - camX, notif.y - camY - yOffset);
			this.container.addChild(text);
		}
	}

	// Minimap

	private renderMinimap(): void {
		const padding = 8;
		const mapX = this.width - this.minimapSize - padding;
		const mapY = 42;
		const mapW = this.getMapWidth();
		const mapH = this.getMapHeight();
		const tileW = this.minimapSize / mapW;
		const tileH = this.minimapSize / mapH;

		// Background
		const bg = new Graphics();
		bg.roundRect(
			mapX - 4,
			mapY - 4,
			this.minimapSize + 8,
			this.minimapSize + 8,
			4,
		);
		bg.fill({ color: 0x000000, alpha: 0.7 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		// Tiles (simplified — just colored rects)
		const mmG = new Graphics();
		for (let ty = 0; ty < mapH; ty++) {
			for (let tx = 0; tx < mapW; tx++) {
				const tile = this.tiles[ty][tx];
				// Simplify tile colors for minimap
				let c = tile;
				if (tile === Tile.FLOWER) c = Tile.GRASS;
				if (tile === Tile.DOOR) c = Tile.BUILDING;
				if (tile === Tile.BRIDGE) c = Tile.PATH;
				if (tile === Tile.CHEST) c = 0xffcc00;
				if (tile === Tile.SAND) c = Tile.SAND;
				mmG.rect(
					mapX + tx * tileW,
					mapY + ty * tileH,
					tileW + 0.5,
					tileH + 0.5,
				);
				mmG.fill({ color: c });
			}
		}
		this.container.addChild(mmG);

		// Player trail (breadcrumb path)
		if (this.playerTrail.length > 1) {
			const trailG = new Graphics();
			for (let i = 1; i < this.playerTrail.length; i++) {
				const alpha = (i / this.playerTrail.length) * 0.4;
				const t = this.playerTrail[i];
				const tx2 = mapX + (t.x / TILE_SIZE) * tileW;
				const ty2 = mapY + (t.y / TILE_SIZE) * tileH;
				trailG.circle(tx2, ty2, 1);
				trailG.fill({ color: 0x88aaff, alpha });
			}
			this.container.addChild(trailG);
		}

		// Player dot (blinking)
		const blink = Math.sin(this.gameTime * 4) > -0.3;
		if (blink) {
			const px = mapX + (this.playerX / TILE_SIZE) * tileW;
			const py = mapY + (this.playerY / TILE_SIZE) * tileH;
			const dot = new Graphics();
			dot.circle(px, py, 3);
			dot.fill({ color: 0xffffff });
			this.container.addChild(dot);
		}

		// NPC dots
		for (const npc of this.npcs) {
			const nx = mapX + (npc.x / TILE_SIZE) * tileW;
			const ny = mapY + (npc.y / TILE_SIZE) * tileH;
			const npcDot = new Graphics();
			npcDot.circle(nx, ny, 2);
			npcDot.fill({ color: npc.color });
			this.container.addChild(npcDot);
		}

		// Label
		const labelStyle = new TextStyle({
			fontFamily: "monospace",
			fontSize: 8,
			fill: 0x445566,
		});
		const label = new Text({ text: "MAP", style: labelStyle });
		label.position.set(mapX, mapY - 12);
		this.container.addChild(label);
	}

	destroy(): void {
		this.container.destroy({ children: true });
	}

	/**
	 * Open a scene by name (dynamic import).
	 * Used for quick-access keys like I (Inventory), Q (Quests), etc.
	 */
	private openScene(sceneName: string): void {
		const app = (this as any).app;
		if (!app) return;

		import("../../state/StateManager").then(({ StateManager }) => {
			import("../../scenes/" + sceneName).then((mod) => {
				const SceneClass = Object.values(mod)[0] as any;
				if (!SceneClass) return;
				const scene = new SceneClass({
					name: sceneName.replace("Scene", "").toLowerCase(),
					app,
				});
				StateManager.push(scene);
			}).catch(() => {
				log.warn(`Failed to open scene: ${sceneName}`);
			});
		});
	}
}
