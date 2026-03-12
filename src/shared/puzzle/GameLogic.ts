import { Grid } from "./Grid";
import { Piece } from "./Piece";
import { GameType, DifficultyType, MovementType, GameMode, CursorType, ScoreType, VSGarbageRule, GarbageSpawnRule } from "./GameType";
import { PieceType } from "./PieceType";
import { BlockType } from "./BlockType";
import { Block } from "./Block";
import { BobColor } from "../BobColor";

// Mock GameSequence since it's not implemented yet
export class GameSequence {
    public name: string = "";
    public gameTypes: GameType[] = [];
    public currentDifficultyName: string = "Normal";
    public randomizeSequence: boolean = false;
}

export class GameLogic {
    public currentGameSequence: GameSequence | null = null;
    public currentGameType: GameType | null = null;
    public gameTypeRandomBag: GameType[] = [];
    public grid: Grid;

    public blockWidth: number = 1;
    public blockHeight: number = 1;

    public static aboveGridBuffer: number = 5;

    public won: boolean = false;
    public lost: boolean = false;
    public died: boolean = false;
    public complete: boolean = false;
    public didInit: boolean = false;

    private firstInit: boolean = true;
    private waitingForStart: boolean = true;
    private waitingForReady: boolean = true;
    private playedReadySound: boolean = false;
    private readyTicksCounter: number = 0;

    private startedDeathSequence: boolean = false;
    private startedWinSequence: boolean = false;
    private startedLoseSequence: boolean = false;
    private creditScreenInitialized: boolean = false;

    public gameSpeed: number = 0.0;
    public currentLineDropSpeedTicks: number = 0;
    public currentStackRiseSpeedTicks: number = 0;
    public lockDelayTicksCounter: number = 0;
    public lineDropTicksCounter: number = 0;
    public spawnDelayTicksCounter: number = 0;
    public lineClearDelayTicksCounter: number = 0;
    public moveDownLineTicksCounter: number = 0;

    private currentTotalYLockDelay: number = 0;
    private adjustedMaxLockDelayTicks: number = 0;
    private adjustedSpawnDelayTicksAmount: number = 0;
    private currentFloorMovements: number = 0;

    private stackRiseTicksCounter: number = 0;
    private stopStackRiseTicksCounter: number = 0;
    private manualStackRiseTicksCounter: number = 0;
    private manualStackRiseSoundToggle: number = 0;

    private timesToFlashScreenQueue: number = 0;
    private flashScreenTicksCounter: number = 0;
    private flashScreenOnOffToggle: boolean = false;

    private flashBlocksTicksCounter: number = 0;
    private timesToFlashBlocksQueue: number = 0;
    private removeBlocksTicksCounter: number = 0;
    private timesToFlashBlocks: number = 20;
    private flashBlockSpeedTicks: number = 30;
    private flashScreenSpeedTicks: number = 50;
    private flashScreenTimesPerLevel: number = 4;

    public currentPiece: Piece | null = null;
    public lastPiece: Piece | null = null;
    public holdPiece: Piece | null = null;
    public nextPieces: Piece[] = [];
    public nextPieceSpecialBuffer: Piece[] = [];

    public lastKnownLevel: number = 0;
    public currentLevel: number = 0;

    public piecesMadeThisGame: number = 0;
    public lastPiecesMadeThisGame: number = 0;
    public blocksClearedThisGame: number = 0;
    public linesClearedThisGame: number = 0;

    public piecesMadeThisLevel: number = 0;
    public blocksClearedThisLevel: number = 0;
    public linesClearedThisLevel: number = 0;

    public blocksMadeTotal: number = 0;
    public piecesMadeTotal: number = 0;
    public piecesPlacedTotal: number = 0;
    public blocksClearedTotal: number = 0;
    public linesClearedTotal: number = 0;

    public timeStarted: number = 0;
    public timeEnded: number = 0;
    public totalTicksPassed: number = 0;

    public currentChain: number = 0;
    public currentCombo: number = 0;
    public comboChainTotal: number = 0;
    public totalCombosMade: number = 0;
    public biggestComboChain: number = 0;

    public currentChainBlocks: Block[] = [];
    public fadingOutBlocks: Block[] = [];

    public pieceSetAtBottom: boolean = false;
    public switchedHoldPieceAlready: boolean = false;
    public forceGravityThisFrame: boolean = false;
    private gravityThisFrame: boolean = false;
    private checkForChainAgainIfNoBlocksPopping: boolean = false;

    public playingFieldX0: number = 0;
    public playingFieldX1: number = 0;
    public playingFieldY0: number = 0;
    public playingFieldY1: number = 0;

    private playingFieldGarbageValueCounter: number = 0;
    public queuedVSGarbageAmountToSend: number = 0;
    private queuedVSGarbageAmountFromOtherPlayer: number = 0;
    private garbageWaitForPiecesSetCount: number = 0;

    private lockInputCountdownTicks: number = 0;
    private canPressRotateCW: boolean = false;
    private canPressRotateCCW: boolean = false;
    private canPressRight: boolean = false;
    private canPressLeft: boolean = false;
    private canPressDown: boolean = false;
    private canPressUp: boolean = false;
    private canPressHoldRaise: boolean = false;
    private canPressSlam: boolean = false;

    private ticksHoldingRotateCW: number = 0;
    private ticksHoldingRotateCCW: number = 0;
    private ticksHoldingRight: number = 0;
    private ticksHoldingLeft: number = 0;
    private ticksHoldingDown: number = 0;
    private ticksHoldingUp: number = 0;
    private ticksHoldingHoldRaise: number = 0;
    private ticksHoldingSlam: number = 0;

