import { EventEmitter } from 'eventemitter3';
import { Grid } from './Grid';
import { Piece } from './Piece';
import { Block, AnimationState } from './Block';
import { GameType, GameTypes, DifficultyLevel } from './GameType';
import { BlockTypes } from './BlockType';

import { GameMode } from '../data/HighScoreManager';

// ============================================================
// Types & Enums
// ============================================================

export enum GameState {
  IDLE = 'IDLE',
  READY = 'READY',
  PLAYING = 'PLAYING',
  LINE_CLEAR = 'LINE_CLEAR',
  SPAWN_DELAY = 'SPAWN_DELAY',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
  WON = 'WON',
}

export enum MovementType {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
  UP = 'UP',
  ROTATE_CW = 'ROTATE_CW',
  ROTATE_CCW = 'ROTATE_CCW',
  ROTATE_180 = 'ROTATE_180',
  HARD_DROP = 'HARD_DROP',
  SOFT_DROP = 'SOFT_DROP',
  HOLD = 'HOLD',
}

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  up: boolean;
  rotateCW: boolean;
  rotateCCW: boolean;
  rotate180: boolean;
  hardDrop: boolean;
  hold: boolean;
}

export interface PuzzleGameEvents {
  stateChange: (state: GameState, prevState: GameState) => void;
  pieceSpawned: (piece: Piece) => void;
  pieceLocked: (piece: Piece) => void;
  pieceHeld: (piece: Piece | null, prevHold: Piece | null) => void;
  pieceMoved: (piece: Piece, movement: MovementType) => void;
  linesCleared: (lines: number[], chain: number, combo: number) => void;
  levelUp: (level: number) => void;
  gameOver: () => void;
  win: () => void;
  tick: (ticks: number) => void;
}

export interface PuzzleGameConfig {
  gameType?: GameType;
  gameMode?: GameMode;
  seed?: number;
  startLevel?: number;
}

// ============================================================
// Wall Kick Tables (SRS)
// ============================================================

const SRS_WALL_KICKS_JLSTZ: Record<string, Array<{ x: number; y: number }>> = {
  '0>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '1>0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '1>2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '2>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '2>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '3>2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '3>0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '0>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
};

const SRS_WALL_KICKS_I: Record<string, Array<{ x: number; y: number }>> = {
  '0>1': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  '1>0': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  '1>2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
  '2>1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  '2>3': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  '3>2': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  '3>0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  '0>3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
};

// ============================================================
// PuzzleGame Class
// ============================================================

export class PuzzleGame extends EventEmitter<PuzzleGameEvents> {
  readonly grid: Grid;
  readonly gameType: GameType;
  readonly gameMode: GameMode;

  private _state: GameState = GameState.IDLE;

  currentPiece: Piece | null = null;
  holdPiece: Piece | null = null;
  nextPieces: Piece[] = [];
  lastPiece: Piece | null = null;
  nextPieceSpecialBuffer: Piece[] = [];
  fadingOutBlocks: Block[] = [];

  private holdUsedThisTurn: boolean = false;
  switchedHoldPieceAlready: boolean = false;

  // ============================================================
  // Timing Counters (in ticks)
  // ============================================================

  private dropTickCounter: number = 0;
  private lockDelayCounter: number = 0;
  private spawnDelayCounter: number = 0;
  private lineClearDelayCounter: number = 0;
  private moveDownLineTicksCounter: number = 0;
  private stackRiseTicksCounter: number = 0;
  private manualStackRiseTicksCounter: number = 0;
  private stopStackRiseTicksCounter: number = 0;
  private flashScreenTicksCounter: number = 0;
  private flashBlocksTicksCounter: number = 0;
  private removeBlocksTicksCounter: number = 0;
  private lockInputCountdownTicks: number = 0;
  private readyTicksCounter: number = 0;

  private currentDropSpeed: number = 60;
  private currentStackRiseSpeed: number = 1000;
  private isSoftDropping: boolean = false;

  private lockMovements: number = 0;
  private maxLockMovements: number = 15;
  private currentTotalYLockDelay: number = 0;
  private currentFloorMovements: number = 0;

  // ============================================================
  // Score & Stats
  // ============================================================

  currentLevel: number = 1;
  lastKnownLevel: number = 1;
  score: number = 0;

