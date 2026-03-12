import { BlockType } from "./BlockType";
import { PieceType } from "./PieceType";
import { BobColor } from "../BobColor";

export type GameMode = "DROP" | "STACK";
export type GarbageType = "NONE" | "RANDOM" | "MATCH_BOTTOM_ROW" | "ZIGZAG_PATTERN";
export type GarbageSpawnRule = "NONE" | "TICKS" | "LINES_CLEARED" | "BLOCKS_CLEARED" | "PIECES_MADE";
export type VSGarbageRule = "FALL_FROM_CEILING_IN_EVEN_ROWS" | "RISE_FROM_FLOOR_IN_EVEN_ROWS";
export type ScoreType = "LINES_CLEARED" | "BLOCKS_CLEARED" | "PIECES_MADE";
export type CursorType = "ONE_BLOCK_PICK_UP" | "TWO_BLOCK_HORIZONTAL" | "TWO_BLOCK_VERTICAL" | "THREE_BLOCK_HORIZONTAL" | "THREE_BLOCK_VERTICAL" | "QUAD_BLOCK_ROTATE";
export type DropLockType = "HARD_DROP_INSTANT_LOCK" | "SOFT_DROP_INSTANT_LOCK" | "NEITHER_INSTANT_LOCK";

export interface DifficultyType {
    name: string;
    initialLineDropSpeedTicks: number;
    minimumLineDropSpeedTicks: number;
    maxStackRise: number;
    minStackRise: number;

    extraStage1Level: number;
    extraStage2Level: number;
    extraStage3Level: number;
    extraStage4Level: number;
    creditsLevel: number;

    playingFieldGarbageSpawnRuleAmount: number;

    randomlyFillGrid: boolean;
    randomlyFillGridStartY: number;
    randomlyFillGridAmount: number;
    maximumBlockTypeColors: number;
    pieceTypesToDisallow_UUID: string[];
    blockTypesToDisallow_UUID: string[];
}

export class GameType {
    public name: string = "";
    public uuid: string = "";

    public downloaded: boolean = false;
    public creatorUserID: number = 0;
    public creatorUserName: string = "";
    public dateCreated: number = 0;
    public lastModified: number = 0;
    public howManyTimesUpdated: number = 0;
    public upVotes: number = 0;
    public downVotes: number = 0;
    public yourVote: string = "none";

    // music and sound
    public normalMusic: string = "";
    public fastMusic: string = "";
    public winMusic: string = "";
    public loseMusic: string = "";
    public deadMusic: string = "";
    public creditsMusic: string = "";

    public blocksFlashingSound: string = "slam";
    public singleLineFlashingSound: string = "single";
    public doubleLineFlashingSound: string = "double";
    public tripleLineFlashingSound: string = "triple";
    public quadLineFlashingSound: string = "sosumi";

    public hardDropSwishSound: string = "";
    public hardDropClankSound: string = "slam2";
    public switchHoldPieceSound: string = "hold";
    public cantHoldPieceSound: string = "buzz";

    public moveUpSound: string = "tick";
    public moveDownSound: string = "tick";
    public moveLeftSound: string = "tick";
    public moveRightSound: string = "tick";

    public pieceSetSound: string = "lock";
    public touchBottomSound: string = "touchblock";
    public wallKickSound: string = "wallkick";
    public doubleWallKickSound: string = "doublewallkick";
    public diagonalWallKickSound: string = "specialwallkick";
    public floorKickSound: string = "floorkick";
    public pieceFlip180Sound: string = "flip";

    public rotateSound: string = "rotate";
    public levelUpSound: string = "levelup";

    public extraStage1Sound: string = "gtbling";
    public extraStage2Sound: string = "gtbling";
    public extraStage3Sound: string = "gtbling";
    public extraStage4Sound: string = "gtbling";
    public creditsSound: string = "gtbling";
    public deadSound: string = "gtbling";
    public winSound: string = "gtbling";
    public loseSound: string = "gtbling";

    public stackRiseSound: string = "tick";

    public readySound: string = "ready";
    public goSound: string = "go";

    public gotBombSound: string = "gotBomb";
    public gotWeightSound: string = "gotWeight";
    public gotSubtractorSound: string = "gotSubtractor";
    public gotAdderSound: string = "gotAdder";
    public flashingClearSound: string = "flashingClear";
    public scanlineClearSound: string = "scanlineClear";

