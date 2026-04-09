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
import {
    Container, Graphics, Text, TextStyle, Sprite, Texture,
} from 'pixi.js';
import { Logger } from '../debug/Logger';
import { AudioUtils } from '../audio/AudioUtils';
import { NetworkManager } from '../network/NetworkManager';

const log = new Logger('DemoWorld');

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
}

export class DemoWorld {
    private container: Container;
    private mapContainer: Container;
    private entityContainer: Container;
    private hudContainer: Container;

    private width: number;
    private height: number;

    // Player state
    playerX = 15 * TILE_SIZE;
    playerY = 10 * TILE_SIZE;
    playerSpeed = 120; // pixels per second
    playerDir = 0; // 0=down, 1=left, 2=right, 3=up

    // NPCs
    private npcs: { x: number; y: number; color: number; name: string; dir: number; dialogue: string[] }[] = [];

    // Clock
    private gameTime = 0;

    // Dialogue state
    private showDialogue = false;
    private dialogueLines: string[] = [];
    private dialogueIndex = 0;
    private dialogueNPC = '';
    private dialogueTimer = 0;
    private dialogueCharIndex = 0;
    private readonly DIALOGUE_SPEED = 30; // chars per second

    // Building interiors
    private insideBuilding: string | null = null;
    private buildingTiles: number[][] = [];
    private buildingW = 12;
    private buildingH = 9;
    private readonly BUILDING_DEFS: { doorTX: number; doorTY: number; name: string; interiorColor: number; items: string[] }[] = [
        { doorTX: 5, doorTY: 3, name: 'Cafe', interiorColor: 0x3d2b1f, items: ['Coffee', 'Espresso', 'Cake'] },
        { doorTX: 12, doorTY: 3, name: 'Shop', interiorColor: 0x2d3d2f, items: ['Potion', 'Key', 'Map'] },
        { doorTX: 22, doorTY: 3, name: 'Stadium', interiorColor: 0x2d2d3d, items: ['Ticket', 'Trophy'] },
    ];

    // Map data (simple 2D array)
    private tiles: number[][] = [];

    // Day/night cycle
    private dayNightPhase = 0; // 0-1 (0=dawn, 0.25=day, 0.5=dusk, 0.75=night)
    private dayNightSpeed = 0.008; // Full cycle in ~125 seconds
    private dayNightOverlay: Graphics | null = null;

    // Minimap
    private minimapSize = 120;
    private minimapScale = this.minimapSize / (MAP_W * TILE_SIZE);

    // Floating notifications
    private notifications: { text: string; x: number; y: number; age: number; maxAge: number; color: number }[] = [];

    // Footstep particles
    private stepTimer = 0;
    private readonly STEP_INTERVAL = 0.2;
    private stepParticles: { x: number; y: number; age: number; maxAge: number }[] = [];

    // Weather system
    private weatherType: 'clear' | 'rain' | 'snow' | 'storm' = 'clear';
    private weatherParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
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

    // Encounter system
    private encounterTimer = 0;
    private encounterInterval = 20; // Average seconds between encounters
    private currentEnemy: { name: string; hp: number; maxHp: number; attack: number; icon: number } | null = null;
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
    private achievements: { id: string; name: string; desc: string; unlocked: boolean }[] = [
        { id: 'first_fish', name: 'Gone Fishing', desc: 'Catch your first fish', unlocked: false },
        { id: 'first_battle', name: 'Battle Initiate', desc: 'Win your first battle', unlocked: false },
        { id: 'five_fish', name: 'Angler', desc: 'Catch 5 fish', unlocked: false },
        { id: 'ten_battles', name: 'Warrior', desc: 'Win 10 battles', unlocked: false },
        { id: 'level_5', name: 'Veteran', desc: 'Reach level 5', unlocked: false },
        { id: 'explorer', name: 'Explorer', desc: 'Visit all 3 buildings', unlocked: false },
        { id: 'treasure_hunter', name: 'Treasure Hunter', desc: 'Open 3 chests', unlocked: false },
        { id: 'rich', name: 'Wealthy', desc: 'Have 50+ gold', unlocked: false },
    ];
    private visitedBuildings = new Set<string>();
    private buildingsVisitedCount = 0;

    // Multiplayer presence
    private networkManager: NetworkManager | null = null;
    private otherPlayers: { id: string; name: string; x: number; y: number; color: number; dir: number }[] = [];
    private chatMessages: { from: string; text: string; age: number }[] = [];
    private showChat = false;
    private chatInput = '';
    private isOnline = false;
    private playerCount = 0;
    private readonly ENEMY_TYPES = [
        { name: 'Slime', hp: 30, attack: 5, icon: 0x44cc44 },
        { name: 'Bat', hp: 20, attack: 8, icon: 0x8844aa },
        { name: 'Goblin', hp: 45, attack: 10, icon: 0x44aa44 },
        { name: 'Ghost', hp: 25, attack: 12, icon: 0xaaaacc },
        { name: 'Mushroom', hp: 35, attack: 6, icon: 0xcc4444 },
    ];

    // Grass sway animation
    private grassSwayTime = 0;

    // Input state
    private keys: Record<string, boolean> = {};

    // Pause menu
    private isPaused = false;
    private pauseCursorPos = 0;
    private readonly pauseOptions = ['Resume', 'Inventory', 'Achievements', 'Save Game', 'Quit to Menu'];

    // Celebration particles (level-up, achievement)
    private celebrationParticles: { x: number; y: number; vx: number; vy: number; color: number; age: number; maxAge: number }[] = [];

    constructor(config: DemoWorldConfig) {
        this.width = config.width;
        this.height = config.height;
        this.container = new Container();
        this.mapContainer = new Container();
        this.entityContainer = new Container();
        this.hudContainer = new Container();

        this.container.addChild(this.mapContainer);
        this.container.addChild(this.entityContainer);
        this.container.addChild(this.hudContainer);

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
        this.weatherType = ['clear', 'rain', 'snow', 'storm'][Math.floor(Math.random() * 4)] as any;
        this.weatherTimer = Math.random() * this.weatherCycleDuration;

        // Starting inventory
        this.inventory = [
            { name: 'nD Console', count: 1, icon: 0x3366ff },
            { name: 'Wallet', count: 1, icon: 0x44aa44 },
            { name: 'Keys', count: 1, icon: 0xccaa00 },
        ];

        // Generate procedural SFX buffers
        this.initAudio();

        // Try connecting to multiplayer server
        this.initNetwork();

        log.info('DemoWorld created');
    }

    // ============================================================
    // Audio
    // ============================================================

    private audioInitialized = false;

    private initAudio(): void {
        try {
            AudioUtils.init();
            // Generate procedural SFX
            const stepBuf = AudioUtils.generateTone(200, 0.05);
            if (stepBuf) AudioUtils.storeBuffer('step', stepBuf);
            const hitBuf = AudioUtils.generateTone(300, 0.1);
            if (hitBuf) AudioUtils.storeBuffer('hit', hitBuf);
            const coinBuf = AudioUtils.generateTone(800, 0.15);
            if (coinBuf) AudioUtils.storeBuffer('coin', coinBuf);
            const fishBuf = AudioUtils.generateTone(500, 0.2);
            if (fishBuf) AudioUtils.storeBuffer('fish', fishBuf);
            const chestBuf = AudioUtils.generateTone(600, 0.3);
            if (chestBuf) AudioUtils.storeBuffer('chest', chestBuf);
            const lvlBuf = AudioUtils.generateTone(1000, 0.4);
            if (lvlBuf) AudioUtils.storeBuffer('levelup', lvlBuf);
            this.audioInitialized = true;
        } catch {
            log.warn('Audio not available');
        }
    }

