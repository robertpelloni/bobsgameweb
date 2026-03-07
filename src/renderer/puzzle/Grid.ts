import { EventEmitter } from 'eventemitter3';
import { Block, AnimationState } from './Block';
import { Piece } from './Piece';
import { PieceType, STANDARD_PIECE_TYPES } from './PieceType';
import { BlockType, BlockTypes } from './BlockType';

export interface GridEvents {
  lineCleared: (y: number) => void;
  linesCleared: (lines: number[], count: number) => void;
  blockAdded: (block: Block, x: number, y: number) => void;
  blockRemoved: (block: Block, x: number, y: number) => void;
  pieceSet: (piece: Piece) => void;
}

export interface GridConfig {
  width?: number;
  height?: number;
  hiddenRows?: number;
}

export class Grid extends EventEmitter<GridEvents> {
  readonly width: number;
  readonly height: number;
  readonly hiddenRows: number;

  private cells: (Block | null)[];

  screenX: number = 0;
  screenY: number = 0;

  wiggleX: number = 0;
  wiggleY: number = 0;
  shakeX: number = 0;
  shakeY: number = 0;

  scrollPlayingFieldY: number = 0;
  scrollBlockIncrement: number = 100;

  private randomBag: PieceType[] = [];
  private pieceTypes: readonly PieceType[] = STANDARD_PIECE_TYPES;

  constructor(config?: GridConfig) {
    super();
    this.width = config?.width ?? 10;
    this.height = config?.height ?? 20;
    this.hiddenRows = config?.hiddenRows ?? 2;

    this.cells = new Array(this.width * this.height).fill(null);
  }

