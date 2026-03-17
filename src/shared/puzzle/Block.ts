import { GameLogic } from "./GameLogic";
import { Grid } from "./Grid";
import { Piece } from "./Piece";
import { BlockType } from "./BlockType";
import { BobColor } from "../BobColor";

export enum AnimationState {
    NORMAL,
    DROPPING,
    TOUCHING_BOTTOM,
    SET_AT_BOTTOM,
    FLASHING,
    REMOVING,
    PRESSURE,
}

export class Block {
    public piece: Piece | null = null;
    public connectedBlocksByPiece: Block[] = [];
    public connectedBlocksByColor: Block[] = [];

    public xInPiece: number = 0;
    public yInPiece: number = 0;
    public xGrid: number = -1;
    public yGrid: number = -1;

    public blockType: BlockType;
    private color: BobColor | null = null;

    public effectAlphaFrom: number = 0.5;
    public effectAlphaTo: number = 0.8;
    public effectFadeTicksPerPhase: number = 1000;
    private effectAlpha: number = 0.5;
    private effectFadeTicks: number = 0;
    private effectFadeInOutToggle: boolean = false;

    public colorFlashFrom: number = 0.0;
    public colorFlashTo: number = 1.0;
    public colorFlashTicksPerPhase: number = 100;
    private colorFlash: number = 0.0;
    private colorFlashTicks: number = 0;
    private colorFlashInOutToggle: boolean = false;

    public overrideAnySpecialBehavior: boolean = false;
    public interpolateSwappingWithX: number = 0;
    public interpolateSwappingWithY: number = 0;
    public swapTicks: number = 0;
    public flashingToBeRemoved: boolean = false;
    public flashingToBeRemovedLightDarkToggle: boolean = false;

    public setInGrid: boolean = false;
    public locking: boolean = false;
    public lockingAnimationFrame: number = 0;
    public lockAnimationFrameTicks: number = 0;

    public fadingOut: boolean = false;
    public disappearingAlpha: number = 1.0;

    public lastScreenX: number = -1;
    public lastScreenY: number = -1;
    public ticksSinceLastMovement: number = 0;

    public slamming: boolean = false;
    private ticksSinceSlam: number = 0;
    public slamX: number = 0;
    public slamY: number = 0;

    public animationState: AnimationState = AnimationState.NORMAL;
    public animationFrame: number = 0;
    public animationFrameTicks: number = 0;
    public animationFrameSpeed: number = 100;

    public counterCount: number = -2;
    public didFlashingColoredDiamond: boolean = false;
    public ateBlocks: boolean = false;
    public direction: number = -1;
    public directionChangeTicksCounter: number = 0;

    public static readonly UP = 0;
    public static readonly LEFT = 1;
    public static readonly DOWN = 2;
    public static readonly RIGHT = 3;

    private customInterpolationTicks: number = -1;

    public popping: boolean = false;
    public panic: boolean = false;

    public connectedUp: boolean = false;
    public connectedDown: boolean = false;
    public connectedLeft: boolean = false;
    public connectedRight: boolean = false;

    public connectedUpRight: boolean = false;
    public connectedDownRight: boolean = false;
    public connectedUpLeft: boolean = false;
    public connectedDownLeft: boolean = false;

    constructor(public game: GameLogic, public grid: Grid, blockType: BlockType) {
        this.blockType = blockType;
        if (blockType.colors.length > 0) {
            this.color = blockType.colors[Math.floor(Math.random() * blockType.colors.length)];
        }
    }

    public getColor(): BobColor | null {
        return this.blockType.specialColor || this.color;
    }

    public setColor(c: BobColor | null): void {
        this.color = c;
    }

