<<<<<<< HEAD
import { AssetData } from "./AssetData";
import type { MapStateData } from "./MapStateData";
import type { EventData } from "./EventData";
import type { DoorData } from "./DoorData";

export enum RenderOrder {
	GROUND,
	ABOVE,
	ABOVE_TOP,
	SPRITE_DEBUG_OUTLINES,
	SPRITE_DEBUG_INFO,
	OVER_TEXT,
	OVER_GUI,
	CONSOLE,
}

export class MapData extends AssetData {
	public static readonly MAP_GROUND_LAYER = 0;
	public static readonly MAP_GROUND_DETAIL_LAYER = 1;
	public static readonly MAP_GROUND_SHADOW_LAYER = 2;
	public static readonly MAP_OBJECT_LAYER = 3;
	public static readonly MAP_OBJECT_DETAIL_LAYER = 4;
	public static readonly MAP_OBJECT_SHADOW_LAYER = 5;
	public static readonly MAP_ABOVE_LAYER = 6;
	public static readonly MAP_ABOVE_DETAIL_LAYER = 7;
	public static readonly MAP_SPRITE_SHADOW_LAYER = 8;
	public static readonly MAP_HIT_LAYER = 9;
	public static readonly MAP_LIGHT_MASK_LAYER = 10;
	public static readonly MAP_CAMERA_BOUNDS_LAYER = 11;
	public static readonly MAP_ENTITY_LAYER = 12; // extra2
	public static readonly MAP_LIGHT_LAYER = 13;
	public static readonly MAP_AREA_LAYER = 14;
	public static readonly MAP_DOOR_LAYER = 15;
	public static readonly MAP_SHADER_LAYER = 16;

	public static readonly layers = 17;

	public static readonly LAYER_NAMES: Record<number, string> = {
		[MapData.MAP_GROUND_LAYER]: "ground",
		[MapData.MAP_GROUND_DETAIL_LAYER]: "groundDetail",
		[MapData.MAP_GROUND_SHADOW_LAYER]: "groundShadow",
		[MapData.MAP_OBJECT_LAYER]: "objects",
		[MapData.MAP_OBJECT_DETAIL_LAYER]: "objects2",
		[MapData.MAP_OBJECT_SHADOW_LAYER]: "objectShadow",
		[MapData.MAP_ABOVE_LAYER]: "above",
		[MapData.MAP_ABOVE_DETAIL_LAYER]: "above2",
		[MapData.MAP_SPRITE_SHADOW_LAYER]: "spriteShadow",
		[MapData.MAP_HIT_LAYER]: "hitBounds",
		[MapData.MAP_LIGHT_MASK_LAYER]: "lightMask",
		[MapData.MAP_CAMERA_BOUNDS_LAYER]: "cameraBounds",
		[MapData.MAP_ENTITY_LAYER]: "entity",
		[MapData.MAP_LIGHT_LAYER]: "light",
		[MapData.MAP_AREA_LAYER]: "area",
		[MapData.MAP_DOOR_LAYER]: "door",
		[MapData.MAP_SHADER_LAYER]: "shader",
	};

	public static readonly WALL_IDS = new Set([
		839,
		8280, // Solid black walls
		700,
		744,
		743,
		745, // Map edges / boundaries
		24,
		795,
		740, // Corner / filler walls
		1261,
		1262,
		1234,
		15488, // Specific room boundary frames
		1416,
		15513,
		1477,
		1292, // Hallway wall filler
	]);

	/**
	 * Known floor/walkable ground tile IDs.
	 */
	public static readonly FLOOR_IDS = new Set([
		1327, 1322, 1305, 1316, 14168, 1415, 1752, 15640, 15672, 15624, 15656,
		15856, 1407, 1444, 15680,
	]);

	public mapNote: string = "";
	public widthTiles1X: number = 40;
	public heightTiles1X: number = 30;
	public maxRandoms: number = 10;
	public isOutside: boolean = false;
	public defaultSpawnX: number = -1;
	public defaultSpawnY: number = -1;
	public preload: boolean = false;

