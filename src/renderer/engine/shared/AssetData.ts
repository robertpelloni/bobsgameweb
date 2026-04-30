/**
 * AssetData — base class for all game assets (sprites, maps, audio, events).
 *
 * Ported from Java com.bobsgame.shared.AssetData.
 */
export class AssetData {
    id = -1;
    name = '';

    constructor(id = -1, name = '') {
        this.id = id;
        this.name = name;
    }

    getTypeIDString(): string { return `ASSET.${this.id}`; }

    static fromJSON(data: Record<string, unknown>): AssetData {
        return new AssetData(
            (data.id as number) ?? -1,
            (data.name as string) ?? '',
        );
    }

    toJSON(): Record<string, unknown> {
        return { id: this.id, name: this.name };
    }
}

/**
 * MusicData — music track asset definition.
 *
 * Ported from Java com.bobsgame.shared.MusicData.
 */
export class MusicData extends AssetData {
    fileName = '';
    fullFilePath = '';
    md5Name = '';
    preload = false;
    loop = true;
    volume = 1.0;
    fadeInMs = 0;
    fadeOutMs = 0;

    constructor(id?: number, name?: string, fileName?: string) {
        super(id ?? -1, name ?? '');
        this.fileName = fileName ?? '';
    }

    static override fromJSON(data: Record<string, unknown>): MusicData {
        const m = new MusicData(
            data.id as number | undefined,
            data.name as string | undefined,
            data.fileName as string | undefined,
        );
        m.md5Name = (data.md5Name as string) ?? '';
        m.preload = (data.preload as boolean) ?? false;
        m.loop = (data.loop as boolean) ?? true;
        m.volume = (data.volume as number) ?? 1.0;
        return m;
    }
}

/**
 * SoundData — sound effect asset definition.
 *
 * Ported from Java com.bobsgame.shared.SoundData.
 */
export class SoundData extends AssetData {
    fileName = '';
    fullFilePath = '';
    md5Name = '';
    volume = 1.0;
    maxSimultaneous = 4;
    pitchVariation = 0.0;

    constructor(id?: number, name?: string, fileName?: string) {
        super(id ?? -1, name ?? '');
        this.fileName = fileName ?? '';
    }

    static override fromJSON(data: Record<string, unknown>): SoundData {
        const s = new SoundData(
            data.id as number | undefined,
            data.name as string | undefined,
            data.fileName as string | undefined,
        );
        s.md5Name = (data.md5Name as string) ?? '';
        s.volume = (data.volume as number) ?? 1.0;
        s.maxSimultaneous = (data.maxSimultaneous as number) ?? 4;
        s.pitchVariation = (data.pitchVariation as number) ?? 0.0;
        return s;
    }
}

/**
 * SpriteAssetData — sprite sheet asset with animation references.
 */
export class SpriteAssetData extends AssetData {
    spriteFileName = '';
    widthPixels = 0;
    heightPixels = 0;
    frames = 1;
    frameRate = 10;

    constructor(id?: number, name?: string) {
        super(id ?? -1, name ?? '');
    }

    static override fromJSON(data: Record<string, unknown>): SpriteAssetData {
        const s = new SpriteAssetData(data.id as number | undefined, data.name as string | undefined);
        s.spriteFileName = (data.spriteFileName as string) ?? '';
        s.widthPixels = (data.widthPixels as number) ?? 0;
        s.heightPixels = (data.heightPixels as number) ?? 0;
        s.frames = (data.frames as number) ?? 1;
        return s;
    }
}

/**
 * MapAssetData — map data file reference.
 */
export class MapAssetData extends AssetData {
    mapFileName = '';
    width = 0;
    height = 0;
    tileWidth = 16;
    tileHeight = 16;

    constructor(id?: number, name?: string) {
        super(id ?? -1, name ?? '');
    }

    static override fromJSON(data: Record<string, unknown>): MapAssetData {
        const m = new MapAssetData(data.id as number | undefined, data.name as string | undefined);
        m.mapFileName = (data.mapFileName as string) ?? '';
        m.width = (data.width as number) ?? 0;
        m.height = (data.height as number) ?? 0;
        return m;
    }
}
