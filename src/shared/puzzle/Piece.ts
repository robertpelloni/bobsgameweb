import { Block } from "./Block";
import { GameLogic } from "./GameLogic";
import { Grid } from "./Grid";
import { PieceType } from "./PieceType";
import { BlockType } from "./BlockType";

export class BlockOffset {
    constructor(public x: number, public y: number) {}
}

export class Rotation {
    public blockOffsets: BlockOffset[] = [];
    public add(b: BlockOffset): void {
        this.blockOffsets.push(b);
    }
}

export class RotationSet {
    public name: string = "";
    public rotations: Rotation[] = [];
    constructor(name: string = "") {
        this.name = name;
    }
    public add(r: Rotation): void {
        this.rotations.push(r);
    }
    public size(): number { return this.rotations.length; }
    public get(i: number): Rotation { return this.rotations[i]; }
}

export enum RotationType {
    SRS,
    SEGA,
    NES,
    GB,
    DTET,
}

export class Piece {
    public game: GameLogic;
    public grid: Grid;
    public pieceType: PieceType;
    public blockType: BlockType;
    public blocks: Block[] = [];

    public xGrid: number = 0;
    public yGrid: number = 0;
    public currentRotation: number = 0;
    public setInGrid: boolean = false;

    public cursorAlphaFrom: number = 0.3;
    public cursorAlphaTo: number = 1.0;
    public cursorFadeTicksPerPhase: number = 200;
    public cursorAlpha: number = 0.3;
    private cursorFadeTicks: number = 0;
    private cursorFadeInOutToggle: boolean = false;

    public ghostAlphaFrom: number = 0.5;
    public ghostAlphaTo: number = 0.8;
    public ghostFadeTicksPerPhase: number = 200;
    public ghostAlpha: number = 0.5;
    private ghostFadeTicks: number = 0;
    private ghostFadeInOutToggle: boolean = false;

    public holdingBlock: Block | null = null;
    public overrideAnySpecialBehavior: boolean = false;
    public piecesSetSinceThisPieceSet: number = 0;

    constructor(game: GameLogic, grid: Grid, pieceType: PieceType, blockType: BlockType) {
        this.game = game;
        this.grid = grid;
        this.pieceType = pieceType;
        this.blockType = blockType;
    }

    public init(): void {
        const rs = this.getRotationSet();
        if (rs && rs.rotations.length > 0) {
            const rot = rs.rotations[0];
            for (const bo of rot.blockOffsets) {
                const b = new Block(this.game, this.grid, this, this.blockType, this.blockType.colors[0]);
                b.xInPiece = bo.x;
                b.yInPiece = bo.y;
                this.blocks.push(b);
            }
        }
    }

    public update(): void {
        this.cursorFadeTicks += this.game.ticks();
        if (this.cursorFadeTicks > this.cursorFadeTicksPerPhase) { this.cursorFadeTicks = 0; this.cursorFadeInOutToggle = !this.cursorFadeInOutToggle; }
        this.cursorAlpha = this.cursorFadeInOutToggle ? this.cursorAlphaFrom + (this.cursorFadeTicks / this.cursorFadeTicksPerPhase) * (this.cursorAlphaTo - this.cursorAlphaFrom) : this.cursorAlphaTo - (this.cursorFadeTicks / this.cursorFadeTicksPerPhase) * (this.cursorAlphaTo - this.cursorAlphaFrom);

        this.ghostFadeTicks += this.game.ticks();
        if (this.ghostFadeTicks > this.ghostFadeTicksPerPhase) { this.ghostFadeTicks = 0; this.ghostFadeInOutToggle = !this.ghostFadeInOutToggle; }
        this.ghostAlpha = this.ghostFadeInOutToggle ? this.ghostAlphaFrom + (this.ghostFadeTicks / this.ghostFadeTicksPerPhase) * (this.ghostAlphaTo - this.ghostAlphaFrom) : this.ghostAlphaTo - (this.ghostFadeTicks / this.ghostFadeTicksPerPhase) * (this.ghostAlphaTo - this.ghostAlphaFrom);

        for (const b of this.blocks) b.update();
        if (this.holdingBlock) this.holdingBlock.update();
    }

    public rotateCW(): void {
        const rs = this.getRotationSet();
        if (!rs) return;
        this.currentRotation = (this.currentRotation + 1) % rs.rotations.length;
        this.applyRotation();
    }

    public rotateCCW(): void {
        const rs = this.getRotationSet();
        if (!rs) return;
        this.currentRotation = (this.currentRotation - 1 + rs.rotations.length) % rs.rotations.length;
        this.applyRotation();
    }

