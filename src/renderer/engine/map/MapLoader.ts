/**
 * MapLoader — loads map data from JSON files, the server, or generates procedural maps.
 *
 * This is the data pipeline for the MapManager. It handles:
 * 1. Loading maps from the server API (`/maps/:id`)
 * 2. Loading maps from static JSON assets (`/data/maps/`)
 * 3. Generating built-in procedural maps for the demo world
 * 4. Parsing the loaded JSON into MapData structures that MapManager can register
 *
 * Map JSON format:
 * {
 *   "id": number,
 *   "name": string,
 *   "width": number,
 *   "height": number,
 *   "tileWidth": number,
 *   "tileHeight": number,
 *   "layers": { "ground": number[][], "objects": number[][], "overhead": number[][] },
 *   "areas": AreaData[],
 *   "doors": DoorData[],
 *   "lights": LightData[]
 * }
 */

import { SERVER_URL } from "../../../shared/Config";
import { Logger } from "../debug/Logger";
import type { MapData, MapManager } from "./MapManager";

const log = new Logger("MapLoader");

// ============================================================
// Tile enum for procedural generation
// ============================================================

export enum MapTile {
	EMPTY = 0,
	GRASS = 1,
	PATH = 2,
	WALL = 3,
	WATER = 4,
	TREE = 5,
	DOOR = 6,
	FLOOR = 7,
	ROOF = 8,
	SAND = 9,
	FLOWER = 10,
	BRIDGE = 11,
	STONE = 12,
	CHEST = 13,
	SIGN = 14,
	STAIRS_DOWN = 15,
	STAIRS_UP = 16,
}

// ============================================================
// Color mapping for tiles (used in rendering)
// ============================================================

export const TILE_COLORS: Record<number, number> = {
	[MapTile.EMPTY]: 0x000000,
	[MapTile.GRASS]: 0x448844,
	[MapTile.PATH]: 0xaa8866,
	[MapTile.WALL]: 0x554433,
	[MapTile.WATER]: 0x3366aa,
	[MapTile.TREE]: 0x2a6a2a,
	[MapTile.DOOR]: 0x886622,
	[MapTile.FLOOR]: 0x665544,
	[MapTile.ROOF]: 0x884422,
	[MapTile.SAND]: 0xddcc88,
	[MapTile.FLOWER]: 0xff88aa,
	[MapTile.BRIDGE]: 0x886644,
	[MapTile.STONE]: 0x888899,
	[MapTile.CHEST]: 0xffcc00,
	[MapTile.SIGN]: 0x997744,
	[MapTile.STAIRS_DOWN]: 0x554466,
	[MapTile.STAIRS_UP]: 0x665577,
};

// ============================================================
// MapLoader
// ============================================================

export class MapLoader {
	private mapManager: MapManager;
	private loadedMapIds: Set<number> = new Set();

	constructor(mapManager: MapManager) {
		this.mapManager = mapManager;
	}

	// ============================================================
	// Loading from Server
	// ============================================================

	/**
	 * Load a map from the server API by its ID.
	 * The server stores maps as JSON files at /opt/bobsgameweb/server/maps/map_{id}.json
	 */
	async loadFromServer(mapId: number): Promise<MapData | null> {
		try {
			const response = await fetch(`${SERVER_URL}/maps/${mapId}`);
			if (!response.ok) {
				log.warn(`Server map ${mapId} not found (${response.status})`);
				return null;
			}
			const data = await response.json();
			const mapData = this.parseMapJSON(data);
			if (mapData) {
				this.mapManager.registerMap(mapData);
				this.loadedMapIds.add(mapId);
				log.info(`Loaded map "${mapData.name}" (ID ${mapId}) from server`);
			}
			return mapData;
		} catch (e) {
			log.warn(`Failed to load map ${mapId} from server: ${e}`);
			return null;
		}
	}

