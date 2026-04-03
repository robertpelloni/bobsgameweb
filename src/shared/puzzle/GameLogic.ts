import { Block } from "./Block";
import { Grid } from "./Grid";
import { Piece } from "./Piece";
import { GameType, DifficultyType, VSGarbageRule, GarbageSpawnRule, ScoreType, GamePlayMode, GarbageType, VSGarbageDropRule, RotationType } from "./GameType";
import { PieceType } from "./PieceType";
import { BlockType, BlockTypes } from "./BlockType";
import { Room, SendGarbageToRule } from "./Room";
import { PuzzlePlayer } from "./PuzzlePlayer";
import { BobColor } from "../BobColor";
import { EventEmitter } from 'eventemitter3';
import { GameState } from "./GameState";
import { MovementType } from "./MovementType";
import { SRS_KICKS, SRS_I_KICKS } from "./SRS";

export class FrameState {
    public ROTATECW_HELD: boolean = false;
    public HOLDRAISE_HELD: boolean = false;
    public ROTATECCW_HELD: boolean = false;
    public UP_HELD: boolean = false;
    public LEFT_HELD: boolean = false;
    public DOWN_HELD: boolean = false;
    public RIGHT_HELD: boolean = false;
    public SLAM_HELD: boolean = false;
    public ticksPassed: number = 0;
    public slamLock: boolean = false;
    public singleDownLock: boolean = false;
    public doubleDownLock: boolean = false;
    public receivedGarbageAmount: number = 0;
}

export interface GameLogicEvents {
    'stateChange': (state: GameState, prevState: GameState) => void;
    'pieceSpawned': (piece: Piece) => void;
    'pieceLocked': (piece: Piece) => void;
    'pieceHeld': (piece: Piece | null, prevHold: Piece | null) => void;
    'pieceMoved': (piece: Piece, movement: MovementType) => void;
    'linesCleared': (lines: number[], chain: number, combo: number) => void;
    'levelUp': (level: number) => void;
    'gameOver': () => void;
    'win': () => void;
    'tick': (ticks: number) => void;
    'announcement': (text: string, color?: BobColor) => void;
    'garbageSent': (amount: number) => void;
    'garbageReceived': (amount: number) => void;
}

export class GameLogic extends EventEmitter<GameLogicEvents> {
    public uuid: string = "";
    public player: PuzzlePlayer | null = null;
    public currentGameSequence: any = null;
    public currentGameType: GameType;
    public grid: Grid;

    public state: GameState = GameState.IDLE;
    public won: boolean = false;
    public lost: boolean = false;
    public died: boolean = false;
    public dead: boolean = false;
    public complete: boolean = false;
    public didInit: boolean = false;
    public firstInit: boolean = true;
    public pieceSetAtBottom: boolean = false;
    public switchedHoldPieceAlready: boolean = false;
    public playingFastMusic: boolean = false;

    public gameSpeed: number = 0.0;
    public currentLineDropSpeedTicks: number = 1000;
    public currentStackRiseSpeedTicks: number = 1000;
    public lockDelayTicksCounter: number = 0;
    public lineDropTicksCounter: number = 0;
    public spawnDelayTicksCounter: number = 0;
    public stackRiseTicksCounter: number = 0;
    public stopStackRiseTicksCounter: number = 0;

    public currentLevel: number = 0;
    public score: number = 0;
    public timeStarted: number = 0;
    public timeEnded: number = 0;
    public totalTicksPassed: number = 0;
    public linesClearedTotal: number = 0;
    public piecesMadeThisGame: number = 0;

    public static readonly aboveGridBuffer: number = 5;

    public currentPiece: Piece | null = null;
    public currentPieceGhostY: number = 0;
    public cursorX: number = 0;
    public cursorY: number = 0;
    public holdPiece: Piece | null = null;
    public nextPieces: Piece[] = [];

    public fadingOutBlocks: Block[] = [];
    public manuallyApplyGravityWithoutChainChecking(): void {}

    public frameState: FrameState = new FrameState();

    private currentChainBlocks: Block[] = [];

    constructor(private scene: any, public seed: number = 0) {
        super();
        this.currentGameType = new GameType();
        this.grid = new Grid(this);
    }

