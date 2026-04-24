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
    public lineClearDelayTicksCounter: number = 0;
    public stackRiseTicksCounter: number = 0;
    public stopStackRiseTicksCounter: number = 0;

    // Chain flashing system
    public timesToFlashBlocks: number = 20;
    public flashBlockSpeedTicks: number = 30;
    public flashBlocksTicksCounter: number = 0;
    public timesToFlashBlocksQueue: number = 0;
    public flashScreenSpeedTicks: number = 50;
    public flashScreenTicksCounter: number = 0;
    public timesToFlashScreenQueue: number = 0;
    public flashScreenOnOffToggle: boolean = false;
    public removeBlocksTicksCounter: number = 0;

    // Scoring / stats
    public currentLevel: number = 0;
    public score: number = 0;
    public timeStarted: number = 0;
    public timeEnded: number = 0;
    public totalTicksPassed: number = 0;
    public linesClearedTotal: number = 0;
    public linesClearedThisGame: number = 0;
    public linesClearedThisLevel: number = 0;
    public blocksClearedTotal: number = 0;
    public blocksClearedThisGame: number = 0;
    public blocksClearedThisLevel: number = 0;
    public piecesMadeThisGame: number = 0;
    public piecesMadeTotal: number = 0;
    public piecesPlacedTotal: number = 0;

    // Combo / chain tracking
    public currentChain: number = 0;
    public currentCombo: number = 0;
    public comboChainTotal: number = 0;
    public totalCombosMade: number = 0;
    public biggestComboChain: number = 0;

    // VS garbage system
    public queuedVSGarbageAmountToSend: number = 0;
    public queuedVSGarbageAmountFromOtherPlayer: number = 0;
    public garbageWaitForPiecesSetCount: number = 0;
    public lastSentGarbageToPlayerIndex: number = 0;

    // Playing field garbage
    public playingFieldGarbageValueCounter: number = 0;

    public static readonly aboveGridBuffer: number = 5;

    public currentPiece: Piece | null = null;
    public currentPieceGhostY: number = 0;
    public cursorX: number = 0;
    public cursorY: number = 0;
    public holdPiece: Piece | null = null;
    public nextPieces: Piece[] = [];
    public nextPieceSpecialBuffer: Piece[] = [];

    public fadingOutBlocks: Block[] = [];

    public frameState: FrameState = new FrameState();
    public room: Room = new Room();

    private currentChainBlocks: Block[] = [];

    constructor(private scene: any, public seed: number = 0) {
        super();
        this.currentGameType = new GameType();
        this.grid = new Grid(this);
        this.room.setDefaults();
    }

    public initGame(): void {
        this.grid.clear();
        this.score = 0;
        this.currentLevel = 0;
        this.linesClearedTotal = 0;
        this.linesClearedThisGame = 0;
        this.linesClearedThisLevel = 0;
        this.blocksClearedTotal = 0;
        this.blocksClearedThisGame = 0;
        this.blocksClearedThisLevel = 0;
        this.piecesMadeThisGame = 0;
        this.piecesMadeTotal = 0;
        this.piecesPlacedTotal = 0;
        this.currentChain = 0;
        this.currentCombo = 0;
        this.comboChainTotal = 0;
        this.totalCombosMade = 0;
        this.biggestComboChain = 0;
        this.queuedVSGarbageAmountToSend = 0;
        this.queuedVSGarbageAmountFromOtherPlayer = 0;
        this.garbageWaitForPiecesSetCount = 0;
        this.playingFieldGarbageValueCounter = 0;
        this.currentLineDropSpeedTicks = this.getCurrentDifficulty().initialLineDropSpeedTicks;
        this.timeStarted = Date.now();
        this.timeEnded = 0;
        this.totalTicksPassed = 0;
        this.won = false;
        this.lost = false;
        this.died = false;
        this.dead = false;
        this.complete = false;
        this.didInit = true;
        this.fadingOutBlocks = [];
        this.nextPieceSpecialBuffer = [];
        this.timesToFlashBlocksQueue = 0;
        this.timesToFlashScreenQueue = 0;
        this.lineClearDelayTicksCounter = 0;

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

        const dt = this.ticks();
        this.totalTicksPassed += dt;

        // Chain flashing / block removal animation
        if (this.timesToFlashBlocksQueue > 0) this.flashChainBlocks();
        if (this.timesToFlashBlocksQueue === 0 && this.currentChainBlocks.length > 0) {
            this.removeFlashedChainBlocks();
        }
        if (this.timesToFlashScreenQueue > 0) this.flashScreen();

        // Update special pieces and fading blocks
        this.updateSpecialPiecesAndBlocks();

        // Line clear delay
        if (this.lineClearDelayTicksCounter > 0) {
            this.lineClearDelayTicksCounter -= dt;
        }

        // Apply gravity after clears
        this.manuallyApplyGravityLogic();

        // Process garbage
        this.processQueuedGarbageSentFromOtherPlayer();
        this.processGarbageRules();

        if (this.currentGameType.gameMode === GamePlayMode.STACK) this.doStackRiseGame();
        else if (this.currentGameType.gameMode === GamePlayMode.DROP) this.doFallingBlockGame();

        for (let i = 0; i < dt; i++) {
            if (this.pieceSetAtBottom && this.lineClearDelayTicksCounter <= 0) {
                this.newRandomPiece();
            }
            this.handleInput();
        }

        // Check for level up
        this.checkForLevelUp();

        // Grid update (animations, shake, etc.)
        this.grid.update();

        this.emit('tick', dt);
    }

    // ─── Chain flashing & removal ────────────────────────────────────

    private flashScreen(): void {
        this.flashScreenTicksCounter += this.ticks();
        if (this.flashScreenTicksCounter > this.flashScreenSpeedTicks) {
            this.flashScreenTicksCounter = 0;
            this.flashScreenOnOffToggle = !this.flashScreenOnOffToggle;
            if (this.flashScreenOnOffToggle) this.timesToFlashScreenQueue--;
        }
    }

    private flashChainBlocks(): void {
        this.flashBlocksTicksCounter += this.ticks();
        if (this.flashBlocksTicksCounter > this.flashBlockSpeedTicks) {
            this.flashBlocksTicksCounter = 0;
            if (this.detectedChain()) {
                for (const b of this.currentChainBlocks) {
                    b.flashingToBeRemovedLightDarkToggle = !b.flashingToBeRemovedLightDarkToggle;
                }
            }
            this.timesToFlashBlocksQueue--;
        }
    }

    private removeFlashedChainBlocks(): void {
        let linesCleared = 0;
        let blocksCleared = 0;

        this.removeBlocksTicksCounter += this.ticks();

        while (
            this.currentChainBlocks.length > 0 &&
            (this.currentGameType.gridWidth === 0 || this.removeBlocksTicksCounter > this.currentGameType.gridWidth)
        ) {
            this.removeBlocksTicksCounter = 0;
            const a = this.currentChainBlocks[0];

            // Handle connected block type transformations
            const neighbors = this.grid.getConnectedBlocksUpDownLeftRight(a);
            for (const n of neighbors) {
                if (n.blockType.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut?.length) {
                    n.popping = true;
                    n.animationFrame = 0;
                }
            }

            // Handle special blocks that spawn pieces when cleared
            if (!a.overrideAnySpecialBehavior && a.blockType.makePieceTypeWhenCleared_UUID?.length > 0) {
                const ptUuid = a.blockType.makePieceTypeWhenCleared_UUID[
                    this.getRandomIntLessThan(a.blockType.makePieceTypeWhenCleared_UUID.length, 'removeFlashedChainBlocks')
                ];
                const pt = this.currentGameType.getPieceTypeByUUID(ptUuid);
                if (pt) {
                    const p = new Piece(this, this.grid, pt, BlockType.emptyBlockType);
                    p.init();
                    this.nextPieceSpecialBuffer.push(p);
                    if (pt.bombPiece) this.emit('announcement', 'BOMB!', BobColor.blue);
                    if (pt.weightPiece) this.emit('announcement', 'WEIGHT!', BobColor.orange);
                    if (pt.pieceShooterPiece) this.emit('announcement', 'ADDER!', BobColor.yellow);
                    if (pt.pieceRemovalShooterPiece) this.emit('announcement', 'SUBTRACTOR!', BobColor.red);
                }
            }

            // Entire line clear check
            if (this.currentGameType.chainRule_CheckEntireLine) {
                const rowY = a.yGrid;
                const toRemove = this.currentChainBlocks.filter(b => b.yGrid === rowY && b !== a);
                for (const b of toRemove) {
                    this.grid.removeBlock(b, true, true);
                    blocksCleared++;
                    const idx = this.currentChainBlocks.indexOf(b);
                    if (idx >= 0) this.currentChainBlocks.splice(idx, 1);
                }
                linesCleared++;
            }

            this.currentChainBlocks.splice(0, 1);
            this.grid.removeBlock(a, true, true);
            blocksCleared++;
        }

        this.blocksClearedThisGame += blocksCleared;
        this.blocksClearedThisLevel += blocksCleared;
        this.blocksClearedTotal += blocksCleared;
        this.linesClearedThisGame += linesCleared;
        this.linesClearedThisLevel += linesCleared;
        this.linesClearedTotal += linesCleared;

        this.timesToFlashScreenQueue += linesCleared;

        // Announcements based on lines cleared
        if (linesCleared === 1) this.emit('announcement', 'Single!');
        if (linesCleared === 2) this.emit('announcement', 'Double!');
        if (linesCleared === 3) this.emit('announcement', 'Triple!');
        if (linesCleared >= 4) this.emit('announcement', 'SOSUMI!', BobColor.green);

        // Score calculation
        const chainMultiplier = this.currentChain > 0 ? this.currentChain : 1;
        const comboMultiplier = this.currentCombo > 0 ? this.currentCombo : 1;
        this.score += blocksCleared * 10 * chainMultiplier * comboMultiplier;

        this.emit('linesCleared', [], this.currentChain, this.currentCombo);

        // Reset combo after processing
        this.currentChain = 0;
        this.currentCombo = 0;
    }

    private updateSpecialPiecesAndBlocks(): void {
        // Update fading out blocks
        for (let i = this.fadingOutBlocks.length - 1; i >= 0; i--) {
            const b = this.fadingOutBlocks[i];
            if (b.fadingOut) {
                b.disappearingAlpha -= 0.05;
                if (b.disappearingAlpha <= 0) {
                    this.grid.removeBlock(b, false, false);
                    this.fadingOutBlocks.splice(i, 1);
                }
            }
        }
    }

    private manuallyApplyGravityLogic(): void {
        if (this.lineClearDelayTicksCounter > 0) return;
        this.moveDownBlocksOverBlankSpaces();
    }

    private moveDownBlocksOverBlankSpaces(): boolean {
        const ignoreTypes = this.currentGameType.getBlockTypesToIgnoreWhenMovingDown(this.getCurrentDifficulty());
        let moved = false;
        for (let y = this.grid.getHeight() - 2; y >= 0; y--) {
            for (let x = 0; x < this.grid.getWidth(); x++) {
                const b = this.grid.get(x, y);
                if (!b) continue;
                if (ignoreTypes.some(it => it.uuid === b.blockType.uuid)) continue;
                const below = this.grid.get(x, y + 1);
                if (below === null) {
                    this.grid.set(x, y, null);
                    this.grid.set(x, y + 1, b);
                    b.yGrid = y + 1;
                    moved = true;
                }
            }
        }
        return moved;
    }

    public manuallyApplyGravityWithoutChainChecking(): void {
        this.moveDownBlocksOverBlankSpaces();
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

        // Turn all touching blocks of from types into to type and fade out
        for (const block of this.currentPiece.blocks) {
            const rules = block.blockType.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut;
            if (rules && rules.length > 0) {
                const neighbors = this.grid.getConnectedBlocksUpDownLeftRight(block);
                for (const neighbor of neighbors) {
                    for (const rule of rules) {
                        if (neighbor.blockType.uuid === rule.fromType_UUID) {
                            const toType = this.currentGameType.getBlockTypeByUUID(rule.toType_UUID);
                            if (toType) {
                                neighbor.blockType = toType;
                                neighbor.fadingOut = true;
                                neighbor.disappearingAlpha = 1.0;
                                if (!this.fadingOutBlocks.includes(neighbor)) {
                                    this.fadingOutBlocks.push(neighbor);
                                }
                            }
                        }
                    }
                }
            }
        }

        this.emit('pieceLocked', this.currentPiece);
        this.checkForChain();
        this.newRandomPiece();
    }

    private checkForChain(): void {
        this.currentChainBlocks = [];

        const ignoreTypes = this.currentGameType.getBlockTypesToIgnoreWhenCheckingChain(this.getCurrentDifficulty());
        const mustContainTypes = this.currentGameType.getBlockTypesChainMustContain(this.getCurrentDifficulty());

        this.grid.setColorConnections(ignoreTypes);

        const toRow = (this.currentGameType.gameMode === GamePlayMode.STACK) ? this.grid.getHeight() - 1 : this.grid.getHeight();

        // Entire line check
        if (this.currentGameType.chainRule_CheckEntireLine) {
            const lineBlocks = this.grid.checkLines(ignoreTypes, mustContainTypes);
            this.addToChainBlocks(lineBlocks);
        }

        // Amount-per-chain check (row, column, diagonal)
        if (this.currentGameType.chainRule_AmountPerChain > 0) {
            const chainBlocks: Block[] = [];
            for (let y = 0; y < toRow; y++) {
                for (let x = 0; x < this.grid.getWidth(); x++) {
                    const b = this.grid.get(x, y);
                    if (!b || ignoreTypes.some(it => it.uuid === b.blockType.uuid)) continue;
                    if (this.currentGameType.chainRule_CheckRow) {
                        this.grid.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(
                            b, chainBlocks, this.currentGameType.chainRule_AmountPerChain,
                            0, this.grid.getWidth(), 0, toRow, ignoreTypes, mustContainTypes);
                    }
                    if (this.currentGameType.chainRule_CheckColumn) {
                        this.grid.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(
                            b, chainBlocks, this.currentGameType.chainRule_AmountPerChain,
                            0, this.grid.getWidth(), 0, toRow, ignoreTypes, mustContainTypes);
                    }
                    if (this.currentGameType.chainRule_CheckDiagonal) {
                        this.grid.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfDiagonalAtLeastAmount(
                            b, chainBlocks, this.currentGameType.chainRule_AmountPerChain,
                            0, this.grid.getWidth(), 0, toRow, ignoreTypes, mustContainTypes);
                    }
                }
            }

            // Recursive connections
            if (this.currentGameType.chainRule_CheckRecursive) {
                this.grid.checkRecursiveConnectedRowOrColumn(
                    chainBlocks, this.currentGameType.chainRule_AmountPerChain,
                    0, this.grid.getWidth(), 0, toRow, ignoreTypes, mustContainTypes);
            }

            this.addToChainBlocks(chainBlocks);
        }

        // Breaker block check
        if (this.currentGameType.chainRule_CheckTouchingBreakerBlocksChain) {
            const breakerBlocks = this.grid.checkBreakerBlocks(toRow, ignoreTypes, mustContainTypes);
            this.addToChainBlocks(breakerBlocks);
        }

        if (this.currentChainBlocks.length > 0) this.handleNewChain();
    }

    private addToChainBlocks(arr: Block[]): void {
        for (const b of arr) {
            if (!this.currentChainBlocks.includes(b)) this.currentChainBlocks.push(b);
        }
    }

    private detectedChain(): boolean {
        return this.currentChainBlocks.length > 0;
    }



    private handleNewChain(): void {
        if (!this.detectedChain()) return;

        const chainMinimum = this.currentGameType.chainRule_AmountPerChain;

        if (this.currentCombo === 0) {
            // First chain in sequence
            this.currentCombo = 1;
            this.currentChain = this.currentChainBlocks.length;
            this.comboChainTotal += this.currentChain;

            this.emit('announcement', `Chain: ${this.currentChain}`);

            const bonusAmount = Math.max(0, this.currentChain - chainMinimum);
            if (bonusAmount > 0) {
                this.emit('announcement', `Chain Bonus: ${bonusAmount}`, BobColor.green);
                this.queueVSGarbageToSend(bonusAmount);
            }

            this.grid.shakeSmall();
        } else {
            // Combo chain
            this.currentCombo++;
            this.currentChain = this.currentChainBlocks.length;
            this.comboChainTotal += this.currentChain;
            this.totalCombosMade++;

            if (this.comboChainTotal > this.biggestComboChain) this.biggestComboChain = this.comboChainTotal;

            this.emit('announcement', `Chain: ${this.currentChain}`);
            this.emit('announcement', `${this.currentCombo}X Combo! Total: ${this.comboChainTotal}`, BobColor.magenta);

            const bonusAmount = Math.max(1, this.currentChain - chainMinimum);
            this.emit('announcement', `Combo Bonus: ${bonusAmount} X ${this.currentCombo}`, BobColor.green);
            this.queueVSGarbageToSend(this.currentCombo);

            this.grid.shakeHard();
        }

        // Check for adjacent breaker-type blocks to add to chain
        const addToChain: Block[] = [];
        for (const a of this.currentChainBlocks) {
            const neighbors = this.grid.getConnectedBlocksUpDownLeftRight(a);
            for (const b of neighbors) {
                if (b.blockType.addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks && !this.currentChainBlocks.includes(b) && !addToChain.includes(b)) {
                    addToChain.push(b);
                }
            }
        }
        for (const b of addToChain) this.currentChainBlocks.push(b);

        // Mark all chain blocks as flashing
        for (const b of this.currentChainBlocks) b.flashingToBeRemoved = true;

        // Stack mode: pause stack rise based on chain size
        if (this.currentGameType.gameMode === GamePlayMode.STACK && this.currentChainBlocks.length > 3) {
            this.stopStackRiseTicksCounter += 1000 * this.currentChainBlocks.length;
            if (this.room.stackWaitLimit > -1 && this.stopStackRiseTicksCounter > this.room.stackWaitLimit) {
                this.stopStackRiseTicksCounter = this.room.stackWaitLimit;
            }
        }

        this.timesToFlashBlocksQueue = this.timesToFlashBlocks;
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

    // ─── Level progression ──────────────────────────────────────────

    private checkForLevelUp(): void {
        const diff = this.getCurrentDifficulty();
        const scoreType = this.currentGameType.scoreType;
        const amountPerLevel = this.currentGameType.scoreTypeAmountPerLevelGained;
        let currentAmount = 0;

        if (scoreType === ScoreType.LINES_CLEARED) currentAmount = this.linesClearedThisLevel;
        else if (scoreType === ScoreType.BLOCKS_CLEARED) currentAmount = this.blocksClearedThisLevel;
        else if (scoreType === ScoreType.PIECES_MADE) currentAmount = this.piecesMadeThisGame;

        if (currentAmount >= amountPerLevel) {
            this.currentLevel++;
            this.linesClearedThisLevel = 0;
            this.blocksClearedThisLevel = 0;

            // Speed up drop speed
            const speedMultiplier = Math.pow(0.85, this.currentLevel);
            this.currentLineDropSpeedTicks = Math.max(
                diff.minimumLineDropSpeedTicks,
                Math.floor(diff.initialLineDropSpeedTicks * speedMultiplier)
            );

            this.emit('levelUp', this.currentLevel);
            this.emit('announcement', `Level ${this.currentLevel}!`, BobColor.green);
        }
    }

    // ─── VS Garbage system ───────────────────────────────────────────

    public gotVSGarbageFromOtherPlayer(amount: number): void {
        this.garbageWaitForPiecesSetCount += 3;
        if (this.garbageWaitForPiecesSetCount > 4) this.garbageWaitForPiecesSetCount = 4;

        if (this.room.multiplayer_GarbageScaleByDifficulty) {
            const name = this.getCurrentDifficulty().name;
            if (name === "Beginner") amount = Math.floor(amount * 0.5);
            else if (name === "Easy") amount = Math.floor(amount * 0.75);
            else if (name === "Hard") amount = Math.floor(amount * 1.5);
            else if (name === "Insane") amount = Math.floor(amount * 2.0);
        }

        this.queuedVSGarbageAmountFromOtherPlayer += amount;
        if (this.room.multiplayer_GarbageLimit > 0 && this.queuedVSGarbageAmountFromOtherPlayer > this.room.multiplayer_GarbageLimit) {
            this.queuedVSGarbageAmountFromOtherPlayer = this.room.multiplayer_GarbageLimit;
        }

        this.emit('garbageReceived', amount);
        this.emit('announcement', `Got VS Garbage: ${amount}`);
    }

    public queueVSGarbageToSend(amount: number): void {
        amount = Math.floor(amount * this.room.multiplayer_GarbageMultiplier);

        if (this.room.multiplayer_GarbageScaleByDifficulty) {
            const name = this.getCurrentDifficulty().name;
            if (name === "Beginner") amount = Math.floor(amount * 2.0);
            else if (name === "Easy") amount = Math.floor(amount * 1.5);
            else if (name === "Hard") amount = Math.floor(amount * 0.75);
            else if (name === "Insane") amount = Math.floor(amount * 0.5);
        }

        // Negate queued incoming garbage first
        if (this.queuedVSGarbageAmountFromOtherPlayer > 0) {
            if (amount >= this.queuedVSGarbageAmountFromOtherPlayer) {
                this.emit('announcement', `Negated VS Garbage: ${this.queuedVSGarbageAmountFromOtherPlayer}`);
                amount -= this.queuedVSGarbageAmountFromOtherPlayer;
                this.queuedVSGarbageAmountFromOtherPlayer = 0;
            } else {
                this.emit('announcement', `Negated VS Garbage: ${amount}`);
                this.queuedVSGarbageAmountFromOtherPlayer -= amount;
                amount = 0;
            }
        }

        if (amount > 0) {
            this.queuedVSGarbageAmountToSend += amount;
            this.emit('garbageSent', amount);
            this.emit('announcement', `Sent VS Garbage: ${amount}`);
        }
    }

    public processQueuedGarbageSentFromOtherPlayer(): void {
        if (this.queuedVSGarbageAmountFromOtherPlayer <= 0) return;
        if (this.garbageWaitForPiecesSetCount > 0) {
            this.garbageWaitForPiecesSetCount--;
            return;
        }

        while (this.queuedVSGarbageAmountFromOtherPlayer >= this.grid.getWidth()) {
            this.queuedVSGarbageAmountFromOtherPlayer -= this.grid.getWidth();
            if (this.queuedVSGarbageAmountFromOtherPlayer < 0) this.queuedVSGarbageAmountFromOtherPlayer = 0;

            if (this.currentGameType.vsGarbageDropRule === VSGarbageDropRule.FALL_FROM_CEILING_IN_EVEN_ROWS) {
                this.grid.makeGarbageRowFromCeiling();
                this.moveDownBlocksOverBlankSpaces();
            } else if (this.currentGameType.vsGarbageDropRule === VSGarbageDropRule.RISE_FROM_FLOOR_IN_EVEN_ROWS) {
                this.grid.makeGarbageRowFromFloor();
            }
        }
    }

    public processGarbageRules(): void {
        const rule = this.currentGameType.playingFieldGarbageType;
        if (rule === GarbageType.NONE) return;

        const spawnRule = this.currentGameType.playingFieldGarbageSpawnRule || GarbageSpawnRule.NONE;
        if (spawnRule === GarbageSpawnRule.NONE) return;

        let makeGarbage = false;
        const diff = this.getCurrentDifficulty();

        if (spawnRule === GarbageSpawnRule.TICKS) {
            this.playingFieldGarbageValueCounter += this.ticks();
            if (this.playingFieldGarbageValueCounter > diff.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = 0;
                makeGarbage = true;
            }
        } else if (spawnRule === GarbageSpawnRule.PIECES_MADE) {
            if (this.piecesMadeThisGame >= this.playingFieldGarbageValueCounter + diff.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = this.piecesMadeThisGame;
                makeGarbage = true;
            }
        } else if (spawnRule === GarbageSpawnRule.BLOCKS_CLEARED) {
            if (this.blocksClearedThisGame >= this.playingFieldGarbageValueCounter + diff.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = this.blocksClearedThisGame;
                makeGarbage = true;
            }
        } else if (spawnRule === GarbageSpawnRule.LINES_CLEARED) {
            if (this.linesClearedThisGame >= this.playingFieldGarbageValueCounter + diff.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = this.linesClearedThisGame;
                makeGarbage = true;
            }
        }

        if (makeGarbage) this.grid.makeGarbageRowFromFloor();
    }

    // ─── Utility ─────────────────────────────────────────────────────

    public getCurrentDifficulty(): DifficultyType { return this.currentGameType.difficultyTypes[0]; }
    public getRoom(): Room { return this.room; }
    public ticks(): number { return 1; }
    public cellW(): number { return 8; }
    public cellH(): number { return 8; }
    public gridW(): number { return this.currentGameType.gridWidth; }
    public gridH(): number { return this.currentGameType.gridHeight; }

    public getRandomIntLessThan(max: number, _context?: string): number {
        if (max <= 0) return 0;
        return Math.floor(Math.random() * max);
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
