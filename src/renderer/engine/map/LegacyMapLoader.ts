/**
 * LegacyMapLoader — loads real binary-extracted map data into the engine.
 *
 * Maps are extracted from bobsgame_v8830.zip as JSON with real tile IDs
 * referencing the original 83,392-tile tileset. Layer data is in sparse
 * format: { s: [[index, tileId], ...], l: totalLength }.
 *
 * Layer mapping (from Java source):
 * _0 = ground, _1 = groundObjects, _2 = groundShadow
 * _3 = objects, _4 = objects2, _5 = objectShadow
 * _6 = above, _7 = above2, _8 = spriteShadow
 * _9 = hitBounds, _10 = lightMask, _11 = extra, _15 = extra2
 */
import { MapData } from "../../../shared/MapData";
import { DoorData } from "../../../shared/DoorData";
// DoorGraph.ts fallback removed - door_graph.json is the single source of truth
import { getDoorGraphForMap } from "./DoorGraphLoader";

/** Shape of a real binary-extracted map JSON file */
export interface RealMapJSON {
	id: number;
	name: string;
	width: number;
	height: number;
	isOutside: boolean;
	layers: Record<string, number[] | SparseLayer>;
}

/** Sparse layer format: only non-zero entries */
export interface SparseLayer {
	s: number[][]; // [[index, tileId], ...]
	l: number; // total length
}

/** Legacy door format from _Project.txt state data */
export interface LegacyDoor {
	name: string;
	x: number;
	y: number;
	destinationMapName: string;
	destinationX: number;
	destinationY: number;
}

/** Cache of already-fetched maps */
const mapCache: Map<string, RealMapJSON> = new Map();

/** Map name to filename mapping */
const MAP_FILE_MAP: Record<string, string> = {};
let manifestLoaded = false;

/** Load the manifest to build the name->file mapping */
async function ensureManifest(): Promise<void> {
	if (manifestLoaded) return;
	try {
		const resp = await fetch("/maps_v2/manifest.json");
		if (resp.ok) {
			const manifest: {
				id: number;
				name: string;
				file: string;
				width: number;
				height: number;
				isOutside: boolean;
			}[] = await resp.json();
			for (const entry of manifest) {
				MAP_FILE_MAP[entry.name] = entry.file;
			}
			console.log(`[LegacyMapLoader] Loaded manifest: ${manifest.length} maps`);
		}
	} catch (e) {
		console.warn("[LegacyMapLoader] Could not load manifest:", e);
	}
	manifestLoaded = true;
}

export class LegacyMapLoader {
	/**
	 * Fetch a real binary-extracted map by its name (e.g. "TOWNYUUUpstairsYuusRoom").
	 */
	static async fetchByName(mapName: string): Promise<RealMapJSON | null> {
		await ensureManifest();
		if (mapCache.has(mapName)) return mapCache.get(mapName)!;
		const filename = MAP_FILE_MAP[mapName];
		if (!filename) {
			console.warn(`[LegacyMapLoader] No file mapping for: "${mapName}"`);
			return null;
		}
		return LegacyMapLoader.fetchByFilename(filename);
	}

	/**
	 * Fetch a real map JSON by filename.
	 */
	static async fetchByFilename(filename: string): Promise<RealMapJSON | null> {
		if (mapCache.has(filename)) return mapCache.get(filename)!;
		try {
			let resp = await fetch(`/maps_v2/${filename}`);
			if (!resp.ok) {
				resp = await fetch(`/maps/${filename}`);
			}
			if (!resp.ok) {
				console.error(
					`[LegacyMapLoader] Failed to fetch ${filename}: ${resp.status}`,
				);
				return null;
			}
			const json: RealMapJSON = await resp.json();
			mapCache.set(filename, json);
			if (json.name) mapCache.set(json.name, json);
			return json;
		} catch (err) {
			console.error(`[LegacyMapLoader] Error loading ${filename}:`, err);
			return null;
		}
	}