  private getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): Block | null {
    if (!this.isWithinBounds(x, y)) return null;
    return this.cells[this.getIndex(x, y)];
  }

  set(x: number, y: number, block: Block | null): void {
    if (!this.isWithinBounds(x, y)) return;

    const index = this.getIndex(x, y);
    const existing = this.cells[index];

    if (existing && block !== existing) {
      existing.grid = null;
      this.emit('blockRemoved', existing, x, y);
    }

    this.cells[index] = block;

    if (block) {
      block.grid = this;
      block.setGridPosition(x, y);
      block.setInGrid = true;
      this.emit('blockAdded', block, x, y);
    }
  }

  remove(x: number, y: number): Block | null {
    if (!this.isWithinBounds(x, y)) return null;

    const index = this.getIndex(x, y);
    const block = this.cells[index];

    if (block) {
      this.cells[index] = null;
      block.grid = null;
      block.setInGrid = false;
      this.emit('blockRemoved', block, x, y);
    }

    return block;
  }

  contains(x: number, y: number): boolean {
    return this.get(x, y) !== null;
  }

  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.remove(x, y);
      }
    }
  }

  // ============================================================
  // Piece Collision & Placement
  // ============================================================

  doesPieceFit(piece: Piece): boolean {
    return this.doesPieceFitAt(piece, piece.xGrid, piece.yGrid);
  }

  doesPieceFitAt(piece: Piece, x: number, y: number): boolean {
    for (const block of piece.blocks) {
      const bx = x + block.xInPiece;
      const by = y + block.yInPiece;

      if (bx < 0 || bx >= this.width || by >= this.height) {
        return false;
      }

      if (by >= 0 && this.contains(bx, by)) {
        return false;
      }
    }
    return true;
  }

  doesPieceFitWithRotation(piece: Piece, rotation: number): boolean {
    const originalRotation = piece.currentRotation;
    piece.setRotation(rotation);
    const fits = this.doesPieceFit(piece);
    piece.setRotation(originalRotation);
    return fits;
  }

  setPiece(piece: Piece): void {
    for (const block of piece.blocks) {
      const x = piece.xGrid + block.xInPiece;
      const y = piece.yGrid + block.yInPiece;

      if (this.isWithinBounds(x, y)) {
        this.set(x, y, block);
      }
    }

    piece.grid = this;
    piece.lock();
    this.emit('pieceSet', piece);
  }

  // ============================================================
  // Line Clearing
  // ============================================================

  isLineFull(y: number): boolean {
    if (y < 0 || y >= this.height) return false;

    for (let x = 0; x < this.width; x++) {
      if (!this.contains(x, y)) return false;
    }
    return true;
  }

  isLineEmpty(y: number): boolean {
    if (y < 0 || y >= this.height) return true;

    for (let x = 0; x < this.width; x++) {
      if (this.contains(x, y)) return false;
    }
    return true;
  }

  findFullLines(): number[] {
    const fullLines: number[] = [];
    for (let y = 0; y < this.height; y++) {
      if (this.isLineFull(y)) {
        fullLines.push(y);
      }
    }
    return fullLines;
  }

  clearLine(y: number): Block[] {
    const cleared: Block[] = [];

    for (let x = 0; x < this.width; x++) {
      const block = this.remove(x, y);
      if (block) {
        cleared.push(block);
      }
    }

    this.emit('lineCleared', y);
    return cleared;
  }

  clearLines(): { lines: number[]; blocks: Block[] } {
    const fullLines = this.findFullLines();
    const allBlocks: Block[] = [];

    for (const y of fullLines) {
      const blocks = this.clearLine(y);
      allBlocks.push(...blocks);
    }

    if (fullLines.length > 0) {
      this.emit('linesCleared', fullLines, fullLines.length);
    }

    return { lines: fullLines, blocks: allBlocks };
  }

  dropLinesAbove(clearedY: number): void {
    for (let y = clearedY - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        const block = this.remove(x, y);
        if (block) {
          this.set(x, y + 1, block);
        }
      }
    }
  }

  clearAndDropLines(): { lines: number[]; blocks: Block[] } {
    const result = this.clearLines();

    const sortedLines = [...result.lines].sort((a, b) => b - a);
    for (const y of sortedLines) {
      this.dropLinesAbove(y);
    }

    return result;
  }

  // ============================================================
  // Gravity & Block Movement
  // ============================================================

  moveDownDisconnectedBlocks(): boolean {
    let moved = false;

    for (let y = this.height - 2; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        const block = this.get(x, y);
        if (block && !this.contains(x, y + 1)) {
          this.remove(x, y);
          this.set(x, y + 1, block);
          moved = true;
        }
      }
    }

    return moved;
  }

  applyGravityUntilSettled(): number {
    let iterations = 0;
    while (this.moveDownDisconnectedBlocks()) {
      iterations++;
      if (iterations > this.height) break;
    }
    return iterations;
  }

  // ============================================================
  // Chain Connection Detection
  // ============================================================

  getConnectedBlocks(startX: number, startY: number, matchColor: boolean = true): Block[] {
    const startBlock = this.get(startX, startY);
    if (!startBlock) return [];

    const visited = new Set<string>();
    const connected: Block[] = [];
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const block = this.get(x, y);
      if (!block) continue;

      if (matchColor && !block.matchesColor(startBlock)) continue;

      connected.push(block);

      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
      ];

      for (const n of neighbors) {
        if (this.isWithinBounds(n.x, n.y) && !visited.has(`${n.x},${n.y}`)) {
          queue.push(n);
        }
      }
    }

    return connected;
  }

  updateColorConnections(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const block = this.get(x, y);
        if (!block) continue;

        block.resetConnections();

        const up = this.get(x, y - 1);
        const down = this.get(x, y + 1);
        const left = this.get(x - 1, y);
        const right = this.get(x + 1, y);

        if (up && block.matchesColor(up)) block.connectedUp = true;
        if (down && block.matchesColor(down)) block.connectedDown = true;
        if (left && block.matchesColor(left)) block.connectedLeft = true;
        if (right && block.matchesColor(right)) block.connectedRight = true;
      }
    }
  }

  // ============================================================
  // Random Piece Generation (7-bag)
  // ============================================================

  setPieceTypes(types: readonly PieceType[]): void {
    this.pieceTypes = types;
    this.randomBag = [];
  }

  private refillBag(): void {
    this.randomBag = [...this.pieceTypes];
    for (let i = this.randomBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.randomBag[i], this.randomBag[j]] = [this.randomBag[j], this.randomBag[i]];
    }
  }

  getRandomPieceType(): PieceType {
    if (this.randomBag.length === 0) {
      this.refillBag();
    }
    return this.randomBag.pop()!;
  }

  createRandomPiece(blockType: BlockType = BlockTypes.NORMAL): Piece {
    const pieceType = this.getRandomPieceType();
    const spawnX = Math.floor((this.width - 4) / 2);
    const spawnY = 0;

    return new Piece({
      pieceType,
      blockType,
      x: spawnX,
      y: spawnY,
    });
  }

  peekNextPieceTypes(count: number): PieceType[] {
    while (this.randomBag.length < count) {
      const newBag = [...this.pieceTypes];
      for (let i = newBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
      }
      this.randomBag.unshift(...newBag);
    }

    return this.randomBag.slice(-count).reverse();
  }

  // ============================================================
  // Utility
  // ============================================================

  getBlockCount(): number {
    let count = 0;
    for (const cell of this.cells) {
      if (cell) count++;
    }
    return count;
  }

  getHighestBlockY(): number {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.contains(x, y)) return y;
      }
    }
    return this.height;
  }

  isGameOver(): boolean {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.hiddenRows; y++) {
        if (this.contains(x, y)) return true;
      }
    }
    return false;
  }

  clone(): Grid {
    const grid = new Grid({
      width: this.width,
      height: this.height,
      hiddenRows: this.hiddenRows,
    });

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const block = this.get(x, y);
        if (block) {
          grid.set(x, y, block.clone());
        }
      }
    }

    return grid;
  }

  toDebugString(): string {
    let result = '';
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        result += this.contains(x, y) ? '#' : '.';
      }
      result += '\n';
    }
    return result;
  }

  update(): void {
    // port shake update and block updates...
  }

  reformat(oldWidth: number, oldHeight: number): void {
    // port reformat logic...
  }

  moveDownLinesAboveBlankLinesOneLine(): boolean {
    // port line dropping logic...
    return false;
  }

  moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignoreTypes: BlockType[]): boolean {
    // port disconnected gravity logic...
    return false;
  }

  moveDownAnyBlocksAboveBlankSpacesOneLine(ignoreTypes: BlockType[]): boolean {
    // port simple gravity logic...
    return false;
  }

  scrollUpStack(cursorPiece: Piece, amt: number): boolean {
    // port stack rise logic...
    return true;
  }

  doDeathSequence(): void {
    // port death animation logic...
  }
}