  linesClearedTotal: number = 0;
  linesClearedThisLevel: number = 0;
  linesClearedThisGame: number = 0;
  blocksClearedTotal: number = 0;
  blocksClearedThisGame: number = 0;
  blocksClearedThisLevel: number = 0;
  piecesMade: number = 0;
  piecesMadeThisLevel: number = 0;
  piecesMadeThisGame: number = 0;
  piecesLocked: number = 0;
  piecesPlacedTotal: number = 0;
  blocksMadeTotal: number = 0;

  currentChain: number = 0;
  currentCombo: number = 0;
  comboChainTotal: number = 0;
  biggestCombo: number = 0;
  totalCombosMade: number = 0;

  totalTicks: number = 0;
  gameStartTime: number = 0;
  gameEndTime: number = 0;

  // ============================================================
  // Flags & Toggles
  // ============================================================

  won: boolean = false;
  lost: boolean = false;
  died: boolean = false;
  complete: boolean = false;
  waitingForStart: boolean = true;
  waitingForReady: boolean = true;
  playedReadySound: boolean = false;
  startedWinSequence: boolean = false;
  startedLoseSequence: boolean = false;
  startedDeathSequence: boolean = false;
  creditScreenInitialized: boolean = false;
  forceGravityThisFrame: boolean = false;
  pieceSetAtBottom: boolean = false;
  checkForChainAgainIfNoBlocksPopping: boolean = false;
  gravityThisFrame: boolean = false;
  flashScreenOnOffToggle: boolean = false;
  playingFastMusic: boolean = false;

  timesToFlashScreenQueue: number = 0;
  timesToFlashBlocksQueue: number = 0;
  timesToFlashBlocks: number = 10;
  createdPiecesCounterForFrequencyPieces: number = 0;

  queuedVSGarbageAmountFromOtherPlayer: number = 0;
  queuedVSGarbageAmountToSend: number = 0;
  garbageWaitForPiecesSetCount: number = 0;
  playingFieldGarbageValueCounter: number = 0;

  // ============================================================
  // Input State
  // ============================================================

  private inputState: InputState = {
    left: false,
    right: false,
    down: false,
    up: false,
    rotateCW: false,
    rotateCCW: false,
    rotate180: false,
    hardDrop: false,
    hold: false,
  };

  private prevInputState: InputState = { ...this.inputState };

  private dasCounter: number = 0;
  private dasDelay: number = 10;
  private dasRate: number = 2;
  private dasDirection: 'left' | 'right' | null = null;

  // ============================================================
  // Random Number Generator
  // ============================================================

  private rngSeed: number;
  private rng: () => number;

  constructor(config?: PuzzleGameConfig) {
    super();
    this.gameType = config?.gameType ?? GameTypes.MODERN;
    this.gameMode = config?.gameMode ?? 'marathon';
    this.currentLevel = config?.startLevel ?? 1;
    this.rngSeed = config?.seed ?? Date.now();
    this.rng = this.createRng(this.rngSeed);

    this.grid = new Grid({
      width: this.gameType.gridWidth,
      height: this.gameType.gridHeight,
      hiddenRows: this.gameType.hiddenRows,
    });

    this.currentDropSpeed = this.gameType.getDropSpeedForLevel(this.currentLevel);
    this.setupGridEvents();
  }

  // ============================================================
  // Seeded RNG (Mulberry32)
  // ============================================================

  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private randomInt(max: number): number {
    return Math.floor(this.rng() * max);
  }

  // ============================================================
  // State Management
  // ============================================================

  get state(): GameState {
    return this._state;
  }

  private setState(newState: GameState): void {
    if (this._state !== newState) {
      const prev = this._state;
      this._state = newState;
      this.emit('stateChange', newState, prev);
    }
  }

  isPlaying(): boolean {
    return this._state === GameState.PLAYING || 
           this._state === GameState.LINE_CLEAR || 
           this._state === GameState.SPAWN_DELAY;
  }

  isPaused(): boolean {
    return this._state === GameState.PAUSED;
  }

  isGameOver(): boolean {
    return this._state === GameState.GAME_OVER || this._state === GameState.WON;
  }

  // ============================================================
  // Game Lifecycle
  // ============================================================

