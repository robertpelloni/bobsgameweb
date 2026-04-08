/**
 * SpriteData — sprite asset definition with animations, hitboxes, and metadata.
 *
 * Ported from okgame C++ Engine/entity/SpriteData.
 */

export interface SpriteAnimationSequenceData {
    name: string;
    frameStart: number;
    hitboxOffsetLeft: number;
    hitboxOffsetRight: number;
    hitboxOffsetTop: number;
    hitboxOffsetBottom: number;
}

export class SpriteData {
    id = -1;
    name = 'none';
    comment = '';
    displayName = '';

    widthPixels = 0;
    heightPixels = 0;
    frames = 1;

    // Entity type flags
    isNPC = false;
    isKid = false;
    isAdult = false;
    isMale = false;
    isFemale = false;
    isCar = false;
    isAnimal = false;

    // Visual flags
    hasShadow = false;
    isRandom = false;
    forceHQ2X = false;

    // Special types
    isDoor = false;
    isGame = false;
    isItem = false;

    // Item/game properties
    itemGameDescription = '';
    gamePrice = 0;

    // Utility offsets (spawn points, doorknobs, hands)
    utilityOffsetX = 0;
    utilityOffsetY = 0;

    // Hash identifiers
    dataMD5 = '';
    paletteMD5 = '';

    // Animation sequences
    animationList: SpriteAnimationSequenceData[] = [];

    // Event data reference
    eventID = -1;

    constructor(data?: Partial<SpriteData>) {
        if (data) Object.assign(this, data);
    }

    // ============================================================
    // Animation
    // ============================================================

    addAnimation(
        name: string,
        frameStart: number,
        hitboxLeft = 0,
        hitboxRight = 0,
        hitboxTop = 0,
        hitboxBottom = 0,
    ): void {
        this.animationList.push({
            name,
            frameStart,
            hitboxOffsetLeft: hitboxLeft,
            hitboxOffsetRight: hitboxRight,
            hitboxOffsetTop: hitboxTop,
            hitboxOffsetBottom: hitboxBottom,
        });
    }

    getAnimation(name: string): SpriteAnimationSequenceData | undefined {
        return this.animationList.find(a => a.name === name);
    }

    getNumFrames(): number { return this.frames; }
    getWidthPixels(): number { return this.widthPixels; }
    getHeightPixels(): number { return this.heightPixels; }
    getDisplayName(): string { return this.displayName; }

    // ============================================================
    // Serialization
    // ============================================================

    static fromJSON(data: Record<string, unknown>): SpriteData {
        return new SpriteData({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? 'none',
            displayName: (data.displayName as string) ?? '',
            widthPixels: (data.widthPixels1X as number) ?? 0,
            heightPixels: (data.heightPixels1X as number) ?? 0,
            frames: (data.frames as number) ?? 1,
            isNPC: (data.isNPC as boolean) ?? false,
            isKid: (data.isKid as boolean) ?? false,
            isAdult: (data.isAdult as boolean) ?? false,
            isMale: (data.isMale as boolean) ?? false,
            isFemale: (data.isFemale as boolean) ?? false,
            isCar: (data.isCar as boolean) ?? false,
            isAnimal: (data.isAnimal as boolean) ?? false,
            hasShadow: (data.hasShadow as boolean) ?? false,
            isRandom: (data.isRandom as boolean) ?? false,
            isDoor: (data.isDoor as boolean) ?? false,
            isGame: (data.isGame as boolean) ?? false,
            isItem: (data.isItem as boolean) ?? false,
            forceHQ2X: (data.forceHQ2X as boolean) ?? false,
            itemGameDescription: (data.itemGameDescription as string) ?? '',
            gamePrice: (data.gamePrice as number) ?? 0,
            utilityOffsetX: (data.utilityOffsetXPixels1X as number) ?? 0,
            utilityOffsetY: (data.utilityOffsetYPixels1X as number) ?? 0,
            dataMD5: (data.dataMD5 as string) ?? '',
            paletteMD5: (data.paletteMD5 as string) ?? '',
            eventID: (data.eventID as number) ?? -1,
        });
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            name: this.name,
            displayName: this.displayName,
            widthPixels1X: this.widthPixels,
            heightPixels1X: this.heightPixels,
            frames: this.frames,
            isNPC: this.isNPC,
            isKid: this.isKid,
            isAdult: this.isAdult,
            isMale: this.isMale,
            isFemale: this.isFemale,
            isCar: this.isCar,
            isAnimal: this.isAnimal,
            hasShadow: this.hasShadow,
            isRandom: this.isRandom,
            isDoor: this.isDoor,
            isGame: this.isGame,
            isItem: this.isItem,
            forceHQ2X: this.forceHQ2X,
            itemGameDescription: this.itemGameDescription,
            gamePrice: this.gamePrice,
            utilityOffsetXPixels1X: this.utilityOffsetX,
            utilityOffsetYPixels1X: this.utilityOffsetY,
            dataMD5: this.dataMD5,
            paletteMD5: this.paletteMD5,
            eventID: this.eventID,
            animationList: this.animationList,
        };
    }
}
