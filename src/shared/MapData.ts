import { AssetData } from './AssetData';
import { MapStateData } from './MapStateData';
import { EventData } from './EventData';
import { DoorData } from './DoorData';

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
    public static readonly MAP_SHADER_LAYER = 2;
    public static readonly MAP_GROUND_SHADOW_LAYER = 3;
    public static readonly MAP_OBJECT_LAYER = 4;
    public static readonly MAP_OBJECT_DETAIL_LAYER = 5;
    public static readonly MAP_OBJECT_SHADOW_LAYER = 6;
    public static readonly MAP_ABOVE_LAYER = 7;
    public static readonly MAP_ABOVE_DETAIL_LAYER = 8;
    public static readonly MAP_SPRITE_SHADOW_LAYER = 9;
    public static readonly MAP_CAMERA_BOUNDS_LAYER = 10;
    public static readonly MAP_HIT_LAYER = 11;
    public static readonly MAP_ENTITY_LAYER = 12;
    public static readonly MAP_LIGHT_LAYER = 13;
    public static readonly MAP_AREA_LAYER = 14;
    public static readonly MAP_LIGHT_MASK_LAYER = 15;
    public static readonly MAP_DOOR_LAYER = 16;

    public static readonly layers = 17;

    public mapNote: string = "";
    public widthTiles1X: number = 40;
    public heightTiles1X: number = 30;
    public maxRandoms: number = 10;
    public isOutside: boolean = false;
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

    constructor(id: number = -1, name: string = "", width: number = 40, height: number = 30) {
        super(id, name);
        this.widthTiles1X = width;
        this.heightTiles1X = height;
        this.layerTileIndex = [];
        for (let i = 0; i < MapData.layers; i++) {
            this.layerTileIndex.push(new Int32Array(width * height));
        }
    }

    public getTileIndex(layer: number, x: number, y: number): number {
        if (x < 0 || x >= this.widthTiles1X || y < 0 || y >= this.heightTiles1X) return 0;
        return this.layerTileIndex[layer][y * this.widthTiles1X + x];
    }

    public setTileIndex(layer: number, x: number, y: number, index: number): void {
        if (x < 0 || x >= this.widthTiles1X || y < 0 || y >= this.heightTiles1X) return;
        this.layerTileIndex[layer][y * this.widthTiles1X + x] = index;
    }

    public static isTileLayer(l: number): boolean {
        if (l === MapData.MAP_DOOR_LAYER) return false;
        if (l === MapData.MAP_ENTITY_LAYER) return false;
        if (l === MapData.MAP_AREA_LAYER) return false;
        if (l === MapData.MAP_LIGHT_LAYER) return false;
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

    public toString(): string {
        let s = super.toString();
        const bt = String.fromCharCode(96);
        let note = this.mapNote.replace(new RegExp(bt, 'g'), '');
        
        const add = (key: string, val: any) => {
            s += key + ":" + bt + (val || '') + bt + ",";
        };

        add("mapNote", note);
        add("widthTiles1X", this.widthTiles1X);
        add("heightTiles1X", this.heightTiles1X);
        add("maxRandoms", this.maxRandoms);
        add("isOutside", this.isOutside);
        add("preload", this.preload);
        add("groundLayerMD5", this.groundLayerMD5);
        add("groundObjectsMD5", this.groundObjectsMD5);
        add("groundShadowMD5", this.groundShadowMD5);
        add("objectsMD5", this.objectsMD5);
        add("objects2MD5", this.objects2MD5);
        add("objectShadowMD5", this.objectShadowMD5);
        add("aboveMD5", this.aboveMD5);
        add("above2MD5", this.above2MD5);
        add("spriteShadowMD5", this.spriteShadowMD5);
        add("groundShaderMD5", this.groundShaderMD5);
        add("cameraBoundsMD5", this.cameraBoundsMD5);
        add("hitBoundsMD5", this.hitBoundsMD5);
        add("lightMaskMD5", this.lightMaskMD5);
        add("paletteMD5", this.paletteMD5);
        add("tilesMD5", this.tilesMD5);

        s += "stateDataList:{";
        this.stateDataList.forEach(d => s += d.toString());
        s += "},";

        s += "eventDataList:{";
        this.eventDataList.forEach(d => s += d.toString());
        s += "},";

        s += "doorDataList:{";
        this.doorDataList.forEach(d => s += d.toString());
        s += "},";

        return s;
    }

    public initFromString(t: string): string {
        t = super.initFromString(t);
        const bt = String.fromCharCode(96);

        const getVal = (key: string) => {
            const k = key + ":" + bt;
            let start = t.indexOf(k) + k.length;
            let end = t.indexOf(bt, start);
            const val = t.substring(start, end);
            t = t.substring(end + 2);
            return val;
        };

        this.mapNote = getVal("mapNote");
        this.widthTiles1X = parseInt(getVal("widthTiles1X"));
        this.heightTiles1X = parseInt(getVal("heightTiles1X"));
        this.maxRandoms = parseInt(getVal("maxRandoms"));
        this.isOutside = getVal("isOutside") === "true";
        this.preload = getVal("preload") === "true";

        this.groundLayerMD5 = getVal("groundLayerMD5") || null;
        this.groundObjectsMD5 = getVal("groundObjectsMD5") || null;
        this.groundShadowMD5 = getVal("groundShadowMD5") || null;
        this.objectsMD5 = getVal("objectsMD5") || null;
        this.objects2MD5 = getVal("objects2MD5") || null;
        this.objectShadowMD5 = getVal("objectShadowMD5") || null;
        this.aboveMD5 = getVal("aboveMD5") || null;
        this.above2MD5 = getVal("above2MD5") || null;
        this.spriteShadowMD5 = getVal("spriteShadowMD5") || null;
        this.groundShaderMD5 = getVal("groundShaderMD5") || null;
        this.cameraBoundsMD5 = getVal("cameraBoundsMD5") || null;
        this.hitBoundsMD5 = getVal("hitBoundsMD5") || null;
        this.lightMaskMD5 = getVal("lightMaskMD5") || null;
        this.paletteMD5 = getVal("paletteMD5") || null;
        this.tilesMD5 = getVal("tilesMD5") || null;

        return t;
    }
}
