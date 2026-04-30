/**
 * Puzzle types — core data types for the puzzle game engine.
 *
 * Ported from okgame C++ Puzzle/Block.h, Piece.h, GameType.h, Grid.h
 */

// ============================================================
// Block Types
// ============================================================

export enum AnimationState {
    NORMAL = 0,
    DROPPING = 1,
    TOUCHING_BOTTOM = 2,
    SET_AT_BOTTOM = 3,
    FLASHING = 4,
    REMOVING = 5,
    PRESSURE = 6,
}

export class BlockType {
    name = '';
    uuid = '';
    spriteName = '';
    specialSpriteName = '';

    useInNormalPieces = false;
    useAsGarbage = false;
    useAsPlayingFieldFiller = false;
    ignoreWhenMovingDownBlocks = false;
    chainConnectionsMustContainAtLeastOneBlockWithThisTrue = false;
    ignoreWhenCheckingChainConnections = false;

    colors: number[] = [];
    specialColor: number | null = null;

    randomSpecialBlockChanceOneOutOf = 0;
    frequencySpecialBlockTypeOnceEveryNPieces = 0;

    flashingSpecialType = false;
    turnBackToNormalBlockAfterNPiecesLock = -1;
    clearEveryOtherLineOnGridWhenCleared = false;
    counterType = false;
    pacmanType = false;
    matchAnyColor = false;

    static readonly EMPTY = new BlockType();
    static readonly SQUARE = new BlockType();
}

export class Block {
    x = 0;
    y = 0;
    type: BlockType;
    color = 0;
    state: AnimationState = AnimationState.NORMAL;
    stateTimer = 0;
    alpha = 1.0;
    popping = false;
    flashing = false;
    specialTimer = -1;
    chainNumber = 0;

    constructor(type?: BlockType, color?: number) {
        this.type = type ?? BlockType.EMPTY;
        this.color = color ?? 0;
    }

    isEmpty(): boolean {
        return this.type === BlockType.EMPTY;
    }

    isSetAtBottom(): boolean {
        return this.state === AnimationState.SET_AT_BOTTOM;
    }

    isPopping(): boolean {
        return this.popping;
    }
}

// ============================================================
// Piece Types
// ============================================================

export enum MovementType {
    UP = 0,
    DOWN = 1,
    RIGHT = 2,
    LEFT = 3,
    ROTATE_COUNTERCLOCKWISE = 4,
    ROTATE_CLOCKWISE = 5,
    ROTATE_180 = 6,
    HARD_DROP = 7,
}

export class PieceType {
    name = '';
    uuid = '';
    blocks: (BlockType | null)[][] = [];
    width = 0;
    height = 0;

    static fromPattern(name: string, pattern: (number | null)[][], colors: number[]): PieceType {
        const pt = new PieceType();
        pt.name = name;
        pt.height = pattern.length;
        pt.width = pattern[0]?.length ?? 0;
        pt.blocks = pattern.map(row =>
            row.map(cell => cell !== null ? BlockType.SQUARE : null),
        );
        return pt;
    }
}

export class Piece {
    type: PieceType;
    blocks: Block[][];
    x = 0;
    y = 0;
    color = 0;
    isCurrentPiece = false;
    isNextPiece = false;

    constructor(type: PieceType, color?: number) {
        this.type = type;
        this.color = color ?? 0;
        this.blocks = type.blocks.map(row =>
            row.map(bt => bt ? new Block(bt, this.color) : new Block()),
        );
    }

    getWidth(): number { return this.type.width; }
    getHeight(): number { return this.type.height; }

    /** Get the grid cells this piece occupies at a given position */
    getCells(px?: number, py?: number): { x: number; y: number; block: Block }[] {
        const result: { x: number; y: number; block: Block }[] = [];
        const ox = px ?? this.x;
        const oy = py ?? this.y;
        for (let r = 0; r < this.blocks.length; r++) {
            for (let c = 0; c < this.blocks[r].length; c++) {
                if (!this.blocks[r][c].isEmpty()) {
                    result.push({ x: ox + c, y: oy + r, block: this.blocks[r][c] });
                }
            }
        }
        return result;
    }
}

// ============================================================
// Game Type Definitions
// ============================================================

export enum GameEnum {
    TETRIS = 'tetris',
    PUYO = 'puyo',
    COLUMNS = 'columns',
    DR_MARIO = 'dr_mario',
    PANEL_DE_PON = 'panel_de_pon',
    MAGIC_DROP = 'magic_drop',
    LUMINES = 'lumines',
    TETRIS_ATTACK = 'tetris_attack',
    CUSTOM = 'custom',
}

export interface GameTypeDefinition {
    name: string;
    gameEnum: GameEnum;
    gridWidth: number;
    gridHeight: number;
    visibleGridHeight: number;
    cellWidth: number;
    cellHeight: number;
    colorsPerPiece: number;
    blocksPerPiece: number;
    numberOfColors: number;
    hasGravity: boolean;
    hasHardDrop: boolean;
    hasWallKick: boolean;
    hasHoldPiece: boolean;
    nextPiecesCount: number;
    dropSpeed: number;
    lockDelay: number;
    clearCondition: 'lines' | 'match' | 'chain' | 'connected';
    minimumMatchSize: number;
    pieces: PieceType[];
    blockTypes: BlockType[];
}

