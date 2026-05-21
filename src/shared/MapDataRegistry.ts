/**
 * MapDataRegistry — loads and manages all game map JSON data.
 *
 * Provides map lookup, area connections, and entity spawning data
 * for the game world. Maps are loaded from /data/maps/*.json.
 *
 * Usage:
 *   const registry = new MapDataRegistry();
 *   await registry.loadAll();
 *   const town = registry.getMap("townyuu");
 *   const connections = registry.getConnections("townyuu");
 */
export interface MapEntity {
	id: string;
	type: string;
	x: number;
	y: number;
	name?: string;
	color?: string;
	dialogue?: string;
	destination?: string;
	destX?: number;
	destY?: number;
	loot?: string[];
	enemy?: string;
	text?: string;
	event?: string;
}

export interface MapEventData {
	trigger: string;
	target?: string;
	command: string;
	params: Record<string, unknown>;
	once?: boolean;
	condition?: { flag?: string };
}

export interface EnemyData {
	name: string;
	hp: number;
	attack: number;
	defense: number;
	xp: number;
	gold: number;
}

export interface GameMapData {
	id: string;
	name: string;
	width: number;
	height: number;
	tileSize: number;
	tiles: string[];
	legend: Record<string, string>;
	entities: MapEntity[];
	events?: MapEventData[];
	encounterRate?: number;
	enemies?: EnemyData[];
}

export class MapDataRegistry {
	private maps: Map<string, GameMapData> = new Map();
	private loaded = false;

	/** Load all built-in map data */
	async loadAll(): Promise<void> {
		if (this.loaded) return;

		try {
			// Fetch the manifest and load all legacy maps
			const resp = await fetch('/maps/legacy-house-manifest.json');
			if (resp.ok) {
				const manifest: { id: number; name: string; path: string }[] = await resp.json();
				for (const entry of manifest) {
					try {
						const mapResp = await fetch(entry.path);
						if (mapResp.ok) {
							const json = await mapResp.json();
							this.register(this.importLegacyMap(json));
						}
					} catch (e) {
						console.warn(`[MapDataRegistry] Failed to load ${entry.path}:`, e);
					}
			}
			console.log(`[MapDataRegistry] Loaded ${this.maps.size} legacy maps from manifest`);
		} else {
			// Fallback to placeholder maps if manifest not available
			this.register(this.createTownyuu());
			this.register(this.createDarkForest());
			this.register(this.createBeach());
			this.register(this.createDragonLair());
		}

		// Mark as loaded
		this.loaded = true;
		} catch (error) {
			console.error("Failed to load MapDataRegistry:", error);
			// Fallback
			this.register(this.createTownyuu());
			this.register(this.createDarkForest());
			this.register(this.createBeach());
			this.register(this.createDragonLair());
			this.loaded = true;
		}
	}

	/** 
	 * Converts legacy JSON format to internal GameMapData 
	 * This allows v3.0.5 to consume the extracted Java assets.
	 */
	importLegacyMap(json: any): GameMapData {
		const entities: MapEntity[] = [];

		// Convert doors to warps
		if (json.doors) {
			json.doors.forEach((door: any, index: number) => {
				entities.push({
					id: `warp_${json.id}_${index}`,
					type: "warp",
					x: door.x,
					y: door.y,
					destination: door.destinationMapName || door.targetMap,
					destX: door.destinationX || 0,
					destY: door.destinationY || 0,
					name: door.name
				});
			});
		}

		// Convert number[][] tiles to character-based string[] for the engine
		const tiles: string[] = json.tiles.map((row: number[]) => {
			return row.map(tileId => {
				// Simple mapping: 3 = wall, 7 = floor, 6 = door
				if (tileId === 3) return "B";
				if (tileId === 7) return "G";
				if (tileId === 6) return "D";
				return "G";
			}).join("");
		});

		return {
			id: json.id.toString(),
			name: json.name || json.legacyName,
			width: json.width,
			height: json.height,
			tileSize: json.tileWidth || 8,
			tiles: tiles,
			legend: { G: "grass", P: "path", W: "water", T: "tree", B: "building", D: "door" },
			entities: entities
		};
	}