    public initGame(): void {
        this.grid.clear();
        this.score = 0;
        this.currentLevel = 0;
        this.linesClearedTotal = 0;
        this.timeStarted = Date.now();
        this.timeEnded = 0;
        this.totalTicksPassed = 0;
        this.won = false;
        this.lost = false;
        this.died = false;
        this.dead = false;
        this.complete = false;
        this.didInit = true;

        if (this.currentGameType.gameMode === GamePlayMode.DROP) {
            this.newRandomPiece();
        } else if (this.currentGameType.gameMode === GamePlayMode.STACK) {
            this.grid.fillBottom(3);
        }
        this.setState(GameState.READY);
    }

    public start(): void { this.setState(GameState.PLAYING); }
    public pause(): void { if (this.state === GameState.PLAYING) this.setState(GameState.PAUSED); }
    public resume(): void { if (this.state === GameState.PAUSED) this.setState(GameState.PLAYING); }

    private setState(s: GameState): void {
        const prev = this.state;
        this.state = s;
        this.emit('stateChange', s, prev);
    }

    public update(): void {
        if (this.won || this.lost || this.complete || this.died) {
            if (this.timeEnded === 0) {
                this.timeEnded = Date.now();
                if (this.won) this.emit('win');
                if (this.lost || this.died) this.emit('gameOver');
            }
            return;
        }
        if (this.state === GameState.PAUSED) return;

        this.totalTicksPassed += this.ticks();

        if (this.currentGameType.gameMode === GamePlayMode.STACK) this.doStackRiseGame();
        else if (this.currentGameType.gameMode === GamePlayMode.DROP) this.doFallingBlockGame();

        for (let i = 0; i < this.ticks(); i++) {
            if (this.currentGameType.gameMode === GamePlayMode.DROP && this.pieceSetAtBottom) this.newRandomPiece();
            this.handleInput();
        }
        
        this.emit('tick', this.ticks());
    }

    private doFallingBlockGame(): void {
        if (!this.currentPiece) return;
        this.lineDropTicksCounter += this.ticks();
        if (this.lineDropTicksCounter >= this.currentLineDropSpeedTicks) {
            this.lineDropTicksCounter = 0;
            this.movePiece(MovementType.DOWN);
        }
    }

    private doStackRiseGame(): void {
        this.stackRiseTicksCounter += this.ticks();
        if (this.stackRiseTicksCounter >= this.currentStackRiseSpeedTicks) {
            this.stackRiseTicksCounter = 0;
            this.grid.scrollUpStack(null, 1);
            if (this.grid.isTopRowOccupied()) this.lost = true;
        }
    }

    private handleInput(): void {
        if (!this.player) return;
        this.player.setButtonStates();
        this.player.setPressedButtons();

        if (this.currentGameType.gameMode === GamePlayMode.STACK) {
            if (this.player.leftPressed()) this.moveCursor(-1, 0);
            if (this.player.rightPressed()) this.moveCursor(1, 0);
            if (this.player.upPressed()) this.moveCursor(0, -1);
            if (this.player.downPressed()) this.moveCursor(0, 1);
            if (this.player.rotateCWPressed()) this.swapBlocks();
        } else {
            if (this.player.leftPressed()) this.movePiece(MovementType.LEFT);
            if (this.player.rightPressed()) this.movePiece(MovementType.RIGHT);
            if (this.player.downPressed()) this.movePiece(MovementType.DOWN);
            if (this.player.rotateCWPressed()) this.movePiece(MovementType.ROTATE_CLOCKWISE);
            if (this.player.rotateCCWPressed()) this.movePiece(MovementType.ROTATE_COUNTERCLOCKWISE);
            if (this.player.holdRaisePressed()) this.holdPieceAction();
            if (this.player.slamPressed()) this.movePiece(MovementType.HARD_DROP);
        }
        this.player.resetPressedButtons();
    }

    private moveCursor(dx: number, dy: number): void {
        this.cursorX = Math.max(0, Math.min(this.grid.getWidth() - 2, this.cursorX + dx));
        this.cursorY = Math.max(0, Math.min(this.grid.getHeight() - 1, this.cursorY + dy));
    }

    private swapBlocks(): void {
        const b1 = this.grid.get(this.cursorX, this.cursorY);
        const b2 = this.grid.get(this.cursorX + 1, this.cursorY);
        this.grid.set(this.cursorX, this.cursorY, b2);
        this.grid.set(this.cursorX + 1, this.cursorY, b1);
        this.checkForChain();
    }