    private playSound(name: string, volume = 0.3): void {
        if (!this.audioInitialized) return;
        AudioUtils.playSFX(name, volume);
    }

    // ============================================================
    // Network / Multiplayer Presence
    // ============================================================

    private initNetwork(): void {
        try {
            this.networkManager = new NetworkManager();
            const wsURL = window.location.hostname === 'localhost'
                ? 'http://localhost:3001'
                : 'https://ws.bobsgame.com';

            this.networkManager.on('connected', () => {
                this.isOnline = true;
                log.info('Connected to multiplayer server');
                this.notifications.push({
                    text: '🟢 Online!',
                    x: this.playerX, y: this.playerY - 20,
                    age: 0, maxAge: 2.0, color: 0x44ff44,
                });
            });

            this.networkManager.on('disconnected', () => {
                this.isOnline = false;
                this.otherPlayers = [];
                log.info('Disconnected from multiplayer server');
            });

            this.networkManager.on('player_joined', (data: unknown) => {
                const d = data as { name?: string };
                this.notifications.push({
                    text: `${d.name || 'Someone'} joined`,
                    x: this.playerX, y: this.playerY - 20,
                    age: 0, maxAge: 2.0, color: 0x44aaff,
                });
            });

            this.networkManager.on('chat', (data: unknown) => {
                const d = data as { from: string; message: string };
                this.chatMessages.push({ from: d.from, text: d.message, age: 0 });
                if (this.chatMessages.length > 50) this.chatMessages.shift();
            });

            this.networkManager.on('game_state', (data: unknown) => {
                // Update other player positions
                const d = data as { players?: { id: string; name: string; x: number; y: number; color: number; dir: number }[] };
                if (d.players) {
                    this.otherPlayers = d.players;
                    this.playerCount = d.players.length;
                }
            });

            this.networkManager.connect(wsURL);
        } catch {
            log.warn('Network not available — offline mode');
        }
    }

    private broadcastPosition(): void {
        if (!this.networkManager || !this.isOnline) return;
        this.networkManager.sendFrame(JSON.stringify({
            x: this.playerX,
            y: this.playerY,
            dir: this.playerDir,
            level: this.playerLevel,
            hp: this.playerHp,
        }));
    }

    private sendChatMessage(text: string): void {
        if (!this.networkManager || !this.isOnline) return;
        this.networkManager.sendChat(text);
        this.chatMessages.push({ from: 'You', text, age: 0 });
    }

