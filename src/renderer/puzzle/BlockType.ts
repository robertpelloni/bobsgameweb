import { Color, Colors, DEFAULT_BLOCK_COLORS } from './Color';

export enum FlashingSpecialType {
  NONE = 0,
  FLASH_THEN_CHANGE_TO_RANDOM_COLOR = 1,
  FLASH_THEN_DESTROY_ALL_BLOCKS_OF_SAME_COLOR = 2,
  FLASH_THEN_DESTROY_PIECE_IT_IS_ON = 3,
}

export enum CounterType {
  NONE = 0,
  COUNT_DOWN_EACH_LINE_DROP = 1,
  COUNT_DOWN_EACH_GRAVITY_DROP = 2,
  COUNT_DOWN_EACH_PIECE_SET = 3,
}

export enum BombType {
  NONE = 0,
  DESTROY_SURROUNDING_8_BLOCKS = 1,
  DESTROY_ENTIRE_ROW = 2,
  DESTROY_ENTIRE_COLUMN = 3,
  DESTROY_ROW_AND_COLUMN = 4,
}

export interface BlockTypeConfig {
  name: string;
  uuid?: string;
  spriteName?: string;
  colors?: readonly Color[];
  useInNormalPieces?: boolean;
  useAsGarbage?: boolean;
  useAsPlayingFieldFiller?: boolean;
  ignoreWhenMovingDownBlocks?: boolean;
  chainConnectionsMustContainAtLeastOneBlockWithThisTrue?: boolean;
  ignoreWhenCheckingChainConnections?: boolean;
  flashingSpecialType?: FlashingSpecialType;
  counterType?: CounterType;
  counterStartAmount?: number;
  bombType?: BombType;
}

export class BlockType {
  readonly name: string;
  readonly uuid: string;
  readonly spriteName: string;
  readonly colors: readonly Color[];

  readonly useInNormalPieces: boolean;
  readonly useAsGarbage: boolean;
  readonly useAsPlayingFieldFiller: boolean;

  readonly ignoreWhenMovingDownBlocks: boolean;
  readonly chainConnectionsMustContainAtLeastOneBlockWithThisTrue: boolean;
  readonly ignoreWhenCheckingChainConnections: boolean;

  readonly flashingSpecialType: FlashingSpecialType;
  readonly counterType: CounterType;
  readonly counterStartAmount: number;
  readonly bombType: BombType;

  constructor(config: BlockTypeConfig) {
    this.name = config.name;
    this.uuid = config.uuid ?? crypto.randomUUID();
    this.spriteName = config.spriteName ?? 'block';
    this.colors = config.colors ?? DEFAULT_BLOCK_COLORS;

    this.useInNormalPieces = config.useInNormalPieces ?? true;
    this.useAsGarbage = config.useAsGarbage ?? false;
    this.useAsPlayingFieldFiller = config.useAsPlayingFieldFiller ?? false;

    this.ignoreWhenMovingDownBlocks = config.ignoreWhenMovingDownBlocks ?? false;
    this.chainConnectionsMustContainAtLeastOneBlockWithThisTrue =
      config.chainConnectionsMustContainAtLeastOneBlockWithThisTrue ?? true;
    this.ignoreWhenCheckingChainConnections = config.ignoreWhenCheckingChainConnections ?? false;

    this.flashingSpecialType = config.flashingSpecialType ?? FlashingSpecialType.NONE;
    this.counterType = config.counterType ?? CounterType.NONE;
    this.counterStartAmount = config.counterStartAmount ?? 0;
    this.bombType = config.bombType ?? BombType.NONE;
  }

  getRandomColor(): Color {
    if (this.colors.length === 0) return Colors.WHITE;
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  isSpecial(): boolean {
    return (
      this.flashingSpecialType !== FlashingSpecialType.NONE ||
      this.counterType !== CounterType.NONE ||
      this.bombType !== BombType.NONE
    );
  }
}

// ============================================================
// Standard Block Types
// ============================================================

export const BlockTypes = {
  NORMAL: new BlockType({
    name: 'Normal',
    useInNormalPieces: true,
  }),

  GARBAGE: new BlockType({
    name: 'Garbage',
    useInNormalPieces: false,
    useAsGarbage: true,
    chainConnectionsMustContainAtLeastOneBlockWithThisTrue: false,
  }),

  FILLER: new BlockType({
    name: 'Filler',
    useInNormalPieces: false,
    useAsPlayingFieldFiller: true,
  }),

  FLASH_RANDOM: new BlockType({
    name: 'Flash Random',
    useInNormalPieces: false,
    flashingSpecialType: FlashingSpecialType.FLASH_THEN_CHANGE_TO_RANDOM_COLOR,
  }),

  FLASH_DESTROY_COLOR: new BlockType({
    name: 'Flash Destroy Color',
    useInNormalPieces: false,
    flashingSpecialType: FlashingSpecialType.FLASH_THEN_DESTROY_ALL_BLOCKS_OF_SAME_COLOR,
  }),

  BOMB_3X3: new BlockType({
    name: 'Bomb 3x3',
    useInNormalPieces: false,
    bombType: BombType.DESTROY_SURROUNDING_8_BLOCKS,
  }),

  BOMB_ROW: new BlockType({
    name: 'Bomb Row',
    useInNormalPieces: false,
    bombType: BombType.DESTROY_ENTIRE_ROW,
  }),

  BOMB_COLUMN: new BlockType({
    name: 'Bomb Column',
    useInNormalPieces: false,
    bombType: BombType.DESTROY_ENTIRE_COLUMN,
  }),

  BOMB_CROSS: new BlockType({
    name: 'Bomb Cross',
    useInNormalPieces: false,
    bombType: BombType.DESTROY_ROW_AND_COLUMN,
  }),
} as const;
