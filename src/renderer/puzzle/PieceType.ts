import { Color, Colors } from './Color';
import { BlockType, BlockTypes, FlashingSpecialType } from './BlockType';

export interface BlockOffset {
  x: number;
  y: number;
}

export interface Rotation {
  offsets: readonly BlockOffset[];
}

export interface RotationSet {
  rotations: readonly Rotation[];
}

export enum RotationType {
  SRS = 'SRS',
  SEGA = 'SEGA',
  NES = 'NES',
  GB = 'GB',
  DTET = 'DTET',
}

export interface PieceTypeConfig {
  name: string;
  uuid?: string;
  color?: Color;
  rotationSet: RotationSet;
  useAsNormalPiece?: boolean;
  useAsGarbagePiece?: boolean;
  frequencySpecialPieceTypeOnceEveryNPieces?: number;
  randomSpecialPieceChanceOneOutOf?: number;
  flashingSpecialType?: FlashingSpecialType;
  bombPiece?: boolean;
  weightPiece?: boolean;
  overrideBlockType?: BlockType;
}

export class PieceType {
  readonly name: string;
  readonly uuid: string;
  readonly color: Color;
  readonly rotationSet: RotationSet;

  readonly useAsNormalPiece: boolean;
  readonly useAsGarbagePiece: boolean;

  readonly frequencySpecialPieceTypeOnceEveryNPieces: number;
  readonly randomSpecialPieceChanceOneOutOf: number;
  readonly flashingSpecialType: FlashingSpecialType;

  readonly bombPiece: boolean;
  readonly weightPiece: boolean;
  readonly overrideBlockType: BlockType | null;

  constructor(config: PieceTypeConfig) {
    this.name = config.name;
    this.uuid = config.uuid ?? crypto.randomUUID();
    this.color = config.color ?? Colors.WHITE;
    this.rotationSet = config.rotationSet;

    this.useAsNormalPiece = config.useAsNormalPiece ?? true;
    this.useAsGarbagePiece = config.useAsGarbagePiece ?? false;

    this.frequencySpecialPieceTypeOnceEveryNPieces = config.frequencySpecialPieceTypeOnceEveryNPieces ?? 0;
    this.randomSpecialPieceChanceOneOutOf = config.randomSpecialPieceChanceOneOutOf ?? 0;
    this.flashingSpecialType = config.flashingSpecialType ?? FlashingSpecialType.NONE;

    this.bombPiece = config.bombPiece ?? false;
    this.weightPiece = config.weightPiece ?? false;
    this.overrideBlockType = config.overrideBlockType ?? null;
  }

  getRotation(index: number): Rotation {
    const rotations = this.rotationSet.rotations;
    return rotations[((index % rotations.length) + rotations.length) % rotations.length];
  }

  getNumRotations(): number {
    return this.rotationSet.rotations.length;
  }

  getBlockCount(): number {
    return this.rotationSet.rotations[0]?.offsets.length ?? 0;
  }
}

// ============================================================
// Rotation Set Factories
// ============================================================

function createRotationSet(rotations: BlockOffset[][]): RotationSet {
  return {
    rotations: rotations.map((offsets) => ({ offsets })),
  };
}

export function getIRotationSet(type: RotationType = RotationType.SRS): RotationSet {
  switch (type) {
    case RotationType.SRS:
      return createRotationSet([
        [
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
        [
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 2, y: 3 },
        ],
        [
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ],
        [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
        ],
      ]);
    case RotationType.NES:
    case RotationType.GB:
      return createRotationSet([
        [
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
        [
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 2, y: 3 },
        ],
      ]);
    default:
      return getIRotationSet(RotationType.SRS);
  }
}

export function getORotationSet(): RotationSet {
  return createRotationSet([
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  ]);
}

export function getTRotationSet(type: RotationType = RotationType.SRS): RotationSet {
  return createRotationSet([
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ]);
}

export function getSRotationSet(type: RotationType = RotationType.SRS): RotationSet {
  return createRotationSet([
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ]);
}

export function getZRotationSet(type: RotationType = RotationType.SRS): RotationSet {
  return createRotationSet([
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ],
  ]);
}

export function getJRotationSet(type: RotationType = RotationType.SRS): RotationSet {
  return createRotationSet([
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
  ]);
}

export function getLRotationSet(type: RotationType = RotationType.SRS): RotationSet {
  return createRotationSet([
    [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ]);
}

// ============================================================
// Standard Tetromino Piece Types
// ============================================================

export const PieceTypes = {
  I: new PieceType({
    name: 'I',
    color: Colors.TETRIS_I,
    rotationSet: getIRotationSet(),
  }),

  O: new PieceType({
    name: 'O',
    color: Colors.TETRIS_O,
    rotationSet: getORotationSet(),
  }),

  T: new PieceType({
    name: 'T',
    color: Colors.TETRIS_T,
    rotationSet: getTRotationSet(),
  }),

  S: new PieceType({
    name: 'S',
    color: Colors.TETRIS_S,
    rotationSet: getSRotationSet(),
  }),

  Z: new PieceType({
    name: 'Z',
    color: Colors.TETRIS_Z,
    rotationSet: getZRotationSet(),
  }),

  J: new PieceType({
    name: 'J',
    color: Colors.TETRIS_J,
    rotationSet: getJRotationSet(),
  }),

  L: new PieceType({
    name: 'L',
    color: Colors.TETRIS_L,
    rotationSet: getLRotationSet(),
  }),
} as const;

export const STANDARD_PIECE_TYPES: readonly PieceType[] = [
  PieceTypes.I,
  PieceTypes.O,
  PieceTypes.T,
  PieceTypes.S,
  PieceTypes.Z,
  PieceTypes.J,
  PieceTypes.L,
];