    public useRandomSoundModulation: boolean = false;

    // game rules
    public gameMode: GameMode = "DROP";

    public rules1: string = "Make a line of 3 or more matching colors to score!";
    public rules2: string = "The spark ball turns the blocks into circles.";
    public rules3: string = "The flashing ball matches any color.";

    public scoreType: ScoreType = "BLOCKS_CLEARED";
    public scoreTypeAmountPerLevelGained: number = 4;

    public gridWidth: number = 10;
    public gridHeight: number = 20;

    public gridPixelsBetweenColumns: number = 0;
    public gridPixelsBetweenRows: number = 0;

    public nextPieceEnabled: boolean = true;
    public numberOfNextPiecesToShow: number = 3;

    public holdPieceEnabled: boolean = true;
    public resetHoldPieceRotation: boolean = true;

    public chainRule_CheckEntireLine: boolean = false;
    public chainRule_AmountPerChain: number = 0;
    public chainRule_CheckRow: boolean = false;
    public chainRule_CheckColumn: boolean = false;
    public chainRule_CheckDiagonal: boolean = false;
    public chainRule_CheckRecursiveConnections: boolean = false;
    public chainRule_CheckTouchingBreakerBlocksChain: boolean = false;

    public gravityRule_onlyMoveDownDisconnectedBlocks: boolean = false;

    public playingFieldGarbageType: GarbageType = "ZIGZAG_PATTERN";
    public playingFieldGarbageSpawnRule: GarbageSpawnRule = "NONE";

    public hardDropPunchThroughToLowestValidGridPosition: boolean = false;

    public twoSpaceWallKickAllowed: boolean = true;
    public diagonalWallKickAllowed: boolean = true;
    public pieceClimbingAllowed: boolean = true;
    public flip180Allowed: boolean = true;
    public floorKickAllowed: boolean = true;

    public vsGarbageRule: VSGarbageRule = "FALL_FROM_CEILING_IN_EVEN_ROWS";

    public stackDontPutSameColorNextToEachOther: boolean = false;
    public stackDontPutSameBlockTypeNextToEachOther: boolean = false;
    public stackDontPutSameColorDiagonalOrNextToEachOtherReturnNull: boolean = false;
    public stackLeaveAtLeastOneGapPerRow: boolean = false;

    public stackCursorType: CursorType = "ONE_BLOCK_PICK_UP";

    public blockRule_drawDotToSquareOffBlockCorners: boolean = false;
    public drawDotOnCenterOfRotation: boolean = false;

    public gridRule_outlineOpenBlockEdges: boolean = false;
    public fadeBlocksDarkerWhenLocking: boolean = true;
    public blockRule_drawBlocksDarkerWhenLocked: boolean = false;
    public blockRule_fillSolidSquareWhenSetInGrid: boolean = false;

    public blockRule_drawBlocksConnectedByPieceIgnoringColor: boolean = false;
    public blockRule_drawBlocksConnectedByColorIgnoringPiece: boolean = false;
    public blockRule_drawBlocksConnectedByColorInPiece: boolean = false;

    public whenGeneratingPieceDontMatchAllBlockColors: boolean = false;
    public whenGeneratingPieceDontMatchTwoBlocksOfTheSameSpecialRandomTypeAndColor: boolean = false;
    public whenGeneratingPieceDontMatchNormalBlockWithBlockOfDifferentTypeAndSameColor: boolean = false;

    public currentPieceOutlineFirstBlockRegardlessOfPosition: boolean = false;
    public currentPieceRule_OutlineBlockAtZeroZero: boolean = false;
    public currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty: boolean = false;

    public currentPieceMoveUpHalfABlock: boolean = false;
    public currentPieceRenderAsNormalPiece: boolean = true;
    public currentPieceRenderHoldingBlock: boolean = true;
    public currentPieceOutlineAllPieces: boolean = false;

    public bloomIntensity: number = 1.5;
    public bloomTimes: number = 4;

    public maxLockDelayTicks: number = 17 * 30;
    public spawnDelayTicksAmountPerPiece: number = 30 * 17;
    public lineClearDelayTicksAmountPerLine: number = 100 * 17;
    public lineClearDelayTicksAmountPerBlock: number = 10 * 17;