    private movePiece(move: MovementType): boolean {
        if (!this.currentPiece) return false;
        
        const oldX = this.currentPiece.xGrid; const oldY = this.currentPiece.yGrid; const oldRot = this.currentPiece.currentRotation;
        
        if (move === MovementType.ROTATE_COUNTERCLOCKWISE || move === MovementType.ROTATE_CLOCKWISE) {
            if (this.currentPiece.pieceType.pieceShooterPiece || this.currentPiece.pieceType.pieceRemovalShooterPiece) {
                const tx = this.currentPiece.xGrid; const ty = this.currentPiece.yGrid;
                if (this.currentPiece.pieceType.pieceShooterPiece) {
                    for (let y = ty; y < this.grid.getHeight(); y++) {
                        if (this.grid.get(tx, y) === null) {
                            this.grid.add(tx, y, new Block(this, this.grid, this.currentPiece.blocks[0].blockType));
                            break;
                        }
                    }
                } else if (this.currentPiece.pieceType.pieceRemovalShooterPiece) {
                    for (let y = ty; y < this.grid.getHeight(); y++) {
                        const b = this.grid.get(tx, y);
                        if (b) { this.grid.removeBlock(b, true, true); break; }
                    }
                }
                this.emit('pieceMoved', this.currentPiece, move);
                return true;
            }

            const newRot = move === MovementType.ROTATE_CLOCKWISE 
                ? (oldRot + 1) % this.currentPiece.pieceType.rotationSet.size()
                : (oldRot + this.currentPiece.pieceType.rotationSet.size() - 1) % this.currentPiece.pieceType.rotationSet.size();

            if (this.currentGameType.rotationType === RotationType.SRS) {
                const kicks = (this.currentPiece.pieceType.name === 'I') ? SRS_I_KICKS : SRS_KICKS;
                const kickOffsets = kicks[`${oldRot}-${newRot}`] || [{x: 0, y: 0}];

                for (const kick of kickOffsets) {
                    if (this.grid.doesPieceFit(this.currentPiece, oldX + kick.x, oldY + kick.y, newRot)) {
                        this.currentPiece.xGrid = oldX + kick.x; this.currentPiece.yGrid = oldY + kick.y;
                        this.currentPiece.setRotation(newRot);
                        this.emit('pieceMoved', this.currentPiece, move);
                        return true;
                    }
                }
                return false;
            }
        }

        if (move === MovementType.LEFT) this.currentPiece.xGrid--;
        else if (move === MovementType.RIGHT) this.currentPiece.xGrid++;
        else if (move === MovementType.DOWN) this.currentPiece.yGrid++;
        else if (move === MovementType.HARD_DROP) {
            while (this.grid.doesPieceFit(this.currentPiece)) { this.currentPiece.yGrid++; }
            this.currentPiece.yGrid--; this.setPiece();
            this.emit('pieceMoved', this.currentPiece, move);
            return true;
        }

        if (this.grid.doesPieceFit(this.currentPiece)) {
            this.emit('pieceMoved', this.currentPiece, move);
            return true;
        } else {
            this.currentPiece.xGrid = oldX; this.currentPiece.yGrid = oldY; this.currentPiece.currentRotation = oldRot;
            if (move === MovementType.DOWN) this.setPiece();
            return false;
        }
    }

    private setPiece(): void {
        if (!this.currentPiece) return;
        if (this.currentPiece.pieceType.bombPiece) {
            const explode: Block[] = [];
            for (let x = this.currentPiece.xGrid - 1; x < this.currentPiece.xGrid + this.currentPiece.getWidth() + 1; x++) {
                for (let y = this.currentPiece.yGrid - 1; y < this.currentPiece.yGrid + this.currentPiece.getHeight() + 1; y++) {
                    const b = this.grid.get(x, y); if (b) explode.push(b);
                }
            }
            for (const b of explode) this.grid.removeBlock(b, true, true);
            this.grid.shakeHard();
        }
        if (this.currentPiece.pieceType.weightPiece) {
            for (let y = this.currentPiece.yGrid; y < this.grid.getHeight(); y++) {
                for (let x = 0; x < this.currentPiece.getWidth(); x++) {
                    const b = this.grid.get(this.currentPiece.xGrid + x, y); if (b) this.grid.removeBlock(b, true, true);
                }
            }
            while (this.grid.doesPieceFit(this.currentPiece)) { this.currentPiece.yGrid++; }
            this.currentPiece.yGrid--; this.grid.shakeHard();
        }
        this.grid.setPiece(this.currentPiece);
        this.emit('pieceLocked', this.currentPiece);
        this.checkForChain();
        this.newRandomPiece();
    }

