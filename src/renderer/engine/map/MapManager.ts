/**
 * MapManager — manages multiple maps, handles transitions, stores map instances.
 *
 * Ported from okgame C++ Engine/map/MapManager.
 */
import type { AreaData } from './Area';
import type { DoorData } from './Door';
import type { WarpArea } from './Area';
import type { LightData } from './Light';

export interface MapData {
    id: number;
    name: string;
    width: number;
    height: number;
    tileWidth: number;
    tileHeight: number;
    tiles: number[][];
    areas: AreaData[];
    doors: DoorData[];
    warps: WarpArea[];
    lights: LightData[];
    isOutside: boolean;
}

export class MapManager {
    private mapsByName: Map<string, MapData> = new Map();
    private mapsByID: Map<number, MapData> = new Map();
    private currentMap: MapData | null = null;
    private lastMap: MapData | null = null;

    // Transitions
    private transitioning = false;
    private transitionProgress = 0;
    private transitionDuration = 1000;
    private pendingMap: MapData | null = null;
    private pendingSpawnX = 0;
    private pendingSpawnY = 0;

    // Visual effects
    hue = 1.0;
    saturation = 1.0;
    brightness = 1.0;
    contrast = 1.0;
    gamma = 1.0;
    grayscale = false;
    effects8Bit = false;
    effectsInverted = false;

    // Door/warp tracking
    doorEntered: DoorData | null = null;
    doorExited: DoorData | null = null;
    warpEntered: WarpArea | null = null;
    warpExited: WarpArea | null = null;

    // Callbacks
    onMapChange?: (oldMap: MapData | null, newMap: MapData) => void;

    // ============================================================
    // Map Registry
    // ============================================================

    registerMap(map: MapData): void {
        this.mapsByName.set(map.name, map);
        this.mapsByID.set(map.id, map);
    }

    getMapByName(name: string): MapData | undefined {
        return this.mapsByName.get(name);
    }

    getMapByID(id: number): MapData | undefined {
        return this.mapsByID.get(id);
    }

    getCurrentMap(): MapData | null {
        return this.currentMap;
    }

    getLastMap(): MapData | null {
        return this.lastMap;
    }

    getAllMaps(): MapData[] {
        return [...this.mapsByID.values()];
    }

    // ============================================================
    // Map Transitions
    // ============================================================

    changeMap(mapName: string, spawnX = 0, spawnY = 0): boolean {
        const map = this.mapsByName.get(mapName);
        if (!map) {
            console.warn(`[MapManager] Map not found: ${mapName}`);
            return false;
        }

        this.lastMap = this.currentMap;
        this.currentMap = map;
        this.pendingSpawnX = spawnX;
        this.pendingSpawnY = spawnY;
        this.transitioning = true;
        this.transitionProgress = 0;

        this.onMapChange?.(this.lastMap ?? null, map);
        return true;
    }

    changeMapByID(id: number, spawnX = 0, spawnY = 0): boolean {
        const map = this.mapsByID.get(id);
        if (!map) return false;
        return this.changeMap(map.name, spawnX, spawnY);
    }

    changeMapThroughDoor(door: DoorData): boolean {
        if (!door.destinationMapName) return false;
        this.doorEntered = door;
        return this.changeMap(door.destinationMapName, 0, 0);
    }

    changeMapThroughWarp(warp: WarpArea): boolean {
        if (!warp.data.destinationMapName) return false;
        this.warpEntered = warp;
        return this.changeMap(warp.data.destinationMapName, 0, 0);
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (this.transitioning) {
            this.transitionProgress += dt;
            if (this.transitionProgress >= this.transitionDuration) {
                this.transitioning = false;
                this.transitionProgress = this.transitionDuration;
                this.doorEntered = null;
                this.doorExited = null;
                this.warpEntered = null;
                this.warpExited = null;
            }
        }
    }

    // ============================================================
    // State
    // ============================================================

    isTransitioning(): boolean { return this.transitioning; }
    getTransitionProgress(): number { return this.transitionProgress / this.transitionDuration; }
    getSpawnX(): number { return this.pendingSpawnX; }
    getSpawnY(): number { return this.pendingSpawnY; }

    setTransitionDuration(ms: number): void { this.transitionDuration = ms; }

    getMapCount(): number { return this.mapsByID.size; }

    clear(): void {
        this.mapsByName.clear();
        this.mapsByID.clear();
        this.currentMap = null;
        this.lastMap = null;
    }
}