    public update(): void {
        const ticks = this.game.ticks();
        this.ticksSinceLastMovement += ticks;

        if (this.slamming) {
            this.ticksSinceSlam += ticks;
            if (this.ticksSinceSlam >= 100) this.slamming = false;
        }

        if (this.locking) {
            this.lockAnimationFrameTicks += ticks;
            if (this.lockAnimationFrameTicks > 20) {
                this.lockAnimationFrameTicks = 0;
                if (this.lockingAnimationFrame < 8) this.lockingAnimationFrame++;
                else { this.lockingAnimationFrame = 0; this.locking = false; }
            }
        }

        if (this.fadingOut) {
            this.disappearingAlpha -= ticks * 0.005;
            if (this.disappearingAlpha <= 0) {
                this.disappearingAlpha = 0;
                this.fadingOut = false;
                this.game.fadingOutBlocks = this.game.fadingOutBlocks.filter(b => b !== this);
                return;
            }
        }

        if (this.popping && this.animationFrame === -1) {
            this.popping = false;
            if (this.blockType.ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID.length > 0) {
                const randomIndex = this.game.getRandomIntLessThan(this.blockType.ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID.length, "Block::update");
                this.blockType = this.game.currentGameType.getBlockTypeByUUID(this.blockType.ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID[randomIndex]);
            }
        }

        this.animationFrameTicks -= ticks;
        if (this.animationFrameTicks <= 0) {
            if (this.animationFrame >= 0) {
                this.animationFrameTicks = this.animationFrameSpeed;
                this.animationFrame++;
            } else if (this.animationFrame === -1) {
                this.animationFrame++;
                this.animationFrameTicks = this.animationFrameSpeed;
            }
        }

        if (this.blockType.pacJarType) {
            this.directionChangeTicksCounter += ticks;
            if (this.directionChangeTicksCounter > this.blockType.ticksToChangeDirection) {
                this.directionChangeTicksCounter = 0;
                this.direction = (this.direction + 1) % 4;
            }
        }

        if (this.blockType.pacmanType && !this.ateBlocks && !this.fadingOut) {
            if (this.setInGrid) {
                this.ateBlocks = true;
                this.customInterpolationTicks = 1000;
                const x = this.xGrid; const y = this.yGrid;
                if (this.direction === Block.UP) {
                    for (let yy = y; yy >= 0; yy--) { const b = this.grid.get(x, yy); if (b) this.grid.removeBlock(b, true, true); }
                } else if (this.direction === Block.DOWN) {
                    for (let yy = y; yy < this.grid.getHeight(); yy++) { const b = this.grid.get(x, yy); if (b) this.grid.removeBlock(b, true, true); }
                } else if (this.direction === Block.LEFT) {
                    for (let xx = x; xx >= 0; xx--) { const b = this.grid.get(xx, y); if (b) this.grid.removeBlock(b, true, true); }
                } else if (this.direction === Block.RIGHT) {
                    for (let xx = x; xx < this.grid.getWidth(); xx++) { const b = this.grid.get(xx, y); if (b) this.grid.removeBlock(b, true, true); }
                }
                this.grid.removeBlock(this, true, true);
                this.game.manuallyApplyGravityWithoutChainChecking();
            } else {
                this.directionChangeTicksCounter += ticks;
                if (this.directionChangeTicksCounter > this.blockType.ticksToChangeDirection) {
                    this.directionChangeTicksCounter = 0;
                    this.direction = (this.direction + 1) % 4;
                }
            }
        }

        if (this.blockType.removeAllBlocksOfColorOnFieldBlockIsSetOn && !this.ateBlocks && !this.fadingOut) {
            if (this.setInGrid) {
                if (this.yGrid < this.grid.getHeight() - 1) {
                    const a = this.grid.get(this.xGrid, this.yGrid + 1);
                    if (a && a.getColor() && !a.blockType.removeAllBlocksOfColorOnFieldBlockIsSetOn && !a.blockType.changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor) {
                        const targetColor = a.getColor();
                        for (let y = 0; y < this.grid.getHeight(); y++) {
                            for (let x = 0; x < this.grid.getWidth(); x++) {
                                const b = this.grid.get(x, y);
                                if (b && b !== this && b.getColor() === targetColor) this.grid.removeBlock(b, true, true);
                            }
                        }
                    }
                }
                this.grid.removeBlock(this, true, true);
                this.game.manuallyApplyGravityWithoutChainChecking();
                this.ateBlocks = true;
            }
        }

        if (this.blockType.changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor && !this.didFlashingColoredDiamond && !this.fadingOut) {
            if (this.setInGrid) {
                if (this.yGrid < this.grid.getHeight() - 1) {
                    const a = this.grid.get(this.xGrid, this.yGrid + 1);
                    if (a && a.getColor() && a.getColor() !== this.getColor() && !a.blockType.removeAllBlocksOfColorOnFieldBlockIsSetOn && !a.blockType.changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor) {
                        const targetColor = a.getColor();
                        const myColor = this.getColor();
                        for (let y = 0; y < this.grid.getHeight(); y++) {
                            for (let x = 0; x < this.grid.getWidth(); x++) {
                                const b = this.grid.get(x, y);
                                if (b && b !== this && b.getColor() === targetColor) b.setColor(myColor);
                            }
                        }
                    }
                }
                this.grid.removeBlock(this, true, true);
                this.game.manuallyApplyGravityWithoutChainChecking();
                this.didFlashingColoredDiamond = true;
            }
        }

        // Effect alpha fading
        this.effectFadeTicks += ticks;
        if (this.effectFadeTicks > this.effectFadeTicksPerPhase) {
            this.effectFadeTicks = 0;
            this.effectFadeInOutToggle = !this.effectFadeInOutToggle;
        }
        this.effectAlpha = this.effectFadeInOutToggle ?
            this.effectAlphaFrom + (this.effectAlphaTo - this.effectAlphaFrom) * (this.effectFadeTicks / this.effectFadeTicksPerPhase) :
            this.effectAlphaTo - (this.effectAlphaTo - this.effectAlphaFrom) * (this.effectFadeTicks / this.effectFadeTicksPerPhase);

        // Color flashing
        this.colorFlashTicks += ticks;
        if (this.colorFlashTicks > this.colorFlashTicksPerPhase) {
            this.colorFlashTicks = 0;
            this.colorFlashInOutToggle = !this.colorFlashInOutToggle;
        }
        this.colorFlash = this.colorFlashInOutToggle ?
            this.colorFlashFrom + (this.colorFlashTo - this.colorFlashFrom) * (this.colorFlashTicks / this.colorFlashTicksPerPhase) :
            this.colorFlashTo - (this.colorFlashTo - this.colorFlashFrom) * (this.colorFlashTicks / this.colorFlashTicksPerPhase);
    }

    public breakConnectionsInPiece(): void {
        this.connectedBlocksByPiece = [];
    }
}