	/** Get a map by ID */
	getMap(id: string): GameMapData | null {
		return this.maps.get(id) ?? null;
	}

	/** Get all map IDs */
	getMapIds(): string[] {
		return [...this.maps.keys()];
	}

	/** Get connections (warps) from a map */
	getConnections(mapId: string): { target: string; x: number; y: number; destX: number; destY: number }[] {
		const map = this.maps.get(mapId);
		if (!map) return [];

		return map.entities
			.filter(e => e.type === "warp" && e.destination)
			.map(e => ({
				target: e.destination!,
				x: e.x,
				y: e.y,
				destX: e.destX ?? 0,
				destY: e.destY ?? 0,
			}));
	}

	/** Get entities of a specific type */
	getEntities(mapId: string, type?: string): MapEntity[] {
		const map = this.maps.get(mapId);
		if (!map) return [];
		if (type) return map.entities.filter(e => e.type === type);
		return map.entities;
	}

	/** Get enemies for a map */
	getEnemies(mapId: string): EnemyData[] {
		return this.maps.get(mapId)?.enemies ?? [];
	}

	/** Check if loaded */
	isLoaded(): boolean {
		return this.loaded;
	}

	/** Register a map */
	private register(map: GameMapData): void {
		this.maps.set(map.id, map);
	}

	// ============================================================
	// Built-in map generators
	// ============================================================

	private createTownyuu(): GameMapData {
		return {
			id: "townyuu",
			name: "TOWNYUU",
			width: 40,
			height: 30,
			tileSize: 8,
			tiles: this.generateTownTiles(),
			legend: { G: "grass", P: "path", W: "water", T: "tree", B: "building", D: "door", S: "sand", F: "flower" },
			entities: [
				{ id: "npc_mayor", type: "npc", x: 14, y: 10, name: "Mayor", dialogue: "mayor_intro", color: "#ffcc00" },
				{ id: "npc_shopkeep", type: "npc", x: 8, y: 13, name: "Shopkeep", dialogue: "shopkeep_basic", color: "#ff8844" },
				{ id: "npc_guard", type: "npc", x: 30, y: 10, name: "Guard", color: "#4488ff" },
				{ id: "npc_shadow", type: "npc", x: 22, y: 22, name: "???", dialogue: "mystery_npc", color: "#aa44ff" },
				{ id: "chest_town_1", type: "chest", x: 6, y: 4, loot: ["health_potion", "50_gold"] },
				{ id: "chest_town_2", type: "chest", x: 34, y: 4, loot: ["iron_sword"] },
				{ id: "sign_1", type: "sign", x: 20, y: 8, text: "Welcome to TOWNYUU!" },
				{ id: "exit_east", type: "warp", x: 39, y: 15, destination: "dark_forest", destX: 1, destY: 15 },
				{ id: "exit_south", type: "warp", x: 20, y: 29, destination: "beach", destX: 20, destY: 1 },
			],
			events: [
				{ trigger: "ENTER_AREA", command: "SHOW_MESSAGE", params: { text: "Entered TOWNYUU" } },
			],
		};
	}