	public groundLayerMD5: string | null = null;
	public groundObjectsMD5: string | null = null;
	public groundShadowMD5: string | null = null;
	public objectsMD5: string | null = null;
	public objects2MD5: string | null = null;
	public objectShadowMD5: string | null = null;
	public aboveMD5: string | null = null;
	public above2MD5: string | null = null;
	public spriteShadowMD5: string | null = null;
	public groundShaderMD5: string | null = null;
	public cameraBoundsMD5: string | null = null;
	public hitBoundsMD5: string | null = null;
	public lightMaskMD5: string | null = null;
	public paletteMD5: string | null = null;
	public tilesMD5: string | null = null;

	public stateDataList: MapStateData[] = [];
	public eventDataList: EventData[] = [];
	public doorDataList: DoorData[] = [];

	private layerTileIndex: Int32Array[];
	private chunks: globalThis.Map<string, Int32Array[]> = new globalThis.Map();
	private isInfinite: boolean = false;

	constructor(
		id: number = -1,
		name: string = "",
		width: number = 40,
		height: number = 30,
	) {
		super(id, name);
		this.widthTiles1X = width;
		this.heightTiles1X = height;
		this.layerTileIndex = [];
		for (let i = 0; i < MapData.layers; i++) {
			this.layerTileIndex.push(new Int32Array(width * height));
		}
	}

	public setInfinite(infinite: boolean): void {
		this.isInfinite = infinite;
	}

	private getChunk(cx: number, cy: number): Int32Array[] {
		const key = `${cx},${cy}`;
		if (!this.chunks.has(key)) {
			const newChunk: Int32Array[] = [];
			for (let i = 0; i < MapData.layers; i++) {
				newChunk.push(new Int32Array(16 * 16));
			}
			this.chunks.set(key, newChunk);
		}
		return this.chunks.get(key)!;
	}

	public getTileIndex(layer: number, x: number, y: number): number {
		if (this.isInfinite) {
			const cx = Math.floor(x / 16);
			const cy = Math.floor(y / 16);
			const tx = ((x % 16) + 16) % 16;
			const ty = ((y % 16) + 16) % 16;
			return this.getChunk(cx, cy)[layer][ty * 16 + tx];
		}
		if (x < 0 || x >= this.widthTiles1X || y < 0 || y >= this.heightTiles1X)
			return 0;
		return this.layerTileIndex[layer][y * this.widthTiles1X + x];
	}

	public setTileIndex(
		layer: number,
		x: number,
		y: number,
		index: number,
	): void {
		if (this.isInfinite) {
			const cx = Math.floor(x / 16);
			const cy = Math.floor(y / 16);
			const tx = ((x % 16) + 16) % 16;
			const ty = ((y % 16) + 16) % 16;
			this.getChunk(cx, cy)[layer][ty * 16 + tx] = index;
			return;
		}
		if (x < 0 || x >= this.widthTiles1X || y < 0 || y >= this.heightTiles1X)
			return;
		this.layerTileIndex[layer][y * this.widthTiles1X + x] = index;
	}

	public clearTileLayer(layer: number): void {
		if (this.isInfinite) {
			this.chunks.forEach((c) => c[layer].fill(0));
		} else {
			this.layerTileIndex[layer].fill(0);
		}
	}

	public shiftMap(dirX: number, dirY: number): void {
		if (this.isInfinite) {
			// Infinite maps don't really need shifting in the same way, but we could translate the chunk keys
			return;
		}
		const newData: Int32Array[] = [];
		for (let l = 0; l < MapData.layers; l++) {
			const oldLayer = this.layerTileIndex[l];
			const newLayer = new Int32Array(this.widthTiles1X * this.heightTiles1X);

			for (let y = 0; y < this.heightTiles1X; y++) {
				for (let x = 0; x < this.widthTiles1X; x++) {
					const newX = (x + dirX + this.widthTiles1X) % this.widthTiles1X;
					const newY = (y + dirY + this.heightTiles1X) % this.heightTiles1X;
					newLayer[newY * this.widthTiles1X + newX] =
						oldLayer[y * this.widthTiles1X + x];
				}
			}
			newData.push(newLayer);
		}
		this.layerTileIndex = newData;
	}