    private checkForChain(): void {
        this.currentChainBlocks = [];
        const toRow = (this.currentGameType.gameMode === GamePlayMode.STACK) ? this.grid.getHeight() - 1 : this.grid.getHeight();
        if (this.currentGameType.chainRule_AmountPerChain > 0) {
            for (let y = 0; y < toRow; y++) {
                for (let x = 0; x < this.grid.getWidth(); x++) {
                    const b = this.grid.get(x, y);
                    if (b) {
                        if (this.currentGameType.chainRule_CheckRow) this.checkDirection(x, y, 1, 0);
                        if (this.currentGameType.chainRule_CheckColumn) this.checkDirection(x, y, 0, 1);
                        if (this.currentGameType.chainRule_CheckDiagonal) { this.checkDirection(x, y, 1, 1); this.checkDirection(x, y, 1, -1); }
                    }
                }
            }
        }
        if (this.currentChainBlocks.length > 0) this.handleNewChain();
    }

    private checkDirection(x: number, y: number, dx: number, dy: number): void {
        const start = this.grid.get(x, y); if (!start) return;
        const chain: Block[] = [start]; let tx = x + dx, ty = y + dy;
        while (tx >= 0 && tx < this.grid.getWidth() && ty >= 0 && ty < this.grid.getHeight()) {
            const b = this.grid.get(tx, ty);
            if (b && b.blockType.uuid === start.blockType.uuid) { chain.push(b); tx += dx; ty += dy; } else break;
        }
        if (chain.length >= this.currentGameType.chainRule_AmountPerChain) {
            for (const b of chain) if (!this.currentChainBlocks.includes(b)) this.currentChainBlocks.push(b);
        }
    }

    private handleNewChain(): void {
        const count = this.currentChainBlocks.length;
        for (const b of this.currentChainBlocks) this.grid.removeBlock(b, true, true);
        this.score += count * 10; this.emit('linesCleared', [], 1, 1);
        this.currentChainBlocks = [];
    }

    private newRandomPiece(): void {
        this.currentPiece = this.grid.getRandomPiece();
        this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2); this.currentPiece.yGrid = 5;
        if (!this.grid.doesPieceFit(this.currentPiece)) this.lost = true;
        this.emit('pieceSpawned', this.currentPiece);
    }

    private holdPieceAction(): void {
        const prev = this.holdPiece; this.holdPiece = this.currentPiece;
        if (prev) { this.currentPiece = prev; this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2); this.currentPiece.yGrid = 5; }
        else this.newRandomPiece();
        this.emit('pieceHeld', this.currentPiece, prev);
    }

    public getCurrentDifficulty(): DifficultyType { return this.currentGameType.difficultyTypes[0]; }
    public getRoom(): Room { return new Room(); }
    public ticks(): number { return 1; }
    public cellW(): number { return 8; }
    public cellH(): number { return 8; }
    public gridW(): number { return this.currentGameType.gridWidth; }
    public gridH(): number { return this.currentGameType.gridHeight; }

    public getRandomIntLessThan(max: number, _context?: string): number {
        return Math.floor(Math.random() * max);
    }

    public gotVSGarbageFromOtherPlayer(amount: number): void {
        this.emit('garbageReceived', amount);
        if (this.getCurrentDifficulty().name === "Beginner") amount = Math.floor(amount * 0.5);
        this.frameState.receivedGarbageAmount += amount;
    }

    public getFormattedTime(): string {
        const sec = Math.floor((Date.now() - this.timeStarted) / 1000);
        return `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2, '0')}`;
    }

    public getGhostY(): number {
        if (!this.currentPiece) return 0;
        const oldY = this.currentPiece.yGrid;
        while (this.grid.doesPieceFit(this.currentPiece)) { this.currentPiece.yGrid++; }
        const ghostY = this.currentPiece.yGrid - 1;
        this.currentPiece.yGrid = oldY; return ghostY;
    }

    public getState(): any {
        return {
            grid: this.grid.getState(), score: this.score, level: this.currentLevel, lines: this.linesClearedTotal,
            cursor: { x: this.cursorX, y: this.cursorY }
        };
    }

    public applyState(state: any): void {
        this.grid.applyState(state.grid); this.score = state.score; this.currentLevel = state.level; this.linesClearedTotal = state.lines;
        if (state.cursor) { this.cursorX = state.cursor.x; this.cursorY = state.cursor.y; }
    }
}
