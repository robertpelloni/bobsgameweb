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

export enum GamePlayMode {
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
    public gameMode: GamePlayMode = GamePlayMode.DROP;
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
    public chainRule_CheckRecursive: boolean = false;
    public chainRule_CheckTouchSameColor: boolean = true;
    public chainRule_CheckTouchAnyColor: boolean = false;

    public scoreType: ScoreType = ScoreType.LINES_CLEARED;
    public scoreTypeAmountPerLevelGained: number = 10;

    public blockTypes: BlockType[] = [];
    public pieceTypes: PieceType[] = [];
    public difficultyTypes: DifficultyType[] = [];

    public static readonly DEFAULT_DIFFICULTY_VALUES = {
        initialLineDropSpeedTicks: 1000,
        minimumLineDropSpeedTicks: 100,
        maxStackRise: 1000,
        minStackRise: 100,
        extraStage1Level: 10,
        extraStage2Level: 20,
        extraStage3Level: 30,
        extraStage4Level: 40,
        creditsLevel: 50,
        playingFieldGarbageSpawnRuleAmount: 0,
        maximumBlockTypeColors: 7,
        randomlyFillGrid: false,
        randomlyFillGridAmount: 0,
        randomlyFillGridStartY: 0,
    };

    constructor() {
        this.uuid = crypto.randomUUID();
        
        // Add default difficulty
        this.difficultyTypes.push({
            name: "Beginner",
            blockTypesToDisallow_UUID: [],
            pieceTypesToDisallow_UUID: [],
            ...GameType.DEFAULT_DIFFICULTY_VALUES
        });

        // Add standard pieces
        this.pieceTypes = [...STANDARD_PIECE_TYPES];
        this.blockTypes = [...BlockTypes];
    }

    public static fromJSON(jsonStr: string): GameType {
        const obj = JSON.parse(jsonStr);
        const gt = new GameType();
        Object.assign(gt, obj);

        if (obj.blockTypes) {
            gt.blockTypes = obj.blockTypes.map((btObj: any) => {
                const bt = new BlockType();
                Object.assign(bt, btObj);
                return bt;
            });
        }

        if (obj.pieceTypes) {
            gt.pieceTypes = obj.pieceTypes.map((ptObj: any) => {
                const pt = new PieceType();
                Object.assign(pt, ptObj);
                return pt;
            });
        }

        return gt;
    }

    public getBlockTypeByUUID(uuid: string): BlockType {
        const found = this.blockTypes.find(bt => bt.uuid === uuid);
        return found || BlockType.emptyBlockType;
    }

    public getPieceTypeByUUID(uuid: string): PieceType {
        const found = this.pieceTypes.find(pt => pt.uuid === uuid);
        return found || PieceType.emptyPieceType;
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
        return found || this.difficultyTypes[0];
    }
}

export const GameTypes = {
    CLASSIC: new GameType(),
    MODERN: new GameType()
};

GameTypes.CLASSIC.name = "Classic";
GameTypes.MODERN.name = "Modern";
