import { BobColor } from "../BobColor";

export class TurnFromBlockTypeToType {
    public fromType_UUID: string = "";
    public toType_UUID: string = "";
    constructor(from?: string, to?: string) {
        this.fromType_UUID = from || "";
        this.toType_UUID = to || "";
    }
}

export class BlockType {
    public static readonly emptyBlockType = new BlockType("empty");

    public uuid: string = "";
    public name: string = "";
    public spriteName: string = "";
    public specialSpriteName: string = "";

    public useInNormalPieces: boolean = false;
    public useAsGarbage: boolean = false;
    public useAsPlayingFieldFiller: boolean = false;
    public ignoreWhenMovingDownBlocks: boolean = false;
    public chainConnectionsMustContainAtLeastOneBlockWithThisTrue: boolean = false;
    public ignoreWhenCheckingChain: boolean = false;
    public ignoreWhenCheckingChainConnections: boolean = false;

    public colors: BobColor[] = [];
    public specialColor: BobColor | null = null;

    public randomSpecialBlockChanceOneOutOf: number = 0;
    public frequencySpecialBlockTypeOnceEveryNPieces: number = 0;

    public flashingSpecialType: boolean = false;
    public turnBackToNormalBlockAfterNPiecesLock: number = -1;

    public makePieceTypeWhenCleared_UUID: string[] = [];
    public clearEveryOtherLineOnGridWhenCleared: boolean = false;

    public counterType: boolean = false;
    public pacmanType: boolean = false;
    public pacJarType: boolean = false;
    public ticksToChangeDirection: number = 1000;

    public ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID: string[] = [];
    public addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks: boolean = false;

    public whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut: TurnFromBlockTypeToType[] = [];
    public removeAllBlocksOfColorOnFieldBlockIsSetOn: boolean = false;
    public changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor: boolean = false;
    public matchAnyColor: boolean = false;

    // Legacy/compatibility fields
    public isGarbageBlockType: boolean = false;
    public isBomb: boolean = false;
    public isWeight: boolean = false;
    public isSubtractor: boolean = false;
    public isShooter: boolean = false;
    public isBreaker: boolean = false;
    public chainMustContainAtLeastOneOfTheseBlockTypesToStartExploding: boolean = true;

    constructor(name: string = "") {
        this.uuid = crypto.randomUUID();
        this.name = name;
    }

    public isSpecialType(): boolean {
        if (this.randomSpecialBlockChanceOneOutOf !== 0) return true;
        if (this.frequencySpecialBlockTypeOnceEveryNPieces !== 0) return true;
        if (this.flashingSpecialType) return true;
        if (this.makePieceTypeWhenCleared_UUID.length > 0) return true;
        if (this.clearEveryOtherLineOnGridWhenCleared) return true;
        return this.isBomb || this.isWeight || this.isSubtractor || this.isShooter || this.isBreaker;
    }

    public isNormalType(): boolean {
        return this.useInNormalPieces;
    }
}

export const BlockTypes = {
    NORMAL: (() => {
        const bt = new BlockType("Normal");
        bt.useInNormalPieces = true;
        bt.chainMustContainAtLeastOneOfTheseBlockTypesToStartExploding = true;
        bt.colors = [
            new BobColor(0, 150, 255),    // Blue
            new BobColor(255, 50, 50),     // Red
            new BobColor(50, 220, 50),     // Green
            new BobColor(255, 220, 0),     // Yellow
            new BobColor(180, 50, 255),    // Purple
            new BobColor(255, 140, 0),     // Orange
            new BobColor(0, 220, 220),     // Cyan
        ];
        return bt;
    })(),

    GARBAGE: (() => {
        const bt = new BlockType("Garbage");
        bt.useAsGarbage = true;
        bt.isGarbageBlockType = true;
        bt.chainMustContainAtLeastOneOfTheseBlockTypesToStartExploding = false;
        return bt;
    })(),

    FILLER: (() => {
        const bt = new BlockType("Filler");
        bt.useAsPlayingFieldFiller = true;
        return bt;
    })(),
};
