import { BlockType, BlockTypes } from "./BlockType";
import { PieceType, PieceTypes, STANDARD_PIECE_TYPES } from "./PieceType";

export type VSGarbageRule = "NONE" | "SEND_GARBAGE";

export enum GarbageSpawnRule {
    NONE = "NONE",
    TICKS = "TICKS",
    LINES_CLEARED = "LINES_CLEARED",
    BLOCKS_CLEARED = "BLOCKS_CLEARED",
    PIECES_MADE = "PIECES_MADE",
}

export enum ScoreType {
    LINES_CLEARED = "LINES_CLEARED",
    BLOCKS_CLEARED = "BLOCKS_CLEARED",
    PIECES_MADE = "PIECES_MADE",
}

export enum DropLockType {
    HARD_DROP_INSTANT_LOCK = "HARD_DROP_INSTANT_LOCK",
    SOFT_DROP_INSTANT_LOCK = "SOFT_DROP_INSTANT_LOCK",
    NEITHER_INSTANT_LOCK = "NEITHER_INSTANT_LOCK",
}

export enum GarbageType {
    NONE = "NONE",
    MATCH_BOTTOM_ROW = "MATCH_BOTTOM_ROW",
    RANDOM = "RANDOM",
    ZIGZAG_PATTERN = "ZIGZAG_PATTERN",
}

export enum GameMode {
    DROP = "DROP",
    STACK = "STACK",
}

export enum VSGarbageDropRule {
    FALL_FROM_CEILING_IN_EVEN_ROWS = "FALL_FROM_CEILING_IN_EVEN_ROWS",
    RISE_FROM_FLOOR_IN_EVEN_ROWS = "RISE_FROM_FLOOR_IN_EVEN_ROWS",
}

export enum RotationType {
    SRS = "SRS",
    SEGA = "SEGA",
    NES = "NES",
    GB = "GB",
    DTET = "DTET",
}


export enum CursorType {
    ONE_BLOCK_PICK_UP,
    TWO_BLOCK_HORIZONTAL,
    TWO_BLOCK_VERTICAL,
    THREE_BLOCK_HORIZONTAL,
    THREE_BLOCK_VERTICAL,
    QUAD_BLOCK_ROTATE,
}

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
    maximumBlockTypeColors: number;
    randomlyFillGrid: boolean;
    randomlyFillGridAmount: number;
    randomlyFillGridStartY: number;
    blockTypesToDisallow_UUID: string[];
    pieceTypesToDisallow_UUID: string[];
}

export class GameType {
    public uuid: string = "";
    public name: string = "New Game Type";
    public gameMode: GameMode = GameMode.DROP;
    public gridWidth: number = 10;
    public gridHeight: number = 20;

    public vsGarbageDropRule: VSGarbageDropRule = VSGarbageDropRule.FALL_FROM_CEILING_IN_EVEN_ROWS;
    public rotationType: RotationType = RotationType.SRS;
    public numberOfNextPiecesToShow: number = 3;

    public maxLockDelayTicks: number = 500;
    public gravityRule_ticksToMoveDownBlocksOverBlankSpaces: number = 100;
    public moveDownAllLinesOverBlankSpacesAtOnce: boolean = false;
    public gravityRule_onlyMoveDownDisconnectedBlocks: boolean = false;

    public chainRule_AmountPerChain: number = 3;
    public chainRule_CheckRow: boolean = true;
    public chainRule_CheckColumn: boolean = true;
    public chainRule_CheckDiagonal: boolean = false;
    public chainRule_CheckRecursiveConnections: boolean = false;
    public chainRule_CheckEntireLine: boolean = false;
    public chainRule_CheckTouchingBreakerBlocksChain: boolean = false;

    public removingBlocksDelayTicksBetweenEachBlock: number = 0;

    public fadeBlocksDarkerWhenLocking: boolean = true;
    public blockRule_drawBlocksDarkerWhenLocked: boolean = false;
    public blockRule_drawDotToSquareOffBlockCorners: boolean = false;
    public drawDotOnCenterOfRotation: boolean = false;

    public stackDontPutSameColorNextToEachOther: boolean = false;
    public stackDontPutSameBlockTypeNextToEachOther: boolean = false;
    public stackDontPutSameColorDiagonalOrNextToEachOtherReturnNull: boolean = false;
    public stackLeaveAtLeastOneGapPerRow: boolean = false;

    public playingFieldGarbageType: GarbageType = GarbageType.NONE as any;
    public playingFieldGarbageSpawnRule: GarbageSpawnRule = GarbageSpawnRule.NONE;

    public scoreType: ScoreType = ScoreType.LINES_CLEARED;
    public scoreTypeAmountPerLevelGained: number = 10;

