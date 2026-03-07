import { EventEmitter } from 'eventemitter3';
import { Block, AnimationState } from './Block';
import { BlockType, BlockTypes } from './BlockType';
import { PieceType, PieceTypes } from './PieceType';
import type { Grid } from './Grid';

export interface PieceEvents {
  rotate: (rotation: number) => void;
  move: (x: number, y: number) => void;
  lock: () => void;
}

export interface PieceConfig {
  pieceType?: PieceType;
  blockType?: BlockType;
  x?: number;
  y?: number;
  rotation?: number;
}

export class Piece extends EventEmitter<PieceEvents> {
  private _pieceType: PieceType;
  private _blockType: BlockType;
  private _currentRotation: number = 0;

  xGrid: number = 0;
  yGrid: number = 0;

  blocks: Block[] = [];
  grid: Grid | null = null;

  setInGrid: boolean = false;
  holdingBlock: boolean = false;
  overrideAnySpecialBehavior: boolean = false;
  piecesSetSinceThisPieceSet: number = 0;

  cursorAlpha: number = 1.0;
  ghostAlpha: number = 0.5;

  constructor(config?: PieceConfig) {
    super();
    this._pieceType = config?.pieceType ?? PieceTypes.T;
    this._blockType = config?.blockType ?? BlockTypes.NORMAL;
    this.xGrid = config?.x ?? 0;
    this.yGrid = config?.y ?? 0;
    this._currentRotation = config?.rotation ?? 0;

    this.createBlocks();
  }

  get pieceType(): PieceType {
    return this._pieceType;
  }

  get blockType(): BlockType {
    return this._blockType;
  }

  get currentRotation(): number {
    return this._currentRotation;
  }

  private createBlocks(): void {
    this.blocks = [];
    const rotation = this._pieceType.getRotation(this._currentRotation);

    for (const offset of rotation.offsets) {
      const block = new Block({
        blockType: this._blockType,
        color: this._pieceType.color,
        xInPiece: offset.x,
        yInPiece: offset.y,
      });
      block.piece = this;
      this.blocks.push(block);
    }
  }

  private updateBlockPositions(): void {
    const rotation = this._pieceType.getRotation(this._currentRotation);

    for (let i = 0; i < this.blocks.length; i++) {
      const offset = rotation.offsets[i];
      if (offset) {
        this.blocks[i].xInPiece = offset.x;
        this.blocks[i].yInPiece = offset.y;
        this.blocks[i].xGrid = this.xGrid + offset.x;
        this.blocks[i].yGrid = this.yGrid + offset.y;
      }
    }
  }

  rotateCW(): void {
    this._currentRotation = (this._currentRotation + 1) % this._pieceType.getNumRotations();
    this.updateBlockPositions();
    this.emit('rotate', this._currentRotation);
  }

  rotateCCW(): void {
    const numRotations = this._pieceType.getNumRotations();
    this._currentRotation = (this._currentRotation - 1 + numRotations) % numRotations;
    this.updateBlockPositions();
    this.emit('rotate', this._currentRotation);
  }

  rotate180(): void {
    const numRotations = this._pieceType.getNumRotations();
    this._currentRotation = (this._currentRotation + 2) % numRotations;
    this.updateBlockPositions();
    this.emit('rotate', this._currentRotation);
  }

  setRotation(rotation: number): void {
    const numRotations = this._pieceType.getNumRotations();
    this._currentRotation = ((rotation % numRotations) + numRotations) % numRotations;
    const r = this._pieceType.getRotation(this._currentRotation);
    for (let i = 0; i < this.blocks.length; i++) {
      const offset = r.offsets[i];
      if (offset) {
        this.blocks[i].setPieceOffset(offset.x, offset.y);
      }
    }
    this.emit('rotate', this._currentRotation);
  }

  moveTo(x: number, y: number): void {
    this.xGrid = x;
    this.yGrid = y;
    this.updateBlockPositions();
    this.emit('move', x, y);
  }

  moveBy(dx: number, dy: number): void {
    this.moveTo(this.xGrid + dx, this.yGrid + dy);
  }

  moveLeft(): void {
    this.moveBy(-1, 0);
  }

  moveRight(): void {
    this.moveBy(1, 0);
  }

  moveDown(): void {
    this.moveBy(0, 1);
  }

  moveUp(): void {
    this.moveBy(0, -1);
  }

  getBlockAt(xOffset: number, yOffset: number): Block | null {
    return this.blocks.find((b) => b.xInPiece === xOffset && b.yInPiece === yOffset) ?? null;
  }

  getBlockAtGrid(x: number, y: number): Block | null {
    return this.blocks.find((b) => b.xGrid === x && b.yGrid === y) ?? null;
  }

  getWidth(): number {
    if (this.blocks.length === 0) return 0;
    const minX = Math.min(...this.blocks.map((b) => b.xInPiece));
    const maxX = Math.max(...this.blocks.map((b) => b.xInPiece));
    return maxX - minX + 1;
  }

  getHeight(): number {
    if (this.blocks.length === 0) return 0;
    const minY = Math.min(...this.blocks.map((b) => b.yInPiece));
    const maxY = Math.max(...this.blocks.map((b) => b.yInPiece));
    return maxY - minY + 1;
  }

  getLowestOffsetX(): number {
    if (this.blocks.length === 0) return 0;
    return Math.min(...this.blocks.map((b) => b.xInPiece));
  }

  getHighestOffsetX(): number {
    if (this.blocks.length === 0) return 0;
    return Math.max(...this.blocks.map((b) => b.xInPiece));
  }

  getLowestOffsetY(): number {
    if (this.blocks.length === 0) return 0;
    return Math.min(...this.blocks.map((b) => b.yInPiece));
  }

  getHighestOffsetY(): number {
    if (this.blocks.length === 0) return 0;
    return Math.max(...this.blocks.map((b) => b.yInPiece));
  }

  getLeftmostX(): number {
    return this.xGrid + this.getLowestOffsetX();
  }

  getRightmostX(): number {
    return this.xGrid + this.getHighestOffsetX();
  }

  getTopmostY(): number {
    return this.yGrid + this.getLowestOffsetY();
  }

  getBottommostY(): number {
    return this.yGrid + this.getHighestOffsetY();
  }

  lock(): void {
    this.setInGrid = true;
    for (const block of this.blocks) {
      block.setInGrid = true;
      block.setState(AnimationState.SET_AT_BOTTOM);
    }
    this.emit('lock');
  }

  getGhostY(grid: Grid): number {
    let ghostY = this.yGrid;
    while (grid.doesPieceFitAt(this, this.xGrid, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }

  clone(): Piece {
    const piece = new Piece({
      pieceType: this._pieceType,
      blockType: this._blockType,
      x: this.xGrid,
      y: this.yGrid,
      rotation: this._currentRotation,
    });
    piece.setInGrid = this.setInGrid;
    piece.holdingBlock = this.holdingBlock;
    return piece;
  }

  getBlockOffsets(): Array<{ x: number; y: number }> {
    return this.blocks.map((b) => ({ x: b.xInPiece, y: b.yInPiece }));
  }

  getAbsoluteBlockPositions(): Array<{ x: number; y: number }> {
    return this.blocks.map((b) => ({ x: this.xGrid + b.xInPiece, y: this.yGrid + b.yInPiece }));
  }

  update(ticks: number, game: PuzzleGame): void {
    // cursor and ghost alpha fading logic...
    for (const b of this.blocks) {
      b.update(ticks, game);
    }
  }

  init(game: PuzzleGame): void {
    // port initColors, setPieceBlockConnections, etc...
  }
}