	/**
	 * Load a map from a static JSON asset file.
	 */
	async loadFromAsset(path: string): Promise<MapData | null> {
		try {
			const response = await fetch(path);
			if (!response.ok) {
				log.warn(`Asset map not found: ${path}`);
				return null;
			}
			const data = await response.json();
			const mapData = this.parseMapJSON(data);
			if (mapData) {
				this.mapManager.registerMap(mapData);
				this.loadedMapIds.add(mapData.id);
				log.info(`Loaded map "${mapData.name}" from asset: ${path}`);
			}
			return mapData;
		} catch (e) {
			log.warn(`Failed to load map from asset ${path}: ${e}`);
			return null;
		}
	}

	/**
	 * Load all maps listed in a manifest file.
	 * The manifest is a JSON array of { id, name, path } objects.
	 */
	async loadFromManifest(manifestPath: string): Promise<number> {
		try {
			const response = await fetch(manifestPath);
			if (!response.ok) {
				log.warn(`Map manifest not found: ${manifestPath}`);
				return 0;
			}
			const manifest: Array<{ id: number; name: string; path: string }> =
				await response.json();
			let loaded = 0;
			for (const entry of manifest) {
				const map = await this.loadFromAsset(entry.path);
				if (map) loaded++;
			}
			log.info(`Loaded ${loaded}/${manifest.length} maps from manifest`);
			return loaded;
		} catch (e) {
			log.warn(`Failed to load manifest: ${e}`);
			return 0;
		}
	}

	// ============================================================
	// JSON Parsing
	// ============================================================

	/**
	 * Parse raw JSON into a MapData structure.
	 * Supports both the "layers" format and flat "tiles" format.
	 */
	parseMapJSON(data: any): MapData | null {
		try {
			if (!data || !data.id || !data.name) {
				log.warn("Invalid map JSON: missing id or name");
				return null;
			}

			// Support both flat tile arrays and layered format
			let tiles: number[][];
			if (data.tiles) {
				tiles = data.tiles;
			} else if (data.layers) {
				// Merge ground + objects layers into a single tile array
				const ground = data.layers.ground ?? [];
				const objects = data.layers.objects ?? [];
				const height = ground.length || objects.length;
				const width =
					height > 0 ? ground[0]?.length || objects[0]?.length || 0 : 0;
				tiles = [];
				for (let y = 0; y < height; y++) {
					tiles[y] = [];
					for (let x = 0; x < width; x++) {
						// Objects layer takes priority, then ground
						tiles[y][x] = objects[y]?.[x] ?? ground[y]?.[x] ?? 0;
					}
				}
			} else {
				log.warn("Invalid map JSON: no tiles or layers");
				return null;
			}

			return {
				id: data.id,
				name: data.name,
				width: data.width ?? tiles[0]?.length ?? 0,
				height: data.height ?? tiles.length,
				tileWidth: data.tileWidth ?? 32,
				tileHeight: data.tileHeight ?? 32,
				tiles,
				areas: data.areas ?? [],
				doors: data.doors ?? [],
				warps: data.warps ?? [],
				lights: data.lights ?? [],
				isOutside: data.isOutside ?? true,
			};
		} catch (e) {
			log.warn(`Failed to parse map JSON: ${e}`);
			return null;
		}
	}

	// ============================================================
	// Procedural Map Generation
	// ============================================================