    // ============================================================
    // Map Generation
    // ============================================================

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
            [0, 0], [1, 6], [2, 12], [0, 15], [1, 20], [0, 25],
            [11, 4], [11, 8], [11, 12],
            [MAP_H - 1, 2], [MAP_H - 1, 8], [MAP_H - 1, 14],
            [MAP_H - 2, 5], [MAP_H - 2, 18], [MAP_H - 1, 22],
            [MAP_H - 1, 26], [MAP_H - 2, 28],
        ];
        for (const [ty, tx] of treePositions) {
            if (ty < MAP_H && tx < MAP_W && this.tiles[ty][tx] === Tile.GRASS) {
                this.tiles[ty][tx] = Tile.TREE;
            }
        }

        // Flowers
        const flowerPositions = [
            [4, 7], [4, 8], [4, 14], [4, 20],
            [12, 3], [12, 10], [12, 25],
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

    // ============================================================
    // Save / Load
    // ============================================================

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
            inventory: this.inventory,
            fishCaught: this.fishCaught,
            openedChests: [...this.openedChests],
            weatherType: this.weatherType,
            dayNightPhase: this.dayNightPhase,
            gameTime: this.gameTime,
            timestamp: Date.now(),
        };
        localStorage.setItem('bobsgame_quicksave', JSON.stringify(saveData));
        this.notifications.push({
            text: '💾 Game Saved!',
            x: this.playerX, y: this.playerY - 30,
            age: 0, maxAge: 1.5, color: 0x44ff44,
        });
    }

    private quickLoad(): void {
        const raw = localStorage.getItem('bobsgame_quicksave');
        if (!raw) {
            this.notifications.push({
                text: 'No save found!',
                x: this.playerX, y: this.playerY - 30,
                age: 0, maxAge: 1.5, color: 0xff4444,
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
            this.inventory = data.inventory;
            this.fishCaught = data.fishCaught;
            this.openedChests = new Set(data.openedChests);
            this.weatherType = data.weatherType;
            this.dayNightPhase = data.dayNightPhase;
            this.gameTime = data.gameTime;
            this.notifications.push({
                text: '📂 Game Loaded!',
                x: this.playerX, y: this.playerY - 30,
                age: 0, maxAge: 1.5, color: 0x44aaff,
            });
        } catch {
            this.notifications.push({
                text: 'Save data corrupted!',
                x: this.playerX, y: this.playerY - 30,
                age: 0, maxAge: 1.5, color: 0xff4444,
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
            localStorage.setItem('bobsgame_autosave', JSON.stringify(saveData));
        }
    }

    // ============================================================
    // Level Up & Achievements
    // ============================================================

    private checkLevelUp(): void {
        while (this.playerXp >= this.playerXpToNext) {
            this.playerXp -= this.playerXpToNext;
            this.playerLevel++;
            this.playerXpToNext = Math.floor(this.playerXpToNext * 1.5);
            // Stat increases
            this.playerMaxHp += 10;
            this.playerHp = this.playerMaxHp;
            this.playerAttack += 3;
            this.playSound('levelup', 0.4);
            this.spawnCelebration(this.width / 2, this.height / 2, 40);
            this.notifications.push({
                text: `⬆️ Level ${this.playerLevel}! HP+10 ATK+3`,
                x: this.playerX, y: this.playerY - 50,
                age: 0, maxAge: 3.0, color: 0xffdd44,
            });
            this.checkAchievement('level_5', this.playerLevel >= 5);
        }
    }

    private checkAchievement(id: string, condition: boolean): void {
        if (!condition) return;
        const ach = this.achievements.find(a => a.id === id);
        if (!ach || ach.unlocked) return;
        ach.unlocked = true;
        this.spawnCelebration(this.width / 2, this.height / 2 - 30, 25);
        this.notifications.push({
            text: `🏆 ${ach.name}!`,
            x: this.playerX, y: this.playerY - 60,
            age: 0, maxAge: 3.0, color: 0xffcc00,
        });
    }

    // ============================================================
    // Treasure Chests
    // ============================================================

    private openedChests = new Set<string>(); // 'x,y' keys
    private chestItems = new Map<string, { name: string; icon: number }>([
        ['3,18', { name: 'Gold Coin', icon: 0xffcc00 }],
        ['26,5', { name: 'Health Potion', icon: 0xff4444 }],
        ['8,14', { name: 'Old Map', icon: 0xb8860b }],
        ['24,18', { name: 'Silver Ring', icon: 0xccccee }],
        ['1,12', { name: 'Emerald', icon: 0x44cc44 }],
    ]);

    private placeChests(): void {
        for (const [key] of this.chestItems) {
            const [x, y] = key.split(',').map(Number);
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
            this.checkAchievement('treasure_hunter', this.openedChests.size >= 3);
            const item = this.chestItems.get(key);
            if (item) {
                const existing = this.inventory.find(i => i.name === item.name);
                if (existing) {
                    existing.count++;
                } else {
                    this.inventory.push({ name: item.name, count: 1, icon: item.icon });
                }
                this.notifications.push({
                    text: `Found: ${item.name}!`,
                    x: this.playerX, y: this.playerY - 30,
                    age: 0, maxAge: 2.0, color: 0xffcc44,
                });
                this.playSound('chest', 0.4);
            }
        }
    }

    private fillRect(x: number, y: number, w: number, h: number, tile: number): void {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                if (y + dy < MAP_H && x + dx < MAP_W) {
                    this.tiles[y + dy][x + dx] = tile;
                }
            }
        }
    }

    // ============================================================
    // NPCs
    // ============================================================

    private placeNPCs(): void {
        this.npcs = [
            { x: 6 * TILE_SIZE, y: 5 * TILE_SIZE, color: 0xff6644, name: 'Barista', dir: 0, dialogue: [
                'Welcome to the Cafe!',
                'We have the best coffee in town.',
                'Have you tried the nD yet? Press ENTER to open it!',
            ]},
            { x: 13 * TILE_SIZE, y: 5 * TILE_SIZE, color: 0x44aaff, name: 'Shopkeep', dir: 0, dialogue: [
                'Welcome to my shop!',
                'I sell all kinds of items for your adventure.',
                'The puzzle tournament starts soon at the Stadium!',
            ]},
            { x: 15 * TILE_SIZE, y: 7 * TILE_SIZE, color: 0x44ff88, name: 'Fisherman', dir: 0, dialogue: [
                'I\'ve been fishing here all day...',
                'The fish aren\'t biting, but the view is nice.',
                'Did you know this river flows all the way to the ocean?',
            ]},
            { x: 22 * TILE_SIZE, y: 5 * TILE_SIZE, color: 0xffaa44, name: 'Coach', dir: 0, dialogue: [
                'The Stadium is closed for renovations.',
                'But you can still play on your nD!',
                'Press ENTER to open it and start playing!',
            ]},
            { x: 15 * TILE_SIZE, y: 15 * TILE_SIZE, color: 0xff44aa, name: 'Villager', dir: 3, dialogue: [
                'Nice day for a walk, isn\'t it?',
                'I heard there\'s a new puzzle game type coming soon.',
            ]},
            { x: 8 * TILE_SIZE, y: 18 * TILE_SIZE, color: 0xaa44ff, name: 'Gamer', dir: 2, dialogue: [
                'I\'m practicing my speedrun strats!',
                'My best time on Master difficulty is 2:34.',
                'You should try the online multiplayer — it\'s intense!',
            ]},
        ];
    }

    // ============================================================
    // Input
    // ============================================================

    private setupInput(): void {
        window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        this.gameTime += dt;

        // If dialogue is showing, only handle dialogue input
        if (this.showDialogue) {
            this.dialogueTimer += dt;

            // Advance text
            if (this.dialogueIndex < this.dialogueLines.length) {
                const line = this.dialogueLines[this.dialogueIndex];
                this.dialogueCharIndex = Math.min(line.length, Math.floor(this.dialogueTimer * this.DIALOGUE_SPEED));
            }

            // Space/Enter advances dialogue
            if (this.keys[' '] || this.keys['Enter']) {
                this.keys[' '] = false;
                this.keys['Enter'] = false;

                const line = this.dialogueLines[this.dialogueIndex];
                if (this.dialogueCharIndex < line.length) {
                    // Show full line immediately
                    this.dialogueCharIndex = line.length;
                } else {
                    // Next line or close
                    this.dialogueIndex++;
                    this.dialogueTimer = 0;
                    this.dialogueCharIndex = 0;
                    if (this.dialogueIndex >= this.dialogueLines.length) {
                        this.showDialogue = false;
                    }
                }
            }
            return;
        }

        // Escape key — pause menu
        if (this.keys['Escape']) {
            this.keys['Escape'] = false;
            this.isPaused = !this.isPaused;
            this.pauseCursorPos = 0;
        }

        // If paused, only handle pause menu input
        if (this.isPaused) {
            if (this.keys['ArrowUp'] || this.keys['w']) { this.keys['ArrowUp'] = false; this.keys['w'] = false; this.pauseCursorPos = Math.max(0, this.pauseCursorPos - 1); }
            if (this.keys['ArrowDown'] || this.keys['s']) { this.keys['ArrowDown'] = false; this.keys['s'] = false; this.pauseCursorPos = Math.min(this.pauseOptions.length - 1, this.pauseCursorPos + 1); }
            if (this.keys[' '] || this.keys['Enter']) { this.keys[' '] = false; this.keys['Enter'] = false; this.handlePauseOption(); }
            return;
        }

        // Player movement (disabled inside buildings)
        if (this.insideBuilding) return;
        let dx = 0, dy = 0;
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) { dy = -1; this.playerDir = 3; }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) { dy = 1; this.playerDir = 0; }
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) { dx = -1; this.playerDir = 1; }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) { dx = 1; this.playerDir = 2; }

        // Space / E to interact
        if (this.keys[' '] || this.keys['e'] || this.keys['E']) {
            this.keys[' '] = false;
            this.keys['e'] = false;
            this.keys['E'] = false;

            if (this.insideBuilding) {
                // Exit building
                this.insideBuilding = null;
                this.notifications.push({ text: 'Left building', x: this.playerX, y: this.playerY - 20, age: 0, maxAge: 1.0, color: 0x88aaff });
            } else {
                // Try NPC interaction first, then building
                if (!this.tryInteractNPC()) {
                    this.tryEnterBuilding();
                }
            }
        }

        // I key toggles inventory
        if (this.keys['i'] || this.keys['I']) {
            this.keys['i'] = false;
            this.keys['I'] = false;
            this.showInventory = !this.showInventory;
        }

        // F5 key — quick save
        if (this.keys['F5']) {
            this.keys['F5'] = false;
            this.quickSave();
        }
        // F9 key — quick load
        if (this.keys['F9']) {
            this.keys['F9'] = false;
            this.quickLoad();
        }

        // F key — fish near water
        if (this.keys['f'] || this.keys['F']) {
            this.keys['f'] = false;
            this.keys['F'] = false;
            this.tryFish();
        }

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        const newX = this.playerX + dx * this.playerSpeed * dt;
        const newY = this.playerY + dy * this.playerSpeed * dt;

        // Collision check (can't walk on water, trees, buildings, fences)
        const tileX = Math.floor(newX / TILE_SIZE);
        const tileY = Math.floor(newY / TILE_SIZE);
        if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
            const tile = this.tiles[tileY][tileX];
            if (tile !== Tile.WATER && tile !== Tile.TREE && tile !== Tile.BUILDING && tile !== Tile.ROOF && tile !== Tile.FENCE) {
                this.playerX = Math.max(0, Math.min((MAP_W - 1) * TILE_SIZE, newX));
                this.playerY = Math.max(0, Math.min((MAP_H - 1) * TILE_SIZE, newY));
                // Auto-open chest when stepping on it
                if (tile === Tile.CHEST) this.tryOpenChest();
            }
        }

        // Edge-of-map detection — area transition
        if (this.playerX <= 0 && dx < 0) {
            this.notifications.push({ text: '← West Field (coming soon)', x: this.playerX, y: this.playerY - 20, age: 0, maxAge: 1.5, color: 0x88aaff });
            this.playerX = 1;
        } else if (this.playerX >= (MAP_W - 1) * TILE_SIZE && dx > 0) {
            this.notifications.push({ text: 'East Forest → (coming soon)', x: this.playerX, y: this.playerY - 20, age: 0, maxAge: 1.5, color: 0x88aaff });
            this.playerX = (MAP_W - 1) * TILE_SIZE - 1;
        }
        if (this.playerY <= 0 && dy < 0) {
            this.notifications.push({ text: '↑ North Mountains (coming soon)', x: this.playerX, y: this.playerY - 20, age: 0, maxAge: 1.5, color: 0x88aaff });
            this.playerY = 1;
        } else if (this.playerY >= (MAP_H - 1) * TILE_SIZE && dy > 0) {
            this.notifications.push({ text: 'South Beach ↓ (coming soon)', x: this.playerX, y: this.playerY - 20, age: 0, maxAge: 1.5, color: 0x88aaff });
            this.playerY = (MAP_H - 1) * TILE_SIZE - 1;
        }

        // Footstep particles when moving
        if (dx !== 0 || dy !== 0) {
            this.stepTimer += dt;
            if (this.stepTimer >= this.STEP_INTERVAL) {
                this.stepTimer = 0;
                this.stepParticles.push({
                    x: this.playerX + TILE_SIZE / 2 + (Math.random() - 0.5) * 6,
                    y: this.playerY + TILE_SIZE - 2,
                    age: 0, maxAge: 0.4,
                });
            }
        } else {
            this.stepTimer = this.STEP_INTERVAL; // Ready to emit on next step
        }

        // Day/night cycle
        this.dayNightPhase = (this.dayNightPhase + dt * this.dayNightSpeed) % 1.0;

        // Fishing
        this.updateFishing(dt);

        // Random encounters (only when walking on grass, not inside buildings)
        if (!this.insideBuilding && dx !== 0 || dy !== 0) {
            const ptx = Math.floor(this.playerX / TILE_SIZE);
            const pty = Math.floor(this.playerY / TILE_SIZE);
            if (ptx >= 0 && ptx < MAP_W && pty >= 0 && pty < MAP_H && this.tiles[pty][ptx] === Tile.GRASS) {
                this.encounterTimer += dt;
                if (this.encounterTimer > this.encounterInterval * (0.5 + Math.random())) {
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

        // Auto-save
        this.autoSaveCheck(dt);

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
            const types: ('clear' | 'rain' | 'snow' | 'storm')[] = ['clear', 'rain', 'snow', 'storm'];
            this.weatherType = types[Math.floor(Math.random() * types.length)];
            this.weatherParticles = [];
        }

        // Spawn weather particles
        if (this.weatherType !== 'clear') {
            const spawnRate = this.weatherType === 'storm' ? 8 : this.weatherType === 'rain' ? 4 : 2;
            for (let i = 0; i < spawnRate; i++) {
                if (this.weatherParticles.length < this.MAX_WEATHER_PARTICLES) {
                    const windX = this.weatherType === 'storm' ? (Math.random() - 0.3) * 200 : (Math.random() - 0.5) * 30;
                    this.weatherParticles.push({
                        x: Math.random() * this.width,
                        y: -10,
                        vx: windX,
                        vy: this.weatherType === 'snow' ? 30 + Math.random() * 40 : 200 + Math.random() * 100,
                        size: this.weatherType === 'snow' ? 2 + Math.random() * 3 : 1,
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
        if (this.weatherType === 'storm') {
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

        // NPC wandering
        for (let i = 0; i < this.npcs.length; i++) {
            this.npcWanderTimers[i] += dt;
            if (this.npcWanderTimers[i] > 3 + Math.random() * 4) {
                this.npcWanderTimers[i] = 0;
                const npc = this.npcs[i];
                const orig = this.npcOriginalPositions[i];
                // Wander within 2 tiles of original position
                const wanderRange = TILE_SIZE * 2;
                const dx = (Math.random() - 0.5) * wanderRange;
                const dy = (Math.random() - 0.5) * wanderRange;
                npc.x = orig.x + dx;
                npc.y = orig.y + dy;
                // Face a random direction
                npc.dir = Math.floor(Math.random() * 4);
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
    }

    // ============================================================
    // NPC Interaction
    // ============================================================

    private tryInteractNPC(): boolean {
        if (this.insideBuilding) return false;
        const interactDist = TILE_SIZE * 1.5;
        for (const npc of this.npcs) {
            const dx = this.playerX - npc.x;
            const dy = this.playerY - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < interactDist) {
                this.showDialogue = true;
                this.dialogueLines = npc.dialogue;
                this.dialogueIndex = 0;
                this.dialogueNPC = npc.name;
                this.dialogueTimer = 0;
                this.dialogueCharIndex = 0;
                this.notifications.push({
                    text: `Talking to ${npc.name}...`,
                    x: this.playerX, y: this.playerY - 40,
                    age: 0, maxAge: 1.5, color: 0x44aaff,
                });
                return true;
            }
        }
        return false;
    }

    // ============================================================
    // Pause Menu
    // ============================================================

    private handlePauseOption(): void {
        const option = this.pauseOptions[this.pauseCursorPos];
        switch (option) {
            case 'Resume':
                this.isPaused = false;
                break;
            case 'Inventory':
                this.isPaused = false;
                this.showInventory = true;
                break;
            case 'Achievements':
                this.isPaused = false;
                // Achievement display happens in HUD
                this.notifications.push({
                    text: `🏆 ${this.achievements.filter(a => a.unlocked).length}/${this.achievements.length} Achievements`,
                    x: this.playerX, y: this.playerY - 30,
                    age: 0, maxAge: 3.0, color: 0xffcc00,
                });
                break;
            case 'Save Game':
                this.isPaused = false;
                this.quickSave();
                break;
            case 'Quit to Menu':
                // Handled by EngineScene
                break;
        }
    }

    get paused(): boolean { return this.isPaused; }
    get wantsQuit(): boolean {
        return this.isPaused && this.pauseOptions[this.pauseCursorPos] === 'Quit to Menu';
    }

    // ============================================================
    // Building Entry
    // ============================================================

    private tryEnterBuilding(): void {
        const playerTileX = Math.floor(this.playerX / TILE_SIZE);
        const playerTileY = Math.floor(this.playerY / TILE_SIZE);

        for (const def of this.BUILDING_DEFS) {
            if (playerTileX === def.doorTX && playerTileY === def.doorTY) {
                this.insideBuilding = def.name;
                this.visitedBuildings.add(def.name);
                this.checkAchievement('explorer', this.visitedBuildings.size >= 3);
                this.notifications.push({
                    text: `Entering ${def.name}...`,
                    x: this.playerX, y: this.playerY - 30,
                    age: 0, maxAge: 1.0, color: 0xffaa44,
                });
                // Generate interior
                this.generateBuildingInterior(def);
                return;
            }
        }
    }

    // ============================================================
    // Fishing
    // ============================================================

    private fishingState: 'idle' | 'casting' | 'waiting' | 'caught' = 'idle';
    private fishingTimer = 0;
    private fishCaught: string[] = [];

    // ============================================================
    // Combat / Encounters
    // ============================================================

    private startEncounter(): void {
        const template = this.ENEMY_TYPES[Math.floor(Math.random() * this.ENEMY_TYPES.length)];
        this.currentEnemy = { ...template, maxHp: template.hp };
        this.showCombat = true;
        this.combatLog = [`A wild ${template.name} appeared!`];
        this.combatTimer = 0;
        this.notifications.push({
            text: `Enemy: ${template.name}!`,
            x: this.playerX, y: this.playerY - 40,
            age: 0, maxAge: 1.5, color: 0xff4444,
        });
    }

    private combatStep(): void {
        if (!this.currentEnemy) return;

        // Player attacks
        const dmg = Math.floor(this.playerAttack * (0.8 + Math.random() * 0.4));
        this.currentEnemy.hp -= dmg;
        this.combatLog.push(`You deal ${dmg} damage!`);
        this.playSound('hit', 0.4);

        if (this.currentEnemy.hp <= 0) {
            this.combatLog.push(`${this.currentEnemy.name} defeated!`);
            // Reward
            const goldReward = 5 + Math.floor(Math.random() * 15);
            const existingGold = this.inventory.find(i => i.name === 'Gold Coin');
            if (existingGold) {
                existingGold.count += goldReward;
            } else {
                this.inventory.push({ name: 'Gold Coin', count: goldReward, icon: 0xffcc00 });
            }
            this.combatLog.push(`+${goldReward} Gold`);
            this.playSound('coin', 0.3);
            // XP reward
            const xpReward = 10 + Math.floor(Math.random() * 20);
            this.playerXp += xpReward;
            this.combatLog.push(`+${xpReward} XP`);
            this.checkLevelUp();
            // Track wins
            this.combatWins++;
            this.checkAchievement('first_battle', this.combatWins >= 1);
            this.checkAchievement('ten_battles', this.combatWins >= 10);
            this.checkAchievement('rich', (existingGold?.count ?? goldReward) >= 50);
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
        const eDmg = Math.floor(this.currentEnemy.attack * (0.7 + Math.random() * 0.6));
        this.playerHp -= eDmg;
        this.combatLog.push(`${this.currentEnemy.name} deals ${eDmg} damage!`);
        this.playSound('hit', 0.2);

        if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.combatLog.push('You fainted! Healing...');
            setTimeout(() => {
                this.playerHp = this.playerMaxHp;
                this.showCombat = false;
                this.currentEnemy = null;
                this.combatLog = [];
            }, 2000);
        }
    }

    // ============================================================
    // Chat & Online Status
    // ============================================================

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
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                fill: msg.from === 'You' ? 0x44aaff : 0xaabbcc,
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
        const statusText = this.isOnline ? `Online (${this.playerCount + 1})` : 'Offline';

        const dot = new Graphics();
        dot.circle(15, 50, 4);
        dot.fill({ color: statusColor });
        this.container.addChild(dot);

        const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: statusColor });
        const text = new Text({ text: statusText, style });
        text.position.set(24, 44);
        this.container.addChild(text);
    }

    // ============================================================
    // Pause Menu
    // ============================================================

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
        const titleStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 20, fill: 0x44aaff, fontWeight: 'bold' });
        const title = new Text({ text: 'PAUSED', style: titleStyle });
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
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                fill: selected ? 0xffff88 : 0x8888aa,
            });
            const optText = new Text({ text: `${selected ? '\u25b8 ' : '  '}${opt}`, style: optStyle });
            optText.anchor.set(0.5);
            optText.position.set(this.width / 2, panelY + 60 + i * 36);
            this.container.addChild(optText);
        });

        // Player stats at bottom
        const statsStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x556677 });
        const stats = new Text({
            text: `Lv${this.playerLevel} | HP ${this.playerHp}/${this.playerMaxHp} | XP ${this.playerXp}/${this.playerXpToNext} | Wins ${this.combatWins}`,
            style: statsStyle,
        });
        stats.anchor.set(0.5);
        stats.position.set(this.width / 2, panelY + panelH - 20);
        this.container.addChild(stats);
    }

    // ============================================================
    // Celebration Particles
    // ============================================================

    private renderCelebrationParticles(): void {
        for (let i = this.celebrationParticles.length - 1; i >= 0; i--) {
            const p = this.celebrationParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravity
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
    }

    private spawnCelebration(cx: number, cy: number, count = 30): void {
        const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const speed = 2 + Math.random() * 4;
            this.celebrationParticles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                color: colors[i % colors.length],
                age: 0, maxAge: 1.5 + Math.random(),
            });
        }
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
        const titleStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0xff6644, fontWeight: 'bold' });
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
        hpFill.fill({ color: hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xcccc44 : 0xcc4444 });
        this.container.addChild(hpFill);

        const hpStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xdddddd });
        const hpText = new Text({ text: `HP: ${enemy.hp}/${enemy.maxHp}`, style: hpStyle });
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
        const pStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0x44aaff });
        const pText = new Text({ text: `You: ${this.playerHp}/${this.playerMaxHp} HP`, style: pStyle });
        pText.position.set(boxX + 12, boxY + 55);
        this.container.addChild(pText);

        // Player HP bar
        const phpBg = new Graphics();
        phpBg.roundRect(boxX + 12, boxY + 74, hpBarW, 10, 3);
        phpBg.fill({ color: 0x003300 });
        this.container.addChild(phpBg);
        const phpFill = new Graphics();
        phpFill.roundRect(boxX + 12, boxY + 74, hpBarW * playerHpPct, 10, 3);
        phpFill.fill({ color: playerHpPct > 0.5 ? 0x44cc44 : playerHpPct > 0.25 ? 0xcccc44 : 0xcc4444 });
        this.container.addChild(phpFill);

        // Combat log (last 4 lines)
        const logStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xccccaa });
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
        if (this.fishingState !== 'idle') {
            this.fishingState = 'idle';
            return;
        }

        // Check if near water
        const ptx = Math.floor(this.playerX / TILE_SIZE);
        const pty = Math.floor(this.playerY / TILE_SIZE);
        let nearWater = false;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tx = ptx + dx;
                const ty = pty + dy;
                if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && this.tiles[ty][tx] === Tile.WATER) {
                    nearWater = true;
                }
            }
        }

        if (nearWater) {
            this.fishingState = 'casting';
            this.fishingTimer = 0;
            this.notifications.push({
                text: 'Casting line...',
                x: this.playerX, y: this.playerY - 30,
                age: 0, maxAge: 1.0, color: 0x44aaff,
            });
        } else {
            this.notifications.push({
                text: 'No water nearby!',
                x: this.playerX, y: this.playerY - 30,
                age: 0, maxAge: 1.0, color: 0xff6644,
            });
        }
    }

    private updateFishing(dt: number): void {
        if (this.fishingState === 'idle') return;

        this.fishingTimer += dt;

        if (this.fishingState === 'casting' && this.fishingTimer > 0.5) {
            this.fishingState = 'waiting';
            this.fishingTimer = 0;
        }

        if (this.fishingState === 'waiting') {
            // Random catch after 1-4 seconds
            const catchTime = 1 + Math.random() * 3;
            if (this.fishingTimer > catchTime) {
                this.fishingState = 'caught';
                this.fishingTimer = 0;
                const fishTypes = ['Trout', 'Bass', 'Salmon', 'Catfish', 'Gold Fish', 'Eel'];
                const fish = fishTypes[Math.floor(Math.random() * fishTypes.length)];
                this.fishCaught.push(fish);
                // Add to inventory
                const existing = this.inventory.find(i => i.name === fish);
                if (existing) {
                    existing.count++;
                } else {
                    this.inventory.push({ name: fish, count: 1, icon: 0x4488cc });
                }
                this.notifications.push({
                    text: `Caught a ${fish}!`,
                    x: this.playerX, y: this.playerY - 40,
                    age: 0, maxAge: 2.0, color: 0x44ffaa,
                });
                // Fishing achievements
                this.checkAchievement('first_fish', true);
                this.checkAchievement('five_fish', this.fishCaught.length >= 5);
                this.playSound('fish', 0.3);
            }
        }

        if (this.fishingState === 'caught' && this.fishingTimer > 1.5) {
            this.fishingState = 'idle';
        }
    }

    private generateBuildingInterior(def: { name: string; interiorColor: number; items: string[] }): void {
        this.buildingTiles = [];
        for (let y = 0; y < this.buildingH; y++) {
            this.buildingTiles[y] = [];
            for (let x = 0; x < this.buildingW; x++) {
                // Floor
                this.buildingTiles[y][x] = def.interiorColor;
                // Walls
                if (y === 0 || y === this.buildingH - 1 || x === 0 || x === this.buildingW - 1) {
                    this.buildingTiles[y][x] = 0x554433; // Wall color
                }
            }
        }
        // Door (bottom center)
        this.buildingTiles[this.buildingH - 1][Math.floor(this.buildingW / 2)] = def.interiorColor;
        // Counter/table in middle
        for (let x = 3; x < this.buildingW - 3; x++) {
            this.buildingTiles[4][x] = 0x665544;
        }
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        // If inside a building, render interior instead of world map
        if (this.insideBuilding) {
            return this.renderBuildingInterior();
        }

        // Camera offset (center on player)
        const camX = Math.max(0, Math.min(MAP_W * TILE_SIZE - this.width, this.playerX - this.width / 2));
        const camY = Math.max(0, Math.min(MAP_H * TILE_SIZE - this.height, this.playerY - this.height / 2));

        // Render map tiles
        this.mapContainer.removeChildren();
        const startTileX = Math.floor(camX / TILE_SIZE);
        const startTileY = Math.floor(camY / TILE_SIZE);
        const endTileX = Math.min(MAP_W, startTileX + Math.ceil(this.width / TILE_SIZE) + 1);
        const endTileY = Math.min(MAP_H, startTileY + Math.ceil(this.height / TILE_SIZE) + 1);

        for (let ty = startTileY; ty < endTileY; ty++) {
            for (let tx = startTileX; tx < endTileX; tx++) {
                if (ty < 0 || tx < 0 || ty >= MAP_H || tx >= MAP_W) continue;
                const tile = this.tiles[ty][tx];
                const g = new Graphics();
                g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                g.fill({ color: tile });

                // Add detail for certain tiles
                if (tile === Tile.WATER) {
                    // Flowing water — animated waves
                    const flow = Math.sin(this.gameTime * 1.5 + tx * 0.8 + ty * 0.4) * 0.2;
                    g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                    g.fill({ color: 0x3366cc, alpha: 0.25 + flow });
                    // Wave lines
                    const waveY1 = TILE_SIZE * 0.3 + Math.sin(this.gameTime * 2 + tx) * 3;
                    const waveY2 = TILE_SIZE * 0.65 + Math.sin(this.gameTime * 2.5 + tx + 1) * 3;
                    g.moveTo(0, waveY1);
                    g.quadraticCurveTo(TILE_SIZE / 2, waveY1 + 4, TILE_SIZE, waveY1);
                    g.stroke({ color: 0x5588dd, width: 1, alpha: 0.3 + flow });
                    g.moveTo(0, waveY2);
                    g.quadraticCurveTo(TILE_SIZE / 2, waveY2 - 3, TILE_SIZE, waveY2);
                    g.stroke({ color: 0x5588dd, width: 1, alpha: 0.25 + flow });
                    // Sparkle
                    const sparkle = Math.sin(this.gameTime * 3 + tx * 2.1 + ty * 1.7);
                    if (sparkle > 0.85) {
                        g.circle(TILE_SIZE * 0.5, TILE_SIZE * 0.4, 1.5);
                        g.fill({ color: 0xffffff, alpha: sparkle - 0.7 });
                    }
                } else if (tile === Tile.TREE) {
                    // Tree trunk
                    g.rect(TILE_SIZE * 0.3, TILE_SIZE * 0.6, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
                    g.fill({ color: 0x553311 });
                    // Tree canopy
                    g.circle(TILE_SIZE * 0.5, TILE_SIZE * 0.35, TILE_SIZE * 0.4);
                    g.fill({ color: 0x226611 });
                } else if (tile === Tile.DOOR) {
                    g.rect(TILE_SIZE * 0.25, TILE_SIZE * 0.2, TILE_SIZE * 0.5, TILE_SIZE * 0.8);
                    g.fill({ color: 0x442200 });
                    g.circle(TILE_SIZE * 0.6, TILE_SIZE * 0.55, 2);
                    g.fill({ color: 0xccaa00 }); // Door knob
                } else if (tile === Tile.BRIDGE) {
                    g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                    g.fill({ color: 0x9b8355 });
                    // Planks
                    g.moveTo(0, TILE_SIZE * 0.25);
                    g.lineTo(TILE_SIZE, TILE_SIZE * 0.25);
                    g.stroke({ color: 0x7b6345, width: 1 });
                    g.moveTo(0, TILE_SIZE * 0.75);
                    g.lineTo(TILE_SIZE, TILE_SIZE * 0.75);
                    g.stroke({ color: 0x7b6345, width: 1 });
                } else if (tile === Tile.CHEST) {
                    const key = `${tx},${ty}`;
                    const opened = this.openedChests.has(key);
                    // Chest base
                    g.rect(TILE_SIZE * 0.15, TILE_SIZE * 0.35, TILE_SIZE * 0.7, TILE_SIZE * 0.45);
                    g.fill({ color: opened ? 0x665533 : 0xb8860b });
                    // Chest lid
                    g.rect(TILE_SIZE * 0.1, TILE_SIZE * 0.2, TILE_SIZE * 0.8, TILE_SIZE * 0.2);
                    g.fill({ color: opened ? 0x554422 : 0xd4a020 });
                    // Lock/clasp
                    g.rect(TILE_SIZE * 0.4, TILE_SIZE * 0.4, TILE_SIZE * 0.2, TILE_SIZE * 0.15);
                    g.fill({ color: opened ? 0x666666 : 0xffcc00 });
                    // Sparkle when unopened
                    if (!opened) {
                        const spark = Math.sin(this.gameTime * 3 + tx + ty) * 0.5 + 0.5;
                        g.circle(TILE_SIZE * 0.5, TILE_SIZE * 0.15, 2 + spark);
                        g.fill({ color: 0xffee44, alpha: 0.3 + spark * 0.5 });
                    }
                } else if (tile === Tile.SAND) {
                    // Sand texture with dots
                    g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                    g.fill({ color: Tile.SAND });
                    const seed = tx * 7 + ty * 13;
                    for (let d = 0; d < 4; d++) {
                        const dx = ((seed + d * 37) % 24) + 4;
                        const dy = ((seed + d * 53) % 24) + 4;
                        g.circle(dx, dy, 1);
                        g.fill({ color: 0xc4a47a, alpha: 0.5 });
                    }
                } else if (tile === Tile.GRASS) {
                    // Grass blades that sway
                    const sway = Math.sin(this.grassSwayTime * 2 + tx * 0.7 + ty * 0.5) * 2;
                    for (let b = 0; b < 3; b++) {
                        const bx = 6 + b * 10 + ((tx * 3 + ty * 7 + b) % 5);
                        g.moveTo(bx, TILE_SIZE);
                        g.lineTo(bx + sway, TILE_SIZE - 8 - (b % 2) * 3);
                        g.stroke({ color: 0x3d7a2e, width: 1, alpha: 0.5 });
                    }
                } else if (tile === Tile.FLOWER) {
                    // Flowers sway too
                    const sway = Math.sin(this.grassSwayTime * 1.5 + tx + ty * 0.8) * 1.5;
                    g.circle(TILE_SIZE * 0.5 + sway, TILE_SIZE * 0.5, 4);
                    g.fill({ color: 0xff44aa });
                    g.circle(TILE_SIZE * 0.5 + sway, TILE_SIZE * 0.5, 2);
                    g.fill({ color: 0xffff00 });
                }

                g.position.set(tx * TILE_SIZE - camX, ty * TILE_SIZE - camY);
                this.mapContainer.addChild(g);
            }
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
                render: () => this.renderCharacter(npc.x - camX, npc.y - camY, npc.color, npc.dir, npc.name),
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
                render: () => this.renderCharacter(op.x - camX, op.y - camY, op.color, op.dir, op.name),
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
        if (this.fishingState !== 'idle') {
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

        // Floating notifications
        this.renderNotifications(camX, camY);

        // Footstep particles
        this.renderStepParticles(camX, camY);

        // Minimap
        this.renderMinimap();

        return this.container;
    }

    // ============================================================
    // Building Interior Rendering
    // ============================================================

    private renderBuildingInterior(): Container {
        const def = this.BUILDING_DEFS.find(d => d.name === this.insideBuilding);
        if (!def) { this.insideBuilding = null; return this.container; }

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
                if (ty === 0 || ty === this.buildingH - 1 || tx === 0 || tx === this.buildingW - 1) {
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

                    const itemStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0xffffff });
                    const itemText = new Text({ text: def.items[itemIdx], style: itemStyle });
                    itemText.anchor.set(0.5);
                    itemText.position.set(tileSize / 2, tileSize / 2 + 14);
                    g.addChild(itemText);
                }

                // Door indicator (bottom center)
                if (ty === this.buildingH - 1 && tx === Math.floor(this.buildingW / 2)) {
                    g.rect(tileSize * 0.2, tileSize * 0.3, tileSize * 0.6, tileSize * 0.7);
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
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0x44aaff,
            fontWeight: 'bold',
        });
        const nameText = new Text({ text: def.name, style: nameStyle });
        nameText.anchor.set(0.5);
        nameText.position.set(this.width / 2, offsetY - 18);
        this.container.addChild(nameText);

        // Items on display
        const itemsStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0xaabbcc });
        const itemsLabel = new Text({
            text: `Items: ${def.items.join(' · ')}`,
            style: itemsStyle,
        });
        itemsLabel.anchor.set(0.5);
        itemsLabel.position.set(this.width / 2, offsetY + this.buildingH * tileSize + 20);
        this.container.addChild(itemsLabel);

        // Exit hint
        const hintStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0x556677 });
        const hint = new Text({ text: 'Press SPACE to exit', style: hintStyle });
        hint.anchor.set(0.5);
        hint.position.set(this.width / 2, offsetY + this.buildingH * tileSize + 40);
        this.container.addChild(hint);

        return this.container;
    }

    private renderCharacter(x: number, y: number, color: number, dir: number, name: string): Container {
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
        const eyeOffsets: Record<number, { ex: number; ey: number }[]> = {
            0: [{ ex: -3, ey: -25 }, { ex: 3, ey: -25 }], // down
            1: [{ ex: -4, ey: -25 }], // left
            2: [{ ex: 4, ey: -25 }], // right
            3: [], // up (no eyes visible)
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
            fontFamily: 'Arial, sans-serif',
            fontSize: 9,
            fill: 0xffffff,
            fontWeight: 'bold',
        });
        const nameText = new Text({ text: name, style: nameStyle });
        nameText.anchor.set(0.5);
        nameText.position.set(0, -34);
        c.addChild(nameText);

        return c;
    }

    private renderPlayer(x: number, y: number): Container {
        const c = this.renderCharacter(x, y, 0x3366ff, this.playerDir, 'You');
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

        const style = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0xccccdd });

        // Location
        const locText = new Text({
            text: `📍 ${this.currentMapName || 'TOWNYUU Downstairs'}`,
            style,
        });
        locText.position.set(8, 10);
        this.hudContainer.addChild(locText);

        // Clock
        const hours = Math.floor((this.gameTime / 4) % 24);
        const mins = Math.floor((this.gameTime % 4) * 15);
        const timeText = new Text({
            text: `🕐 ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
            style,
        });
        timeText.position.set(this.width / 2 - 40, 10);
        this.hudContainer.addChild(timeText);

        // Wallet
        const moneyText = new Text({
            text: `💰 $19.99`,
            style: new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0x44ff44 }),
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
        hpFillG.fill({ color: hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xcccc44 : 0xcc4444 });
        this.hudContainer.addChild(hpFillG);
        const hpStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0xdddddd });
        const hpText = new Text({ text: `HP ${this.playerHp}/${this.playerMaxHp}`, style: hpStyle });
        hpText.position.set(hpBarX, hpBarY - 1);
        this.hudContainer.addChild(hpText);

        // Level display
        const lvlStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xffdd44, fontWeight: 'bold' });
        const lvlText = new Text({ text: `Lv${this.playerLevel}`, style: lvlStyle });
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
        const unlocked = this.achievements.filter(a => a.unlocked).length;
        const achStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0xaa8844 });
        const achText = new Text({ text: `🏆 ${unlocked}/${this.achievements.length}`, style: achStyle });
        achText.position.set(hpBarX, xpBarY2 + 6);
        this.hudContainer.addChild(achText);

        // Bottom hint bar
        const hintBg = new Graphics();
        hintBg.rect(0, this.height - 28, this.width, 28);
        hintBg.fill({ color: 0x000000, alpha: 0.5 });
        this.hudContainer.addChild(hintBg);

        const hintStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0x666688 });
        const hint = new Text({
            text: 'Arrows: Move · Space/E: Talk · I: Items · F: Fish · F5: Save · F9: Load · Enter: nD',
            style: hintStyle,
        });
        hint.anchor.set(0.5);
        hint.position.set(this.width / 2, this.height - 14);
        this.hudContainer.addChild(hint);
    }

    // ============================================================
    // Dialogue Box
    // ============================================================

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
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0x44aaff,
            fontWeight: 'bold',
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
        if (this.dialogueIndex < this.dialogueLines.length) {
            const fullLine = this.dialogueLines[this.dialogueIndex];
            const visibleText = fullLine.substring(0, this.dialogueCharIndex);

            const textStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 14,
                fill: 0xddddee,
                wordWrap: true,
                wordWrapWidth: boxW - 32,
            });
            const text = new Text({ text: visibleText, style: textStyle });
            text.position.set(boxX + 16, boxY + 38);
            this.hudContainer.addChild(text);

            // Advance indicator (blinking triangle)
            const allCharsShown = this.dialogueCharIndex >= fullLine.length;
            if (allCharsShown) {
                const blink = Math.sin(this.gameTime * 5) > 0;
                if (blink) {
                    const indicatorStyle = new TextStyle({
                        fontFamily: 'Arial, sans-serif',
                        fontSize: 16,
                        fill: 0x4466aa,
                    });
                    const isLast = this.dialogueIndex >= this.dialogueLines.length - 1;
                    const indicator = new Text({
                        text: isLast ? '▼ END' : '▼',
                        style: indicatorStyle,
                    });
                    indicator.position.set(boxX + boxW - 60, boxY + boxH - 25);
                    this.hudContainer.addChild(indicator);
                }
            }
        }

        // Page indicator
        const pageStyle = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 10,
            fill: 0x445566,
        });
        const page = new Text({
            text: `${this.dialogueIndex + 1}/${this.dialogueLines.length}`,
            style: pageStyle,
        });
        page.position.set(boxX + boxW - 40, boxY + 10);
        this.hudContainer.addChild(page);
    }

    // ============================================================
    // Access
    // ============================================================

    getContainer(): Container { return this.container; }
    getPlayerX(): number { return this.playerX; }
    getPlayerY(): number { return this.playerY; }
    getMapName(): string { return this.currentMapName || 'TOWNYUU Downstairs'; }

    private currentMapName = '';

    setMapName(name: string): void { this.currentMapName = name; }

    // ============================================================
    // Footstep Particles
    // ============================================================

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
    }

    // ============================================================
    // Fishing Indicator Rendering
    // ============================================================

    private renderFishingIndicator(): void {
        // Position above center of screen (player is always near center)
        const px = this.width / 2;
        const py = this.height / 2 - 60;

        const bg = new Graphics();
        bg.roundRect(px - 40, py, 80, 20, 4);
        bg.fill({ color: 0x0a1a3a, alpha: 0.9 });
        bg.stroke({ color: 0x4488cc, width: 1 });
        this.container.addChild(bg);

        const labels: Record<string, string> = { casting: 'Casting...', waiting: 'Waiting...', caught: '🐟 Got one!' };
        const colors: Record<string, number> = { casting: 0x88bbdd, waiting: 0xaaaacc, caught: 0x44ffaa };
        const state = this.fishingState;
        const style = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: colors[state] || 0xffffff });
        const txt = new Text({ text: labels[state] || '...', style });
        txt.anchor.set(0.5);
        txt.position.set(px, py + 10);
        this.container.addChild(txt);

        // Bobber animation when waiting
        if (this.fishingState === 'waiting') {
            const bob = Math.sin(this.gameTime * 4) * 3;
            const bobberX = px + 25;
            const bobberY = py + 22 + bob;
            const bobber = new Graphics();
            bobber.circle(bobberX, bobberY, 3);
            bobber.fill({ color: 0xff4444 });
            this.container.addChild(bobber);
        }
    }

    // ============================================================
    // Weather Rendering
    // ============================================================

    private renderWeather(): void {
        if (this.weatherType === 'clear' || this.weatherParticles.length === 0) return;

        const isSnow = this.weatherType === 'snow';
        const g = new Graphics();

        for (const p of this.weatherParticles) {
            if (isSnow) {
                // Snow: white circles, slight wobble
                const wobble = Math.sin(this.gameTime * 2 + p.x * 0.1) * 2;
                g.circle(p.x + wobble, p.y, p.size);
                g.fill({ color: 0xffffff, alpha: p.alpha });
            } else {
                // Rain/storm: streaks
                const len = this.weatherType === 'storm' ? 12 : 8;
                g.moveTo(p.x, p.y);
                g.lineTo(p.x + p.vx * 0.02, p.y + len);
                g.stroke({ color: 0x8899bb, width: 1, alpha: p.alpha });
            }
        }
        this.container.addChild(g);

        // Weather indicator in HUD area
        const weatherNames: Record<string, string> = { clear: '', rain: '🌧️ Rain', snow: '❄️ Snow', storm: '⛈️ Storm' };
        const indicatorStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x556677 });
        const indicator = new Text({ text: weatherNames[this.weatherType] || '', style: indicatorStyle });
        indicator.position.set(this.width / 2 - 30, this.height - 50);
        this.container.addChild(indicator);
    }

    // ============================================================
    // Inventory Rendering
    // ============================================================

    private renderInventory(): void {
        const boxW = 300;
        const boxH = Math.max(200, 40 + this.inventory.length * 28);
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
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0x44aaff,
            fontWeight: 'bold',
        });
        const title = new Text({ text: 'INVENTORY', style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, boxY + 20);
        this.container.addChild(title);

        // Separator
        const sep = new Graphics();
        sep.moveTo(boxX + 10, boxY + 38);
        sep.lineTo(boxX + boxW - 10, boxY + 38);
        sep.stroke({ color: 0x334466, width: 1 });
        this.container.addChild(sep);

        // Items
        for (let i = 0; i < this.inventory.length; i++) {
            const item = this.inventory[i];
            const itemY = boxY + 48 + i * 28;

            // Item icon (colored square)
            const icon = new Graphics();
            icon.roundRect(boxX + 16, itemY, 18, 18, 3);
            icon.fill({ color: item.icon });
            this.container.addChild(icon);

            // Item name
            const style = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0xddddee });
            const text = new Text({ text: `${item.name}  ×${item.count}`, style });
            text.position.set(boxX + 42, itemY + 2);
            this.container.addChild(text);
        }

        if (this.inventory.length === 0) {
            const emptyStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0x556677 });
            const empty = new Text({ text: 'No items', style: emptyStyle });
            empty.anchor.set(0.5);
            empty.position.set(this.width / 2, boxY + 70);
            this.container.addChild(empty);
        }

        // Close hint
        const hintStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x445566 });
        const hint = new Text({ text: 'Press I to close', style: hintStyle });
        hint.anchor.set(0.5);
        hint.position.set(this.width / 2, boxY + boxH - 18);
        this.container.addChild(hint);
    }

    // ============================================================
    // Day/Night Cycle
    // ============================================================

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
                const flicker = Math.sin(this.gameTime * 8) * 10 + Math.sin(this.gameTime * 13) * 5;
                const radius = 80 + flicker;
                torchGlow.circle(this.width / 2, this.height / 2, radius);
                torchGlow.fill({ color: 0xffaa44, alpha: alpha * 0.3 });
                torchGlow.circle(this.width / 2, this.height / 2, radius * 0.5);
                torchGlow.fill({ color: 0xffcc66, alpha: alpha * 0.2 });
                this.container.addChild(torchGlow);
            }
        }
    }

    // ============================================================
    // Floating Notifications
    // ============================================================

    private renderNotifications(camX: number, camY: number): void {
        for (const notif of this.notifications) {
            const progress = notif.age / notif.maxAge;
            const alpha = 1 - progress;
            const yOffset = progress * 30; // Float upward

            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
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

    // ============================================================
    // Minimap
    // ============================================================

    private renderMinimap(): void {
        const padding = 8;
        const mapX = this.width - this.minimapSize - padding;
        const mapY = 42;
        const tileW = this.minimapSize / MAP_W;
        const tileH = this.minimapSize / MAP_H;

        // Background
        const bg = new Graphics();
        bg.roundRect(mapX - 4, mapY - 4, this.minimapSize + 8, this.minimapSize + 8, 4);
        bg.fill({ color: 0x000000, alpha: 0.7 });
        bg.stroke({ color: 0x334466, width: 1 });
        this.container.addChild(bg);

        // Tiles (simplified — just colored rects)
        const mmG = new Graphics();
        for (let ty = 0; ty < MAP_H; ty++) {
            for (let tx = 0; tx < MAP_W; tx++) {
                const tile = this.tiles[ty][tx];
                // Simplify tile colors for minimap
                let c = tile;
                if (tile === Tile.FLOWER) c = Tile.GRASS;
                if (tile === Tile.DOOR) c = Tile.BUILDING;
                if (tile === Tile.BRIDGE) c = Tile.PATH;
                if (tile === Tile.CHEST) c = 0xffcc00;
                if (tile === Tile.SAND) c = Tile.SAND;
                mmG.rect(mapX + tx * tileW, mapY + ty * tileH, tileW + 0.5, tileH + 0.5);
                mmG.fill({ color: c });
            }
        }
        this.container.addChild(mmG);

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
        const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0x445566 });
        const label = new Text({ text: 'MAP', style: labelStyle });
        label.position.set(mapX, mapY - 12);
        this.container.addChild(label);
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