  init(): void {
    this.grid.clear();
    this.currentPiece = null;
    this.holdPiece = null;
    this.nextPieces = [];
    this.lastPiece = null;
    this.holdUsedThisTurn = false;

    this.dropTickCounter = 0;
    this.lockDelayCounter = 0;
    this.spawnDelayCounter = 0;
    this.lineClearDelayCounter = 0;
    this.lockMovements = 0;

    this.score = 0;
    this.linesClearedTotal = 0;
    this.linesClearedThisLevel = 0;
    this.piecesMade = 0;
    this.piecesLocked = 0;
    this.currentChain = 0;
    this.currentCombo = 0;
    this.biggestCombo = 0;
    this.totalTicks = 0;

    this.currentDropSpeed = this.gameType.getDropSpeedForLevel(this.currentLevel);

    this.fillNextPieces();
    this.setState(GameState.READY);
  }

  start(): void {
    if (this._state !== GameState.READY) {
      this.init();
    }
    this.gameStartTime = Date.now();
    this.setState(GameState.PLAYING);
    this.spawnNextPiece();
  }

  pause(): void {
    if (this._state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    }
  }

  resume(): void {
    if (this._state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
    }
  }

  private gameOver(): void {
    this.gameEndTime = Date.now();
    this.setState(GameState.GAME_OVER);
    this.emit('gameOver');
  }

  private win(): void {
    this.gameEndTime = Date.now();
    this.setState(GameState.WON);
    this.emit('win');
  }

  // ============================================================
  // Grid Events
  // ============================================================

  private setupGridEvents(): void {
    this.grid.on('linesCleared', (lines, count) => {
      this.onLinesCleared(lines, count);
    });
  }

  private onLinesCleared(lines: number[], count: number): void {
    this.linesClearedTotal += count;
    this.linesClearedThisLevel += count;
    this.currentCombo++;

    if (this.currentCombo > this.biggestCombo) {
      this.biggestCombo = this.currentCombo;
    }

    const baseScore = this.getLineClearScore(count);
    this.score += baseScore * this.currentLevel * (1 + this.currentChain * 0.5);

    this.emit('linesCleared', lines, this.currentChain, this.currentCombo);
    this.checkLevelUp();
  }

  private getLineClearScore(lines: number): number {
    switch (lines) {
      case 1: return 100;
      case 2: return 300;
      case 3: return 500;
      case 4: return 800;
      default: return lines * 200;
    }
  }

  private checkLevelUp(): void {
    const linesPerLevel = 10;
    if (this.linesClearedThisLevel >= linesPerLevel) {
      this.linesClearedThisLevel -= linesPerLevel;
      this.currentLevel++;
      this.currentDropSpeed = this.gameType.getDropSpeedForLevel(this.currentLevel);
      this.emit('levelUp', this.currentLevel);
    }

    // Check Win Conditions
    if (this.gameMode === 'sprint' && this.linesClearedTotal >= 40) {
      this.win();
    }
  }

  // ============================================================
  // Piece Management
  // ============================================================

  private fillNextPieces(): void {
    const showCount = this.gameType.visualRules.showNextPieces;
    while (this.nextPieces.length < showCount + 1) {
      const piece = this.grid.createRandomPiece(BlockTypes.NORMAL);
      this.nextPieces.push(piece);
      this.piecesMade++;
    }
  }

  private spawnNextPiece(): void {
    this.fillNextPieces();
    const piece = this.nextPieces.shift()!;
    this.spawnPiece(piece);
  }

  private spawnPiece(piece: Piece): void {
    const spawnX = Math.floor((this.grid.width - piece.getWidth()) / 2);
    const spawnY = 0;

    piece.moveTo(spawnX, spawnY);
    this.currentPiece = piece;
    this.holdUsedThisTurn = false;
    this.dropTickCounter = 0;
    this.lockDelayCounter = 0;
    this.lockMovements = 0;
    this.isSoftDropping = false;

    if (!this.grid.doesPieceFit(piece)) {
      if (!this.tryNudgePieceIntoGrid(piece)) {
        this.gameOver();
        return;
      }
    }

    this.emit('pieceSpawned', piece);
  }

  private tryNudgePieceIntoGrid(piece: Piece): boolean {
    for (let nudgeY = 0; nudgeY < 3; nudgeY++) {
      if (this.grid.doesPieceFitAt(piece, piece.xGrid, piece.yGrid - nudgeY)) {
        piece.moveTo(piece.xGrid, piece.yGrid - nudgeY);
        return true;
      }
    }
    return false;
  }

  // ============================================================
  // Hold Piece
  // ============================================================