	/**
	 * Generate a town map with buildings, paths, NPCs, and exits.
	 * This creates the "TOWNYUU Downstairs" starting area.
	 */
	generateTownMap(): MapData {
		const W = 40;
		const H = 40;
		const tiles: number[][] = [];

		// Fill with grass
		for (let y = 0; y < H; y++) {
			tiles[y] = [];
			for (let x = 0; x < W; x++) {
				tiles[y][x] = MapTile.GRASS;
			}
		}

		// Main path (horizontal, center)
		for (let x = 2; x < W - 2; x++) {
			tiles[H / 2][x] = MapTile.PATH;
			tiles[H / 2 + 1][x] = MapTile.PATH;
		}

		// Cross path (vertical, center)
		for (let y = 2; y < H - 2; y++) {
			tiles[y][W / 2] = MapTile.PATH;
			tiles[y][W / 2 + 1] = MapTile.PATH;
		}

		// Buildings (4 buildings in corners)
		const buildings = [
			{ x: 3, y: 3, w: 6, h: 5, name: "Inn" },
			{ x: W - 9, y: 3, w: 6, h: 5, name: "Shop" },
			{ x: 3, y: H - 8, w: 6, h: 5, name: "Cafe" },
			{ x: W - 9, y: H - 8, w: 6, h: 5, name: "Library" },
		];

		for (const b of buildings) {
			// Walls
			for (let y = b.y; y < b.y + b.h; y++) {
				for (let x = b.x; x < b.x + b.w; x++) {
					if (
						y === b.y ||
						y === b.y + b.h - 1 ||
						x === b.x ||
						x === b.x + b.w - 1
					) {
						tiles[y][x] = MapTile.WALL;
					} else {
						tiles[y][x] = MapTile.FLOOR;
					}
				}
			}
			// Door (bottom center of each building)
			const doorX = b.x + Math.floor(b.w / 2);
			tiles[b.y + b.h - 1][doorX] = MapTile.DOOR;

			// Roof tiles above
			if (b.y > 0) {
				for (let x = b.x; x < b.x + b.w; x++) {
					if (b.y - 1 >= 0) tiles[b.y - 1][x] = MapTile.ROOF;
				}
			}
		}

		// Trees along edges
		for (let x = 0; x < W; x++) {
			tiles[0][x] = MapTile.TREE;
			tiles[1][x] = MapTile.TREE;
			tiles[H - 1][x] = MapTile.TREE;
			tiles[H - 2][x] = MapTile.TREE;
		}
		for (let y = 0; y < H; y++) {
			tiles[y][0] = MapTile.TREE;
			tiles[y][1] = MapTile.TREE;
			tiles[y][W - 1] = MapTile.TREE;
			tiles[y][W - 2] = MapTile.TREE;
		}

		// Flowers scattered
		for (let i = 0; i < 15; i++) {
			const fx = 3 + Math.floor(Math.random() * (W - 6));
			const fy = 3 + Math.floor(Math.random() * (H - 6));
			if (tiles[fy][fx] === MapTile.GRASS) {
				tiles[fy][fx] = MapTile.FLOWER;
			}
		}

		// Water feature (small pond)
		for (let y = H / 2 - 3; y < H / 2 - 1; y++) {
			for (let x = 5; x < 10; x++) {
				tiles[y][x] = MapTile.WATER;
			}
		}

		// Bridge over water
		tiles[H / 2 - 3][7] = MapTile.BRIDGE;
		tiles[H / 2 - 2][7] = MapTile.BRIDGE;

		// Sign near spawn
		tiles[H / 2 + 3][W / 2] = MapTile.SIGN;

		const mapData: MapData = {
			id: 1,
			name: "TOWNYUU Downstairs",
			width: W,
			height: H,
			tileWidth: 32,
			tileHeight: 32,
			tiles,
			areas: [],
			doors: buildings.map((b, i) => ({
				x: b.x + Math.floor(b.w / 2),
				y: b.y + b.h - 1,
				destinationMapName: `${b.name}_interior`,
				destinationX: 3,
				destinationY: 3,
				locked: false,
				requiresItem: null,
			})),
			warps: [
				{
					x: W / 2,
					y: 2,
					data: {
						destinationMapName: "overworld",
						destinationX: 50,
						destinationY: 50,
					},
				},
				{
					x: W / 2,
					y: H - 3,
					data: {
						destinationMapName: "beach",
						destinationX: 5,
						destinationY: 5,
					},
				},
			],
			lights: [
				{ x: W / 2, y: H / 2, radius: 200, color: 0xffaa44, intensity: 0.6 },
				{ x: 6, y: H / 2, radius: 120, color: 0x4488ff, intensity: 0.4 },
			],
			isOutside: true,
		};

		this.mapManager.registerMap(mapData);
		return mapData;
	}

	/**
	 * Generate a building interior map.
	 */
	generateInteriorMap(name: string, width = 12, height = 10): MapData {
		const tiles: number[][] = [];

		for (let y = 0; y < height; y++) {
			tiles[y] = [];
			for (let x = 0; x < width; x++) {
				if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
					tiles[y][x] = MapTile.WALL;
				} else {
					tiles[y][x] = MapTile.FLOOR;
				}
			}
		}

