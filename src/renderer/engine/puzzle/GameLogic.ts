/**
 * GameLogic — puzzle game engine with state machine, piece handling, scoring, and multiplayer frame sync.
 *
 * Ported from okgame C++ Puzzle/GameLogic.h + GameLogic.cpp
 */
import { Grid } from './Grid';
import { Piece, PieceType, MovementType, Block, BlockType, AnimationState } from './PuzzleTypes';
import type { GameTypeDefinition, GameEnum } from './PuzzleTypes';

export enum GameState {
    IDLE = 0,
    READY = 1,
    PLAYING = 2,
    PAUSED = 3,
    GAMEOVER = 4,
}

export interface FrameState {
    ticksPassed: number;
    receivedGarbageAmount: number;
    ROTATECW_HELD: boolean;
    HOLDRAISE_HELD: boolean;
    ROTATECCW_HELD: boolean;
    UP_HELD: boolean;
    LEFT_HELD: boolean;
    DOWN_HELD: boolean;
    RIGHT_HELD: boolean;
    SLAM_HELD: boolean;
    randomInt: number;
}

export interface GameStats {
    score: number;
    linesCleared: number;
    piecesPlaced: number;
    chains: number;
    combo: number;
    maxCombo: number;
    gameTime: number;
}

export class GameLogic {
    state: GameState = GameState.IDLE;
    score = 0;
    chainCount = 0;
    comboCount = 0;
    maxCombo = 0;
    linesCleared = 0;
    piecesPlaced = 0;

    readonly gameType: GameTypeDefinition;
    readonly grid: Grid;

    currentPiece: Piece | null = null;
    nextPieces: Piece[] = [];
    holdPiece: Piece | null = null;
    canHold = true;

    dropTimer = 0;
    lockTimer = 0;
    lockDelay: number;
    dropSpeed: number;

    private pieceBag: Piece[] = [];
    private randomSeed: number;
    private rng: () => number;

    // Frame state for multiplayer replay
    private frameStates: FrameState[] = [];