  private holdCurrentPiece(): boolean {
    if (!this.currentPiece || this.holdUsedThisTurn) return false;
    if (!this.gameType.visualRules.showHoldPiece) return false;

    const prevHold = this.holdPiece;
    this.holdPiece = this.currentPiece;
    this.holdPiece.moveTo(0, 0);
    this.holdPiece.setRotation(0);
    this.holdUsedThisTurn = true;

    if (prevHold) {
      this.spawnPiece(prevHold);
    } else {
      this.spawnNextPiece();
    }

    this.emit('pieceHeld', this.holdPiece, prevHold);
    return true;
  }

  // ============================================================
  // Movement & Rotation
  // ============================================================

  movePiece(movement: MovementType): boolean {
    if (!this.currentPiece || this._state !== GameState.PLAYING) return false;

    let success = false;

    switch (movement) {
      case MovementType.LEFT:
        success = this.tryMove(-1, 0);
        break;
      case MovementType.RIGHT:
        success = this.tryMove(1, 0);
        break;
      case MovementType.DOWN:
        success = this.tryMove(0, 1);
        break;
      case MovementType.UP:
        success = this.tryMove(0, -1);
        break;
      case MovementType.ROTATE_CW:
        success = this.tryRotateCW();
        break;
      case MovementType.ROTATE_CCW:
        success = this.tryRotateCCW();
        break;
      case MovementType.ROTATE_180:
        success = this.tryRotate180();
        break;
      case MovementType.HARD_DROP:
        success = this.hardDrop();
        break;
      case MovementType.SOFT_DROP:
        this.isSoftDropping = true;
        success = this.tryMove(0, 1);
        break;
      case MovementType.HOLD:
        success = this.holdCurrentPiece();
        break;
    }

    if (success) {
      this.emit('pieceMoved', this.currentPiece!, movement);
    }

    return success;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const newX = this.currentPiece.xGrid + dx;
    const newY = this.currentPiece.yGrid + dy;

    if (this.grid.doesPieceFitAt(this.currentPiece, newX, newY)) {
      this.currentPiece.moveTo(newX, newY);
      this.onPieceMoved();
      return true;
    }

    return false;
  }

  private tryRotateCW(): boolean {
    return this.tryRotate(1);
  }

  private tryRotateCCW(): boolean {
    return this.tryRotate(-1);
  }

  private tryRotate180(): boolean {
    if (!this.gameType.wallKickRules.flip180Allowed) return false;
    return this.tryRotate(2);
  }

  private tryRotate(rotationDelta: number): boolean {
    if (!this.currentPiece) return false;

    const piece = this.currentPiece;
    const originalRotation = piece.currentRotation;
    const numRotations = piece.pieceType.getNumRotations();
    const newRotation = ((originalRotation + rotationDelta) % numRotations + numRotations) % numRotations;

    piece.setRotation(newRotation);

    if (this.grid.doesPieceFit(piece)) {
      this.onPieceMoved();
      return true;
    }

    const kicks = this.getWallKicks(piece, originalRotation, newRotation);
    for (const kick of kicks) {
      if (this.grid.doesPieceFitAt(piece, piece.xGrid + kick.x, piece.yGrid + kick.y)) {
        piece.moveTo(piece.xGrid + kick.x, piece.yGrid + kick.y);
        this.onPieceMoved();
        return true;
      }
    }

    piece.setRotation(originalRotation);
    return false;
  }

  private getWallKicks(
    piece: Piece,
    fromRotation: number,
    toRotation: number
  ): Array<{ x: number; y: number }> {
    const key = `${fromRotation}>${toRotation}`;
    const isIPiece = piece.pieceType.name === 'I';
    const kickTable = isIPiece ? SRS_WALL_KICKS_I : SRS_WALL_KICKS_JLSTZ;
    return kickTable[key] ?? [{ x: 0, y: 0 }];
  }

  private onPieceMoved(): void {
    if (this.isAtLockPosition()) {
      this.lockMovements++;
      if (this.lockMovements < this.maxLockMovements) {
        this.lockDelayCounter = 0;
      }
    }
  }

  private isAtLockPosition(): boolean {
    if (!this.currentPiece) return false;
    return !this.grid.doesPieceFitAt(
      this.currentPiece,
      this.currentPiece.xGrid,
      this.currentPiece.yGrid + 1
    );
  }

  // ============================================================
  // Hard Drop
  // ============================================================

  private hardDrop(): boolean {
    if (!this.currentPiece) return false;

    let dropDistance = 0;
    while (this.grid.doesPieceFitAt(
      this.currentPiece,
      this.currentPiece.xGrid,
      this.currentPiece.yGrid + 1
    )) {
      this.currentPiece.moveDown();
      dropDistance++;
    }

    this.score += dropDistance * 2;
    this.lockPiece();
    return true;
  }