		// Door at bottom center
		tiles[height - 1][Math.floor(width / 2)] = MapTile.DOOR;

		// Add a chest
		tiles[2][width - 2] = MapTile.CHEST;

		const mapData: MapData = {
			id: 100 + Math.abs(name.hashCode?.() ?? Math.floor(Math.random() * 1000)),
			name,
			width,
			height,
			tileWidth: 32,
			tileHeight: 32,
			tiles,
			areas: [],
			doors: [
				{
					x: Math.floor(width / 2),
					y: height - 1,
					destinationMapName: "TOWNYUU Downstairs",
					destinationX: 20,
					destinationY: 25,
					locked: false,
					requiresItem: null,
				},
			],
			warps: [],
			lights: [
				{
					x: width / 2,
					y: height / 2,
					radius: 150,
					color: 0xffaa44,
					intensity: 0.5,
				},
			],
			isOutside: false,
		};

		this.mapManager.registerMap(mapData);
		return mapData;
	}

	/**
	 * Generate an overworld map (large, with varied terrain).
	 */
	generateOverworldMap(): MapData {
		const W = 80;
		const H = 80;
		const tiles: number[][] = [];

		// Simple noise-like terrain generation using layered sin waves
		for (let y = 0; y < H; y++) {
			tiles[y] = [];
			for (let x = 0; x < W; x++) {
				const noise =
					Math.sin(x * 0.1) * Math.cos(y * 0.1) +
					Math.sin(x * 0.05 + y * 0.07) * 0.5 +
					Math.cos(x * 0.03 - y * 0.04) * 0.3;

				if (noise < -0.6) {
					tiles[y][x] = MapTile.WATER;
				} else if (noise < -0.3) {
					tiles[y][x] = MapTile.SAND;
				} else if (noise < 0.5) {
					tiles[y][x] = MapTile.GRASS;
				} else if (noise < 0.7) {
					tiles[y][x] = MapTile.TREE;
				} else {
					tiles[y][x] = MapTile.STONE;
				}
			}
		}

		// Create a path through the center
		for (let x = 5; x < W - 5; x++) {
			const py = Math.floor(H / 2 + Math.sin(x * 0.1) * 3);
			for (let dy = -1; dy <= 1; dy++) {
				if (py + dy >= 0 && py + dy < H) {
					tiles[py + dy][x] = MapTile.PATH;
				}
			}
		}

		const mapData: MapData = {
			id: 2,
			name: "overworld",
			width: W,
			height: H,
			tileWidth: 32,
			tileHeight: 32,
			tiles,
			areas: [],
			doors: [],
			warps: [
				{
					x: 40,
					y: 5,
					data: {
						destinationMapName: "TOWNYUU Downstairs",
						destinationX: 20,
						destinationY: 3,
					},
				},
			],
			lights: [],
			isOutside: true,
		};

		this.mapManager.registerMap(mapData);
		return mapData;
	}

	/**
	 * Generate all built-in maps and register them with MapManager.
	 * Called during startup to provide maps when no server data is available.
	 */
	generateBuiltinMaps(): number {
		let count = 0;
		this.generateTownMap();
		count++;
		this.generateOverworldMap();
		count++;

		// Generate interiors for each building
		for (const name of [
			"Inn_interior",
			"Shop_interior",
			"Cafe_interior",
			"Library_interior",
		]) {
			this.generateInteriorMap(name);
			count++;
		}

		log.info(`Generated ${count} built-in maps`);
		return count;
	}

	/**
	 * Save a map to the server.
	 */
	async saveToServer(mapData: MapData): Promise<boolean> {
		try {
			const response = await fetch(`${SERVER_URL}/maps/${mapData.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(mapData),
			});
			return response.ok;
		} catch (e) {
			log.warn(`Failed to save map to server: ${e}`);
			return false;
		}
	}

	// ============================================================
	// Query
	// ============================================================

	isMapLoaded(mapId: number): boolean {
		return this.loadedMapIds.has(mapId);
	}

	getLoadedCount(): number {
		return this.loadedMapIds.size;
	}
}