    public gravityRule_ticksToMoveDownBlocksOverBlankSpaces: number = 200;
    public moveDownAllLinesOverBlankSpacesAtOnce: boolean = false;
    public removingBlocksDelayTicksBetweenEachBlock: number = 0;

    public blockMovementInterpolationTicks: number = 100;
    public blockAnimationTicksRandomUpToBetweenLoop: number = 0;

    public blockTypes: BlockType[] = [];
    public pieceTypes: PieceType[] = [];
    public difficultyTypes: DifficultyType[] = [];

    constructor() {
        this.uuid = crypto.randomUUID();
    }

    public getDifficultyByName(name: string): DifficultyType {
        return this.difficultyTypes.find(d => d.name.toLowerCase() === name.toLowerCase()) || GameType.difficulty_NORMAL;
    }

    public static difficulty_NORMAL: DifficultyType = {
        name: "Normal",
        initialLineDropSpeedTicks: 1000,
        minimumLineDropSpeedTicks: 64,
        maxStackRise: 400,
        minStackRise: 30,
        extraStage1Level: 10,
        extraStage2Level: 15,
        extraStage3Level: 20,
        extraStage4Level: 25,
        creditsLevel: 30,
        playingFieldGarbageSpawnRuleAmount: 5,
        randomlyFillGrid: true,
        randomlyFillGridStartY: 10,
        randomlyFillGridAmount: 30,
        maximumBlockTypeColors: 8,
        pieceTypesToDisallow_UUID: [],
        blockTypesToDisallow_UUID: []
    };

    public getNormalBlockTypes(difficulty: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.useInNormalPieces && !difficulty.blockTypesToDisallow_UUID.includes(bt.uuid));
    }

    public getPlayingFieldBlockTypes(difficulty: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.useAsPlayingFieldFillerBlock && !difficulty.blockTypesToDisallow_UUID.includes(bt.uuid));
    }

    public getBlockTypesToIgnoreWhenCheckingChain(difficulty: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.ignoreWhenCheckingChainConnections);
    }

    public getBlockTypesChainMustContain(difficulty: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.chainConnectionsMustContainAtLeastOneBlockWithThisTrue);
    }

    public getNormalPieceTypes(difficulty: DifficultyType): PieceType[] {
        return this.pieceTypes.filter(pt => pt.useAsNormalPiece && !difficulty.pieceTypesToDisallow_UUID.includes(pt.uuid));
    }

    public getPlayingFieldPieceTypes(difficulty: DifficultyType): PieceType[] {
        return this.pieceTypes.filter(pt => pt.useAsPlayingFieldFillerPiece && !difficulty.pieceTypesToDisallow_UUID.includes(pt.uuid));
    }

    public getGarbageBlockTypes(difficulty: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.useAsGarbageBlock && !difficulty.blockTypesToDisallow_UUID.includes(bt.uuid));
    }

    public getGarbagePieceTypes(difficulty: DifficultyType): PieceType[] {
        return this.pieceTypes.filter(pt => pt.useAsGarbagePiece && !difficulty.pieceTypesToDisallow_UUID.includes(pt.uuid));
    }

    public getBlockTypeByUUID(uuid: string): BlockType | undefined {
        return this.blockTypes.find(bt => bt.uuid === uuid);
    }

    public getPieceTypeByUUID(uuid: string): PieceType | undefined {
        return this.pieceTypes.find(pt => pt.uuid === uuid);
    }

    public getBlockTypeByName(name: string): BlockType | undefined {
        return this.blockTypes.find(bt => bt.name === name);
    }

    public getPieceTypeByName(name: string): PieceType | undefined {
        return this.pieceTypes.find(pt => pt.name === name);
    }

    public getBlockTypesToIgnoreWhenMovingDown(difficulty: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.ignoreWhenMovingDownBlocks);
    }

    public toBase64GZippedXML(): string {
        // TODO: implement XML serialization and GZip
        return btoa(JSON.stringify(this));
    }

    public static fromBase64GZippedXML(data: string): GameType {
        // TODO: implement XML deserialization and GZip
        const gt = new GameType();
        Object.assign(gt, JSON.parse(atob(data)));
        return gt;
    }
}
