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
import { MapData } from '../../../shared/MapData';
import { DoorData } from '../../../shared/DoorData';
// DoorGraph.ts fallback removed - door_graph.json is the single source of truth
import { getDoorGraphForMap } from './DoorGraphLoader';

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
    const resp = await fetch('/maps_v2/manifest.json');
    if (resp.ok) {
      const manifest: { id: number; name: string; file: string; width: number; height: number; isOutside: boolean }[] = await resp.json();
      for (const entry of manifest) {
        MAP_FILE_MAP[entry.name] = entry.file;
      }
      console.log(`[LegacyMapLoader] Loaded manifest: ${manifest.length} maps`);
    }
  } catch (e) {
    console.warn('[LegacyMapLoader] Could not load manifest:', e);
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
        console.error(`[LegacyMapLoader] Failed to fetch ${filename}: ${resp.status}`);
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
      'ground': MapData.MAP_GROUND_LAYER,
      'groundObjects': MapData.MAP_GROUND_DETAIL_LAYER,
      'groundShadow': MapData.MAP_GROUND_SHADOW_LAYER,
      'objects': MapData.MAP_OBJECT_LAYER,
      'objects2': MapData.MAP_OBJECT_DETAIL_LAYER,
      'objectShadow': MapData.MAP_OBJECT_SHADOW_LAYER,
      'above': MapData.MAP_ABOVE_LAYER,
      'above2': MapData.MAP_ABOVE_DETAIL_LAYER,
      'spriteShadow': MapData.MAP_SPRITE_SHADOW_LAYER,
      'hitBounds': MapData.MAP_HIT_LAYER,
      'lightMask': MapData.MAP_LIGHT_MASK_LAYER,
      'extra': MapData.MAP_CAMERA_BOUNDS_LAYER,
      'extra2': MapData.MAP_ENTITY_LAYER,
    };

    const totalTiles = w * h;

    // Process each layer
    for (const [layerName, layerData] of Object.entries(legacy.layers)) {
      const layerIdx = LAYER_MAP[layerName];
      if (layerIdx === undefined) continue;
      const dense = LegacyMapLoader.expandLayer(layerData, totalTiles);
      for (let i = 0; i < dense.length && i < totalTiles; i++) {
        const tileId = dense[i];
        if (tileId === 0) continue;
        if (layerName === 'ground' && tileId === 1) continue;
        const x = i % w;
        const y = Math.floor(i / w);
        mapData.setTileIndex(layerIdx, x, y, tileId);
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
    // (door_graph.json has approximate positions; scanForDoors finds exact door tiles)
    LegacyMapLoader.scanForDoors(mapData, legacy);

    // Find default spawn point (walkable floor tile from center)
    mapData.defaultSpawnX = Math.floor(w / 2);
    mapData.defaultSpawnY = Math.floor(h / 2);

    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const WALL_GROUND_IDS = new Set([839, 700, 744, 743, 745, 24, 795, 740]);
    for (let r = 0; r < Math.max(w, h); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const sx = cx + dx;
          const sy = cy + dy;
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const extraVal = mapData.getTileIndex(MapData.MAP_CAMERA_BOUNDS_LAYER, sx, sy);
            const gndVal = mapData.getTileIndex(MapData.MAP_GROUND_LAYER, sx, sy);
            const objVal = mapData.getTileIndex(MapData.MAP_OBJECT_LAYER, sx, sy);
     if (extraVal !== 0 && gndVal !== 0 && !WALL_GROUND_IDS.has(gndVal) && objVal === 0) {
              mapData.defaultSpawnX = sx;
              mapData.defaultSpawnY = sy;
              console.log(`[LegacyMapLoader] Spawn at (${sx},${sy}) ground=${gndVal}`);
              r = w + h; dy = r + 1; break;
            }
          }
        }
      }
    }

    console.log(`[LegacyMapLoader] Converted: ${legacy.name} (${w}x${h}), doors: ${mapData.doorDataList.length}, spawn: (${mapData.defaultSpawnX},${mapData.defaultSpawnY})`);
    return mapData;
  }

  /**
   * Known door frame tile IDs from the original game.
   * These are the ONLY tile IDs that represent actual doors/stairs
   * in the objects layer. Other tiles between walls (floor, furniture)
   * are NOT doors.
   */
  private static readonly DOOR_TILE_IDS = new Set([
    732, 733, 734, 735, 736, 737, 741, 742, // Door frames
    1495, 1503, 1511, // Staircase tiles (indoor)
    14144, 15440, // Special door frames
  ]);

  /**
   * Scan the objects layer for door tiles and assign door positions.
   * Only matches known door/staircase tile IDs between wall tiles.
   */
  private static scanForDoors(mapData: MapData, legacy: RealMapJSON): void {
    const w = legacy.width;
    const h = legacy.height;
    const objectsLayer = legacy.layers['objects'];
    if (!objectsLayer) return;
    const dense = LegacyMapLoader.expandLayer(objectsLayer, w * h);
    const WALL_TILE = 839;

    // Collect positions of KNOWN door tiles between walls
    const doorPositions: { x: number; y: number }[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const tileId = dense[y * w + x];
        // Only accept known door/staircase tiles
        if (!LegacyMapLoader.DOOR_TILE_IDS.has(tileId)) continue;
        const left = dense[y * w + (x - 1)];
        const right = dense[y * w + (x + 1)];
        const above = dense[(y - 1) * w + x];
        const below = dense[(y + 1) * w + x];
        const isHOpening = (left === WALL_TILE && right === WALL_TILE);
        const isVOpening = (above === WALL_TILE && below === WALL_TILE);
        if (isHOpening || isVOpening) {
          doorPositions.push({ x, y });
        }
      }
    }

    // Assign positions: for each door, find the closest scanned wall-opening
    const assigned = new Set<number>();
    for (let i = 0; i < mapData.doorDataList.length; i++) {
      const door = mapData.doorDataList[i];
      const gx = door.x ?? 0;
      const gy = door.y ?? 0;

      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < doorPositions.length; j++) {
        if (assigned.has(j)) continue;
        const dx = Math.abs(doorPositions[j].x - gx);
        const dy = Math.abs(doorPositions[j].y - gy);
        const dist = dx + dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }

      if (bestIdx >= 0 && bestDist <= 3) {
        door.x = doorPositions[bestIdx].x;
        door.y = doorPositions[bestIdx].y;
        assigned.add(bestIdx);
      } else if (gx === 0 && gy === 0 && doorPositions.length > 0) {
        // No existing position - assign by order
        let fallbackIdx = 0;
        while (fallbackIdx < doorPositions.length && assigned.has(fallbackIdx)) fallbackIdx++;
        if (fallbackIdx < doorPositions.length) {
          door.x = doorPositions[fallbackIdx].x;
          door.y = doorPositions[fallbackIdx].y;
          assigned.add(fallbackIdx);
        }
      }
      // If door has a position from door_graph and no nearby scanForDoors match,
      // keep the door_graph position (warp area position, still usable for detection)
    }

    console.log(`[LegacyMapLoader] scanForDoors: ${doorPositions.length} wall-openings, assigned ${assigned.size}/${mapData.doorDataList.length} doors`);
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
