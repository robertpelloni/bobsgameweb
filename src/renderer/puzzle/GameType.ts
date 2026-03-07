import { PieceType, STANDARD_PIECE_TYPES } from './PieceType';
import { BlockType, BlockTypes } from './BlockType';

export enum GameMode {
  DROP = 'DROP',
  STACK = 'STACK',
}

export enum ScoreType {
  LINES_CLEARED = 'LINES_CLEARED',
  BLOCKS_CLEARED = 'BLOCKS_CLEARED',
  PIECES_MADE = 'PIECES_MADE',
}

export interface ChainRules {
  checkEntireLine: boolean;
  amountPerChain: number;
  checkRow: boolean;
  checkColumn: boolean;
  checkDiagonal: boolean;
  checkRecursiveConnections: boolean;
}

export interface GravityRules {
  onlyMoveDownDisconnectedBlocks: boolean;
  enableGravity: boolean;
}

export interface WallKickRules {
  twoSpaceWallKickAllowed: boolean;
  diagonalWallKickAllowed: boolean;
  pieceClimbingAllowed: boolean;
  flip180Allowed: boolean;
  floorKickAllowed: boolean;
}

export interface TimingRules {
  maxLockDelayTicks: number;
  spawnDelayTicksPerPiece: number;
  lineClearDelayTicksPerLine: number;
  initialDropSpeedTicks: number;
  minimumDropSpeedTicks: number;
  softDropSpeedMultiplier: number;
}

export interface VisualRules {
  drawBlocksConnectedByPieceIgnoringColor: boolean;
  drawBlocksConnectedByColorIgnoringPiece: boolean;
  showGhostPiece: boolean;
  showNextPieces: number;
  showHoldPiece: boolean;
}

export interface DifficultyLevel {
  name: string;
  level: number;
  dropSpeedTicks: number;
  randomlyFillGridRows: number;
  garbageRowsPerLevel: number;
}

export interface GameTypeConfig {
  name: string;
  uuid?: string;

  gridWidth?: number;
  gridHeight?: number;
  hiddenRows?: number;

  gameMode?: GameMode;
  scoreType?: ScoreType;

  chainRules?: Partial<ChainRules>;
  gravityRules?: Partial<GravityRules>;
  wallKickRules?: Partial<WallKickRules>;
  timingRules?: Partial<TimingRules>;
  visualRules?: Partial<VisualRules>;

  pieceTypes?: readonly PieceType[];
  blockTypes?: readonly BlockType[];
  difficultyLevels?: readonly DifficultyLevel[];
}

const DEFAULT_CHAIN_RULES: ChainRules = {
  checkEntireLine: true,
  amountPerChain: 4,
  checkRow: false,
  checkColumn: false,
  checkDiagonal: false,
  checkRecursiveConnections: false,
};

const DEFAULT_GRAVITY_RULES: GravityRules = {
  onlyMoveDownDisconnectedBlocks: false,
  enableGravity: true,
};

const DEFAULT_WALL_KICK_RULES: WallKickRules = {
  twoSpaceWallKickAllowed: true,
  diagonalWallKickAllowed: true,
  pieceClimbingAllowed: false,
  flip180Allowed: false,
  floorKickAllowed: true,
};

const DEFAULT_TIMING_RULES: TimingRules = {
  maxLockDelayTicks: 30,
  spawnDelayTicksPerPiece: 0,
  lineClearDelayTicksPerLine: 20,
  initialDropSpeedTicks: 60,
  minimumDropSpeedTicks: 1,
  softDropSpeedMultiplier: 20,
};

const DEFAULT_VISUAL_RULES: VisualRules = {
  drawBlocksConnectedByPieceIgnoringColor: false,
  drawBlocksConnectedByColorIgnoringPiece: true,
  showGhostPiece: true,
  showNextPieces: 3,
  showHoldPiece: true,
};

const DEFAULT_DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { name: 'Level 1', level: 1, dropSpeedTicks: 60, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 2', level: 2, dropSpeedTicks: 50, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 3', level: 3, dropSpeedTicks: 40, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 4', level: 4, dropSpeedTicks: 30, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 5', level: 5, dropSpeedTicks: 20, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 6', level: 6, dropSpeedTicks: 15, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 7', level: 7, dropSpeedTicks: 10, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 8', level: 8, dropSpeedTicks: 5, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 9', level: 9, dropSpeedTicks: 3, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
  { name: 'Level 10', level: 10, dropSpeedTicks: 1, randomlyFillGridRows: 0, garbageRowsPerLevel: 0 },
];