  // ============================================================
  // Lock Piece
  // ============================================================

  private lockPiece(): void {
    if (!this.currentPiece) return;

    this.grid.setPiece(this.currentPiece);
    this.lastPiece = this.currentPiece;
    this.piecesLocked++;

    this.emit('pieceLocked', this.currentPiece);

    const clearResult = this.grid.findFullLines();
    if (clearResult.length > 0) {
      this.startLineClearPhase(clearResult);
    } else {
      this.currentCombo = 0;
      this.startSpawnDelay();
    }

    this.currentPiece = null;
  }

  private startLineClearPhase(lines: number[]): void {
    for (const y of lines) {
      for (let x = 0; x < this.grid.width; x++) {
        const block = this.grid.get(x, y);
        if (block) {
          block.setState(AnimationState.FLASHING);
          block.flashingToBeRemoved = true;
        }
      }
    }

    this.lineClearDelayCounter = this.gameType.timingRules.lineClearDelayTicksPerLine * lines.length;
    this.setState(GameState.LINE_CLEAR);
  }

  private finishLineClear(): void {
    this.grid.clearAndDropLines();
    this.grid.updateColorConnections();

    if (this.gameType.chainRules.checkRecursiveConnections) {
      this.checkForChains();
    }

    this.startSpawnDelay();
  }

  private checkForChains(): void {
    const minChainSize = this.gameType.chainRules.amountPerChain;
    const visited = new Set<string>();
    const blocksToRemove: Block[] = [];

    for (let y = this.grid.hiddenRows; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const block = this.grid.get(x, y);
        if (!block || block.flashingToBeRemoved) continue;

        const connected = this.grid.getConnectedBlocks(x, y, true);

        for (const b of connected) {
          visited.add(`${b.xGrid},${b.yGrid}`);
        }

        if (connected.length >= minChainSize) {
          blocksToRemove.push(...connected);
        }
      }
    }