	public resizeMap(newWidth: number, newHeight: number): void {
		const newData: Int32Array[] = [];
		for (let l = 0; l < MapData.layers; l++) {
			const oldLayer = this.layerTileIndex[l];
			const newLayer = new Int32Array(newWidth * newHeight);

			for (let y = 0; y < Math.min(this.heightTiles1X, newHeight); y++) {
				for (let x = 0; x < Math.min(this.widthTiles1X, newWidth); x++) {
					newLayer[y * newWidth + x] = oldLayer[y * this.widthTiles1X + x];
				}
			}
			newData.push(newLayer);
		}
		this.widthTiles1X = newWidth;
		this.heightTiles1X = newHeight;
		this.layerTileIndex = newData;
	}

	public static isTileLayer(l: number): boolean {
		if (l === MapData.MAP_ENTITY_LAYER) return false;
		if (l === MapData.MAP_AREA_LAYER) return false;
		return true;
	}

	public static isTransparentLayer(l: number): boolean {
		if (l === MapData.MAP_AREA_LAYER) return true;
		if (l === MapData.MAP_LIGHT_LAYER) return true;
		if (l === MapData.MAP_HIT_LAYER) return true;
		if (l === MapData.MAP_SPRITE_SHADOW_LAYER) return true;
		if (l === MapData.MAP_GROUND_SHADOW_LAYER) return true;
		if (l === MapData.MAP_SHADER_LAYER) return true;
		if (l === MapData.MAP_OBJECT_SHADOW_LAYER) return true;
		if (l === MapData.MAP_CAMERA_BOUNDS_LAYER) return true;
		if (l === MapData.MAP_LIGHT_MASK_LAYER) return true;
		return false;
	}
=======
import { AssetData } from './AssetData';
import type { MapStateData } from './MapStateData';
import type { EventData } from './EventData';
import type { DoorData } from './DoorData';

export enum RenderOrder {
    GROUND,
    ABOVE,
    ABOVE_TOP,
    SPRITE_DEBUG_OUTLINES,
    SPRITE_DEBUG_INFO,
    OVER_TEXT,
    OVER_GUI,
    CONSOLE
}

export class MapData extends AssetData {
    public static readonly MAP_GROUND_LAYER = 0;
    public static readonly MAP_GROUND_DETAIL_LAYER = 1;
    public static readonly MAP_GROUND_SHADOW_LAYER = 2;
    public static readonly MAP_OBJECT_LAYER = 3;
    public static readonly MAP_OBJECT_DETAIL_LAYER = 4;
    public static readonly MAP_OBJECT_SHADOW_LAYER = 5;
    public static readonly MAP_ABOVE_LAYER = 6;
    public static readonly MAP_ABOVE_DETAIL_LAYER = 7;
    public static readonly MAP_SPRITE_SHADOW_LAYER = 8;
    public static readonly MAP_HIT_LAYER = 9;
    public static readonly MAP_LIGHT_MASK_LAYER = 10;
    public static readonly MAP_CAMERA_BOUNDS_LAYER = 11;
    public static readonly MAP_ENTITY_LAYER = 12; // extra2
    public static readonly MAP_LIGHT_LAYER = 13;
    public static readonly MAP_AREA_LAYER = 14;
    public static readonly MAP_DOOR_LAYER = 15;
    public static readonly MAP_SHADER_LAYER = 16;

    public static readonly layers = 17;