    constructor(gameType: GameTypeDefinition, randomSeed?: number) {
        this.gameType = gameType;
        this.grid = new Grid(gameType);
        this.lockDelay = gameType.lockDelay;
        this.dropSpeed = gameType.dropSpeed;
        this.randomSeed = randomSeed ?? Date.now();

        // Simple seeded RNG (LCG)
        let seed = this.randomSeed;
        this.rng = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };
    }

    // ============================================================
    // State Machine
    // ============================================================

    start(): void {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.chainCount = 0;
        this.comboCount = 0;
        this.linesCleared = 0;
        this.piecesPlaced = 0;
        this.dropTimer = 0;
        this.lockTimer = 0;
        this.canHold = true;
        this.holdPiece = null;
        this.grid.removeAllBlocks();

        // Fill piece bag
        this.pieceBag = [];
        this.nextPieces = [];
        for (let i = 0; i < this.gameType.nextPiecesCount; i++) {
            this.nextPieces.push(this.getNextPieceFromBag());
        }
        this.spawnNextPiece();
    }

    pause(): void {
        if (this.state === GameState.PLAYING) this.state = GameState.PAUSED;
    }

    resume(): void {
        if (this.state === GameState.PAUSED) this.state = GameState.PLAYING;
    }

    gameOver(): void {
        this.state = GameState.GAMEOVER;
    }

    // ============================================================
    // Update Loop
    // ============================================================

    update(dt: number): void {
        if (this.state !== GameState.PLAYING) return;

        this.grid.updateShake(dt);

        // Auto-drop current piece
        if (this.currentPiece && this.gameType.hasGravity && this.dropSpeed > 0) {
            this.dropTimer += dt;
            if (this.dropTimer >= this.dropSpeed) {
                this.dropTimer = 0;
                this.moveDown();
            }
        }

        // Check for line clears and apply gravity
        this.checkAndClear();
    }

    // ============================================================
    // Movement
    // ============================================================

    moveLeft(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) return false;
        if (this.grid.canPlace(this.currentPiece, this.currentPiece.x - 1, this.currentPiece.y)) {
            this.currentPiece.x--;
            return true;
        }
        return false;
    }

    moveRight(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) return false;
        if (this.grid.canPlace(this.currentPiece, this.currentPiece.x + 1, this.currentPiece.y)) {
            this.currentPiece.x++;
            return true;
        }
        return false;
    }

    moveDown(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) return false;
        if (this.grid.canPlace(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            this.score += 1;
            this.lockTimer = 0;
            return true;
        }
        // Can't move down — start lock delay
        return false;
    }

    hardDrop(): void {
        if (!this.currentPiece || this.state !== GameState.PLAYING) return;
        let dropped = 0;
        while (this.grid.canPlace(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            dropped++;
        }
        this.score += dropped * 2;
        this.lockPiece();
    }

    rotateClockwise(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) return false;
        const rotated = this.rotatePiece(this.currentPiece, true);
        if (rotated) return true;
        // Wall kick attempts
        if (this.gameType.hasWallKick) {
            for (const offset of [[-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]]) {
                if (this.grid.canPlace(this.currentPiece, this.currentPiece.x + offset[0], this.currentPiece.y + offset[1])) {
                    this.currentPiece.x += offset[0];
                    this.currentPiece.y += offset[1];
                    return this.rotatePiece(this.currentPiece, true);
                }
            }
        }
        return false;
    }

    rotateCounterClockwise(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) return false;
        return this.rotatePiece(this.currentPiece, false);
    }

    hold(): void {
        if (!this.gameType.hasHoldPiece || !this.currentPiece || !this.canHold) return;
        this.canHold = false;
        const held = this.holdPiece;
        this.holdPiece = this.currentPiece;
        if (held) {
            this.currentPiece = held;
            this.currentPiece.x = Math.floor((this.gameType.gridWidth - this.currentPiece.getWidth()) / 2);
            this.currentPiece.y = 0;
        } else {
            this.spawnNextPiece();
        }
    }

    // ============================================================
    // Piece Management
    // ============================================================

    private rotatePiece(piece: Piece, clockwise: boolean): boolean {
        const w = piece.getWidth();
        const h = piece.getHeight();
        const newBlocks: typeof piece.blocks = [];

        for (let r = 0; r < w; r++) {
            newBlocks[r] = [];
            for (let c = 0; c < h; c++) {
                if (clockwise) {
                    newBlocks[r][c] = piece.blocks[h - 1 - c][r];
                } else {
                    newBlocks[r][c] = piece.blocks[c][w - 1 - r];
                }
            }
        }

        const oldBlocks = piece.blocks;
        piece.blocks = newBlocks;

        if (!this.grid.canPlace(piece, piece.x, piece.y)) {
            piece.blocks = oldBlocks;
            return false;
        }
        return true;
    }

    private lockPiece(): void {
        if (!this.currentPiece) return;

        // Place blocks on grid
        for (const cell of this.currentPiece.getCells()) {
            const block = cell.block;
            block.state = AnimationState.SET_AT_BOTTOM;
            this.grid.add(cell.x, cell.y, block);
        }

        this.piecesPlaced++;
        this.canHold = true;
        this.currentPiece = null;

        // Check clears immediately
        this.checkAndClear();

        // Spawn next piece
        this.spawnNextPiece();
    }

    private spawnNextPiece(): void {
        if (this.nextPieces.length === 0) return;

        this.currentPiece = this.nextPieces.shift()!;
        this.currentPiece.isCurrentPiece = true;
        this.currentPiece.x = Math.floor((this.gameType.gridWidth - this.currentPiece.getWidth()) / 2);
        this.currentPiece.y = 0;
        this.dropTimer = 0;
        this.lockTimer = 0;

        // Refill next pieces
        while (this.nextPieces.length < this.gameType.nextPiecesCount) {
            this.nextPieces.push(this.getNextPieceFromBag());
        }

        // Check if spawn position is valid
        if (!this.grid.canPlace(this.currentPiece, this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver();
        }
    }

    private getNextPieceFromBag(): Piece {
        if (this.pieceBag.length === 0) {
            this.pieceBag = this.generateBag();
        }
        return this.pieceBag.shift()!;
    }

    private generateBag(): Piece[] {
        // Generate random pieces with random colors
        const pieces: Piece[] = [];
        const numColors = this.gameType.numberOfColors;

        // Simple 1-block piece generation for now (enhance later with proper piece shapes)
        for (let i = 0; i < 7; i++) {
            const color = Math.floor(this.rng() * numColors);
            const piece = new Piece(new PieceType(), color);
            piece.type.name = `piece_${i}`;
            piece.type.width = 1;
            piece.type.height = 1;
            piece.type.blocks = [[BlockType.SQUARE]];
            piece.blocks = [[new Block(BlockType.SQUARE, color)]];
            pieces.push(piece);
        }

        // Shuffle (Fisher-Yates)
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }

        return pieces;
    }

    // ============================================================
    // Clearing & Scoring
    // ============================================================

    private checkAndClear(): void {
        let cleared: number;

        switch (this.gameType.clearCondition) {
            case 'lines':
                cleared = this.grid.clearCompletedLines();
                break;
            case 'connected':
                cleared = this.grid.clearConnectedGroups();
                break;
            case 'match':
                cleared = this.grid.clearCompletedLines();
                break;
            default:
                cleared = 0;
        }

        if (cleared > 0) {
            this.linesCleared += cleared;
            this.comboCount++;
            if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
            this.score += this.calculateScore(cleared, this.comboCount);
            this.grid.shakeSmall();
        } else {
            this.comboCount = 0;
        }

        // Apply gravity
        if (this.gameType.hasGravity) {
            this.grid.applyGravity();
        }
    }

    private calculateScore(linesCleared: number, combo: number): number {
        const base = [0, 100, 300, 500, 800];
        const lineScore = base[Math.min(linesCleared, 4)] ?? linesCleared * 200;
        return lineScore * (1 + combo * 0.5);
    }

    // ============================================================
    // Stats
    // ============================================================

    getStats(): GameStats {
        return {
            score: this.score,
            linesCleared: this.linesCleared,
            piecesPlaced: this.piecesPlaced,
            chains: this.chainCount,
            combo: this.comboCount,
            maxCombo: this.maxCombo,
            gameTime: 0,
        };
    }

    // ============================================================
    // Input
    // ============================================================

    handleInput(input: MovementType): void {
        switch (input) {
            case MovementType.LEFT: this.moveLeft(); break;
            case MovementType.RIGHT: this.moveRight(); break;
            case MovementType.DOWN: this.moveDown(); break;
            case MovementType.HARD_DROP: this.hardDrop(); break;
            case MovementType.ROTATE_CLOCKWISE: this.rotateClockwise(); break;
            case MovementType.ROTATE_COUNTERCLOCKWISE: this.rotateCounterClockwise(); break;
            case MovementType.UP: this.hardDrop(); break;
        }
    }
}
