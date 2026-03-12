import { BobColor } from "../BobColor";

export interface TurnFromBlockTypeToType {
    fromType_UUID: string;
    toType_UUID: string;
}

export class BlockType {
    public name: string = "";
    public uuid: string = "";
    public description: string = "";

    public sprite: string = "";
    public spriteName: string = "";
    public specialSpriteName: string = "";

    public specialColor: BobColor | null = null;
    public colors: BobColor[] = [];

    public randomSpecialBlockChanceOneOutOf: number = 0;
    public frequencySpecialBlockTypeOnceEveryNPieces: number = 0;
    public flashingSpecialType: boolean = false;

    public makePieceTypeWhenCleared_UUID: string[] = [];
    public clearEveryOtherLineOnGridWhenCleared: boolean = false;

    public useInNormalPieces: boolean = false;
    public useAsGarbageBlock: boolean = false;
    public useAsPlayingFieldFillerBlock: boolean = false;

    public removeAllBlocksOfColorOnFieldBlockIsSetOn: boolean = false;
    public changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor: boolean = false;

    public pacmanType: boolean = false;
    public pacJarType: boolean = false;
    public ticksToChangeDirection: number = 1000;

    public counterType: boolean = false;
    public turnBackToNormalBlockAfterNPiecesLock: number = -1;

    public ignoreWhenCheckingChainConnections: boolean = false;
    public ignoreWhenMovingDownBlocks: boolean = false;
    public chainConnectionsMustContainAtLeastOneBlockWithThisTrue: boolean = false;
    public addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks: boolean = false;
    public matchAnyColor: boolean = false;

    public ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID: string[] = [];
    public whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut: TurnFromBlockTypeToType[] = [];

    constructor() {
        this.uuid = crypto.randomUUID();
    }

    public isNormalType(): boolean {
        return this.useInNormalPieces;
    }

    public isSpecialType(): boolean {
        if (this.randomSpecialBlockChanceOneOutOf !== 0) return true;
        if (this.frequencySpecialBlockTypeOnceEveryNPieces !== 0) return true;
        if (this.flashingSpecialType) return true;
        if (this.makePieceTypeWhenCleared_UUID.length > 0) return true;
        if (this.clearEveryOtherLineOnGridWhenCleared) return true;
        return false;
    }
}