	private createDarkForest(): GameMapData {
		return {
			id: "dark_forest",
			name: "Dark Forest",
			width: 50,
			height: 40,
			tileSize: 8,
			tiles: this.generateForestTiles(),
			legend: { G: "grass", T: "tree", P: "path", W: "water", S: "sand", C: "cave" },
			encounterRate: 0.15,
			enemies: [
				{ name: "Forest Goblin", hp: 20, attack: 5, defense: 2, xp: 15, gold: 8 },
				{ name: "Wild Wolf", hp: 30, attack: 8, defense: 3, xp: 25, gold: 12 },
				{ name: "Dark Slime", hp: 15, attack: 4, defense: 1, xp: 10, gold: 5 },
			],
			entities: [
				{ id: "exit_west", type: "warp", x: 0, y: 20, destination: "townyuu", destX: 38, destY: 15 },
				{ id: "exit_cave", type: "warp", x: 49, y: 20, destination: "dragon_lair", destX: 1, destY: 10 },
				{ id: "chest_1", type: "chest", x: 10, y: 5, loot: ["mana_potion", "100_gold"] },
				{ id: "chest_2", type: "chest", x: 40, y: 32, loot: ["steel_blade"] },
			],
			events: [
				{ trigger: "ENTER_AREA", command: "SHOW_MESSAGE", params: { text: "The forest grows dark..." } },
			],
		};
	}

	private createBeach(): GameMapData {
		return {
			id: "beach",
			name: "Sunset Beach",
			width: 40,
			height: 25,
			tileSize: 8,
			tiles: this.generateBeachTiles(),
			legend: { G: "grass", P: "path", S: "sand", W: "water" },
			encounterRate: 0.05,
			enemies: [
				{ name: "Crab", hp: 12, attack: 4, defense: 3, xp: 8, gold: 3 },
			],
			entities: [
				{ id: "npc_fisherman", type: "npc", x: 12, y: 3, name: "Fisherman", color: "#44aaff" },
				{ id: "exit_north", type: "warp", x: 20, y: 0, destination: "townyuu", destX: 20, destY: 28 },
				{ id: "fishing_spot", type: "fishing", x: 30, y: 10 },
				{ id: "chest_beach", type: "chest", x: 5, y: 8, loot: ["gold_ring", "200_gold"] },
			],
			events: [
				{ trigger: "ENTER_AREA", command: "SHOW_MESSAGE", params: { text: "The ocean breeze..." } },
			],
		};
	}

	private createDragonLair(): GameMapData {
		return {
			id: "dragon_lair",
			name: "Dragon's Lair",
			width: 30,
			height: 20,
			tileSize: 8,
			tiles: this.generateLairTiles(),
			legend: { R: "rock", L: "lava", P: "path" },
			encounterRate: 0.3,
			enemies: [
				{ name: "Fire Elemental", hp: 40, attack: 12, defense: 5, xp: 35, gold: 20 },
				{ name: "Lava Golem", hp: 60, attack: 15, defense: 8, xp: 50, gold: 30 },
				{ name: "Ancient Dragon", hp: 200, attack: 30, defense: 15, xp: 200, gold: 500 },
			],
			entities: [
				{ id: "exit", type: "warp", x: 0, y: 10, destination: "dark_forest", destX: 48, destY: 20 },
				{ id: "treasure", type: "chest", x: 15, y: 7, loot: ["dragon_crown", "5000_gold"] },
			],
			events: [
				{ trigger: "ENTER_AREA", command: "SHOW_MESSAGE", params: { text: "The dragon awaits." } },
			],
		};
	}

	// ============================================================
	// Tile generators
	// ============================================================

	private generateTownTiles(): string[] {
		const W = 40;
		const H = 30;
		const rows: string[] = [];

		for (let y = 0; y < H; y++) {
			let row = "";
			for (let x = 0; x < W; x++) {
				// Water lake (top-left area)
				if (x >= 6 && x <= 9 && y >= 3 && y <= 7) { row += "W"; continue; }
				// Trees (scattered)
				if ((x < 4 && y < 5) || (x > 30 && y < 5) || (x > 32 && y >= 1 && y <= 3)) { row += "T"; continue; }
				// Trees (right side)
				if (x >= 32 && y >= 1 && y <= 6) { row += "T"; continue; }
				// Buildings (center)
				if (x >= 12 && x <= 15 && y >= 13 && y <= 15) {
					if (y === 14 && (x === 13 || x === 14)) row += "D"; else row += "B";
					continue;
				}
				if (x >= 22 && x <= 25 && y >= 13 && y <= 15) {
					if (y === 14 && (x === 23 || x === 24)) row += "D"; else row += "B";
					continue;
				}
				// Main path (horizontal)
				if (y >= 9 && y <= 11 && x >= 3 && x <= 37) { row += "P"; continue; }
				// Vertical path
				if (x >= 19 && x <= 21 && y >= 3 && y <= 27) { row += "P"; continue; }
				// Sand (south)
				if (y >= 22 && y <= 24 && (x <= 7 || x >= 33)) { row += "S"; continue; }
				// Flowers
				if ((x + y) % 7 === 0 && y > 7 && y < 22 && !(x >= 19 && x <= 21)) { row += "F"; continue; }
				row += "G";
			}
			rows.push(row);
		}
		return rows;
	}