  public static readonly LAYER_NAMES: Record<number, string> = {
    [MapData.MAP_GROUND_LAYER]: 'ground',
    [MapData.MAP_GROUND_DETAIL_LAYER]: 'groundDetail',
    [MapData.MAP_GROUND_SHADOW_LAYER]: 'groundShadow',
    [MapData.MAP_OBJECT_LAYER]: 'objects',
    [MapData.MAP_OBJECT_DETAIL_LAYER]: 'objects2',
    [MapData.MAP_OBJECT_SHADOW_LAYER]: 'objectShadow',
    [MapData.MAP_ABOVE_LAYER]: 'above',
    [MapData.MAP_ABOVE_DETAIL_LAYER]: 'above2',
    [MapData.MAP_SPRITE_SHADOW_LAYER]: 'spriteShadow',
    [MapData.MAP_HIT_LAYER]: 'hitBounds',
    [MapData.MAP_LIGHT_MASK_LAYER]: 'lightMask',
    [MapData.MAP_CAMERA_BOUNDS_LAYER]: 'cameraBounds',
    [MapData.MAP_ENTITY_LAYER]: 'entity',
    [MapData.MAP_LIGHT_LAYER]: 'light',
    [MapData.MAP_AREA_LAYER]: 'area',
    [MapData.MAP_DOOR_LAYER]: 'door',
    [MapData.MAP_SHADER_LAYER]: 'shader',
  };

    public static readonly WALL_IDS = new Set([
        839, 8280, // Solid black walls
        700, 744, 743, 745, // Map edges / boundaries
        24, 795, 740, // Corner / filler walls
        1261, 1262, 1234, 15488, // Specific room boundary frames
        1416, 15513, 1477, 1292, // Hallway wall filler
    ]);

    /**
     * Known floor/walkable ground tile IDs.
     */
    public static readonly FLOOR_IDS = new Set([
        1327, 1322, 1305, 1316, 14168, 1415, 1752,
        15640, 15672, 15624, 15656, 15856
    ]);

    public mapNote: string = "";
    public widthTiles1X: number = 40;
    public heightTiles1X: number = 30;
    public maxRandoms: number = 10;
    public isOutside: boolean = false;
	public defaultSpawnX: number = -1;
	public defaultSpawnY: number = -1;
    public preload: boolean = false;

    public groundLayerMD5: string | null = null;
    public groundObjectsMD5: string | null = null;
    public groundShadowMD5: string | null = null;
    public objectsMD5: string | null = null;
    public objects2MD5: string | null = null;
    public objectShadowMD5: string | null = null;
    public aboveMD5: string | null = null;
    public above2MD5: string | null = null;
    public spriteShadowMD5: string | null = null;
    public groundShaderMD5: string | null = null;
    public cameraBoundsMD5: string | null = null;
    public hitBoundsMD5: string | null = null;
    public lightMaskMD5: string | null = null;
    public paletteMD5: string | null = null;
    public tilesMD5: string | null = null;

    public stateDataList: MapStateData[] = [];
    public eventDataList: EventData[] = [];
    public doorDataList: DoorData[] = [];

    private layerTileIndex: Int32Array[];
    private chunks: globalThis.Map<string, Int32Array[]> = new globalThis.Map();
    private isInfinite: boolean = false;

    constructor(id: number = -1, name: string = "", width: number = 40, height: number = 30) {
        super(id, name);
        this.widthTiles1X = width;
        this.heightTiles1X = height;
        this.layerTileIndex = [];
        for (let i = 0; i < MapData.layers; i++) {
            this.layerTileIndex.push(new Int32Array(width * height));
        }
    }

    public setInfinite(infinite: boolean): void {
        this.isInfinite = infinite;
    }

    private getChunk(cx: number, cy: number): Int32Array[] {
        const key = `${cx},${cy}`;
        if (!this.chunks.has(key)) {
            const newChunk: Int32Array[] = [];
            for (let i = 0; i < MapData.layers; i++) {
                newChunk.push(new Int32Array(16 * 16));
            }
            this.chunks.set(key, newChunk);
        }
        return this.chunks.get(key)!;
    }