export const DEFAULT_GAME_TYPES: Record<GameEnum, GameTypeDefinition> = {
    [GameEnum.TETRIS]: {
        name: 'Tetris',
        gameEnum: GameEnum.TETRIS,
        gridWidth: 10,
        gridHeight: 20,
        visibleGridHeight: 20,
        cellWidth: 24,
        cellHeight: 24,
        colorsPerPiece: 1,
        blocksPerPiece: 4,
        numberOfColors: 7,
        hasGravity: true,
        hasHardDrop: true,
        hasWallKick: true,
        hasHoldPiece: true,
        nextPiecesCount: 6,
        dropSpeed: 1000,
        lockDelay: 500,
        clearCondition: 'lines',
        minimumMatchSize: 10,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.PUYO]: {
        name: 'Puyo Puyo',
        gameEnum: GameEnum.PUYO,
        gridWidth: 6,
        gridHeight: 13,
        visibleGridHeight: 12,
        cellWidth: 32,
        cellHeight: 32,
        colorsPerPiece: 2,
        blocksPerPiece: 2,
        numberOfColors: 5,
        hasGravity: true,
        hasHardDrop: true,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 2,
        dropSpeed: 800,
        lockDelay: 0,
        clearCondition: 'connected',
        minimumMatchSize: 4,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.COLUMNS]: {
        name: 'Columns',
        gameEnum: GameEnum.COLUMNS,
        gridWidth: 6,
        gridHeight: 13,
        visibleGridHeight: 13,
        cellWidth: 32,
        cellHeight: 32,
        colorsPerPiece: 3,
        blocksPerPiece: 3,
        numberOfColors: 7,
        hasGravity: true,
        hasHardDrop: true,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 1,
        dropSpeed: 600,
        lockDelay: 0,
        clearCondition: 'match',
        minimumMatchSize: 3,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.DR_MARIO]: {
        name: 'Dr. Mario',
        gameEnum: GameEnum.DR_MARIO,
        gridWidth: 8,
        gridHeight: 16,
        visibleGridHeight: 16,
        cellWidth: 24,
        cellHeight: 24,
        colorsPerPiece: 2,
        blocksPerPiece: 2,
        numberOfColors: 3,
        hasGravity: true,
        hasHardDrop: true,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 3,
        dropSpeed: 700,
        lockDelay: 0,
        clearCondition: 'connected',
        minimumMatchSize: 4,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.PANEL_DE_PON]: {
        name: 'Panel de Pon',
        gameEnum: GameEnum.PANEL_DE_PON,
        gridWidth: 6,
        gridHeight: 12,
        visibleGridHeight: 12,
        cellWidth: 32,
        cellHeight: 32,
        colorsPerPiece: 1,
        blocksPerPiece: 1,
        numberOfColors: 5,
        hasGravity: true,
        hasHardDrop: false,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 0,
        dropSpeed: 0,
        lockDelay: 0,
        clearCondition: 'match',
        minimumMatchSize: 3,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.MAGIC_DROP]: {
        name: 'Magic Drop',
        gameEnum: GameEnum.MAGIC_DROP,
        gridWidth: 6,
        gridHeight: 15,
        visibleGridHeight: 15,
        cellWidth: 32,
        cellHeight: 32,
        colorsPerPiece: 1,
        blocksPerPiece: 1,
        numberOfColors: 6,
        hasGravity: true,
        hasHardDrop: false,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 0,
        dropSpeed: 0,
        lockDelay: 0,
        clearCondition: 'match',
        minimumMatchSize: 3,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.LUMINES]: {
        name: 'Lumines',
        gameEnum: GameEnum.LUMINES,
        gridWidth: 16,
        gridHeight: 10,
        visibleGridHeight: 10,
        cellWidth: 20,
        cellHeight: 20,
        colorsPerPiece: 2,
        blocksPerPiece: 4,
        numberOfColors: 2,
        hasGravity: true,
        hasHardDrop: false,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 1,
        dropSpeed: 500,
        lockDelay: 0,
        clearCondition: 'match',
        minimumMatchSize: 4,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.TETRIS_ATTACK]: {
        name: 'Tetris Attack',
        gameEnum: GameEnum.TETRIS_ATTACK,
        gridWidth: 6,
        gridHeight: 12,
        visibleGridHeight: 12,
        cellWidth: 32,
        cellHeight: 32,
        colorsPerPiece: 1,
        blocksPerPiece: 1,
        numberOfColors: 5,
        hasGravity: true,
        hasHardDrop: false,
        hasWallKick: false,
        hasHoldPiece: false,
        nextPiecesCount: 0,
        dropSpeed: 0,
        lockDelay: 0,
        clearCondition: 'match',
        minimumMatchSize: 3,
        pieces: [],
        blockTypes: [],
    },
    [GameEnum.CUSTOM]: {
        name: 'Custom',
        gameEnum: GameEnum.CUSTOM,
        gridWidth: 10,
        gridHeight: 20,
        visibleGridHeight: 20,
        cellWidth: 24,
        cellHeight: 24,
        colorsPerPiece: 1,
        blocksPerPiece: 4,
        numberOfColors: 7,
        hasGravity: true,
        hasHardDrop: true,
        hasWallKick: true,
        hasHoldPiece: true,
        nextPiecesCount: 6,
        dropSpeed: 1000,
        lockDelay: 500,
        clearCondition: 'lines',
        minimumMatchSize: 10,
        pieces: [],
        blockTypes: [],
    },
};