	/**
	 * Convert a sparse layer to a dense array.
	 */
	static expandLayer(layer: number[] | SparseLayer, length: number): number[] {
		if (Array.isArray(layer)) return layer;
		const sparse = layer as SparseLayer;
		const total = sparse.l || length;
		const result = new Array(total).fill(0);
		const entries = sparse.s;
		// Sparse entries are [position, tileId] pairs.
		// Only set explicit entries - missing positions stay 0 (empty).
		for (const entry of entries) {
			const pos = entry[0];
			const tileId = entry[1];
			if (pos >= 0 && pos < total) {
				result[pos] = tileId;
			}
		}
		return result;
	}

	/**
	 * Convert a RealMapJSON into the engine's MapData object.
	 */
	static toMapData(legacy: RealMapJSON): MapData {
		const w = legacy.width;
		const h = legacy.height;
		const mapData = new MapData(legacy.id, legacy.name, w, h);
		mapData.isOutside = legacy.isOutside ?? false;
		mapData.mapNote = legacy.name;

		const LAYER_MAP: Record<string, number> = {
			ground: MapData.MAP_GROUND_LAYER,
			groundObjects: MapData.MAP_GROUND_DETAIL_LAYER,
			groundShadow: MapData.MAP_GROUND_SHADOW_LAYER,
			objects: MapData.MAP_OBJECT_LAYER,
			objects2: MapData.MAP_OBJECT_DETAIL_LAYER,
			objectShadow: MapData.MAP_OBJECT_SHADOW_LAYER,
			above: MapData.MAP_ABOVE_LAYER,
			above2: MapData.MAP_ABOVE_DETAIL_LAYER,
			spriteShadow: MapData.MAP_SPRITE_SHADOW_LAYER,
			hitBounds: MapData.MAP_HIT_LAYER,
			lightMask: MapData.MAP_LIGHT_MASK_LAYER,
			extra: MapData.MAP_CAMERA_BOUNDS_LAYER,
			extra2: MapData.MAP_ENTITY_LAYER,
		};

		const totalTiles = w * h;

		// Process each layer
		for (const [layerName, layerData] of Object.entries(legacy.layers)) {
			const layerIdx = LAYER_MAP[layerName];
			if (layerIdx === undefined) continue;
			const dense = LegacyMapLoader.expandLayer(layerData, totalTiles);
			let shadowNonZero = 0;
			for (let i = 0; i < dense.length && i < totalTiles; i++) {
				const tileId = dense[i];
				if (tileId === 0) continue;
				// Tile 1 is now handled by transparency key in getTileTexture
				const x = i % w;
				const y = Math.floor(i / w);
				mapData.setTileIndex(layerIdx, x, y, tileId);
				if (
					layerIdx === MapData.MAP_GROUND_SHADOW_LAYER ||
					layerIdx === MapData.MAP_OBJECT_SHADOW_LAYER ||
					layerIdx === MapData.MAP_SPRITE_SHADOW_LAYER
				) {
					shadowNonZero++;
				}
			}
			if (shadowNonZero > 0) {
				console.log(
					`[LegacyMapLoader] ${legacy.name} ${layerName}(L${layerIdx}): ${shadowNonZero} shadow tiles loaded`,
				);
			}
		}

		// Load doors from the comprehensive door graph (door_graph.json)
		const graphDoors = getDoorGraphForMap(legacy.name);
		if (graphDoors.length > 0) {
			for (const gd of graphDoors) {
				if (!gd.destMap) continue;
				const dd = new DoorData(-1, gd.name);
				dd.x = gd.x ?? 0;
				dd.y = gd.y ?? 0;
				dd.destinationMapName = gd.destMap;
				dd.destinationX = gd.arrivalX ?? 1;
				dd.destinationY = gd.arrivalY ?? 1;
				dd.width = 1;
				dd.height = 1;
				mapData.doorDataList.push(dd);
			}
		}
		// Scan objects layer for door tiles and refine positions
		LegacyMapLoader.scanForDoors(mapData, legacy);

		const cx = Math.floor(w / 2);
		const cy = Math.floor(h / 2);
		const WALL_IDS = new Set([839, 8280, 700, 744, 743, 745, 24, 795, 740]);

		const isWalkable = (sx: number, sy: number): boolean => {
			const extraVal = mapData.getTileIndex(
				MapData.MAP_CAMERA_BOUNDS_LAYER,
				sx,
				sy,
			);
			const gndVal = mapData.getTileIndex(MapData.MAP_GROUND_LAYER, sx, sy);
			const objVal = mapData.getTileIndex(MapData.MAP_OBJECT_LAYER, sx, sy);
			const hitVal = mapData.getTileIndex(MapData.MAP_HIT_LAYER, sx, sy);

			if (hitVal !== 0) return false;
			if (WALL_IDS.has(objVal)) return false;
			if (WALL_IDS.has(gndVal)) return false;
			if (gndVal === 0) return false;
			if (extraVal === 0) {
				if (gndVal === 0 || WALL_IDS.has(gndVal)) return false;
			}
			return true;
		};

		// Priority 1: Search near doors (usually guaranteed walkable path)
		let spawnFound = false;
		if (mapData.doorDataList.length > 0) {
			for (const door of mapData.doorDataList) {
				const tx = door.x;
				const ty = door.y;
				// Try the door itself and then 1-2 tiles around it
				const offsets = [
					[0, 0],
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
					[2, 0],
					[-2, 0],
					[0, 2],
					[0, -2],
				];
				for (const [ox, oy] of offsets) {
					const sx = tx + ox;
					const sy = ty + oy;
					if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
						if (isWalkable(sx, sy)) {
							mapData.defaultSpawnX = sx;
							mapData.defaultSpawnY = sy;
							spawnFound = true;
							console.log(
								`[LegacyMapLoader] Found door spawn at (${sx},${sy})`,
							);
							break;
						}
					}
				}
				if (spawnFound) break;
			}
		}

