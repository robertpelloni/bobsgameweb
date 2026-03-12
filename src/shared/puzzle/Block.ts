import { BobColor } from "../BobColor";
import { GameLogic } from "./GameLogic";
import { Grid } from "./Grid";
import { Piece } from "./Piece";
import { BlockType } from "./BlockType";

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
    public game: GameLogic | null = null;
    public grid: Grid | null = null;
    public piece: Piece | null = null;
    public blockType: BlockType;
    public color: BobColor;

    public xGrid: number = -1;
    public yGrid: number = -1;
    public xInPiece: number = 0;
    public yInPiece: number = 0;

    public setInGrid: boolean = false;
    public locking: boolean = false;
    public popping: boolean = false;
    public fadingOut: boolean = false;
    public flashingToBeRemoved: boolean = false;
    public flashingToBeRemovedLightDarkToggle: boolean = false;

    public lastScreenX: number = 0;
    public lastScreenY: number = 0;
    public ticksSinceLastMovement: number = 0;

    public interpolateSwappingWithX: number = 0;
    public interpolateSwappingWithY: number = 0;
    public swapTicks: number = 0;

    public connectedBlocksByColor: Block[] = [];
    public connectedBlocksByPiece: Block[] = [];

    public disappearingAlpha: number = 1.0;

    public lockingAnimationFrame: number = 0;
    public lockAnimationFrameTicks: number = 0;

    public slamming: boolean = false;
    public ticksSinceSlam: number = 0;
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

    public connectedUp: boolean = false;
    public connectedDown: boolean = false;
    public connectedLeft: boolean = false;
    public connectedRight: boolean = false;

    public connectedUpRight: boolean = false;
    public connectedDownRight: boolean = false;
    public connectedUpLeft: boolean = false;
    public connectedDownLeft: boolean = false;

    constructor(game: GameLogic | null, grid: Grid | null, piece: Piece | null, blockType: BlockType, color: BobColor) {
        this.game = game;
        this.grid = grid;
        this.piece = piece;
        this.blockType = blockType;
        this.color = color;
    }

    public update(): void {
        const ticks = this.game?.ticks() || 16;
        this.ticksSinceLastMovement += ticks;

        if (this.slamming) {
            this.ticksSinceSlam += ticks;
            if (this.ticksSinceSlam >= 100) {
                this.slamming = false;
            }
        }

        if (this.locking) {
            this.lockAnimationFrameTicks += ticks;
            if (this.lockAnimationFrameTicks > 20) {
                this.lockAnimationFrameTicks = 0;
                if (this.lockingAnimationFrame < 8) {
                    this.lockingAnimationFrame++;
                } else {
                    this.lockingAnimationFrame = 0;
                    this.locking = false;
                }
            }
        }

        if (this.fadingOut) {
            if (this.disappearingAlpha > 0.0) {
                this.disappearingAlpha -= ticks * 0.005;
            }
            if (this.disappearingAlpha < 0.0) this.disappearingAlpha = 0.0;
            if (this.disappearingAlpha === 0.0) {
                this.fadingOut = false;
                if (this.game) {
                    const idx = this.game.fadingOutBlocks.indexOf(this);
                    if (idx > -1) this.game.fadingOutBlocks.splice(idx, 1);
                }
            }
        }
    }

    public render(renderer: any, screenX: number, screenY: number, a: number, scale: number, interpolate: boolean, ghost: boolean): void {
        if (!this.grid) return;
        let renderColor = this.color;
        if (!renderColor) renderColor = BobColor.white;

        const w = this.grid.cellW() * scale;
        const h = this.grid.cellH() * scale;

        if (this.interpolateSwappingWithX !== 0) {
            const ratio = this.swapTicks / (17 * 6);
            screenX += (this.interpolateSwappingWithX * this.grid.cellW() * ratio);
        }
        if (this.interpolateSwappingWithY !== 0) {
            const ratio = this.swapTicks / (17 * 6);
            screenY += (this.interpolateSwappingWithY * this.grid.cellH() * ratio);
        }

        if (this.flashingToBeRemoved) {
            const flash = Math.sin(Date.now() / 50.0) * 0.5 + 0.5;
            a *= flash;
        }

        renderer.fillRect(screenX, screenY, w, h, renderColor.toInt(), a);
        renderer.strokeRect(screenX, screenY, w, h, 0x000000, 1.0, 1);
    }

    public renderDisappearing(renderer: any): void {
        this.render(renderer, this.getScreenX(), this.getScreenY(), this.disappearingAlpha, 1.0 + (2.0 - (this.disappearingAlpha * 2.0)), true, false);
    }

    public renderOutlines(renderer: any, screenX: number, screenY: number, s: number): void {
        if (!this.grid) return;
        const w = this.grid.cellW() * s;
        const h = this.grid.cellH() * s;

        if (this.setInGrid && !this.fadingOut) {
            const gridAlpha = 1.0;
            const gridOutlineWidth = 2;

            for (let j = 0; j < gridOutlineWidth; j++) {
                const i = j;
                if (this.xGrid - 1 < 0 || this.grid.get(this.xGrid - 1, this.yGrid) === null) renderer.fillRect(screenX - i, screenY, 1, h, 0xffffff, gridAlpha);
                if (this.xGrid + 1 >= this.grid.getWidth() || this.grid.get(this.xGrid + 1, this.yGrid) === null) renderer.fillRect(screenX + w + i, screenY, 1, h, 0xffffff, gridAlpha);
                if (this.yGrid - 1 < 0 || this.grid.get(this.xGrid, this.yGrid - 1) === null) renderer.fillRect(screenX, screenY - i, w, 1, 0xffffff, gridAlpha);
                if (this.yGrid + 1 >= this.grid.getHeight() || this.grid.get(this.xGrid, this.yGrid + 1) === null) renderer.fillRect(screenX, screenY + h + i, w, 1, 0xffffff, gridAlpha);
            }
        }
    }

    public getScreenX(): number {
        if (!this.grid) return 0;
        return this.grid.getXInFBO() + this.xGrid * this.grid.cellW();
    }

    public getScreenY(): number {
        if (!this.grid) return 0;
        return this.grid.getYInFBO() + this.yGrid * this.grid.cellH() + this.grid.scrollPlayingFieldY;
    }

    public getColor(): BobColor { return this.color; }
    public setColor(c: BobColor): void { this.color = c; }

    public breakConnectionsInPiece(): void {
        if (this.piece) {
            const index = this.piece.blocks.indexOf(this);
            if (index > -1) this.piece.blocks.splice(index, 1);
            this.piece = null;
        }
    }
}