    public getTileIndex(layer: number, x: number, y: number): number {
        if (this.isInfinite) {
            const cx = Math.floor(x / 16);
            const cy = Math.floor(y / 16);
            const tx = (x % 16 + 16) % 16;
            const ty = (y % 16 + 16) % 16;
            return this.getChunk(cx, cy)[layer][ty * 16 + tx];
        }
        if (x < 0 || x >= this.widthTiles1X || y < 0 || y >= this.heightTiles1X) return 0;
        return this.layerTileIndex[layer][y * this.widthTiles1X + x];
    }

    public setTileIndex(layer: number, x: number, y: number, index: number): void {
        if (this.isInfinite) {
            const cx = Math.floor(x / 16);
            const cy = Math.floor(y / 16);
            const tx = (x % 16 + 16) % 16;
            const ty = (y % 16 + 16) % 16;
            this.getChunk(cx, cy)[layer][ty * 16 + tx] = index;
            return;
        }
        if (x < 0 || x >= this.widthTiles1X || y < 0 || y >= this.heightTiles1X) return;
        this.layerTileIndex[layer][y * this.widthTiles1X + x] = index;
    }

    public clearTileLayer(layer: number): void {
        if (this.isInfinite) {
            this.chunks.forEach(c => c[layer].fill(0));
        } else {
            this.layerTileIndex[layer].fill(0);
        }
    }

    public shiftMap(dirX: number, dirY: number): void {
        if (this.isInfinite) {
            // Infinite maps don't really need shifting in the same way, but we could translate the chunk keys
            return;
        }
        const newData: Int32Array[] = [];
        for (let l = 0; l < MapData.layers; l++) {
            const oldLayer = this.layerTileIndex[l];
            const newLayer = new Int32Array(this.widthTiles1X * this.heightTiles1X);

            for (let y = 0; y < this.heightTiles1X; y++) {
                for (let x = 0; x < this.widthTiles1X; x++) {
                    const newX = (x + dirX + this.widthTiles1X) % this.widthTiles1X;
                    const newY = (y + dirY + this.heightTiles1X) % this.heightTiles1X;
                    newLayer[newY * this.widthTiles1X + newX] = oldLayer[y * this.widthTiles1X + x];
                }
            }
            newData.push(newLayer);
        }
        this.layerTileIndex = newData;
    }

    public resizeMap(newWidth: number, newHeight: number): void {
        const newData: Int32Array[] = [];
        for (let l = 0; l < MapData.layers; l++) {
            const oldLayer = this.layerTileIndex[l];
            const newLayer = new Int32Array(newWidth * newHeight);

            for (let y = 0; y < Math.min(this.heightTiles1X, newHeight); y++) {
                for (let x = 0; x < Math.min(this.widthTiles1X, newWidth); x++) {
                    newLayer[y * newWidth + x] = oldLayer[y * this.widthTiles1X + x];
                }
            }
            newData.push(newLayer);
        }
        this.widthTiles1X = newWidth;
        this.heightTiles1X = newHeight;
        this.layerTileIndex = newData;
    }

    public static isTileLayer(l: number): boolean {
        if (l === MapData.MAP_ENTITY_LAYER) return false;
        if (l === MapData.MAP_AREA_LAYER) return false;
        return true;
    }

    public static isTransparentLayer(l: number): boolean {
        if (l === MapData.MAP_AREA_LAYER) return true;
        if (l === MapData.MAP_LIGHT_LAYER) return true;
        if (l === MapData.MAP_HIT_LAYER) return true;
        if (l === MapData.MAP_SPRITE_SHADOW_LAYER) return true;
        if (l === MapData.MAP_GROUND_SHADOW_LAYER) return true;
        if (l === MapData.MAP_SHADER_LAYER) return true;
        if (l === MapData.MAP_OBJECT_SHADOW_LAYER) return true;
        if (l === MapData.MAP_CAMERA_BOUNDS_LAYER) return true;
        if (l === MapData.MAP_LIGHT_MASK_LAYER) return true;
        return false;
    }
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
}
