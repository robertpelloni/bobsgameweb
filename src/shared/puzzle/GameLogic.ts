import { Block } from "./Block";
import { Grid } from "./Grid";
import { Piece } from "./Piece";
import { GameType, DifficultyType, VSGarbageRule, GarbageSpawnRule, ScoreType, GameMode, GarbageType, VSGarbageDropRule } from "./GameType";
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

    public currentPiece: Piece | null = null;
    public lastPiece: Piece | null = null;
    public holdPiece: Piece | null = null;
    public nextPieces: Piece[] = [];
    public nextPieceSpecialBuffer: Piece[] = [];

    public currentLevel: number = 0;
    public lastKnownLevel: number = 0;

    public piecesMadeThisGame: number = 0;
    public lastPiecesMadeThisGame: number = 0;
    public blocksClearedThisGame: number = 0;
    public linesClearedThisGame: number = 0;

    public piecesMadeThisLevel: number = 0;
    public blocksClearedThisLevel: number = 0;
    public linesClearedThisLevel: number = 0;

    public piecesPlacedTotal: number = 0;
    public blocksClearedTotal: number = 0;
    public linesClearedTotal: number = 0;
    public blocksMadeTotal: number = 0;

    public score: number = 0;

    public totalTicksPassed: number = 0;
    public timeStarted: number = 0;
    public timeEnded: number = 0;
    public createdPiecesCounterForFrequencyPieces: number = 0;

    public currentChain: number = 0;
    public currentCombo: number = 0;
    public comboChainTotal: number = 0;
    public biggestComboChain: number = 0;
    public totalCombosMade: number = 0;

    public queuedVSGarbageAmountToSend: number = 0;
    public queuedVSGarbageAmountFromOtherPlayer: number = 0;
    public garbageWaitForPiecesSetCount: number = 0;
    public playingFieldGarbageValueCounter: number = 0;

    public checkForChainAgainIfNoBlocksPopping: boolean = false;

    public playingFieldX0: number = 0;
    public playingFieldX1: number = 0;
    public playingFieldY0: number = 0;
    public playingFieldY1: number = 0;

    public frameState: FrameState = new FrameState();
    public isNetworkPlayer: boolean = false;

    public lastSentGarbageToPlayerIndex: number = 0;

    public manager: any = null; // Equivalent to BobsGame instance

    constructor(manager: any, seed: number) {
        super();
        this.uuid = crypto.randomUUID();
        this.manager = manager;
        this.grid = new Grid(this);
        this.currentGameType = new GameType();
    }

    public ticks(): number { return this.frameState ? this.frameState.ticksPassed : 0; }

    public getCurrentDifficulty(): DifficultyType {
        if (this.currentGameSequence && this.currentGameSequence.gameTypes.length > 0) {
            return this.currentGameSequence.gameTypes[0].getDifficultyByName(this.currentGameSequence.currentDifficultyName);
        }
        return GameType.difficulty_NORMAL;
    }

    public update(gameIndex: number = 0, numGames: number = 1): void {
        const screenWidth = 800; const screenHeight = 600;
        const colWidth = screenWidth / numGames;
        this.blockHeight = Math.floor(screenHeight / (this.gridH() + 7)); this.blockWidth = this.blockHeight;
        this.blockWidth -= this.currentGameType.gridPixelsBetweenColumns; this.blockHeight -= this.currentGameType.gridPixelsBetweenRows;
        this.grid.screenX = (gameIndex * colWidth) + (colWidth / 2 - (this.gridW() * this.cellW() / 2));
        this.grid.screenY = 5 * this.cellH();
        this.playingFieldX0 = gameIndex * colWidth; this.playingFieldX1 = (gameIndex + 1) * colWidth;
        this.playingFieldY0 = 0; this.playingFieldY1 = screenHeight;

        if (!this.isNetworkPlayer) {
            this.frameState = new FrameState(); this.frameState.ticksPassed = 16;
            this.setControlsState();
            if (!this.didInit) this.initGame();
            this.processFrame();
        }

        if (this.getRoom().multiplayer_DisableVSGarbage === false) {
            const otherPlayers: GameLogic[] = [];
            if (this.manager && this.manager.players) {
                for (let n = 0; n < this.manager.players.length; n++) {
                    const g2 = this.manager.players[n].gameLogic;
                    if (g2 !== this) otherPlayers.push(g2);
                }
            }
            otherPlayers.sort((a, b) => a.uuid.localeCompare(b.uuid));

            if (this.isNetworkGame()) {
                if (this.getRoom().multiplayer_SendGarbageTo !== SendGarbageToRule.SEND_GARBAGE_TO_ALL_PLAYERS) {
                    this.getRoom().multiplayer_SendGarbageTo = SendGarbageToRule.SEND_GARBAGE_TO_ALL_PLAYERS;
                }
            } else {
                const alivePlayers = otherPlayers.filter(g2 => !g2.won && !g2.died && !g2.lost && !g2.complete);
                if (alivePlayers.length > 0) {
                    if (this.getRoom().multiplayer_SendGarbageTo === SendGarbageToRule.SEND_GARBAGE_TO_EACH_PLAYER_IN_ROTATION) {
                        if (this.queuedVSGarbageAmountToSend > 0) {
                            this.lastSentGarbageToPlayerIndex++;
                            if (this.lastSentGarbageToPlayerIndex >= alivePlayers.length) this.lastSentGarbageToPlayerIndex = 0;
                            const g2 = alivePlayers[this.lastSentGarbageToPlayerIndex];
                            g2.gotVSGarbageFromOtherPlayer(this.queuedVSGarbageAmountToSend);
                            g2.frameState.receivedGarbageAmount += this.queuedVSGarbageAmountToSend;
                            this.queuedVSGarbageAmountToSend = 0;
                        }
                    }
                    if (this.getRoom().multiplayer_SendGarbageTo === SendGarbageToRule.SEND_GARBAGE_TO_PLAYER_WITH_LEAST_BLOCKS) {
                        if (this.queuedVSGarbageAmountToSend > 0) {
                            let leastBlocksPlayer = alivePlayers[0];
                            let leastBlocks = alivePlayers[0].grid.getNumberOfFilledCells();
                            for (const g2 of alivePlayers) {
                                if (g2.grid.getNumberOfFilledCells() < leastBlocks) {
                                    leastBlocks = g2.grid.getNumberOfFilledCells();
                                    leastBlocksPlayer = g2;
                                }
                            }
                            leastBlocksPlayer.gotVSGarbageFromOtherPlayer(this.queuedVSGarbageAmountToSend);
                            leastBlocksPlayer.frameState.receivedGarbageAmount += this.queuedVSGarbageAmountToSend;
                            this.queuedVSGarbageAmountToSend = 0;
                        }
                    }
                    if (this.getRoom().multiplayer_SendGarbageTo === SendGarbageToRule.SEND_GARBAGE_TO_RANDOM_PLAYER) {
                        if (this.queuedVSGarbageAmountToSend > 0) {
                            const g2 = alivePlayers[this.getRandomIntLessThan(alivePlayers.length, "sendGarbage")];
                            g2.gotVSGarbageFromOtherPlayer(this.queuedVSGarbageAmountToSend);
                            g2.frameState.receivedGarbageAmount += this.queuedVSGarbageAmountToSend;
                            this.queuedVSGarbageAmountToSend = 0;
                        }
                    }
                }
            }

            if (this.getRoom().multiplayer_SendGarbageTo === SendGarbageToRule.SEND_GARBAGE_TO_ALL_PLAYERS) {
                if (!this.isNetworkGame()) {
                    if (this.queuedVSGarbageAmountToSend > 0) {
                        for (const g2 of otherPlayers) {
                            g2.gotVSGarbageFromOtherPlayer(this.queuedVSGarbageAmountToSend);
                            g2.frameState.receivedGarbageAmount += this.queuedVSGarbageAmountToSend;
                        }
                        this.queuedVSGarbageAmountToSend = 0;
                    }
                } else {
                    for (const g2 of otherPlayers) {
                        if (g2.queuedVSGarbageAmountToSend > 0) {
                            this.gotVSGarbageFromOtherPlayer(g2.queuedVSGarbageAmountToSend);
                            this.frameState.receivedGarbageAmount += g2.queuedVSGarbageAmountToSend;
                            g2.queuedVSGarbageAmountToSend = 0;
                        }
                    }
                }
            }

            if (this.getRoom().multiplayer_SendGarbageTo === SendGarbageToRule.SEND_GARBAGE_TO_ALL_PLAYERS_50_PERCENT_CHANCE) {
                if (!this.isNetworkGame()) {
                    if (this.queuedVSGarbageAmountToSend > 0) {
                        for (const g2 of otherPlayers) {
                            if (this.getRandomIntLessThan(2, "sendGarbage") === 0) {
                                g2.gotVSGarbageFromOtherPlayer(this.queuedVSGarbageAmountToSend);
                                g2.frameState.receivedGarbageAmount += this.queuedVSGarbageAmountToSend;
                            }
                        }
                        this.queuedVSGarbageAmountToSend = 0;
                    }
                } else {
                    for (const g2 of otherPlayers) {
                        if (g2.queuedVSGarbageAmountToSend > 0) {
                            if (this.getRandomIntLessThan(2, "sendGarbage") === 0) {
                                this.gotVSGarbageFromOtherPlayer(g2.queuedVSGarbageAmountToSend);
                                this.frameState.receivedGarbageAmount += g2.queuedVSGarbageAmountToSend;
                            }
                            g2.queuedVSGarbageAmountToSend = 0;
                        }
                    }
                }
            }
        }

        this.emit('tick', this.ticks());
    }

    private setControlsState(): void {
        if (!this.player) return;
        this.frameState.ROTATECW_HELD = this.player.ROTATECW_HELD;
        this.frameState.HOLDRAISE_HELD = this.player.HOLDRAISE_HELD;
        this.frameState.ROTATECCW_HELD = this.player.ROTATECCW_HELD;
        this.frameState.UP_HELD = this.player.UP_HELD;
        this.frameState.LEFT_HELD = this.player.LEFT_HELD;
        this.frameState.DOWN_HELD = this.player.DOWN_HELD;
        this.frameState.RIGHT_HELD = this.player.RIGHT_HELD;
        this.frameState.SLAM_HELD = this.player.SLAM_HELD;
        this.frameState.slamLock = this.player.slamLock;
        this.frameState.singleDownLock = this.player.singleDownLock;
        this.frameState.doubleDownLock = this.player.doubleDownLock;
    }

    public setState(state: GameState): void {
        if (this.state !== state) {
            const prev = this.state;
            this.state = state;
            this.emit('stateChange', state, prev);
        }
    }

    public initGame(): void {
        if (this.firstInit) {
            this.firstInit = false;
            this.timeStarted = Date.now();
            this.gameSpeed = this.getRoom().gameSpeedStart;
            this.adjustedMaxLockDelayTicks = this.currentGameType.maxLockDelayTicks;
        }
        this.didInit = true;
        this.resetNextPieces();
        this.grid.reformat(this.gridW(), this.gridH());
        this.grid.scrollPlayingFieldY = 0;
        this.manuallyApplyGravityWithoutChainChecking();
        this.grid.replaceAllBlocksWithNewGameBlocks();
        this.manuallyApplyGravityWithoutChainChecking();
        this.lockDelayTicksCounter = this.adjustedMaxLockDelayTicks;
        this.currentLineDropSpeedTicks = this.getCurrentDifficulty().initialLineDropSpeedTicks;
        this.currentStackRiseSpeedTicks = this.getCurrentDifficulty().maxStackRise;
        this.stopStackRiseTicksCounter = 1000;
        if (this.currentGameType.gameMode === GameMode.DROP) {
            if (this.getCurrentDifficulty().randomlyFillGrid) this.grid.randomlyFillGridWithPlayingFieldPieces(this.getCurrentDifficulty().randomlyFillGridAmount, this.getCurrentDifficulty().randomlyFillGridStartY);
            this.newRandomPiece();
        } else if (this.currentGameType.gameMode === GameMode.STACK) {
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
        this.setState(GameState.PAUSED);
    }

    public resume(): void {
        this.setState(GameState.PLAYING);
    }

    private processFrame(): void {
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
        this.updateSpecialPiecesAndBlocks();
        this.processQueuedGarbageSentFromOtherPlayer();
        this.processGarbageRules();
        this.grid.update();
        this.grid.scrollBackground();
        this.lockInputCountdownTicks = Math.max(0, this.lockInputCountdownTicks - this.ticks());
        this.lockDelayTicksCounter = Math.max(0, this.lockDelayTicksCounter - this.ticks());
        this.lineDropTicksCounter = Math.max(0, this.lineDropTicksCounter - this.ticks());
        this.lineClearDelayTicksCounter = Math.max(0, this.lineClearDelayTicksCounter - this.ticks());
        this.spawnDelayTicksCounter = Math.max(0, this.spawnDelayTicksCounter - this.ticks());
        if (this.currentGameType.gameMode === GameMode.STACK) this.doStackRiseGame();
        else if (this.currentGameType.gameMode === GameMode.DROP) this.doFallingBlockGame();
        this.moveDownLineTicksCounter += this.ticks();
        if ((this.pieceSetAtBottom && !this.detectedChain())) {
            if (this.checkForChainAgainIfNoBlocksPopping) { if (this.grid.areAnyBlocksPopping()) return; else this.checkForChainAgainIfNoBlocksPopping = false; }
            const movedDownBlocks = this.moveDownBlocksOverBlankSpaces();
            if (!movedDownBlocks) {
                this.checkForChain(); this.handleNewChain(); this.checkForFastMusic();
                if (!this.detectedChain() && !this.checkForChainAgainIfNoBlocksPopping) {
                    this.currentCombo = 0; this.currentChain = 0; this.comboChainTotal = 0;
                    if (this.currentGameType.gameMode === GameMode.DROP && this.pieceSetAtBottom) this.newRandomPiece();
                    this.updateScore();
                }
            }
        }
    }

    private doStackRiseGame(): void {
        this.pieceSetAtBottom = true; this.manualStackRiseTicksCounter += this.ticks();
        let stop = false;
        if (this.stopStackRiseTicksCounter > 0) { this.stopStackRiseTicksCounter = Math.max(0, this.stopStackRiseTicksCounter - this.ticks()); stop = true; }
        if (this.timesToFlashBlocksQueue > 0) { this.flashChainBlocks(); stop = true; }
        else if (this.detectedChain()) { this.removeFlashedChainBlocks(); stop = true; }
        if (this.grid.continueSwappingBlocks()) { stop = true; }
        if (!stop) {
            this.stackRiseTicksCounter += this.ticks();
            if (this.stackRiseTicksCounter > this.currentStackRiseSpeedTicks) {
                this.stackRiseTicksCounter = 0;
                if (!this.grid.scrollUpStack(this.currentPiece, 1)) {
                    this.died = true;
                    this.setState(GameState.GAME_OVER);
                }
            }
        }
        this.updateKeyInput();
    }

    private doFallingBlockGame(): void {
        if (this.timesToFlashBlocksQueue > 0) { this.flashChainBlocks(); return; }
        if (this.detectedChain()) { this.removeFlashedChainBlocks(); return; }
        if (!this.pieceSetAtBottom) {
            this.currentTotalYLockDelay += this.lockDelayTicksCounter;
            if (this.getRoom().totalYLockDelayLimit > -1 && this.currentTotalYLockDelay >= this.getRoom().totalYLockDelayLimit) {
                this.currentPiece!.yGrid++; if (!this.grid.doesPieceFit(this.currentPiece!)) { this.currentPiece!.yGrid--; this.setPiece(); } else this.currentPiece!.yGrid--;
            }
            if (this.lineDropTicksCounter === 0 && this.spawnDelayTicksCounter === 0 && this.lineClearDelayTicksCounter === 0) {
                if (this.movePiece(MovementType.DOWN)) this.lineDropTicksCounter = this.currentLineDropSpeedTicks;
            }
            this.updateKeyInput();
        }
    }

    public movePiece(move: MovementType): boolean {
        if (!this.currentPiece) return false;

        if (move === MovementType.ROTATE_COUNTERCLOCKWISE || move === MovementType.ROTATE_CLOCKWISE) {
            if (this.currentPiece.pieceType.pieceShooterPiece) {
                this.switchedHoldPieceAlready = true;
                const p = new Piece(this, this.grid, PieceType.emptyPieceType, BlockTypes.NORMAL); // Should use shotPieceBlockType
                p.init();
                const b = p.blocks[0];
                b.lastScreenX = this.grid.getXInFBO() + this.currentPiece.xGrid * this.cellW();
                b.lastScreenY = this.grid.getYInFBO() + this.currentPiece.yGrid * this.cellH();
                b.ticksSinceLastMovement = 0;
                let x = this.currentPiece.xGrid; let y = this.currentPiece.yGrid;
                while (y < this.gridH() - 1 && this.grid.get(x, y + 1) === null) y++;
                p.xGrid = x; p.yGrid = y;
                if (y !== this.currentPiece.yGrid) { this.grid.shakeSmall(); this.grid.setPiece(p); }
                return false;
            }
            if (this.currentPiece.pieceType.pieceRemovalShooterPiece) {
                this.switchedHoldPieceAlready = true;
                let x = this.currentPiece.xGrid; let y = this.currentPiece.yGrid;
                while (y < this.gridH() - 1 && this.grid.get(x, y) === null) y++;
                const b = this.grid.get(x, y);
                if (b) {
                    this.grid.removeBlock(b, true, true);
                    b.lastScreenX = this.grid.getXInFBO() + x * this.cellW();
                    b.lastScreenY = this.grid.getYInFBO() + y * this.cellH();
                    b.xGrid = x; b.yGrid = this.currentPiece.yGrid;
                }
                return false;
            }
        }

        const oldX = this.currentPiece.xGrid; const oldY = this.currentPiece.yGrid; const oldRot = this.currentPiece.currentRotation;
        if (move === MovementType.ROTATE_COUNTERCLOCKWISE) this.currentPiece.rotateCCW();
        else if (move === MovementType.ROTATE_CLOCKWISE) this.currentPiece.rotateCW();
        else if (move === MovementType.LEFT) this.currentPiece.xGrid--;
        else if (move === MovementType.RIGHT) this.currentPiece.xGrid++;
        else if (move === MovementType.DOWN) this.currentPiece.yGrid++;

        if (this.grid.doesPieceFit(this.currentPiece)) {
            this.pieceMoved();
            this.emit('pieceMoved', this.currentPiece, move);
            return true;
        } else {
            if (move === MovementType.ROTATE_COUNTERCLOCKWISE || move === MovementType.ROTATE_CLOCKWISE) {
                if (this.currentGameType.pieceClimbingAllowed) {
                    if (this.frameState.LEFT_HELD) {
                        const tempY = this.currentPiece.yGrid; this.currentPiece.xGrid--;
                        for (let i = 0; i <= this.currentPiece.getHeight(); i++) {
                            this.currentPiece.yGrid--;
                            if (this.grid.doesPieceFit(this.currentPiece)) { this.pieceMoved(); return true; }
                        }
                        this.currentPiece.yGrid = tempY; this.currentPiece.xGrid++;
                    }
                    if (this.frameState.RIGHT_HELD) {
                        const tempY = this.currentPiece.yGrid; this.currentPiece.xGrid++;
                        for (let i = 0; i <= this.currentPiece.getHeight(); i++) {
                            this.currentPiece.yGrid--;
                            if (this.grid.doesPieceFit(this.currentPiece)) { this.pieceMoved(); return true; }
                        }
                        this.currentPiece.yGrid = tempY; this.currentPiece.xGrid--;
                    }
                }
            }
            this.currentPiece.xGrid = oldX; this.currentPiece.yGrid = oldY; this.currentPiece.setRotation(oldRot);
            if (move === MovementType.DOWN) { if (this.lockDelayTicksCounter === 0) this.setPiece(); }
            return false;
        }
    }

    public updateKeyInput(): void {
        if (this.lockInputCountdownTicks > 0 || !this.player) return;
        if (this.player.rotateCWPressed()) this.movePiece(MovementType.ROTATE_CLOCKWISE);
        if (this.player.rotateCCWPressed()) this.movePiece(MovementType.ROTATE_COUNTERCLOCKWISE);
        if (this.player.leftPressed()) this.movePiece(MovementType.LEFT);
        if (this.player.rightPressed()) this.movePiece(MovementType.RIGHT);
        if (this.player.downPressed()) this.movePiece(MovementType.DOWN);
    }

    public manuallyApplyGravityWithoutChainChecking(): void {
        let moved = true;
        while (moved) {
            moved = false;
            for (let y = this.grid.getHeight() - 2; y >= 0; y--) {
                for (let x = 0; x < this.grid.getWidth(); x++) {
                    const b = this.grid.get(x, y);
                    if (b && this.grid.get(x, y + 1) === null) { this.grid.remove(x, y, false, false); this.grid.add(x, y + 1, b); moved = true; }
                }
            }
        }
    }

    private moveDownBlocksOverBlankSpaces(): boolean {
        const ignore = this.currentGameType.getBlockTypesToIgnoreWhenMovingDown(this.getCurrentDifficulty());
        let movedAny = false;
        this.moveDownLineTicksCounter += this.ticks();
        if (this.moveDownLineTicksCounter >= this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces || this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce) {
            this.moveDownLineTicksCounter = 0;
            let movedThisPass = true;
            while (movedThisPass) {
                movedThisPass = false;
                if (this.currentGameType.chainRule_CheckEntireLine) movedThisPass = this.grid.moveDownLinesAboveBlankLinesOneLine();
                else if (this.currentGameType.gravityRule_onlyMoveDownDisconnectedBlocks) movedThisPass = this.grid.moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignore);
                else movedThisPass = this.grid.moveDownAnyBlocksAboveBlankSpacesOneLine(ignore);
                if (movedThisPass) movedAny = true;
                if (!this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce) break;
            }
        }
        return movedAny;
    }

    public checkForChain(): void {
        this.currentChainBlocks = [];
        const ignore = this.currentGameType.getBlockTypesToIgnoreWhenCheckingChain(this.getCurrentDifficulty());
        const mustContain = this.currentGameType.getBlockTypesChainMustContain(this.getCurrentDifficulty());
        this.grid.setColorConnections(ignore);
        const toRow = (this.currentGameType.gameMode === GameMode.STACK) ? this.grid.getHeight() - 1 : this.grid.getHeight();

        if (this.currentGameType.chainRule_CheckEntireLine) {
            this.addToChainBlocks(this.grid.checkLines(ignore, mustContain));
        }
        if (this.currentGameType.chainRule_AmountPerChain > 0) {
            const chainBlocks: Block[] = [];
            for (let y = 0; y < toRow; y++) {
                for (let x = 0; x < this.grid.getWidth(); x++) {
                    const b = this.grid.get(x, y);
                    if (b && (ignore.length === 0 || !ignore.includes(b.blockType))) {
                        if (this.currentGameType.chainRule_CheckRow) this.grid.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(b, chainBlocks, this.currentGameType.chainRule_AmountPerChain, 0, this.grid.getWidth(), 0, toRow, ignore, mustContain);
                        if (this.currentGameType.chainRule_CheckColumn) this.grid.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(b, chainBlocks, this.currentGameType.chainRule_AmountPerChain, 0, this.grid.getWidth(), 0, toRow, ignore, mustContain);
                        if (this.currentGameType.chainRule_CheckDiagonal) this.grid.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfDiagonalAtLeastAmount(b, chainBlocks, this.currentGameType.chainRule_AmountPerChain, 0, this.grid.getWidth(), 0, toRow, ignore, mustContain);
                    }
                }
            }
            if (this.currentGameType.chainRule_CheckRecursiveConnections) this.grid.checkRecursiveConnectedRowOrColumn(chainBlocks, this.currentGameType.chainRule_AmountPerChain, 0, this.grid.getWidth(), 0, toRow, ignore, mustContain);
            this.addToChainBlocks(chainBlocks);
        }
        if (this.currentGameType.chainRule_CheckTouchingBreakerBlocksChain) {
            const breakers: BlockType[] = this.currentGameType.blockTypes.filter(bt => bt.isSpecialType());
            this.addToChainBlocks(this.grid.checkBreakerBlocks(toRow, ignore, breakers));
        }
    }

    private addToChainBlocks(arr: Block[]): void { for (const b of arr) if (!this.currentChainBlocks.includes(b)) this.currentChainBlocks.push(b); }

    public handleNewChain(): void {
        if (this.detectedChain()) {
            const chainMinimum = this.currentGameType.chainRule_CheckEntireLine ? this.currentGameType.gridWidth : this.currentGameType.chainRule_AmountPerChain;

            if (this.currentCombo === 0) {
                this.currentCombo = 1;
                this.currentChain = this.currentChainBlocks.length;
                let bonus = (this.currentChain - chainMinimum);
                if (this.currentGameType.chainRule_CheckEntireLine) {
                    bonus = Math.floor(this.currentChain / this.currentGameType.gridWidth);
                    if (bonus === 1) bonus = 0;
                }
                if (bonus > 0) this.queueVSGarbageToSend(bonus);
                this.grid.shakeSmall();
            } else {
                this.currentCombo++;
                this.currentChain = this.currentChainBlocks.length;
                this.comboChainTotal += this.currentChain;
                this.totalCombosMade++;
                if (this.comboChainTotal > this.biggestComboChain) this.biggestComboChain = this.comboChainTotal;
                let bonus = (this.currentChain - chainMinimum);
                if (bonus <= 0) bonus = 1;
                this.queueVSGarbageToSend(this.currentCombo);
                this.grid.shakeHard();
            }

            const addToChain: Block[] = [];
            for (const a of this.currentChainBlocks) {
                for (const b of this.grid.getConnectedBlocksUpDownLeftRight(a)) {
                    if (b.blockType.addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks) {
                        if (!this.currentChainBlocks.includes(b) && !addToChain.includes(b)) addToChain.push(b);
                    }
                }
            }
            this.currentChainBlocks.push(...addToChain);
            for (const b of this.currentChainBlocks) b.flashingToBeRemoved = true;

            if (this.currentGameType.gameMode === GameMode.STACK && this.currentChainBlocks.length > 3) {
                this.stopStackRiseTicksCounter += 1000 * this.currentChainBlocks.length;
            }
            this.timesToFlashBlocksQueue = this.timesToFlashBlocks;
            this.emit('linesCleared', [], this.currentChain, this.currentCombo);
        }
    }

    public queueVSGarbageToSend(amount: number): void {
        amount *= this.getRoom().multiplayer_GarbageMultiplier;
        if (this.getRoom().multiplayer_GarbageScaleByDifficulty) {
            if (this.getCurrentDifficulty().name === "Beginner") amount = Math.floor(amount * 2.0);
            if (this.getCurrentDifficulty().name === "Easy") amount = Math.floor(amount * 1.5);
            if (this.getCurrentDifficulty().name === "Normal") amount = Math.floor(amount * 1.0);
            if (this.getCurrentDifficulty().name === "Hard") amount = Math.floor(amount * 0.75);
            if (this.getCurrentDifficulty().name === "Insane") amount = Math.floor(amount * 0.5);
        }

        if (this.queuedVSGarbageAmountFromOtherPlayer > 0) {
            if (amount >= this.queuedVSGarbageAmountFromOtherPlayer) {
                this.makeAnnouncementCaption("Negated VS Garbage: " + this.queuedVSGarbageAmountFromOtherPlayer);
                amount -= this.queuedVSGarbageAmountFromOtherPlayer;
                this.queuedVSGarbageAmountFromOtherPlayer = 0;
            } else {
                this.makeAnnouncementCaption("Negated VS Garbage: " + amount);
                this.queuedVSGarbageAmountFromOtherPlayer -= amount;
                amount = 0;
            }
        }

        if (this.isMultiplayer() && this.getRoom().multiplayer_DisableVSGarbage === false) {
            if (amount > 0) {
                this.queuedVSGarbageAmountToSend += amount;
                this.makeAnnouncementCaption("Sent VS Garbage: " + amount + " Total: " + this.queuedVSGarbageAmountToSend);
                this.emit('garbageSent', amount);
            }
        }
    }

    public gotVSGarbageFromOtherPlayer(amount: number): void {
        this.garbageWaitForPiecesSetCount = Math.min(4, this.garbageWaitForPiecesSetCount + 3);
        if (this.getRoom().multiplayer_GarbageScaleByDifficulty) {
            if (this.getCurrentDifficulty().name === "Beginner") amount = Math.floor(amount * 0.5);
            if (this.getCurrentDifficulty().name === "Easy") amount = Math.floor(amount * 0.75);
            if (this.getCurrentDifficulty().name === "Normal") amount = Math.floor(amount * 1.0);
            if (this.getCurrentDifficulty().name === "Hard") amount = Math.floor(amount * 1.5);
            if (this.getCurrentDifficulty().name === "Insane") amount = Math.floor(amount * 2.0);
        }
        this.queuedVSGarbageAmountFromOtherPlayer += amount;
        if (this.getRoom().multiplayer_GarbageLimit > 0 && this.queuedVSGarbageAmountFromOtherPlayer > this.getRoom().multiplayer_GarbageLimit) {
            this.queuedVSGarbageAmountFromOtherPlayer = this.getRoom().multiplayer_GarbageLimit;
        }
        this.makeAnnouncementCaption("Got VS Garbage: " + amount);
    }

    public processQueuedGarbageSentFromOtherPlayer(): void {
        if (this.queuedVSGarbageAmountFromOtherPlayer > 0) {
            if (this.garbageWaitForPiecesSetCount === 0) {
                const garbageMultiplier = 2;
                while (this.queuedVSGarbageAmountFromOtherPlayer / (this.grid.getWidth() / garbageMultiplier) > 0) {
                    this.queuedVSGarbageAmountFromOtherPlayer -= this.grid.getWidth();
                    if (this.queuedVSGarbageAmountFromOtherPlayer < 0) this.queuedVSGarbageAmountFromOtherPlayer = 0;

                    if (this.currentGameType.vsGarbageDropRule === VSGarbageDropRule.FALL_FROM_CEILING_IN_EVEN_ROWS) {
                        this.makeGarbageRowFromCeiling();
                        this.moveDownBlocksOverBlankSpaces();
                    } else if (this.currentGameType.vsGarbageDropRule === VSGarbageDropRule.RISE_FROM_FLOOR_IN_EVEN_ROWS) {
                        this.makeGarbageRowFromFloor();
                    }
                }
            }
        }
    }

    public processGarbageRules(): void {
        let makeGarbage = false;
        if (this.currentGameType.playingFieldGarbageSpawnRule === GarbageSpawnRule.TICKS) {
            this.playingFieldGarbageValueCounter += this.ticks();
            if (this.playingFieldGarbageValueCounter > this.getCurrentDifficulty().playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = 0;
                makeGarbage = true;
            }
        } else {
            const rule = this.currentGameType.playingFieldGarbageSpawnRule;
            const amount = this.getCurrentDifficulty().playingFieldGarbageSpawnRuleAmount;
            if (rule === GarbageSpawnRule.PIECES_MADE) {
                if (this.piecesMadeThisGame >= this.playingFieldGarbageValueCounter + amount) {
                    this.playingFieldGarbageValueCounter = this.piecesMadeThisGame;
                    makeGarbage = true;
                }
            } else if (rule === GarbageSpawnRule.BLOCKS_CLEARED) {
                if (this.blocksClearedThisGame >= this.playingFieldGarbageValueCounter + amount) {
                    this.playingFieldGarbageValueCounter = this.blocksClearedThisGame;
                    makeGarbage = true;
                }
            } else if (rule === GarbageSpawnRule.LINES_CLEARED) {
                if (this.linesClearedThisGame >= this.playingFieldGarbageValueCounter + amount) {
                    this.playingFieldGarbageValueCounter = this.linesClearedThisGame;
                    makeGarbage = true;
                }
            }
        }
        if (makeGarbage) this.makeGarbageRowFromFloor();
    }

    public makeGarbageRowFromFloor(): void {
        this.grid.makeGarbageRowFromFloor();
        this.manuallyApplyGravityWithoutChainChecking();
        this.grid.shakeMedium();
    }

    public makeGarbageRowFromCeiling(): void {
        this.grid.makeGarbageRowFromCeiling();
        this.manuallyApplyGravityWithoutChainChecking();
        this.grid.shakeHard();
    }

    public makeAnnouncementCaption(text: string, color?: BobColor): void {
        this.emit('announcement', text, color);
    }

    public isNetworkGame(): boolean {
        return this.manager?.isNetworkGame?.() || false;
    }

    private detectedChain(): boolean { return this.currentChainBlocks.length > 0; }

    public updateScore(): void {
        if (this.piecesMadeThisGame > this.lastPiecesMadeThisGame) {
            this.lastPiecesMadeThisGame = this.piecesMadeThisGame;
            this.gameSpeed += this.getRoom().gameSpeedChangeRate;
            if (this.gameSpeed > this.getRoom().gameSpeedMaximum) this.gameSpeed = this.getRoom().gameSpeedMaximum;
            const dropSpeedDiff = this.getCurrentDifficulty().initialLineDropSpeedTicks - this.getCurrentDifficulty().minimumLineDropSpeedTicks;
            this.currentLineDropSpeedTicks = this.getCurrentDifficulty().initialLineDropSpeedTicks - Math.floor(dropSpeedDiff * this.gameSpeed);
        }
        const amount = this.currentGameType.scoreTypeAmountPerLevelGained * this.getRoom().levelUpMultiplier * this.getRoom().levelUpCompoundMultiplier;
        if (this.currentGameType.scoreType === ScoreType.LINES_CLEARED && this.linesClearedThisLevel >= amount) { this.currentLevel++; this.linesClearedThisLevel -= amount; this.emit('levelUp', this.currentLevel); }
        else if (this.currentGameType.scoreType === ScoreType.BLOCKS_CLEARED && this.blocksClearedThisLevel >= amount) { this.currentLevel++; this.blocksClearedThisLevel -= amount; this.emit('levelUp', this.currentLevel); }
        else if (this.currentGameType.scoreType === ScoreType.PIECES_MADE && this.piecesMadeThisLevel >= amount) { this.currentLevel++; this.piecesMadeThisLevel -= amount; this.emit('levelUp', this.currentLevel); }
    }

    public flashChainBlocks(): void {
        this.flashBlocksTicksCounter += this.ticks();
        if (this.flashBlocksTicksCounter > this.flashBlockSpeedTicks) {
            this.flashBlocksTicksCounter = 0;
            for (const b of this.currentChainBlocks) b.flashingToBeRemovedLightDarkToggle = !b.flashingToBeRemovedLightDarkToggle;
            this.timesToFlashBlocksQueue--;
        }
    }

    public removeFlashedChainBlocks(): void {
        let linesCleared = 0;
        let blocksCleared = 0;

        if (this.currentChainBlocks.length > 0) {
            for (let i = 0; i < this.currentChainBlocks.length; i++) {
                const b = this.currentChainBlocks[i];
                if (!b.overrideAnySpecialBehavior) {
                    if (b.blockType.makePieceTypeWhenCleared_UUID.length > 0) {
                        const pt = this.currentGameType.getPieceTypeByUUID(b.blockType.makePieceTypeWhenCleared_UUID[this.getRandomIntLessThan(b.blockType.makePieceTypeWhenCleared_UUID.length, "removeFlashedChainBlocks")]);
                        const p = new Piece(this, this.grid, pt, BlockTypes.NORMAL);
                        p.init();
                        this.nextPieceSpecialBuffer.push(p);
                        if (p.pieceType.bombPiece) this.makeAnnouncementCaption("BOMB", BobColor.blue);
                        if (p.pieceType.weightPiece) this.makeAnnouncementCaption("WEIGHT", BobColor.orange);
                        if (p.pieceType.clearEveryRowPieceIsOnIfAnySingleRowCleared) this.makeAnnouncementCaption("FLASHING CLEAR", BobColor.green);
                        if (p.pieceType.pieceRemovalShooterPiece) this.makeAnnouncementCaption("SUBTRACTOR", BobColor.red);
                        if (p.pieceType.pieceShooterPiece) this.makeAnnouncementCaption("ADDER", BobColor.yellow);
                    }
                    if (b.blockType.clearEveryOtherLineOnGridWhenCleared) {
                        this.makeAnnouncementCaption("SCANLINE CLEAR", BobColor.red);
                        for (let y = this.gridH() - 2; y >= 0; y -= 2) {
                            for (let x = 0; x < this.gridW(); x++) {
                                const c = this.grid.get(x, y);
                                if (c && !this.currentChainBlocks.includes(c)) this.currentChainBlocks.push(c);
                            }
                        }
                        this.grid.shakeSmall();
                    }
                }
            }

            this.removeBlocksTicksCounter += this.ticks();
            while (this.currentChainBlocks.length > 0 && (this.currentGameType.removingBlocksDelayTicksBetweenEachBlock === 0 || this.removeBlocksTicksCounter > this.currentGameType.removingBlocksDelayTicksBetweenEachBlock)) {
                this.removeBlocksTicksCounter = 0;
                const a = this.currentChainBlocks[0];
                for (const b of this.grid.getConnectedBlocksUpDownLeftRight(a)) {
                    if (b.blockType.ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID.length > 0) {
                        b.popping = true; b.animationFrame = 0; this.checkForChainAgainIfNoBlocksPopping = true;
                    }
                }
                if (this.currentGameType.chainRule_CheckEntireLine) {
                    for (let i = 0; i < this.currentChainBlocks.length; i++) {
                        const b = this.currentChainBlocks[i];
                        if (b !== a && b.yGrid === a.yGrid) {
                            this.currentChainBlocks.splice(i, 1);
                            this.grid.removeBlock(b, true, true);
                            blocksCleared++; this.blocksClearedThisGame++; this.blocksClearedThisLevel++; this.blocksClearedTotal++;
                            i = -1;
                        }
                    }
                    linesCleared++; this.linesClearedThisGame++; this.linesClearedThisLevel++; this.linesClearedTotal++;
                }
                this.currentChainBlocks.shift();
                this.grid.removeBlock(a, true, true);
                blocksCleared++; this.blocksClearedThisGame++; this.blocksClearedThisLevel++; this.blocksClearedTotal++;
            }
        }
        this.timesToFlashScreenQueue += linesCleared;
        if (linesCleared >= 4) this.makeAnnouncementCaption("SOSUMI!", BobColor.green);
        this.currentChain = this.currentChainBlocks.length;
    }

    private setPiece(): void {
        this.grid.setPiece(this.currentPiece!);
        this.pieceSetAtBottom = true; this.piecesPlacedTotal++; this.lastPiece = this.currentPiece; 
        this.emit('pieceLocked', this.lastPiece!);
        this.currentPiece = null;
    }

    public newRandomPiece(): void {
        this.pieceSetAtBottom = false;
        while (this.nextPieces.length < this.currentGameType.numberOfNextPiecesToShow + 1) {
            if (this.nextPieceSpecialBuffer.length > 0) {
                this.nextPieces.push(this.nextPieceSpecialBuffer.shift()!);
            } else {
                this.nextPieces.push(this.grid.getRandomPiece());
            }
            this.createdPiecesCounterForFrequencyPieces++;
        }
        this.currentPiece = this.nextPieces.shift()!;
        this.currentPiece.init(); this.setCurrentPieceAtTop();

        if (this.lastPiece) {
            for (const b of this.lastPiece.blocks) {
                if (b.yGrid < GameLogic.aboveGridBuffer && b.yGrid >= 0 && this.grid.contains(b.xGrid, b.yGrid)) {
                    this.died = true;
                }
            }
        }

        this.switchedHoldPieceAlready = false;
        this.piecesMadeThisGame++; this.piecesMadeThisLevel++; this.piecesPlacedTotal++;
        this.blocksMadeTotal += this.currentPiece.blocks.length;
        if (this.garbageWaitForPiecesSetCount > 0) this.garbageWaitForPiecesSetCount--;

        const piecesOnGrid = this.grid.getArrayOfPiecesOnGrid();
        for (const p of piecesOnGrid) {
            p.piecesSetSinceThisPieceSet++;
            for (const b of p.blocks) {
                if (b.blockType.counterType && b.counterCount > -1) b.counterCount--;
            }
        }

        if (this.currentPiece.pieceType.bombPiece || this.currentPiece.pieceType.weightPiece || this.currentPiece.pieceType.pieceShooterPiece || this.currentPiece.pieceType.pieceRemovalShooterPiece) {
            this.lineClearDelayTicksCounter = 0;
        }

        this.emit('pieceSpawned', this.currentPiece);
    }

    private setCurrentPieceAtTop(): void {
        this.currentPiece!.xGrid = Math.floor(this.grid.getWidth() / 2) - Math.floor(this.currentPiece!.getWidth() / 2 + this.currentPiece!.getLowestOffsetX());
        this.currentPiece!.yGrid = -2 + GameLogic.aboveGridBuffer;
        if (!this.grid.doesPieceFit(this.currentPiece!)) {
            this.died = true;
            this.setState(GameState.GAME_OVER);
        }
        this.spawnDelayTicksCounter = this.adjustedSpawnDelayTicksAmount;
    }

    public pieceMoved(): void { this.lockDelayTicksCounter = this.adjustedMaxLockDelayTicks; }
    public getRoom(): Room { return this.manager?.currentRoom || new Room(); }
    public isMultiplayer(): boolean { 
        if (this.manager && this.manager.players) return this.manager.players.length > 1;
        return false;
    }
    public cellW(): number { return this.blockWidth + this.currentGameType.gridPixelsBetweenColumns; }
    public cellH(): number { return this.blockHeight + this.currentGameType.gridPixelsBetweenRows; }
    public gridW(): number { return this.currentGameType.gridWidth; }
    public gridH(): number { return this.currentGameType.gridHeight + GameLogic.aboveGridBuffer; }
    public getRandomIntLessThan(i: number, s: string): number { return Math.floor(Math.random() * i); }
    private updateSpecialPiecesAndBlocks(): void { 
        if (this.currentPiece) this.currentPiece.update(); 
        if (this.holdPiece) this.holdPiece.update(); 
        for (const p of this.nextPieces) p.update();
        for (const p of this.nextPieceSpecialBuffer) p.update();
        for (const b of this.fadingOutBlocks) b.update();
    }
    private resetNextPieces(): void { this.currentPiece = null; this.holdPiece = null; this.nextPieces = []; }
    private checkForFastMusic(): void { this.playingFastMusic = this.grid.isAnythingAboveThreeQuarters(); }

    public getFormattedTime(): string {
        const totalMs = Date.now() - this.timeStarted;
        const totalSeconds = Math.floor(totalMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    public getGhostY(): number {
        if (!this.currentPiece) return 0;
        let ghostY = this.currentPiece.yGrid;
        for (let y = ghostY; y < this.grid.getHeight(); y++) {
            if (this.grid.doesPieceFit(this.currentPiece, this.currentPiece.xGrid, y)) ghostY = y;
            else break;
        }
        return ghostY;
    }
}