	private generateForestTiles(): string[] {
		const W = 50;
		const H = 40;
		const rows: string[] = [];

		for (let y = 0; y < H; y++) {
			let row = "";
			for (let x = 0; x < W; x++) {
				// Central path
				if (x >= 16 && x <= 19 && y >= 3 && y <= 37) { row += "P"; continue; }
				if (y >= 18 && y <= 21 && x >= 3 && x <= 47) { row += "P"; continue; }
				// Clearings
				if (x >= 22 && x <= 28 && y >= 8 && y <= 14) { row += "G"; continue; }
				// Water pond
				if (x >= 34 && x <= 37 && y >= 32 && y <= 36) { row += "W"; continue; }
				// Cave entrance
				if (x >= 46 && y >= 18 && y <= 21) { row += "C"; continue; }
				// Dense trees (random-ish based on position)
				const density = 0.6 + 0.3 * Math.sin(x * 0.3) * Math.cos(y * 0.2);
				if (Math.random() < density && row === "") { row += "T"; continue; }
				if (row === "") row += "G";
			}
			rows.push(row);
		}
		return rows;
	}

	private generateBeachTiles(): string[] {
		const W = 40;
		const H = 25;
		const rows: string[] = [];

		for (let y = 0; y < H; y++) {
			let row = "";
			for (let x = 0; x < W; x++) {
				if (y < 3) { row += "G"; continue; }
				if (y < 4) { row += x >= 14 && x <= 26 ? "P" : "G"; continue; }
				if (y < 10) {
					// Sand with path
					if (x >= 14 && x <= 26) { row += "P"; continue; }
					// Sand widens toward water
					const sandStart = Math.max(0, 5 - Math.floor((y - 3) * 0.5));
					const sandEnd = Math.min(W - 1, 35 + Math.floor((y - 3) * 0.5));
					if (x >= sandStart && x <= sandEnd) { row += "S"; continue; }
					row += "G";
					continue;
				}
				// Water gets closer
				const waterStart = 30 + Math.floor((y - 10) * 0.5);
				if (x >= 14 && x <= 26) { row += "P"; continue; }
				if (x > waterStart) { row += "W"; continue; }
				row += "S";
			}
			rows.push(row);
		}
		return rows;
	}

	private generateLairTiles(): string[] {
		const W = 30;
		const H = 20;
		const rows: string[] = [];

		for (let y = 0; y < H; y++) {
			let row = "";
			for (let x = 0; x < W; x++) {
				if (x <= 1 || x >= 28 || y <= 1 || y >= 18) { row += "R"; continue; }
				// Lava pool
				const dx = x - 15;
				const dy = y - 10;
				if (dx * dx + dy * dy < 64) {
					// Path through center
					if (x >= 13 && x <= 17 && y >= 5 && y <= 15) { row += "P"; continue; }
					row += "L";
					continue;
				}
				// Paths
				if (x >= 13 && x <= 17) { row += "P"; continue; }
				if (y >= 9 && y <= 11) { row += "P"; continue; }
				// Rock walls with some lava
				if (Math.random() < 0.15) { row += "L"; continue; }
				row += "R";
			}
			rows.push(row);
		}
		return rows;
	}
}