    private repeatStartedRotateCW: boolean = false;
    private repeatStartedRotateCCW: boolean = false;
    private repeatStartedHoldRaise: boolean = false;
    private repeatStartedUp: boolean = false;
    private repeatStartedDown: boolean = false;
    private repeatStartedLeft: boolean = false;
    private repeatStartedRight: boolean = false;
    private repeatStartedSlam: boolean = false;

    public player: any = null; // Should be PuzzlePlayer
    public uuid: string = crypto.randomUUID();
    private playingMusic: string = "";
    private playingFastMusic: boolean = false;
    private firstDeath: boolean = false;
    private madeBeginnerStackAnnouncement: boolean = false;

    private extraStage1: boolean = false;
    private extraStage2: boolean = false;
    private extraStage3: boolean = false;
    private extraStage4: boolean = false;

    // Captions would go here, omitting for brevity or implementing simple versions
    public stopCounterCaptionText: string = "Go!";

    constructor() {
        this.grid = new Grid(this);
        this.currentGameSequence = new GameSequence();
    }

    public ticks(): number { return 16; } // Mock value for frame duration

    public getCurrentDifficulty(): DifficultyType {
        if (this.currentGameType && this.currentGameSequence) {
            return this.currentGameType.getDifficultyByName(this.currentGameSequence.currentDifficultyName);
        }
        return GameType.difficulty_NORMAL;
    }

    public setGameType(gameType: GameType): void {
        this.currentGameType = gameType;
    }

    public fillGameTypeRandomBag(): void {
        if (!this.currentGameSequence) return;
        if (this.currentGameSequence.randomizeSequence) {
            let tempBag = [...this.currentGameSequence.gameTypes];
            while (tempBag.length > 0) {
                let i = this.getRandomIntLessThan(tempBag.length, "fillGameTypeRandomBag");
                this.gameTypeRandomBag.push(tempBag[i]);
                tempBag.splice(i, 1);
            }
        } else {
            this.gameTypeRandomBag = [...this.currentGameSequence.gameTypes];
        }
        if (this.gameTypeRandomBag.length > 0 && this.gameTypeRandomBag[0] === this.currentGameType) {
            let first = this.gameTypeRandomBag.shift()!;
            this.gameTypeRandomBag.push(first);
        }
    }

    public getGameTypeFromRandomBag(): GameType | null {
        if (this.gameTypeRandomBag.length === 0) {
            this.fillGameTypeRandomBag();
        }
        return this.gameTypeRandomBag.shift() || null;
    }

    public update(): void {
        if (!this.didInit) this.initGame();
        this.processFrame();
    }

    private initGame(): void {
        if (this.firstInit) {
            this.firstInit = false;
            this.timeStarted = Date.now();
            this.gameSpeed = 0; // getRoom().gameSpeedStart
            if (this.currentGameType) this.adjustedMaxLockDelayTicks = this.currentGameType.maxLockDelayTicks;
        }
        this.didInit = true;
        const next = this.getGameTypeFromRandomBag();
        if (next) this.setGameType(next);

        this.grid.reformat(this.gridW(), this.gridH());
        this.manuallyApplyGravityWithoutChainChecking();
        this.grid.replaceAllBlocksWithNewGameBlocks();
        this.manuallyApplyGravityWithoutChainChecking();

        this.lockDelayTicksCounter = this.adjustedMaxLockDelayTicks;
        const difficulty = this.getCurrentDifficulty();
        this.currentLineDropSpeedTicks = difficulty.initialLineDropSpeedTicks;
        this.currentStackRiseSpeedTicks = difficulty.maxStackRise;
        this.stopStackRiseTicksCounter = 1000;

        this.piecesMadeThisGame = 0;
        this.lastPiecesMadeThisGame = 0;
        this.blocksClearedThisGame = 0;
        this.linesClearedThisGame = 0;

        if (this.currentGameType?.gameMode === "DROP") {
            if (difficulty.randomlyFillGrid) {
                this.grid.randomlyFillGridWithPlayingFieldPieces(difficulty.randomlyFillGridAmount, difficulty.randomlyFillGridStartY);
            }
            this.newRandomPiece();
        } else if (this.currentGameType?.gameMode === "STACK") {
            if (difficulty.randomlyFillGrid) {
                this.grid.buildRandomStackRetainingExistingBlocks(difficulty.randomlyFillGridAmount, difficulty.randomlyFillGridStartY);
            }
            this.spawnPiece(); // Set up cursor
        }
    }