    if (blocksToRemove.length > 0) {
      this.currentChain++;

      for (const block of blocksToRemove) {
        block.setState(AnimationState.FLASHING);
        block.flashingToBeRemoved = true;
      }

      this.lineClearDelayCounter = this.gameType.timingRules.lineClearDelayTicksPerLine;
      this.setState(GameState.LINE_CLEAR);
    }
  }

  private startSpawnDelay(): void {
    this.spawnDelayCounter = this.gameType.timingRules.spawnDelayTicksPerPiece;
    if (this.spawnDelayCounter <= 0) {
      this.spawnNextPiece();
      this.setState(GameState.PLAYING);
    } else {
      this.setState(GameState.SPAWN_DELAY);
    }
  }

  // ============================================================
  // Input Processing
  // ============================================================

  setInput(input: Partial<InputState>): void {
    Object.assign(this.inputState, input);
  }

  private processInput(): void {
    const justPressed = (key: keyof InputState) =>
      this.inputState[key] && !this.prevInputState[key];

    if (justPressed('rotateCW')) {
      this.movePiece(MovementType.ROTATE_CW);
    }
    if (justPressed('rotateCCW')) {
      this.movePiece(MovementType.ROTATE_CCW);
    }
    if (justPressed('rotate180')) {
      this.movePiece(MovementType.ROTATE_180);
    }
    if (justPressed('hold')) {
      this.movePiece(MovementType.HOLD);
    }
    if (justPressed('hardDrop')) {
      this.movePiece(MovementType.HARD_DROP);
    }

    this.processDAS();

    if (this.inputState.down) {
      this.isSoftDropping = true;
    } else {
      this.isSoftDropping = false;
    }

    Object.assign(this.prevInputState, this.inputState);
  }

  private processDAS(): void {
    const leftPressed = this.inputState.left;
    const rightPressed = this.inputState.right;
    const leftJust = leftPressed && !this.prevInputState.left;
    const rightJust = rightPressed && !this.prevInputState.right;

    if (leftJust) {
      this.movePiece(MovementType.LEFT);
      this.dasDirection = 'left';
      this.dasCounter = 0;
    } else if (rightJust) {
      this.movePiece(MovementType.RIGHT);
      this.dasDirection = 'right';
      this.dasCounter = 0;
    } else if (leftPressed && this.dasDirection === 'left') {
      this.dasCounter++;
      if (this.dasCounter >= this.dasDelay) {
        if ((this.dasCounter - this.dasDelay) % this.dasRate === 0) {
          this.movePiece(MovementType.LEFT);
        }
      }
    } else if (rightPressed && this.dasDirection === 'right') {
      this.dasCounter++;
      if (this.dasCounter >= this.dasDelay) {
        if ((this.dasCounter - this.dasDelay) % this.dasRate === 0) {
          this.movePiece(MovementType.RIGHT);
        }
      }
    } else {
      this.dasDirection = null;
      this.dasCounter = 0;
    }
  }

  // ============================================================
  // Update Loop
  // ============================================================

  update(): void {
    if (this._state === GameState.PAUSED || this._state === GameState.IDLE) {
      return;
    }

    // Check time-based win conditions
    if (this._state === GameState.PLAYING && this.gameMode === 'ultra') {
      const elapsed = this.getElapsedTime();
      if (elapsed >= 120000) { // 2 minutes
        this.win();
        return;
      }
    }

    this.totalTicks++;
    this.emit('tick', this.totalTicks);

    switch (this._state) {
      case GameState.PLAYING:
        this.processInput();
        this.updatePlaying();
        break;
      case GameState.LINE_CLEAR:
        this.updateLineClear();
        break;
      case GameState.SPAWN_DELAY:
        this.updateSpawnDelay();
        break;
    }
  }

  private updatePlaying(): void {
    if (!this.currentPiece) return;

    const effectiveDropSpeed = this.isSoftDropping
      ? Math.max(1, Math.floor(this.currentDropSpeed / this.gameType.timingRules.softDropSpeedMultiplier))
      : this.currentDropSpeed;

    this.dropTickCounter++;

    if (this.dropTickCounter >= effectiveDropSpeed) {
      this.dropTickCounter = 0;

      if (this.grid.doesPieceFitAt(
        this.currentPiece,
        this.currentPiece.xGrid,
        this.currentPiece.yGrid + 1
      )) {
        this.currentPiece.moveDown();
        if (this.isSoftDropping) {
          this.score += 1;
        }
      }
    }

    if (this.isAtLockPosition()) {
      this.lockDelayCounter++;
      if (this.lockDelayCounter >= this.gameType.timingRules.maxLockDelayTicks ||
          this.lockMovements >= this.maxLockMovements) {
        this.lockPiece();
      }
    } else {
      this.lockDelayCounter = 0;
    }
  }

  private updateLineClear(): void {
    this.lineClearDelayCounter--;
    if (this.lineClearDelayCounter <= 0) {
      this.finishLineClear();
    }
  }

  private updateSpawnDelay(): void {
    this.spawnDelayCounter--;
    if (this.spawnDelayCounter <= 0) {
      this.spawnNextPiece();
      this.setState(GameState.PLAYING);
    }
  }

  // ============================================================
  // Ghost Piece
  // ============================================================

  getGhostY(): number {
    if (!this.currentPiece) return 0;
    return this.currentPiece.getGhostY(this.grid);
  }

  // ============================================================
  // Utility
  // ============================================================

  getElapsedTime(): number {
    if (this.gameStartTime === 0) return 0;
    const endTime = this.gameEndTime > 0 ? this.gameEndTime : Date.now();
    return endTime - this.gameStartTime;
  }

  getFormattedTime(): string {
    const ms = this.getElapsedTime();
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getDifficulty(): DifficultyLevel {
    return this.gameType.getDifficultyLevel(this.currentLevel);
  }

  processFrame(): void {
    if (this.won || this.lost || this.complete || this.died) {
      // end game logic
    }
    if (this.won) { this.wonSequence(); return; }
    if (this.lost) { this.lostSequence(); return; }
    if (this.complete) { this.creditsSequence(); return; }
    if (this.died) { this.diedSequence(); return; }

    this.totalTicks++;
    this.emit('tick', this.totalTicks);

    this.updateSpecialPiecesAndBlocks();
    // process garbage rules...

    this.grid.update();
    // scroll background...

    this.lockInputCountdownTicks--;
    if (this.lockInputCountdownTicks < 0) this.lockInputCountdownTicks = 0;
    this.lockDelayCounter--;
    if (this.lockDelayCounter < 0) this.lockDelayCounter = 0;
    this.dropTickCounter--;
    if (this.dropTickCounter < 0) this.dropTickCounter = 0;
    this.lineClearDelayCounter--;
    if (this.lineClearDelayCounter < 0) this.lineClearDelayCounter = 0;
    this.spawnDelayCounter--;
    if (this.spawnDelayCounter < 0) this.spawnDelayCounter = 0;

    if (this.gameType.gameMode === 'STACK') this.doStackRiseGame();
    else if (this.gameType.gameMode === 'DROP') this.doFallingBlockGame();

    this.moveDownLineTicksCounter++;

    if ((this.pieceSetAtBottom && !this.detectedChain()) || this.forceGravityThisFrame) {
      if (this.checkForChainAgainIfNoBlocksPopping) {
        if (this.grid.areAnyBlocksPopping()) return;
        else this.checkForChainAgainIfNoBlocksPopping = false;
      }

      const movedDownBlocks = this.moveDownBlocksOverBlankSpaces();
      if (movedDownBlocks) this.gravityThisFrame = true;
      else {
        this.forceGravityThisFrame = false;
        this.gravityThisFrame = false;
        this.checkForChain();
        this.handleNewChain();
        // check for fast music...

        if (!this.detectedChain() && !this.checkForChainAgainIfNoBlocksPopping) {
          this.currentCombo = 0;
          this.currentChain = 0;
          this.comboChainTotal = 0;
          if (this.gameType.gameMode === 'DROP' && this.pieceSetAtBottom) this.spawnNextPiece();
          this.updateScore();
        }
      }
    }
  }

  doStackRiseGame(): void {
    this.pieceSetAtBottom = true;
    this.manualStackRiseTicksCounter++;
    let stop = false;
    if (this.stopStackRiseTicksCounter > 0) {
      this.stopStackRiseTicksCounter--;
      if (this.stopStackRiseTicksCounter < 0) this.stopStackRiseTicksCounter = 0;
      stop = true;
    }
    if (this.timesToFlashBlocksQueue > 0) {
      this.flashChainBlocks();
      stop = true;
    } else if (this.detectedChain()) {
      this.removeFlashedChainBlocks();
      stop = true;
    }
    if (this.timesToFlashScreenQueue > 0) {
      this.flashScreen();
      stop = true;
    }
    if (this.grid.continueSwappingBlocks()) stop = true;

    if (!stop) {
      this.stackRiseTicksCounter++;
      if (this.stackRiseTicksCounter > this.currentStackRiseSpeed) {
        this.stackRiseTicksCounter = 0;
        if (!this.grid.scrollUpStack(this.currentPiece!, 1)) this.died = true;
      }
    }
    this.processInput();
  }

  doFallingBlockGame(): void {
    if (this.timesToFlashBlocksQueue > 0) { this.flashChainBlocks(); return; }
    if (this.detectedChain()) { this.removeFlashedChainBlocks(); return; }
    if (this.timesToFlashScreenQueue > 0) this.flashScreen();

    if (!this.pieceSetAtBottom) {
      this.currentTotalYLockDelay += this.lockDelayCounter;
      // lock delay limit check...
      if (this.dropTickCounter <= 0 && this.spawnDelayCounter <= 0 && this.lineClearDelayCounter <= 0) {
        if (this.movePiece(MovementType.DOWN)) this.dropTickCounter = this.currentDropSpeed;
        if (this.died) return;
      }
      this.processInput();
    }
  }

  moveDownBlocksOverBlankSpaces(): boolean {
    const ignoreTypes = this.gameType.getBlockTypesToIgnoreWhenMovingDown(this.getDifficulty());
    let moved = false;
    if (this.moveDownLineTicksCounter >= this.gameType.timingRules.ticksToMoveDownBlocksOverBlankSpaces || this.gameType.gravityRules.moveDownAllLinesAtOnce) {
      this.moveDownLineTicksCounter = 0;
      do {
        if (this.gameType.chainRules.checkEntireLine) moved = this.grid.moveDownLinesAboveBlankLinesOneLine();
        else {
          if (this.gameType.gravityRules.onlyMoveDownDisconnectedBlocks) moved = this.grid.moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignoreTypes);
          else moved = this.grid.moveDownAnyBlocksAboveBlankSpacesOneLine(ignoreTypes);
        }
      } while (this.gameType.gravityRules.moveDownAllLinesAtOnce && moved);
    }
    return moved;
  }

  flashScreen(): void {
    this.flashScreenTicksCounter++;
    if (this.flashScreenTicksCounter > this.gameType.timingRules.flashScreenSpeedTicks) {
      this.flashScreenTicksCounter = 0;
      this.flashScreenOnOffToggle = !this.flashScreenOnOffToggle;
      if (this.flashScreenOnOffToggle) this.timesToFlashScreenQueue--;
    }
  }

  flashChainBlocks(): void {
    this.flashBlocksTicksCounter++;
    if (this.flashBlocksTicksCounter > this.gameType.timingRules.flashBlockSpeedTicks) {
      this.flashBlocksTicksCounter = 0;
      if (this.detectedChain()) {
        for (const b of this.currentChainBlocks) {
          b.flashingToBeRemovedLightDarkToggle = !b.flashingToBeRemovedLightDarkToggle;
        }
      }
      this.timesToFlashBlocksQueue--;
    }
  }

  removeFlashedChainBlocks(): void {
    let linesCleared = 0;
    let blocksCleared = 0;
    if (this.currentChainBlocks.length > 0) {
      // special piece type handling...
      this.removeBlocksTicksCounter++;
      while (this.currentChainBlocks.length > 0 && (this.gameType.timingRules.removingBlocksDelayTicksBetweenEachBlock === 0 || this.removeBlocksTicksCounter > this.gameType.timingRules.removingBlocksDelayTicksBetweenEachBlock)) {
        this.removeBlocksTicksCounter = 0;
        const a = this.currentChainBlocks.shift()!;
        // popping logic...
        if (this.gameType.chainRules.checkEntireLine) {
          for (let i = 0; i < this.currentChainBlocks.length; i++) {
            const b = this.currentChainBlocks[i];
            if (b.yGrid === a.yGrid) {
              this.currentChainBlocks.splice(i--, 1);
              this.grid.remove(b, true, true);
              blocksCleared++; this.blocksClearedThisGame++; this.blocksClearedThisLevel++; this.blocksClearedTotal++;
            }
          }
          linesCleared++; this.linesClearedThisGame++; this.linesClearedThisLevel++; this.linesClearedTotal++;
        }
        this.grid.remove(a, true, true);
        blocksCleared++; this.blocksClearedThisGame++; this.blocksClearedThisLevel++; this.blocksClearedTotal++;
      }
    }
    this.timesToFlashScreenQueue += linesCleared;
    // line clear delay logic...
    this.currentChain = this.currentChainBlocks.length;
  }

  updateSpecialPiecesAndBlocks(): void {
    if (this.currentPiece) this.currentPiece.update();
    if (this.holdPiece) this.holdPiece.update();
    for (const p of this.nextPieces) p.update();
    for (const p of this.nextPieceSpecialBuffer) p.update();
    for (const b of this.fadingOutBlocks) b.update();
  }

  detectedChain(): boolean { return this.currentChainBlocks.length > 0; }

  checkForChain(): void {
    this.currentChainBlocks = [];
    const ignoreTypes = this.gameType.getBlockTypesToIgnoreWhenCheckingChain(this.getDifficulty());
    const mustContainTypes = this.gameType.getBlockTypesChainMustContain(this.getDifficulty());
    this.grid.updateColorConnections(ignoreTypes);
    let toRow = this.grid.height;
    if (this.gameType.gameMode === 'STACK') toRow--;

    if (this.gameType.chainRules.checkEntireLine) this.addToChainBlocks(this.grid.findFullLines()); // simplified
    // chain amount logic...
  }

  addToChainBlocks(blocks: Block[] | number[]): void {
    // simplified
  }

  handleNewChain(): void {
    if (this.detectedChain()) {
      // combo and bonus logic...
      this.timesToFlashBlocksQueue = this.timesToFlashBlocks;
    }
  }

  updateScore(): void {
    // scoring and level up logic...
  }

  wonSequence(): void {
    if (!this.startedWinSequence) {
      this.startedWinSequence = true;
      this.emit('win');
    }
    this.updateSpecialPiecesAndBlocks();
  }

  lostSequence(): void {
    if (!this.startedLoseSequence) {
      this.startedLoseSequence = true;
      this.emit('gameOver');
    }
    this.updateSpecialPiecesAndBlocks();
  }

  diedSequence(): void {
    if (!this.startedDeathSequence) {
      this.startedDeathSequence = true;
      this.emit('gameOver');
    }
    this.updateSpecialPiecesAndBlocks();
    this.grid.doDeathSequence();
  }

  creditsSequence(): void {
    if (!this.creditScreenInitialized) {
      this.creditScreenInitialized = true;
      this.emit('win');
    }
  }
}