    private applyRotation(): void {
        const rs = this.getRotationSet();
        if (!rs) return;
        const rot = rs.rotations[this.currentRotation];
        for (let i = 0; i < this.blocks.length && i < rot.blockOffsets.length; i++) {
            this.blocks[i].xInPiece = rot.blockOffsets[i].x;
            this.blocks[i].yInPiece = rot.blockOffsets[i].y;
        }
    }

    public renderAsCurrentPiece(renderer: any, x: number, y: number): void {
        const w = this.grid.cellW();
        const h = this.grid.cellH();
        if (this.game.currentGameType!.gameMode === "STACK" && this.game.currentGameType!.stackCursorType === "ONE_BLOCK_PICK_UP") {
            y -= h / 3;
        }

        if (this.game.currentGameType!.gameMode === "DROP") {
            if (this.game.pieceSetAtBottom === false) {
                this.grid.renderGhostPiece(renderer, this);
            }
            this.render(renderer, x, y);
        }

        if (this.game.currentGameType!.currentPieceRule_OutlineBlockAtZeroZero) {
            this.renderOutlineBlockZeroZero(renderer, x, y, this.cursorAlpha, false);
        }

        if (this.game.currentGameType!.currentPieceOutlineFirstBlockRegardlessOfPosition) {
            this.renderOutlineFirstBlock(renderer, x, y, this.cursorAlpha, false);
        }

        if (this.game.currentGameType!.gameMode === "STACK" && this.game.currentGameType!.stackCursorType === "ONE_BLOCK_PICK_UP") {
            if (this.holdingBlock) {
                this.holdingBlock.render(renderer, x, y, 1.0, 1.0, true, false);
            }
        }

        if (this.game.currentGameType!.gameMode === "STACK") {
            for (let i = 0; i < this.getNumBlocksInCurrentRotation() && i < this.blocks.length; i++) {
                const b = this.blocks[i];
                const bx = x + b.xInPiece * w + b.xInPiece * this.game.currentGameType!.gridPixelsBetweenColumns;
                const by = y + b.yInPiece * h + b.yInPiece * this.game.currentGameType!.gridPixelsBetweenRows;
                this.drawOutlineBox(renderer, bx, by, this.cursorAlpha);
            }
        }
    }

    public render(renderer: any, x: number, y: number): void {
        for (let i = 0; i < this.getNumBlocksInCurrentRotation() && i < this.blocks.length; i++) {
            const b = this.blocks[i];
            b.render(renderer, x + b.xInPiece * this.grid.cellW(), y + b.yInPiece * this.grid.cellH(), 1.0, 1.0, true, false);
        }
    }

    public renderGhost(renderer: any, x: number, y: number, alpha: number): void {
        for (let i = 0; i < this.getNumBlocksInCurrentRotation() && i < this.blocks.length; i++) {
            const b = this.blocks[i];
            renderer.fillRect(x + b.xInPiece * this.grid.cellW(), y + b.yInPiece * this.grid.cellH(), this.grid.cellW(), this.grid.cellH(), 0x000000, 1.0);
            b.render(renderer, x + b.xInPiece * this.grid.cellW(), y + b.yInPiece * this.grid.cellH(), this.ghostAlpha * alpha, 1.0, false, true);
        }
        if (this.game.currentGameType!.currentPieceRule_OutlineBlockAtZeroZero) this.renderOutlineBlockZeroZero(renderer, x, y, (this.ghostAlpha / 2) * alpha, true);
        if (this.game.currentGameType!.currentPieceOutlineFirstBlockRegardlessOfPosition) this.renderOutlineFirstBlock(renderer, x, y, (this.ghostAlpha / 2) * alpha, true);
    }

    public renderOutlineFirstBlock(renderer: any, x: number, y: number, alpha: number, asGhost: boolean): void {
        if (this.blocks.length === 0) return;
        const b = this.blocks[0];
        const bx = x + b.xInPiece * this.grid.cellW();
        const by = y + b.yInPiece * this.grid.cellH();
        this.drawOutlineBox(renderer, bx, by, alpha);
    }

    public renderOutlineBlockZeroZero(renderer: any, x: number, y: number, alpha: number, asGhost: boolean): void {
        for (let i = 0; i < this.getNumBlocksInCurrentRotation() && i < this.blocks.length; i++) {
            const b = this.blocks[i];
            if (b.xInPiece === 0 && b.yInPiece === 0) {
                const bx = x + b.xInPiece * this.grid.cellW();
                const by = y + b.yInPiece * this.grid.cellH();
                this.drawOutlineBox(renderer, bx, by, alpha);
            }
        }
    }