    public blockTypes: BlockType[] = [];
    public pieceTypes: PieceType[] = [];
    public difficultyTypes: DifficultyType[] = [];

    public gridPixelsBetweenColumns: number = 0;
    public gridPixelsBetweenRows: number = 0;

    public touchBottomSound: string = "touchBottom";
    public wallKickSound: string = "wallKick";
    public doubleWallKickSound: string = "doubleWallKick";
    public diagonalWallKickSound: string = "diagonalWallKick";
    public floorKickSound: string = "floorKick";
    public pieceFlip180Sound: string = "pieceFlip180";
    public hardDropClankSound: string = "hardDropClank";
    public hardDropSwishSound: string = "hardDropSwish";
    public gotBombSound: string = "gotBomb";
    public gotWeightSound: string = "gotWeight";
    public gotSubtractorSound: string = "gotSubtractor";
    public gotAdderSound: string = "gotAdder";
    public flashingClearSound: string = "flashingClear";

    public pieceClimbingAllowed: boolean = true;
    public twoSpaceWallKickAllowed: boolean = true;
    public diagonalWallKickAllowed: boolean = true;
    public floorKickAllowed: boolean = true;
    public flip180Allowed: boolean = true;

    constructor() {
        this.uuid = crypto.randomUUID();
    }

    public static readonly DEFAULT_DIFFICULTY_VALUES = {
        extraStage1Level: 10,
        extraStage2Level: 15,
        extraStage3Level: 20,
        extraStage4Level: 25,
        creditsLevel: 30,
        playingFieldGarbageSpawnRuleAmount: 5,
    };

    public static readonly difficulty_BEGINNER: DifficultyType = {
        name: "Beginner",
        initialLineDropSpeedTicks: 1000,
        minimumLineDropSpeedTicks: 500,
        maxStackRise: 1000,
        minStackRise: 500,
        maximumBlockTypeColors: 3,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
        blockTypesToDisallow_UUID: [],
        pieceTypesToDisallow_UUID: [],
        ...GameType.DEFAULT_DIFFICULTY_VALUES
    };

    public static readonly difficulty_NORMAL: DifficultyType = {
        name: "Normal",
        initialLineDropSpeedTicks: 500,
        minimumLineDropSpeedTicks: 100,
        maxStackRise: 500,
        minStackRise: 100,
        maximumBlockTypeColors: 4,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
        blockTypesToDisallow_UUID: [],
        pieceTypesToDisallow_UUID: [],
        ...GameType.DEFAULT_DIFFICULTY_VALUES
    };

    public static readonly difficulty_HARD: DifficultyType = {
        name: "Hard",
        initialLineDropSpeedTicks: 200,
        minimumLineDropSpeedTicks: 50,
        maxStackRise: 200,
        minStackRise: 50,
        maximumBlockTypeColors: 5,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
        blockTypesToDisallow_UUID: [],
        pieceTypesToDisallow_UUID: [],
        ...GameType.DEFAULT_DIFFICULTY_VALUES
    };

    public static readonly difficulty_INSANE: DifficultyType = {
        name: "Insane",
        initialLineDropSpeedTicks: 100,
        minimumLineDropSpeedTicks: 10,
        maxStackRise: 100,
        minStackRise: 10,
        maximumBlockTypeColors: 6,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
        blockTypesToDisallow_UUID: [],
        pieceTypesToDisallow_UUID: [],
        ...GameType.DEFAULT_DIFFICULTY_VALUES
    };

    public static readonly difficulty_IMPOSSIBLE: DifficultyType = {
        name: "Impossible",
        initialLineDropSpeedTicks: 50,
        minimumLineDropSpeedTicks: 0,
        maxStackRise: 50,
        minStackRise: 0,
        maximumBlockTypeColors: 7,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
        blockTypesToDisallow_UUID: [],
        pieceTypesToDisallow_UUID: [],
        ...GameType.DEFAULT_DIFFICULTY_VALUES
    };

    public static readonly difficulty_EASY: DifficultyType = {
        name: "Easy",
        initialLineDropSpeedTicks: 750,
        minimumLineDropSpeedTicks: 300,
        maxStackRise: 750,
        minStackRise: 300,
        maximumBlockTypeColors: 4,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
        blockTypesToDisallow_UUID: [],
        pieceTypesToDisallow_UUID: [],
        ...GameType.DEFAULT_DIFFICULTY_VALUES
    };

    public getBlockTypeByUUID(uuid: string): BlockType {
        const found = this.blockTypes.find(bt => bt.uuid === uuid);
        return found || BlockType.emptyBlockType;
    }