export class GameType {
  readonly name: string;
  readonly uuid: string;

  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly hiddenRows: number;

  readonly gameMode: GameMode;
  readonly scoreType: ScoreType;

  readonly chainRules: ChainRules;
  readonly gravityRules: GravityRules;
  readonly wallKickRules: WallKickRules;
  readonly timingRules: TimingRules;
  readonly visualRules: VisualRules;

  readonly pieceTypes: readonly PieceType[];
  readonly blockTypes: readonly BlockType[];
  readonly difficultyLevels: readonly DifficultyLevel[];

  constructor(config: GameTypeConfig) {
    this.name = config.name;
    this.uuid = config.uuid ?? crypto.randomUUID();

    this.gridWidth = config.gridWidth ?? 10;
    this.gridHeight = config.gridHeight ?? 20;
    this.hiddenRows = config.hiddenRows ?? 2;

    this.gameMode = config.gameMode ?? GameMode.DROP;
    this.scoreType = config.scoreType ?? ScoreType.LINES_CLEARED;

    this.chainRules = { ...DEFAULT_CHAIN_RULES, ...config.chainRules };
    this.gravityRules = { ...DEFAULT_GRAVITY_RULES, ...config.gravityRules };
    this.wallKickRules = { ...DEFAULT_WALL_KICK_RULES, ...config.wallKickRules };
    this.timingRules = { ...DEFAULT_TIMING_RULES, ...config.timingRules };
    this.visualRules = { ...DEFAULT_VISUAL_RULES, ...config.visualRules };

    this.pieceTypes = config.pieceTypes ?? STANDARD_PIECE_TYPES;
    this.blockTypes = config.blockTypes ?? [BlockTypes.NORMAL];
    this.difficultyLevels = config.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  }

  getDifficultyLevel(level: number): DifficultyLevel {
    const clamped = Math.max(1, Math.min(level, this.difficultyLevels.length));
    return this.difficultyLevels[clamped - 1];
  }

  getDropSpeedForLevel(level: number): number {
    return this.getDifficultyLevel(level).dropSpeedTicks;
  }
}

// ============================================================
// Standard Game Types
// ============================================================

export const GameTypes = {
  CLASSIC: new GameType({
    name: 'Classic',
    gridWidth: 10,
    gridHeight: 20,
    gameMode: GameMode.DROP,
    scoreType: ScoreType.LINES_CLEARED,
  }),

  MODERN: new GameType({
    name: 'Modern',
    gridWidth: 10,
    gridHeight: 20,
    gameMode: GameMode.DROP,
    scoreType: ScoreType.LINES_CLEARED,
    wallKickRules: {
      twoSpaceWallKickAllowed: true,
      diagonalWallKickAllowed: true,
      pieceClimbingAllowed: true,
      flip180Allowed: true,
      floorKickAllowed: true,
    },
    visualRules: {
      showGhostPiece: true,
      showNextPieces: 5,
      showHoldPiece: true,
      drawBlocksConnectedByPieceIgnoringColor: false,
      drawBlocksConnectedByColorIgnoringPiece: true,
    },
  }),

  PUYO: new GameType({
    name: 'Puyo',
    gridWidth: 6,
    gridHeight: 12,
    gameMode: GameMode.DROP,
    scoreType: ScoreType.BLOCKS_CLEARED,
    chainRules: {
      checkEntireLine: false,
      amountPerChain: 4,
      checkRecursiveConnections: true,
    },
    gravityRules: {
      onlyMoveDownDisconnectedBlocks: true,
      enableGravity: true,
    },
  }),

  COLUMNS: new GameType({
    name: 'Columns',
    gridWidth: 6,
    gridHeight: 13,
    gameMode: GameMode.DROP,
    scoreType: ScoreType.BLOCKS_CLEARED,
    chainRules: {
      checkEntireLine: false,
      amountPerChain: 3,
      checkRow: true,
      checkColumn: true,
      checkDiagonal: true,
    },
  }),
} as const;