    private drawOutlineBox(renderer: any, bx: number, by: number, a: number): void {
        const w = this.grid.cellW();
        const h = this.grid.cellH();
        for (let p = 0; p < 3; p++) {
            renderer.fillRect(bx, by - p, w, 1, 0xffffff, a);
            renderer.fillRect(bx, by + h + p - 1, w, 1, 0xffffff, a);
            renderer.fillRect(bx - p, by, 1, h, 0xffffff, a);
            renderer.fillRect(bx + w + p - 1, by, 1, h, 0xffffff, a);
        }
    }

    public static get2BlockRotateAround00RotationSet(): RotationSet {
        const rotations = new RotationSet("2 Block Rotate Around 0,0");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get2BlockBottomLeftAlwaysFilledRotationSet(): RotationSet {
        const rotations = new RotationSet("2 Block BottomLeft Always Filled");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(0, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(0, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get1BlockCursorRotationSet(): RotationSet {
        const rotations = new RotationSet("1 Block Cursor");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get2BlockHorizontalCursorRotationSet(): RotationSet {
        const rotations = new RotationSet("2 Block Horizontal Cursor");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get2BlockVerticalCursorRotationSet(): RotationSet {
        const rotations = new RotationSet("2 Block Vertical Cursor");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockHorizontalCursorRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block Horizontal Cursor");
        {
            const r = new Rotation();
            r.add(new BlockOffset(-1, 0));
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockVerticalCursorRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block Vertical Cursor");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get4BlockCursorRotationSet(): RotationSet {
        const rotations = new RotationSet("4 Block Cursor");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(0, 1));
            r.add(new BlockOffset(1, 1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockVerticalRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block Vertical Swap");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(0, -2));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, -2));
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(0, -2));
            r.add(new BlockOffset(0, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockHorizontalRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block Horizontal Swap");
        {
            const r = new Rotation();
            r.add(new BlockOffset(-1, 0));
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(-1, 0));
            r.add(new BlockOffset(0, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(-1, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockTRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block T");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 1));
            r.add(new BlockOffset(1, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, -1));
            r.add(new BlockOffset(-1, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(-1, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 1));
            r.add(new BlockOffset(1, -1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockLRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block L");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, -1));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(-1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 1));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 1));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockJRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block J");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 1));
            r.add(new BlockOffset(-1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 1));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, -1));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockIRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block I");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(-1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, 1));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 0));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockCRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block C");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, 1));
            r.add(new BlockOffset(-1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 0));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(0, 1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get3BlockDRotationSet(): RotationSet {
        const rotations = new RotationSet("3 Block D");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, -1));
            r.add(new BlockOffset(1, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(-1, 1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 1));
            r.add(new BlockOffset(-1, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(-1, 1));
            r.add(new BlockOffset(1, -1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get4BlockORotationSet(): RotationSet {
        const rotations = new RotationSet("4 Block O");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(1, -1));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(1, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(0, 0));
            rotations.add(r);
        }
        {
            const r = new Rotation();
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(0, -1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get4BlockSolidRotationSet(): RotationSet {
        const rotations = new RotationSet("4 Block Solid");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(1, -1));
            rotations.add(r);
        }
        return rotations;
    }

    public static get9BlockSolidRotationSet(): RotationSet {
        const rotations = new RotationSet("9 Block Solid");
        {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            r.add(new BlockOffset(1, 0));
            r.add(new BlockOffset(2, 0));
            r.add(new BlockOffset(0, -1));
            r.add(new BlockOffset(1, -1));
            r.add(new BlockOffset(2, -1));
            r.add(new BlockOffset(0, -2));
            r.add(new BlockOffset(1, -2));
            r.add(new BlockOffset(2, -2));
            rotations.add(r);
        }
        return rotations;
    }

    public static get4BlockIRotationSet(type: RotationType): RotationSet {
        let name = "4 Block I";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rotations = new RotationSet(name);

        if (type === RotationType.SRS || type === RotationType.DTET || type === RotationType.SEGA) {
            if (type === RotationType.SRS || type === RotationType.SEGA) {
                const r = new Rotation();
                r.add(new BlockOffset(-2, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            if (type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(-2, 1));
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 2));
                rotations.add(r);
            }
            if (type === RotationType.SRS || type === RotationType.DTET) {
                {
                    const r = new Rotation();
                    r.add(new BlockOffset(1, 1));
                    r.add(new BlockOffset(0, 1));
                    r.add(new BlockOffset(-1, 1));
                    r.add(new BlockOffset(-2, 1));
                    rotations.add(r);
                }
                {
                    const r = new Rotation();
                    r.add(new BlockOffset(-1, 2));
                    r.add(new BlockOffset(-1, 1));
                    r.add(new BlockOffset(-1, 0));
                    r.add(new BlockOffset(-1, -1));
                    rotations.add(r);
                }
            }
            if (type === RotationType.SEGA) {
                {
                    const r = new Rotation();
                    r.add(new BlockOffset(1, 0));
                    r.add(new BlockOffset(0, 0));
                    r.add(new BlockOffset(-1, 0));
                    r.add(new BlockOffset(-2, 0));
                    rotations.add(r);
                }
                {
                    const r = new Rotation();
                    r.add(new BlockOffset(0, 2));
                    r.add(new BlockOffset(0, 1));
                    r.add(new BlockOffset(0, 0));
                    r.add(new BlockOffset(0, -1));
                    rotations.add(r);
                }
            }
        }
        if (type === RotationType.GB) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(2, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, -2));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(2, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, -2));
                rotations.add(r);
            }
        }
        if (type === RotationType.NES) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(-2, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, -2));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(-2, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, -2));
                rotations.add(r);
            }
        }
        return rotations;
    }

    public static get4BlockJRotationSet(type: RotationType): RotationSet {
        let name = "4 Block J";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rotations = new RotationSet(name);

        if (type === RotationType.SRS) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, -1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, -1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES || type === RotationType.DTET) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            if (type === RotationType.GB || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(-1, -1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(1, -1));
                rotations.add(r);
            }
        }
        return rotations;
    }

    public static get4BlockLRotationSet(type: RotationType): RotationSet {
        let name = "4 Block L";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rotations = new RotationSet(name);

        if (type === RotationType.SRS) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(1, -1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(-1, -1));
                rotations.add(r);
            }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES || type === RotationType.DTET) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(-1, -1));
                rotations.add(r);
            }
            if (type === RotationType.GB || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(-1, -1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
        }
        return rotations;
    }

    public static get4BlockSRotationSet(type: RotationType): RotationSet {
        let name = "4 Block S";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rotations = new RotationSet(name);

        if (type === RotationType.SRS || type === RotationType.DTET) {
            if (type === RotationType.SRS) {
                const r = new Rotation();
                r.add(new BlockOffset(1, -1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            if (type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(-1, -1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(-1, -1));
                rotations.add(r);
            }
            if (type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, -1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            if (type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
        }
        return rotations;
    }

    public static get4BlockTRotationSet(type: RotationType): RotationSet {
        let name = "4 Block T";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rotations = new RotationSet(name);

        if (type === RotationType.SRS) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES || type === RotationType.DTET) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            if (type === RotationType.GB || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
        }
        return rotations;
    }

    public static get4BlockZRotationSet(type: RotationType): RotationSet {
        let name = "4 Block Z";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rotations = new RotationSet(name);

        if (type === RotationType.SRS || type === RotationType.DTET) {
            if (type === RotationType.SRS) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, -1));
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                rotations.add(r);
            } else if (type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(1, -1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES) {
            {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(1, 1));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(1, -1));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, 1));
                rotations.add(r);
            }
            if (type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(0, -1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(-1, 1));
                rotations.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(1, 1));
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(-1, 0));
                rotations.add(r);
            }
            if (type === RotationType.SEGA || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(1, 0));
                r.add(new BlockOffset(1, -1));
                rotations.add(r);
            }
            if (type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 1));
                r.add(new BlockOffset(-1, 0));
                r.add(new BlockOffset(0, 0));
                r.add(new BlockOffset(0, -1));
                rotations.add(r);
            }
        }
        return rotations;
    }

    public getNumBlocksInCurrentRotation(): number {
        const rs = this.getRotationSet();
        if (!rs) return 0;
        return rs.rotations[this.currentRotation].blockOffsets.length;
    }

    public getWidth(): number {
        const rs = this.getRotationSet();
        if (!rs) return 1;
        let minX = 10, maxX = -10;
        for (const bo of rs.rotations[this.currentRotation].blockOffsets) {
            minX = Math.min(minX, bo.x); maxX = Math.max(maxX, bo.x);
        }
        return maxX - minX + 1;
    }

    public getLowestOffsetX(): number {
        const rs = this.getRotationSet();
        if (!rs) return 0;
        let minX = 10;
        for (const bo of rs.rotations[this.currentRotation].blockOffsets) minX = Math.min(minX, bo.x);
        return minX;
    }

    public getLowestOffsetY(): number {
        const rs = this.getRotationSet();
        if (!rs) return 0;
        let minY = 10;
        for (const bo of rs.rotations[this.currentRotation].blockOffsets) minY = Math.min(minY, bo.y);
        return minY;
    }

    private getRotationSet(): RotationSet | null {
        return this.pieceType.rotationSet;
    }
}
