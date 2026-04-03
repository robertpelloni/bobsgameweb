import { Block } from "./Block";
import { Grid } from "./Grid";
import { Piece } from "./Piece";
import { GameType, DifficultyType, VSGarbageRule, GarbageSpawnRule, ScoreType, GamePlayMode, GarbageType, VSGarbageDropRule } from "./GameType";
import { PieceType } from "./PieceType";
import { BlockType, BlockTypes } from "./BlockType";
import { Room, SendGarbageToRule } from "./Room";
import { PuzzlePlayer } from "./PuzzlePlayer";
import { BobColor } from "../BobColor";
import { EventEmitter } from 'eventemitter3';
import { GameState } from "./GameState";
import { MovementType } from "./MovementType";

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

    public blockWidth: number = 1;
    public blockHeight: number = 1;
    public static readonly aboveGridBuffer: number = 5;

    public lockInputCountdownTicks: number = 0;
    public canPressRotateCW: boolean = false;
    public canPressRotateCCW: boolean = false;
    public canPressRight: boolean = false;
    public canPressLeft: boolean = false;
    public canPressDown: boolean = false;
    public canPressUp: boolean = false;
    public canPressHoldRaise: boolean = false;
    public canPressSlam: boolean = false;

    public ticksHoldingRotateCW: number = 0;
    public ticksHoldingRotateCCW: number = 0;
    public ticksHoldingRight: number = 0;
    public ticksHoldingLeft: number = 0;
    public ticksHoldingDown: number = 0;
    public ticksHoldingUp: number = 0;
    public ticksHoldingHoldRaise: number = 0;
    public ticksHoldingSlam: number = 0;

    public timesToFlashBlocks: number = 20;
    public flashBlockSpeedTicks: number = 30;
    public flashScreenSpeedTicks: number = 50;
    public flashScreenTimesPerLevel: number = 4;

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
    public currentLineDropSpeedTicks: number = 0;
    public currentStackRiseSpeedTicks: number = 0;
    public lockDelayTicksCounter: number = 0;
    public lineDropTicksCounter: number = 0;
    public spawnDelayTicksCounter: number = 0;
    public lineClearDelayTicksCounter: number = 0;
    public moveDownLineTicksCounter: number = 0;

    public currentTotalYLockDelay: number = 0;
    public adjustedMaxLockDelayTicks: number = 0;
    public adjustedSpawnDelayTicksAmount: number = 0;
    public currentFloorMovements: number = 0;

    public stackRiseTicksCounter: number = 0;
    public stopStackRiseTicksCounter: number = 0;
    public manualStackRiseTicksCounter: number = 0;

    public timesToFlashScreenQueue: number = 0;
    public flashScreenTicksCounter: number = 0;
    public flashScreenOnOffToggle: boolean = false;

    public flashBlocksTicksCounter: number = 0;
    public timesToFlashBlocksQueue: number = 0;
    public removeBlocksTicksCounter: number = 0;
    public currentChainBlocks: Block[] = [];
    public fadingOutBlocks: Block[] = [];

    public lastSentGarbageToPlayerIndex: number = 0;
    public queuedVSGarbageAmountToSend: number = 0;
    public garbageWaitForPiecesSetCount: number = 0;

    public currentLevel: number = 0;
    public score: number = 0;
    public timeStarted: number = 0;
    public timeEnded: number = 0;
    public totalTicksPassed: number = 0;

    public blocksClearedThisGame: number = 0;
    public linesClearedThisGame: number = 0;

    public piecesMadeThisLevel: number = 0;
    public blocksClearedThisLevel: number = 0;
    public linesClearedThisLevel: number = 0;

    public piecesPlacedTotal: number = 0;
    public blocksClearedTotal: number = 0;
    public linesClearedTotal: number = 0;
    public blocksMadeTotal: number = 0;

    public currentPiece: Piece | null = null;
    public currentPieceGhostY: number = 0;
    public holdPiece: Piece | null = null;
    public nextPieces: Piece[] = [];

    public frameState: FrameState = new FrameState();

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

        this.currentLineDropSpeedTicks = this.getCurrentDifficulty().initialLineDropSpeedTicks;
        this.currentStackRiseSpeedTicks = this.getCurrentDifficulty().maxStackRise;
        this.stopStackRiseTicksCounter = 1000;
        if (this.currentGameType.gameMode === GamePlayMode.DROP) {
            if (this.getCurrentDifficulty().randomlyFillGrid) this.grid.randomlyFillGridWithPlayingFieldPieces(this.getCurrentDifficulty().randomlyFillGridAmount, this.getCurrentDifficulty().randomlyFillGridStartY);
            this.newRandomPiece();
        } else if (this.currentGameType.gameMode === GamePlayMode.STACK) {
            if (this.getCurrentDifficulty().randomlyFillGrid) this.grid.buildRandomStackRetainingExistingBlocks(this.getCurrentDifficulty().randomlyFillGridAmount, this.getCurrentDifficulty().randomlyFillGridStartY);
            this.currentPiece = this.grid.getRandomPiece();
            this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2); this.currentPiece.yGrid = 7 + GameLogic.aboveGridBuffer;
        }
        this.setState(GameState.READY);
    }

    public start(): void {
        this.setState(GameState.PLAYING);
    }

    public pause(): void {
        if (this.state === GameState.PLAYING) this.setState(GameState.PAUSED);
    }

    public resume(): void {
        if (this.state === GameState.PAUSED) this.setState(GameState.PLAYING);
    }

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
        }
        if (this.won || this.lost || this.complete || this.died) return;
        if (this.state === GameState.PAUSED) return;

        this.totalTicksPassed += this.ticks();

        if (this.currentGameType.gameMode === GamePlayMode.STACK) this.doStackRiseGame();
        else if (this.currentGameType.gameMode === GamePlayMode.DROP) this.doFallingBlockGame();

        for (let i = 0; i < this.ticks(); i++) {
            if (this.lockInputCountdownTicks > 0) this.lockInputCountdownTicks--;
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
        // Logic for stack rise mode
    }

    private handleInput(): void {
        if (!this.player) return;
        this.player.setButtonStates();
        this.player.setPressedButtons();

        if (this.player.leftPressed()) this.movePiece(MovementType.LEFT);
        if (this.player.rightPressed()) this.movePiece(MovementType.RIGHT);
        if (this.player.downPressed()) this.movePiece(MovementType.DOWN);
        if (this.player.rotateCWPressed()) this.movePiece(MovementType.ROTATE_CLOCKWISE);
        if (this.player.rotateCCWPressed()) this.movePiece(MovementType.ROTATE_COUNTERCLOCKWISE);
        if (this.player.holdRaisePressed()) this.holdPieceAction();
        if (this.player.slamPressed()) this.movePiece(MovementType.HARD_DROP);
        
        this.player.resetPressedButtons();
    }

    private movePiece(move: MovementType): boolean {
        if (!this.currentPiece) return false;
        
        const oldX = this.currentPiece.xGrid; const oldY = this.currentPiece.yGrid; const oldRot = this.currentPiece.currentRotation;
        if (move === MovementType.ROTATE_COUNTERCLOCKWISE) this.currentPiece.rotateCCW();
        else if (move === MovementType.ROTATE_CLOCKWISE) this.currentPiece.rotateCW();
        else if (move === MovementType.LEFT) this.currentPiece.xGrid--;
        else if (move === MovementType.RIGHT) this.currentPiece.xGrid++;
        else if (move === MovementType.DOWN) this.currentPiece.yGrid++;
        else if (move === MovementType.HARD_DROP) {
            while (this.grid.doesPieceFit(this.currentPiece)) { this.currentPiece.yGrid++; }
            this.currentPiece.yGrid--;
            this.setPiece();
            this.emit('pieceMoved', this.currentPiece, move);
            return true;
        }

        if (this.grid.doesPieceFit(this.currentPiece)) {
            this.emit('pieceMoved', this.currentPiece, move);
            return true;
        } else {
            this.currentPiece.xGrid = oldX; this.currentPiece.yGrid = oldY; this.currentPiece.currentRotation = oldRot;
            if (move === MovementType.DOWN) {
                this.setPiece();
            }
            return false;
        }
    }

    private setPiece(): void {
        if (this.currentPiece) {
            this.grid.setPiece(this.currentPiece);
            this.emit('pieceLocked', this.currentPiece);
            this.checkLines();
            this.newRandomPiece();
        }
    }

    private checkLines(): void {
        const linesToClear: number[] = [];
        for (let y = 0; y < this.grid.getHeight(); y++) {
            let full = true;
            for (let x = 0; x < this.grid.getWidth(); x++) {
                if (this.grid.get(x, y) === null) { full = false; break; }
            }
            if (full) linesToClear.push(y);
        }

        if (linesToClear.length > 0) {
            for (const y of linesToClear) {
                this.grid.clearLine(y);
            }
            this.linesClearedTotal += linesToClear.length;
            this.emit('linesCleared', linesToClear, linesToClear.length, 1);
            this.checkLevelUp();
        }
    }

    private checkLevelUp(): void {
        const levelThreshold = 10;
        if (this.linesClearedTotal >= (this.currentLevel + 1) * levelThreshold) {
            this.currentLevel++;
            this.currentLineDropSpeedTicks = Math.max(10, this.currentLineDropSpeedTicks - 50);
            this.emit('levelUp', this.currentLevel);
        }
    }

    private newRandomPiece(): void {
        this.currentPiece = this.grid.getRandomPiece();
        this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2);
        this.currentPiece.yGrid = 5;
        if (!this.grid.doesPieceFit(this.currentPiece)) {
            this.lost = true;
        }
        this.emit('pieceSpawned', this.currentPiece);
    }

    private holdPieceAction(): void {
        const prevHold = this.holdPiece;
        this.holdPiece = this.currentPiece;
        if (prevHold) {
            this.currentPiece = prevHold;
            this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2);
            this.currentPiece.yGrid = 5;
        } else {
            this.newRandomPiece();
        }
        this.emit('pieceHeld', this.currentPiece, prevHold);
    }

    public getCurrentDifficulty(): DifficultyType {
        return this.currentGameType.difficultyTypes[0];
    }

    public getRoom(): Room {
        return new Room();
    }

    public ticks(): number { return 1; }
    public cellW(): number { return 8; }
    public cellH(): number { return 8; }

    public gotVSGarbageFromOtherPlayer(amount: number): void {
        this.emit('garbageReceived', amount);
        this.garbageWaitForPiecesSetCount = Math.min(4, this.garbageWaitForPiecesSetCount + 3);
    }

    public getFormattedTime(): string {
        const seconds = Math.floor((Date.now() - this.timeStarted) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    public getGhostY(): number {
        if (!this.currentPiece) return 0;
        const oldY = this.currentPiece.yGrid;
        while (this.grid.doesPieceFit(this.currentPiece)) { this.currentPiece.yGrid++; }
        const ghostY = this.currentPiece.yGrid - 1;
        this.currentPiece.yGrid = oldY;
        return ghostY;
    }

    public getState(): any {
        return {
            grid: this.grid.getState(),
            piece: this.currentPiece ? {
                x: this.currentPiece.xGrid,
                y: this.currentPiece.yGrid,
                rot: this.currentPiece.currentRotation,
                type: this.currentPiece.pieceType.name
            } : null,
            score: this.score,
            level: this.currentLevel,
            lines: this.linesClearedTotal,
        };
    }

    public applyState(state: any): void {
        this.grid.applyState(state.grid);
        this.score = state.score;
        this.currentLevel = state.level;
        this.linesClearedTotal = state.lines;
    }
}