    public getPieceTypeByUUID(uuid: string): PieceType {
        const found = this.pieceTypes.find(pt => pt.uuid === uuid);
        return found || PieceType.emptyPieceType;
    }

    public getNormalBlockTypes(d: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => !bt.isSpecialType() && !d.blockTypesToDisallow_UUID.includes(bt.uuid));
    }

    public getNormalPieceTypes(d: DifficultyType): PieceType[] {
        return this.pieceTypes.filter(pt => !pt.isSpecialType() && !d.pieceTypesToDisallow_UUID.includes(pt.uuid));
    }

    public getGarbageBlockTypes(d: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.isGarbageBlockType);
    }

    public getGarbagePieceTypes(d: DifficultyType): PieceType[] {
        return this.pieceTypes.filter(pt => pt.isGarbagePieceType);
    }

    public getPlayingFieldBlockTypes(d: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => !bt.isSpecialType() && !bt.isGarbageBlockType);
    }

    public getPlayingFieldPieceTypes(d: DifficultyType): PieceType[] {
        return this.pieceTypes.filter(pt => !pt.isSpecialType() && !pt.isGarbagePieceType);
    }

    public getBlockTypesToIgnoreWhenMovingDown(d: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.ignoreWhenMovingDownBlocks);
    }

    public getBlockTypesToIgnoreWhenCheckingChain(d: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.ignoreWhenCheckingChain);
    }

    public getBlockTypesChainMustContain(d: DifficultyType): BlockType[] {
        return this.blockTypes.filter(bt => bt.chainMustContainAtLeastOneOfTheseBlockTypesToStartExploding);
    }

    public getDifficultyByName(name: string): DifficultyType {
        const found = this.difficultyTypes.find(d => d.name.toLowerCase() === name.toLowerCase());
        if (found) return found;
        if (name.toLowerCase() === "beginner") return GameType.difficulty_BEGINNER;
        if (name.toLowerCase() === "easy") return GameType.difficulty_EASY;
        if (name.toLowerCase() === "hard") return GameType.difficulty_HARD;
        if (name.toLowerCase() === "insane") return GameType.difficulty_INSANE;
        if (name.toLowerCase() === "impossible") return GameType.difficulty_IMPOSSIBLE;
        return GameType.difficulty_NORMAL;
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

export const GameTypes = {
    CLASSIC: (() => {
        const gt = new GameType();
        gt.name = "Classic";
        gt.gameMode = GameMode.DROP;
        gt.scoreType = ScoreType.LINES_CLEARED;
        gt.chainRule_CheckEntireLine = true;
        gt.blockTypes = [BlockTypes.NORMAL];
        gt.pieceTypes = [...STANDARD_PIECE_TYPES];
        return gt;
    })(),

    MODERN: (() => {
        const gt = new GameType();
        gt.name = "Modern";
        gt.gameMode = GameMode.DROP;
        gt.scoreType = ScoreType.LINES_CLEARED;
        gt.chainRule_CheckEntireLine = true;
        gt.blockTypes = [BlockTypes.NORMAL];
        gt.pieceTypes = [...STANDARD_PIECE_TYPES];
        return gt;
    })(),

    PUYO: (() => {
        const gt = new GameType();
        gt.name = "Puyo";
        gt.gridWidth = 6;
        gt.gridHeight = 12;
        gt.gameMode = GameMode.DROP;
        gt.scoreType = ScoreType.BLOCKS_CLEARED;
        gt.chainRule_CheckEntireLine = false;
        gt.chainRule_AmountPerChain = 4;
        gt.chainRule_CheckRecursiveConnections = true;
        gt.gravityRule_onlyMoveDownDisconnectedBlocks = true;
        gt.blockTypes = [BlockTypes.NORMAL];
        gt.pieceTypes = [PieceTypes.I]; // Puyo is usually 2 blocks, but PieceTypes.I is 4. Need to define 2 block piece properly.
        return gt;
    })(),

    COLUMNS: (() => {
        const gt = new GameType();
        gt.name = "Columns";
        gt.gridWidth = 6;
        gt.gridHeight = 13;
        gt.gameMode = GameMode.DROP;
        gt.scoreType = ScoreType.BLOCKS_CLEARED;
        gt.chainRule_CheckEntireLine = false;
        gt.chainRule_AmountPerChain = 3;
        gt.chainRule_CheckRow = true;
        gt.chainRule_CheckColumn = true;
        gt.chainRule_CheckDiagonal = true;
        gt.blockTypes = [BlockTypes.NORMAL];
        gt.pieceTypes = [PieceTypes.I]; // Columns is usually 3 vertical blocks.
        return gt;
    })(),
};