    private processFrame(): void {
        if (this.won) { this.wonSequence(); return; }
        if (this.lost) { this.lostSequence(); return; }
        if (this.died) { this.diedSequence(); return; }
        if (this.complete) { this.creditsSequence(); return; }

        this.totalTicksPassed += this.ticks();
        this.updateSpecialPiecesAndBlocks();

        if (this.currentGameType?.playingFieldGarbageSpawnRule !== "NONE") {
            this.processGarbageRules();
        }
        this.processQueuedGarbageSentFromOtherPlayer();

        this.grid.update();
        // this.grid.scrollBackground();
        // this.doExtraStageEffects();

        this.lockInputCountdownTicks = Math.max(0, this.lockInputCountdownTicks - this.ticks());
        this.lockDelayTicksCounter = Math.max(0, this.lockDelayTicksCounter - this.ticks());
        this.lineDropTicksCounter = Math.max(0, this.lineDropTicksCounter - this.ticks());
        this.lineClearDelayTicksCounter = Math.max(0, this.lineClearDelayTicksCounter - this.ticks());
        this.spawnDelayTicksCounter = Math.max(0, this.spawnDelayTicksCounter - this.ticks());

        if (this.currentGameType?.gameMode === "STACK") this.doStackRiseGame();
        else if (this.currentGameType?.gameMode === "DROP") this.doFallingBlockGame();

        this.moveDownLineTicksCounter += this.ticks();

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
                // this.checkForFastMusic();

                if (!this.detectedChain() && !this.checkForChainAgainIfNoBlocksPopping) {
                    this.currentCombo = 0; this.currentChain = 0; this.comboChainTotal = 0;
                    if (this.currentGameType?.gameMode === "DROP" && this.pieceSetAtBottom) {
                        this.newRandomPiece();
                    }
                    this.calculateScore();
                }
            }
        }
    }

    public doStackGame(): void { this.doStackRiseGame(); }
    public processMovements(): void { this.handleInputs(); }
    public processGravity(): void {
        if (this.currentGameType?.gameMode === "STACK") this.grid.scrollUpStack(this.currentPiece, 1);
        else if (this.currentGameType?.gameMode === "DROP") this.movePiece("DOWN");
    }
    public processLineClears(): void { this.checkForChain(); }
    public processGarbage(): void { this.processGarbageRules(); }
    public holdPiece(): void { this.holdPieceMethod(); }

    public doStackRiseGame(): void {
        this.pieceSetAtBottom = true;
        this.manualStackRiseTicksCounter += this.ticks();

        let stop = false;
        if (this.stopStackRiseTicksCounter > 0) {
            this.stopStackRiseTicksCounter = Math.max(0, this.stopStackRiseTicksCounter - this.ticks());
            this.stopCounterCaptionText = "Stack Wait: " + this.stopStackRiseTicksCounter;
            stop = true;
        }

        if (this.timesToFlashBlocksQueue > 0) {
            this.flashChainBlocks();
            this.stopCounterCaptionText = "Stack Wait: Flash";
            stop = true;
        } else if (this.detectedChain()) {
            this.processChainClears();
            this.stopCounterCaptionText = "Stack Wait: Pop " + this.currentChainBlocks.length;
            stop = true;
        }

        if (this.timesToFlashScreenQueue > 0) {
            this.flashScreen();
            this.stopCounterCaptionText = "Stack Wait: Flash";
            stop = true;
        }

        if (this.grid.continueSwappingBlocks()) {
            this.stopCounterCaptionText = "Stack Wait: Swap";
            stop = true;
        }

        if (!stop) {
            this.stopCounterCaptionText = "Go!";
            this.stackRiseTicksCounter += this.ticks();
            if (this.stackRiseTicksCounter > this.currentStackRiseSpeedTicks) {
                this.stackRiseTicksCounter = 0;
                if (!this.grid.scrollUpStack(this.currentPiece, 1)) {
                    this.died = true;
                }
                if (this.died) {
                    this.stopCounterCaptionText = "Wait: Dead";
                    return;
                }
            }
        }
        this.handleInputs();
    }

    public doFallingBlockGame(): void {
        if (this.timesToFlashBlocksQueue > 0) {
            this.flashChainBlocks();
            return;
        }
        if (this.detectedChain()) {
            this.processChainClears();
            return;
        }
        if (this.timesToFlashScreenQueue > 0) this.flashScreen();

        if (!this.pieceSetAtBottom) {
            this.currentTotalYLockDelay += this.lockDelayTicksCounter;
            // Room limit check omitted for now
            if (this.lineDropTicksCounter === 0 && this.spawnDelayTicksCounter === 0 && this.lineClearDelayTicksCounter === 0) {
                if (this.movePiece("DOWN")) {
                    this.lineDropTicksCounter = this.currentLineDropSpeedTicks;
                }
                if (this.died) return;
            }
            this.handleInputs();
        }
    }

    public manuallyApplyGravityWithoutChainChecking(): void {
        while (this.moveDownBlocksOverBlankSpaces()) {
            this.moveDownLineTicksCounter = this.currentGameType?.gravityRule_ticksToMoveDownBlocksOverBlankSpaces || 200;
        }
    }

    public moveDownBlocksOverBlankSpaces(): boolean {
        if (!this.currentGameType) return false;
        const difficulty = this.getCurrentDifficulty();
        const ignore = this.currentGameType.getBlockTypesToIgnoreWhenMovingDown(difficulty);
        let moved = false;

        if (this.moveDownLineTicksCounter >= this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces || this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce) {
            this.moveDownLineTicksCounter = 0;
            do {
                if (this.currentGameType.chainRule_CheckEntireLine) {
                    moved = this.grid.moveDownLinesAboveBlankLinesOneLine();
                } else if (this.currentGameType.gravityRule_onlyMoveDownDisconnectedBlocks) {
                    moved = this.grid.moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignore);
                } else {
                    moved = this.grid.moveDownAnyBlocksAboveBlankSpacesOneLine(ignore);
                }
            } while (this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce && moved);
        }
        return moved;
    }

    public processChainClears(): void {
        let linesCleared = 0;
        let blocksCleared = 0;

        if (this.currentChainBlocks.length > 0) {
            for (let i = 0; i < this.currentChainBlocks.length; i++) {
                const b = this.currentChainBlocks[i];
                if (!b.overrideAnySpecialBehavior) {
                    if (b.blockType.makePieceTypeWhenCleared_UUID.length > 0) {
                        const uuid = b.blockType.makePieceTypeWhenCleared_UUID[this.getRandomIntLessThan(b.blockType.makePieceTypeWhenCleared_UUID.length, "removeFlashedChainBlocks")];
                        const pt = this.currentGameType?.getPieceTypeByUUID(uuid);
                        if (pt) {
                            const p = new Piece(this, this.grid, pt, BlockType.emptyBlockType);
                            p.init();
                            this.nextPieceSpecialBuffer.push(p);
                        }
                    }
                    if (b.blockType.clearEveryOtherLineOnGridWhenCleared) {
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
            const delay = this.currentGameType?.removingBlocksDelayTicksBetweenEachBlock || 0;

            while (this.currentChainBlocks.length > 0 && (delay === 0 || this.removeBlocksTicksCounter > delay)) {
                this.removeBlocksTicksCounter = 0;
                const a = this.currentChainBlocks.shift()!;
                const connected = this.grid.getConnectedBlocksUpDownLeftRight(a);
                for (const b of connected) {
                    if (b.blockType.ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID.length > 0) {
                        b.popping = true; b.animationFrame = 0;
                        this.checkForChainAgainIfNoBlocksPopping = true;
                    }
                }

                if (this.currentGameType?.chainRule_CheckEntireLine) {
                    for (let i = 0; i < this.currentChainBlocks.length; i++) {
                        const b = this.currentChainBlocks[i];
                        if (b.yGrid === a.yGrid) {
                            this.currentChainBlocks.splice(i, 1);
                            this.grid.removeBlock(b, true, true);
                            blocksCleared++; this.blocksClearedThisGame++; this.blocksClearedThisLevel++; this.blocksClearedTotal++;
                            i = -1;
                        }
                    }
                    linesCleared++; this.linesClearedThisGame++; this.linesClearedThisLevel++; this.linesClearedTotal++;
                }
                this.grid.removeBlock(a, true, true);
                blocksCleared++; this.blocksClearedThisGame++; this.blocksClearedThisLevel++; this.blocksClearedTotal++;
            }
        }

        this.timesToFlashScreenQueue += linesCleared;
        if (this.currentGameType?.chainRule_CheckEntireLine) {
            this.lineClearDelayTicksCounter += linesCleared * (this.currentGameType.lineClearDelayTicksAmountPerLine || 0);
        } else {
            this.lineClearDelayTicksCounter += blocksCleared * (this.currentGameType.lineClearDelayTicksAmountPerBlock || 0);
        }
        this.currentChain = this.currentChainBlocks.length;
    }

    public processGarbageRules(): void {
        if (!this.currentGameType) return;
        let makeGarbage = false;
        const difficulty = this.getCurrentDifficulty();

        if (this.currentGameType.playingFieldGarbageSpawnRule === "TICKS") {
            this.playingFieldGarbageValueCounter += this.ticks();
            if (this.playingFieldGarbageValueCounter > difficulty.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = 0; makeGarbage = true;
            }
        } else if (this.currentGameType.playingFieldGarbageSpawnRule === "PIECES_MADE") {
            if (this.piecesMadeThisGame >= this.playingFieldGarbageValueCounter + difficulty.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = this.piecesMadeThisGame; makeGarbage = true;
            }
        } else if (this.currentGameType.playingFieldGarbageSpawnRule === "BLOCKS_CLEARED") {
            if (this.blocksClearedThisGame >= this.playingFieldGarbageValueCounter + difficulty.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = this.blocksClearedThisGame; makeGarbage = true;
            }
        } else if (this.currentGameType.playingFieldGarbageSpawnRule === "LINES_CLEARED") {
            if (this.linesClearedThisGame >= this.playingFieldGarbageValueCounter + difficulty.playingFieldGarbageSpawnRuleAmount) {
                this.playingFieldGarbageValueCounter = this.linesClearedThisGame; makeGarbage = true;
            }
        }

        if (makeGarbage) this.makeGarbageRowFromFloor();
    }

    public addGarbage(amount: number): void {
        this.garbageWaitForPiecesSetCount = Math.min(4, this.garbageWaitForPiecesSetCount + 3);
        // Scale by difficulty logic omitted for brevity
        this.queuedVSGarbageAmountFromOtherPlayer += amount;
    }

    public sendGarbage(amount: number): void {
        if (this.queuedVSGarbageAmountFromOtherPlayer > 0) {
            if (amount >= this.queuedVSGarbageAmountFromOtherPlayer) {
                amount -= this.queuedVSGarbageAmountFromOtherPlayer;
                this.queuedVSGarbageAmountFromOtherPlayer = 0;
            } else {
                this.queuedVSGarbageAmountFromOtherPlayer -= amount;
                amount = 0;
            }
        }
        if (amount > 0) this.queuedVSGarbageAmountToSend += amount;
    }

    public processQueuedGarbageSentFromOtherPlayer(): void {
        if (this.queuedVSGarbageAmountFromOtherPlayer > 0 && this.garbageWaitForPiecesSetCount === 0) {
            const multiplier = 2;
            while (this.queuedVSGarbageAmountFromOtherPlayer / (this.grid.getWidth() / multiplier) > 0) {
                this.queuedVSGarbageAmountFromOtherPlayer = Math.max(0, this.queuedVSGarbageAmountFromOtherPlayer - this.grid.getWidth());
                if (this.currentGameType?.vsGarbageRule === "FALL_FROM_CEILING_IN_EVEN_ROWS") {
                    this.makeGarbageRowFromCeiling();
                    this.moveDownBlocksOverBlankSpaces();
                } else if (this.currentGameType?.vsGarbageRule === "RISE_FROM_FLOOR_IN_EVEN_ROWS") {
                    this.makeGarbageRowFromFloor();
                }
            }
        }
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

    public handleInputs(): void {
        if (this.lockInputCountdownTicks > 0) return;

        // Reset press flags if not held
        if (!this.player?.ROTATECW_HELD) { this.canPressRotateCW = true; this.ticksHoldingRotateCW = 0; this.repeatStartedRotateCW = false; }
        if (!this.player?.ROTATECCW_HELD) { this.canPressRotateCCW = true; this.ticksHoldingRotateCCW = 0; this.repeatStartedRotateCCW = false; }
        if (!this.player?.RIGHT_HELD) { this.canPressRight = true; this.ticksHoldingRight = 0; this.repeatStartedRight = false; }
        if (!this.player?.LEFT_HELD) { this.canPressLeft = true; this.ticksHoldingLeft = 0; this.repeatStartedLeft = false; }
        if (!this.player?.DOWN_HELD) { this.canPressDown = true; this.ticksHoldingDown = 0; this.repeatStartedDown = false; }
        if (!this.player?.UP_HELD) { this.canPressUp = true; this.ticksHoldingUp = 0; this.repeatStartedUp = false; }
        if (!this.player?.HOLDRAISE_HELD) { this.canPressHoldRaise = true; this.ticksHoldingHoldRaise = 0; this.repeatStartedHoldRaise = false; }
        if (!this.player?.SLAM_HELD) { this.canPressSlam = true; this.ticksHoldingSlam = 0; this.repeatStartedSlam = false; }

        // Repeat logic simplified for brevity
        const repeatCheck = (held: boolean, canPress: boolean, ticks: number, started: boolean) => {
            if (held && ((!started && ticks >= 150) || (started && ticks >= 50))) return true;
            return false;
        };

        if (this.player?.ROTATECW_HELD && repeatCheck(true, this.canPressRotateCW, this.ticksHoldingRotateCW, this.repeatStartedRotateCW)) { this.canPressRotateCW = true; this.ticksHoldingRotateCW = 0; this.repeatStartedRotateCW = true; }
        else this.ticksHoldingRotateCW += this.ticks();
        if (this.player?.ROTATECCW_HELD && repeatCheck(true, this.canPressRotateCCW, this.ticksHoldingRotateCCW, this.repeatStartedRotateCCW)) { this.canPressRotateCCW = true; this.ticksHoldingRotateCCW = 0; this.repeatStartedRotateCCW = true; }
        else this.ticksHoldingRotateCCW += this.ticks();
        if (this.player?.RIGHT_HELD && repeatCheck(true, this.canPressRight, this.ticksHoldingRight, this.repeatStartedRight)) { this.canPressRight = true; this.ticksHoldingRight = 0; this.repeatStartedRight = true; }
        else this.ticksHoldingRight += this.ticks();
        if (this.player?.LEFT_HELD && repeatCheck(true, this.canPressLeft, this.ticksHoldingLeft, this.repeatStartedLeft)) { this.canPressLeft = true; this.ticksHoldingLeft = 0; this.repeatStartedLeft = true; }
        else this.ticksHoldingLeft += this.ticks();
        if (this.player?.DOWN_HELD && repeatCheck(true, this.canPressDown, this.ticksHoldingDown, this.repeatStartedDown)) { this.canPressDown = true; this.ticksHoldingDown = 0; this.repeatStartedDown = true; }
        else this.ticksHoldingDown += this.ticks();
        if (this.player?.UP_HELD && repeatCheck(true, this.canPressUp, this.ticksHoldingUp, this.repeatStartedUp)) { this.canPressUp = true; this.ticksHoldingUp = 0; this.repeatStartedUp = true; }
        else this.ticksHoldingUp += this.ticks();
        if (this.player?.HOLDRAISE_HELD && repeatCheck(true, this.canPressHoldRaise, this.ticksHoldingHoldRaise, this.repeatStartedHoldRaise)) { this.canPressHoldRaise = true; this.ticksHoldingHoldRaise = 0; this.repeatStartedHoldRaise = true; }
        else this.ticksHoldingHoldRaise += this.ticks();
        if (this.player?.SLAM_HELD && repeatCheck(true, this.canPressSlam, this.ticksHoldingSlam, this.repeatStartedSlam)) { this.canPressSlam = true; this.ticksHoldingSlam = 0; this.repeatStartedSlam = true; }
        else this.ticksHoldingSlam += this.ticks();

        // Handle Actions
        if (this.player?.ROTATECW_HELD && this.canPressRotateCW) {
            if (this.currentGameType?.gameMode === "STACK") this.rotatePiece("ROTATE_CLOCKWISE");
            else if (this.currentGameType?.gameMode === "DROP") this.movePiece("ROTATE_CLOCKWISE");
            this.canPressRotateCW = false; this.ticksHoldingRotateCW = 0;
        }
        if (this.player?.ROTATECCW_HELD && this.canPressRotateCCW) {
            if (this.currentGameType?.gameMode === "STACK") this.rotatePiece("ROTATE_COUNTERCLOCKWISE");
            else if (this.currentGameType?.gameMode === "DROP") this.movePiece("ROTATE_COUNTERCLOCKWISE");
            this.canPressRotateCCW = false; this.ticksHoldingRotateCCW = 0;
        }
        if (this.player?.RIGHT_HELD && this.canPressRight) {
            if (this.currentGameType?.gameMode === "STACK") { if (this.currentPiece && this.currentPiece.xGrid < this.grid.getWidth() - this.currentPiece.getWidth()) this.currentPiece.xGrid++; }
            else if (this.currentGameType?.gameMode === "DROP") this.movePiece("RIGHT");
            this.canPressRight = false; this.ticksHoldingRight = 0;
        }
        if (this.player?.LEFT_HELD && this.canPressLeft) {
            if (this.currentGameType?.gameMode === "STACK") { if (this.currentPiece && this.currentPiece.xGrid > 0) this.currentPiece.xGrid--; }
            else if (this.currentGameType?.gameMode === "DROP") this.movePiece("LEFT");
            this.canPressLeft = false; this.ticksHoldingLeft = 0;
        }
        if (this.player?.DOWN_HELD && this.canPressDown) {
            if (this.currentGameType?.gameMode === "STACK") { if (this.currentPiece && this.currentPiece.yGrid < this.grid.getHeight() - (1 + this.currentPiece.getHeight())) this.currentPiece.yGrid++; }
            else if (this.currentGameType?.gameMode === "DROP" && !this.pieceSetAtBottom) {
                if (this.movePiece("DOWN") && (this.player.singleDownLock)) this.lockDelayTicksCounter = 0;
            }
            this.canPressDown = false; this.ticksHoldingDown = 0;
        }
        if (this.player?.UP_HELD && this.canPressUp) {
            if (this.currentGameType?.gameMode === "STACK") { if (this.currentPiece && this.currentPiece.yGrid > 1 + GameLogic.aboveGridBuffer) this.currentPiece.yGrid--; }
            this.canPressUp = false; this.ticksHoldingUp = 0;
        }
        if (this.player?.SLAM_HELD && this.canPressSlam) {
            if (this.currentGameType?.gameMode === "DROP" && !this.pieceSetAtBottom) {
                while (this.movePiece("HARD_DROP")) { if (this.player.slamLock) this.lockDelayTicksCounter = 0; }
                this.grid.shakeSmall();
            }
            this.canPressSlam = false; this.ticksHoldingSlam = 0;
        }
        if (this.player?.HOLDRAISE_HELD && this.canPressHoldRaise) {
            if (this.currentGameType?.gameMode === "DROP") this.holdPieceMethod();
            this.canPressHoldRaise = false; this.ticksHoldingHoldRaise = 0;
        }
        if (this.currentGameType?.gameMode === "STACK" && this.player?.HOLDRAISE_HELD) {
            if (this.manualStackRiseTicksCounter > 7) {
                this.manualStackRiseTicksCounter = 0; this.grid.scrollUpStack(this.currentPiece, 1);
            }
        }
    }

    public spawnPiece(): void {
        if (!this.currentGameType) return;
        if (this.currentGameType.gameMode === "STACK") {
            let pt: PieceType | null = null;
            if (this.currentGameType.stackCursorType === "ONE_BLOCK_PICK_UP") pt = PieceType.oneBlockCursorPieceType;
            else if (this.currentGameType.stackCursorType === "TWO_BLOCK_HORIZONTAL") pt = PieceType.twoBlockHorizontalCursorPieceType;
            else if (this.currentGameType.stackCursorType === "TWO_BLOCK_VERTICAL") pt = PieceType.twoBlockVerticalCursorPieceType;
            else if (this.currentGameType.stackCursorType === "THREE_BLOCK_HORIZONTAL") pt = PieceType.threeBlockHorizontalCursorPieceType;
            else if (this.currentGameType.stackCursorType === "THREE_BLOCK_VERTICAL") pt = PieceType.threeBlockVerticalCursorPieceType;
            else if (this.currentGameType.stackCursorType === "QUAD_BLOCK_ROTATE") pt = PieceType.fourBlockCursorPieceType;

            if (pt) {
                this.currentPiece = new Piece(this, this.grid, pt, BlockType.emptyBlockType);
                this.currentPiece.init();
                this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2) - 1;
                this.currentPiece.yGrid = 7 + GameLogic.aboveGridBuffer;
            }
        }
    }

    public nextPiece(): void { this.newRandomPiece(); }

    public holdPieceMethod(): void {
        if (!this.currentGameType || !this.currentGameType.holdPieceEnabled) return;
        if (this.holdPiece || this.switchedHoldPieceAlready) {
            if (!this.switchedHoldPieceAlready) {
                this.switchedHoldPieceAlready = true;
                const temp = this.holdPiece; this.holdPiece = this.currentPiece; this.currentPiece = temp;
                if (this.currentGameType.resetHoldPieceRotation && this.holdPiece) this.holdPiece.setRotation(0);
                this.setCurrentPieceAtTop();
            }
        } else if (this.currentPiece) {
            this.holdPiece = this.currentPiece;
            if (this.currentGameType.resetHoldPieceRotation) this.holdPiece.setRotation(0);
            this.newRandomPiece();
        }
    }

    public rotatePiece(move: MovementType): void {
        if (!this.currentPiece || !this.currentGameType) return;
        if (this.currentGameType.gameMode === "STACK") {
            if (this.currentGameType.stackCursorType === "ONE_BLOCK_PICK_UP") this.grid.cursorSwapHoldingBlockWithGrid(this.currentPiece);
            else if (this.currentGameType.stackCursorType === "TWO_BLOCK_HORIZONTAL") this.grid.cursorSwapBetweenTwoBlocksHorizontal(this.currentPiece);
            else if (this.currentGameType.stackCursorType === "TWO_BLOCK_VERTICAL") this.grid.cursorSwapBetweenTwoBlocksVertical(this.currentPiece);
            else if (this.currentGameType.stackCursorType === "THREE_BLOCK_HORIZONTAL") this.grid.cursorSwapBetweenThreeBlocksHorizontal(this.currentPiece, move);
            else if (this.currentGameType.stackCursorType === "THREE_BLOCK_VERTICAL") this.grid.cursorSwapBetweenThreeBlocksVertical(this.currentPiece, move);
            else if (this.currentGameType.stackCursorType === "QUAD_BLOCK_ROTATE") this.grid.cursorRotateBlocks(this.currentPiece, move);
        }
    }

    public dropPiece(): void { this.movePiece("HARD_DROP"); }

    public calculateScore(): void { this.updateScore(); }

    public updateScore(): void {
        if (this.piecesMadeThisGame > this.lastPiecesMadeThisGame) {
            this.lastPiecesMadeThisGame = this.piecesMadeThisGame;
            // gameSpeed logic omitted for brevity
        }
        const difficulty = this.getCurrentDifficulty();
        let amount = (this.currentGameType?.scoreTypeAmountPerLevelGained || 4); // simplified multipliers

        let levelUp = false;
        if (this.currentGameType?.scoreType === "LINES_CLEARED") { if (this.linesClearedThisLevel >= amount) levelUp = true; }
        else if (this.currentGameType?.scoreType === "BLOCKS_CLEARED") { if (this.blocksClearedThisLevel >= amount) levelUp = true; }
        else if (this.currentGameType?.scoreType === "PIECES_MADE") { if (this.piecesMadeThisLevel >= amount) levelUp = true; }

        if (levelUp) {
            this.currentLevel++;
            this.levelUp();
        }
    }

    public levelUp(): void {
        this.linesClearedThisLevel = 0; this.piecesMadeThisLevel = 0; this.blocksClearedThisLevel = 0;
        this.lastKnownLevel = this.currentLevel;
        // Decrease lock/spawn delays logic omitted
        this.timesToFlashScreenQueue = this.flashScreenTimesPerLevel;
        this.grid.setRandomWholePieceColors(false, this.currentPiece, this.nextPieces);
        if (this.currentLevel > this.getCurrentDifficulty().creditsLevel) this.complete = true;
    }

    public setReady(): void { this.waitingForReady = true; }
    public setGo(): void { this.waitingForReady = false; }
    public setWin(): void { this.won = true; }
    public setLose(): void { this.lost = true; }
    public setDead(): void { this.died = true; }

    public movePiece(move: MovementType): boolean {
        if (!this.currentPiece) return false;
        const oldX = this.currentPiece.xGrid; const oldY = this.currentPiece.yGrid;
        const oldRot = this.currentPiece.currentRotation;

        if (move === "ROTATE_CLOCKWISE") this.currentPiece.rotateCW();
        else if (move === "ROTATE_COUNTERCLOCKWISE") this.currentPiece.rotateCCW();
        else if (move === "LEFT") this.currentPiece.xGrid--;
        else if (move === "RIGHT") this.currentPiece.xGrid++;
        else if (move === "DOWN" || move === "HARD_DROP") this.currentPiece.yGrid++;
        else if (move === "UP") this.currentPiece.yGrid--;

        if (this.grid.doesPieceFit(this.currentPiece)) {
            this.pieceMoved();
            if (move === "DOWN" || move === "HARD_DROP") this.currentTotalYLockDelay = 0;
            return true;
        } else {
            // Wallkick/climbing logic simplified or omitted for brevity
            this.currentPiece.xGrid = oldX; this.currentPiece.yGrid = oldY;
            this.currentPiece.setRotation(oldRot);
            if (move === "DOWN" || move === "HARD_DROP") {
                if (this.lockDelayTicksCounter === 0) this.setPiece();
            }
            return false;
        }
    }

    private pieceMoved(): void {
        this.lockDelayTicksCounter = this.adjustedMaxLockDelayTicks;
        this.currentPiece!.yGrid++;
        if (!this.grid.doesPieceFit(this.currentPiece!)) { /* touch bottom sound */ }
        this.currentPiece!.yGrid--;
    }

    private setPiece(): void {
        if (!this.currentPiece) return;
        this.grid.setPiece(this.currentPiece);
        this.pieceSetAtBottom = true; this.piecesPlacedTotal++;
        this.lastPiece = this.currentPiece; this.currentPiece = null;
        this.currentFloorMovements = 0; this.currentTotalYLockDelay = 0;
    }

    public newRandomPiece(): void {
        if (!this.currentGameType) return;
        this.pieceSetAtBottom = false;
        while (this.nextPieces.length < this.currentGameType.numberOfNextPiecesToShow + 1) {
            if (this.nextPieceSpecialBuffer.length > 0) this.nextPieces.push(this.nextPieceSpecialBuffer.shift()!);
            else this.nextPieces.push(this.grid.getRandomPiece());
        }
        this.currentPiece = this.nextPieces.shift()!;
        this.setCurrentPieceAtTop();
        if (this.lastPiece) {
            for (const b of this.lastPiece.blocks) {
                if (b.yGrid < GameLogic.aboveGridBuffer && b.yGrid > 0) this.died = true;
            }
        }
        this.switchedHoldPieceAlready = false;
        this.piecesMadeThisGame++; this.piecesMadeThisLevel++; this.piecesMadeTotal++;
    }

    private setCurrentPieceAtTop(): void {
        if (!this.currentPiece) return;
        this.currentPiece.xGrid = Math.floor(this.grid.getWidth() / 2) - Math.floor(this.currentPiece.getWidth() / 2);
        this.currentPiece.yGrid = -2 + GameLogic.aboveGridBuffer;
        if (!this.grid.doesPieceFit(this.currentPiece)) this.died = true;
        this.spawnDelayTicksCounter = this.adjustedSpawnDelayTicksAmount;
        this.lineDropTicksCounter = 0;
    }

    public checkForChain(): void {
        if (!this.grid || !this.currentGameType) return;
        this.currentChainBlocks = [];
        const ignore = this.currentGameType.getBlockTypesToIgnoreWhenCheckingChain(this.getCurrentDifficulty());
        const mustContain = this.currentGameType.getBlockTypesChainMustContain(this.getCurrentDifficulty());
        this.grid.setColorConnections(ignore);

        let toRow = this.grid.getHeight();
        if (this.currentGameType.gameMode === "STACK") toRow = this.grid.getHeight() - 1;

        if (this.currentGameType.chainRule_CheckEntireLine) {
            const lineBlocks = this.grid.checkLines(ignore, mustContain);
            this.addToChainBlocks(lineBlocks);
        }
        if (this.currentGameType.chainRule_AmountPerChain > 0) {
            let chainBlocks: Block[] = [];
            for (let y = 0; y < toRow; y++) {
                for (let x = 0; x < this.grid.getWidth(); x++) {
                    const b = this.grid.get(x, y);
                    if (b && (!ignore.length || !ignore.includes(b.blockType))) {
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
            const breakerBlocks = this.grid.checkBreakerBlocks(toRow, ignore, mustContain);
            this.addToChainBlocks(breakerBlocks);
        }
    }

    public addToChainBlocks(arr: Block[]): void {
        for (const b of arr) if (!this.currentChainBlocks.includes(b)) this.currentChainBlocks.push(b);
    }

    public detectedChain(): boolean { return this.currentChainBlocks.length > 0; }

    public handleNewChain(): void {
        if (this.detectedChain()) {
            if (this.currentCombo === 0) {
                this.currentCombo = 1; this.currentChain = this.currentChainBlocks.length;
            } else {
                this.currentCombo++; this.currentChain = this.currentChainBlocks.length;
                this.comboChainTotal += this.currentChain; this.totalCombosMade++;
                if (this.comboChainTotal > this.biggestComboChain) this.biggestComboChain = this.comboChainTotal;
            }
            for (const b of this.currentChainBlocks) b.flashingToBeRemoved = true;
            if (this.currentGameType?.gameMode === "STACK") {
                this.stopStackRiseTicksCounter += 1000 * this.currentChainBlocks.length;
            }
            this.timesToFlashBlocksQueue = this.timesToFlashBlocks;
        }
    }

    private flashScreen(): void {
        this.flashScreenTicksCounter += this.ticks();
        if (this.flashScreenTicksCounter > this.flashScreenSpeedTicks) {
            this.flashScreenTicksCounter = 0; this.flashScreenOnOffToggle = !this.flashScreenOnOffToggle;
            if (this.flashScreenOnOffToggle) this.timesToFlashScreenQueue--;
        }
    }

    private flashChainBlocks(): void {
        this.flashBlocksTicksCounter += this.ticks();
        if (this.flashBlocksTicksCounter > this.flashBlockSpeedTicks) {
            this.flashBlocksTicksCounter = 0;
            for (const b of this.currentChainBlocks) b.flashingToBeRemovedLightDarkToggle = !b.flashingToBeRemovedLightDarkToggle;
            this.timesToFlashBlocksQueue--;
        }
    }

    private updateSpecialPiecesAndBlocks(): void {
        this.currentPiece?.update(); this.holdPiece?.update();
        for (const p of this.nextPieces) p.update();
        for (const p of this.nextPieceSpecialBuffer) p.update();
        for (const b of this.fadingOutBlocks) b.update();
    }

    private wonSequence(): void { if (!this.startedWinSequence) { this.startedWinSequence = true; } this.updateSpecialPiecesAndBlocks(); }
    private lostSequence(): void { if (!this.startedLoseSequence) { this.startedLoseSequence = true; } this.updateSpecialPiecesAndBlocks(); }
    private diedSequence(): void { if (!this.startedDeathSequence) { this.startedDeathSequence = true; } this.updateSpecialPiecesAndBlocks(); this.grid.doDeathSequence(); }
    private creditsSequence(): void { if (!this.creditScreenInitialized) { this.creditScreenInitialized = true; } }

    public render(renderer: any): void { this.grid.renderBackground(renderer); this.grid.renderBorder(renderer); this.grid.render(renderer); this.renderHoldPiece(renderer); this.renderNextPiece(renderer); this.renderCurrentPiece(renderer); this.grid.renderBlockOutlines(renderer); }
    public renderHoldPiece(renderer: any): void { if (this.holdPiece) { /* render logic */ } }
    public renderNextPiece(renderer: any): void { for (const p of this.nextPieces) { /* render logic */ } }
    public renderCurrentPiece(renderer: any): void { this.currentPiece?.renderAsCurrentPiece(renderer, this.currentPiece.getScreenX(), this.currentPiece.getScreenY()); }

    public cellW(): number { return this.blockWidth + (this.currentGameType?.gridPixelsBetweenColumns || 0); }
    public cellH(): number { return this.blockHeight + (this.currentGameType?.gridPixelsBetweenRows || 0); }
    public gridW(): number { return this.currentGameType?.gridWidth || 10; }
    public gridH(): number { return (this.currentGameType?.gridHeight || 20) + GameLogic.aboveGridBuffer; }
    public getRandomIntLessThan(i: number, s: string): number { return Math.floor(Math.random() * i); }
}