		// Priority 2: Spiral search from center (fallback)
		if (!spawnFound) {
			for (let r = 0; r < Math.max(w, h); r++) {
				for (let dy = -r; dy <= r; dy++) {
					for (let dx = -r; dx <= r; dx++) {
						const sx = cx + dx;
						const sy = cy + dy;
						if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
							if (isWalkable(sx, sy)) {
								mapData.defaultSpawnX = sx;
								mapData.defaultSpawnY = sy;
								spawnFound = true;
								console.log(
									`[LegacyMapLoader] Found fallback spiral spawn at (${sx},${sy})`,
								);
								r = w + h;
								dy = r + 1;
								break;
							}
						}
					}
				}
			}
		}

		console.log(
			`[LegacyMapLoader] Converted: ${legacy.name} (${w}x${h}), doors: ${mapData.doorDataList.length}, spawn: (${mapData.defaultSpawnX},${mapData.defaultSpawnY})`,
		);
		return mapData;
	}

	/**
	 * Known door frame tile IDs from the original game.
	 */
	private static readonly DOOR_TILE_IDS = new Set([
		732,
		733,
		734,
		735,
		736,
		737,
		741,
		742, // Door frames
		1316,
		1495,
		1503,
		1511, // Staircase tiles (indoor)
		14144,
		15440, // Special door frames
		755,
		756, // paths
	]);

	/**
	 * Scan the objects layer for door tiles and assign door positions.
	 * Only matches known door/staircase tile IDs between wall tiles.
	 */
	private static scanForDoors(mapData: MapData, legacy: RealMapJSON): void {
		const w = legacy.width;
		const h = legacy.height;
		const objectsLayer = legacy.layers["objects"];
		if (!objectsLayer) return;
		const dense = LegacyMapLoader.expandLayer(objectsLayer, w * h);
		const WALL_TILE = 839;

		// Collect positions of KNOWN door frame tiles between walls
		// (e.g. 742/743 door frames flanked by 839 walls)
		const doorPositions: { x: number; y: number; tileId: number }[] = [];
		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				const tileId = dense[y * w + x];
				if (!LegacyMapLoader.DOOR_TILE_IDS.has(tileId)) continue;
				const left = dense[y * w + (x - 1)];
				const right = dense[y * w + (x + 1)];
				const above = dense[(y - 1) * w + x];
				const below = dense[(y + 1) * w + x];
				const isHOpening = left === WALL_TILE && right === WALL_TILE;
				const isVOpening = above === WALL_TILE && below === WALL_TILE;
				if (isHOpening || isVOpening) {
					doorPositions.push({ x, y, tileId });
				}
			}
		}

		// Also find wall gaps: empty tiles (0) on the objects layer that
		// are flanked by 839 walls. These are door walkways — the actual
		// passage the player walks through. A door walkway is a gap in
		// the wall where the player enters/exits a room.
		const wallGaps: { x: number; y: number }[] = [];
		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				const tileId = dense[y * w + x];
				if (tileId !== 0) continue; // Must be empty
				const left = dense[y * w + (x - 1)];
				const right = dense[y * w + (x + 1)];
				const above = dense[(y - 1) * w + x];
				const below = dense[(y + 1) * w + x];
				// Horizontal gap: 839 on both sides
				const isHGap = left === WALL_TILE && right === WALL_TILE;
				// Vertical gap: 839 above and below
				const isVGap = above === WALL_TILE && below === WALL_TILE;
				if (isHGap || isVGap) {
					wallGaps.push({ x, y });
				}
			}
		}

		// Combine: door frame positions + wall gaps
		// Prefer door frame positions (more specific), use wall gaps as fallback
		const allPositions: { x: number; y: number; priority: number }[] = [
			...doorPositions.map((d) => ({ x: d.x, y: d.y, priority: 0 })),
			...wallGaps.map((g) => ({ x: g.x, y: g.y, priority: 1 })),
		];

		// Assign positions: for each door, find the closest position
		const assigned = new Set<number>();
		for (let i = 0; i < mapData.doorDataList.length; i++) {
			const door = mapData.doorDataList[i];
			const gx = door.x ?? 0;
			const gy = door.y ?? 0;

			// If the door is already on a walkable tile (obj=0), don't snap it.
			// The door_graph coordinates are already correct.
			const currentObj = dense[gy * w + gx];
			if (currentObj === 0) {
				console.log(
					`[LegacyMapLoader] Door "${door.name}" already on walkable tile (${gx},${gy}), keeping`,
				);
				continue;
			}

			let bestIdx = -1;
			let bestDist = Infinity;
			let bestPriority = Infinity;

			for (let j = 0; j < allPositions.length; j++) {
				if (assigned.has(j)) continue;
				const dx = Math.abs(allPositions[j].x - gx);
				const dy = Math.abs(allPositions[j].y - gy);
				const dist = dx + dy;
				// Prefer closer positions, break ties by priority (door frames first)
				if (
					dist < bestDist ||
					(dist === bestDist && allPositions[j].priority < bestPriority)
				) {
					bestDist = dist;
					bestIdx = j;
					bestPriority = allPositions[j].priority;
				}
			}

			// Allow larger snap distance (20 tiles) since door graph coords
			// can be far from the actual door on the map
			if (bestIdx >= 0 && bestDist <= 20) {
				console.log(
					`[LegacyMapLoader] Snapping door "${door.name}" from (${gx},${gy}) to ${allPositions[bestIdx].priority === 0 ? "frame" : "gap"} at (${allPositions[bestIdx].x},${allPositions[bestIdx].y}) dist=${bestDist}`,
				);
				door.x = allPositions[bestIdx].x;
				door.y = allPositions[bestIdx].y;
				assigned.add(bestIdx);
			} else {
				console.log(
					`[LegacyMapLoader] Door "${door.name}" at (${gx},${gy}) dist to nearest: ${bestDist}`,
				);
			}
		}
		console.log(
			`[LegacyMapLoader] scanForDoors: ${doorPositions.length} frame-openings, ${wallGaps.length} wall-gaps, assigned ${assigned.size}/${mapData.doorDataList.length} doors`,
		);
	}

	/** Get the filename for a map by name. */
	static getFilenameForMap(mapName: string): string | null {
		return MAP_FILE_MAP[mapName] ?? null;
	}

	/** Get all known map names. */
	static getAllMapNames(): string[] {
		return Object.keys(MAP_FILE_MAP);
	}
}
