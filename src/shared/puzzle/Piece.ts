import { Block } from "./Block";
import { BlockType } from "./BlockType";
import { GameLogic } from "./GameLogic";
import { Grid } from "./Grid";
import { PieceType } from "./PieceType";
import { GameType } from "./GameType";

export enum RotationType { SRS, SEGA, NES, GB, DTET }

export class BlockOffset {
    constructor(public x: number = 0, public y: number = 0) {}
}

export class Rotation {
    public blockOffsets: BlockOffset[] = [];
    public add(b: BlockOffset): void { this.blockOffsets.push(b); }
}

export class RotationSet {
    public rotations: Rotation[] = [];
    constructor(public name: string) {}
    public add(r: Rotation): void { this.rotations.push(r); }
    public size(): number { return this.rotations.length; }
    public get(i: number): Rotation { return this.rotations[i]; }
    public clear(): void { this.rotations = []; }
}

export class Piece {
    public currentRotation: number = 0;
    public xGrid: number = 0;
    public yGrid: number = 0;
    public blocks: Block[] = [];

    public cursorAlphaFrom: number = 0.3;
    public cursorAlphaTo: number = 1.0;
    public cursorFadeTicksPerPhase: number = 200;
    private cursorAlpha: number = 0.3;
    private cursorFadeTicks: number = 0;
    private cursorFadeInOutToggle: boolean = false;

    public ghostAlphaFrom: number = 0.5;
    public ghostAlphaTo: number = 0.8;
    public ghostFadeTicksPerPhase: number = 200;
    private ghostAlpha: number = 0.5;
    private ghostFadeTicks: number = 0;
    private ghostFadeInOutToggle: boolean = false;

    public holdingBlock: Block | null = null;
    public pieceType: PieceType;
    public overrideAnySpecialBehavior: boolean = false;
    public piecesSetSinceThisPieceSet: number = 0;
    public setInGrid: boolean = false;

    constructor(public game: GameLogic, public grid: Grid, pieceType: PieceType, blockTypes: BlockType[] | BlockType | any) {
        this.pieceType = pieceType;
        
        let bts: BlockType[] = [];
        if (Array.isArray(blockTypes)) {
            bts = blockTypes;
        } else if (blockTypes instanceof BlockType) {
            bts = [blockTypes];
        } else {
            // GameType.BlockTypes enum logic
            if (blockTypes === 0) { // NORMAL
                bts = game.currentGameType.getNormalBlockTypes(game.getCurrentDifficulty());
            } else if (blockTypes === 1) { // GARBAGE
                bts = game.currentGameType.getGarbageBlockTypes(game.getCurrentDifficulty());
            }
        }

        let maxNumBlocks = 0;
        if (pieceType.rotationSet && pieceType.rotationSet.size() > 0) {
            for (let i = 0; i < pieceType.rotationSet.size(); i++) {
                maxNumBlocks = Math.max(maxNumBlocks, pieceType.rotationSet.get(i).blockOffsets.length);
            }
        } else {
            maxNumBlocks = 1;
        }

        for (let b = 0; b < maxNumBlocks; b++) {
            const bt = bts.length > 0 ? bts[Math.floor(Math.random() * bts.length)] : BlockType.emptyBlockType;
            const block = new Block(game, grid, bt);
            block.piece = this;
            this.blocks.push(block);
        }
        
        this.setRotation(0);
    }

    public init(): void {
        for (const b of this.blocks) b.setRandomBlockTypeColor();
        this.setPieceBlockConnections();
    }

    public setPieceBlockConnections(): void {
        for (const b of this.blocks) {
            b.connectedBlocksByPiece = this.blocks.filter(other => other !== b);
        }
    }

    public getNumBlocksInCurrentRotation(): number {
        return this.pieceType.rotationSet.get(this.currentRotation).blockOffsets.length;
    }

    public update(): void {
        for (const b of this.blocks) b.update();

        // Handle alpha fading
        this.cursorFadeTicks += this.game.ticks();
        if (this.cursorFadeTicks > this.cursorFadeTicksPerPhase) {
            this.cursorFadeTicks = 0;
            this.cursorFadeInOutToggle = !this.cursorFadeInOutToggle;
        }
        this.cursorAlpha = this.cursorFadeInOutToggle ? 
            this.cursorAlphaFrom + (this.cursorAlphaTo - this.cursorAlphaFrom) * (this.cursorFadeTicks / this.cursorFadeTicksPerPhase) :
            this.cursorAlphaTo - (this.cursorAlphaTo - this.cursorAlphaFrom) * (this.cursorFadeTicks / this.cursorFadeTicksPerPhase);

        this.ghostFadeTicks += this.game.ticks();
        if (this.ghostFadeTicks > this.ghostFadeTicksPerPhase) {
            this.ghostFadeTicks = 0;
            this.ghostFadeInOutToggle = !this.ghostFadeInOutToggle;
        }
        this.ghostAlpha = this.ghostFadeInOutToggle ? 
            this.ghostAlphaFrom + (this.ghostAlphaTo - this.ghostAlphaFrom) * (this.ghostFadeTicks / this.ghostFadeTicksPerPhase) :
            this.ghostAlphaTo - (this.ghostAlphaTo - this.ghostAlphaFrom) * (this.ghostFadeTicks / this.ghostFadeTicksPerPhase);
    }

    public rotateCW(): void {
        this.currentRotation = (this.currentRotation + 1) % this.pieceType.rotationSet.size();
        this.updateBlockOffsets();
    }

    public rotateCCW(): void {
        this.currentRotation = (this.currentRotation + this.pieceType.rotationSet.size() - 1) % this.pieceType.rotationSet.size();
        this.updateBlockOffsets();
    }

    public setRotation(r: number): void {
        this.currentRotation = r % this.pieceType.rotationSet.size();
        this.updateBlockOffsets();
    }

    private updateBlockOffsets(): void {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        for (let i = 0; i < rs.blockOffsets.length; i++) {
            if (i < this.blocks.length) {
                this.blocks[i].xInPiece = rs.blockOffsets[i].x;
                this.blocks[i].yInPiece = rs.blockOffsets[i].y;
            }
        }
    }

    public getWidth(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minX = 10, maxX = -10;
        for (const bo of rs.blockOffsets) {
            minX = Math.min(minX, bo.x);
            maxX = Math.max(maxX, bo.x);
        }
        return maxX - minX + 1;
    }

    public getHeight(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minY = 10, maxY = -10;
        for (const bo of rs.blockOffsets) {
            minY = Math.min(minY, bo.y);
            maxY = Math.max(maxY, bo.y);
        }
        return maxY - minY + 1;
    }

    public getLowestOffsetX(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minX = 10;
        for (const bo of rs.blockOffsets) minX = Math.min(minX, bo.x);
        return minX;
    }

    public getHighestOffsetX(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let maxX = -10;
        for (const bo of rs.blockOffsets) maxX = Math.max(maxX, bo.x);
        return maxX;
    }

    public getLowestOffsetY(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minY = 10;
        for (const bo of rs.blockOffsets) minY = Math.min(minY, bo.y);
        return minY;
    }

    public getHighestOffsetY(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let maxY = -10;
        for (const bo of rs.blockOffsets) maxY = Math.max(maxY, bo.y);
        return maxY;
    }

    public setBlocksSlamming(screenX: number, screenY: number): void {
        for (const b of this.blocks) {
            b.slamming = true;
            b.slamX = screenX + b.xInPiece * this.game.cellW();
            b.slamY = screenY + b.yInPiece * this.game.cellH();
        }
    }

    // Static Rotation Set methods
    
    public static get2BlockRotateAround00RotationSet(): RotationSet {
        const rs = new RotationSet("2 Block Rotate Around 0,0");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        return rs;
    }

    public static get2BlockBottomLeftAlwaysFilledRotationSet(): RotationSet {
        const rs = new RotationSet("2 Block Bottom Left Always Filled");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        return rs;
    }

    public static get1BlockCursorRotationSet(): RotationSet {
        const rs = new RotationSet("1 Block Cursor");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); rs.add(r); }
        return rs;
    }

    public static get2BlockHorizontalCursorRotationSet(): RotationSet {
        const rs = new RotationSet("2 Block Horizontal Cursor");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get2BlockVerticalCursorRotationSet(): RotationSet {
        const rs = new RotationSet("2 Block Vertical Cursor");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        return rs;
    }

    public static get3BlockHorizontalCursorRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block Horizontal Cursor");
        { const r = new Rotation(); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockVerticalCursorRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block Vertical Cursor");
        { const r = new Rotation(); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        return rs;
    }

    public static get4BlockCursorRotationSet(): RotationSet {
        const rs = new RotationSet("4 Block Cursor");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        return rs;
    }

    public static get3BlockVerticalRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block Vertical Swap");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, -2)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, -2)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, -2)); r.add(new BlockOffset(0, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockHorizontalRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block Horizontal Swap");
        { const r = new Rotation(); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockTRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block T");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(-1, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(1, -1)); rs.add(r); }
        return rs;
    }

    public static get3BlockLRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block L");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockJRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block J");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockIRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block I");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockCRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block C");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get3BlockDRotationSet(): RotationSet {
        const rs = new RotationSet("3 Block D");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        return rs;
    }

    public static get4BlockORotationSet(): RotationSet {
        const rs = new RotationSet("4 Block O");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        return rs;
    }

    public static get4BlockSolidRotationSet(): RotationSet {
        return Piece.get4BlockORotationSet();
    }

    public static get9BlockSolidRotationSet(): RotationSet {
        const rs = new RotationSet("9 Block Solid");
        const r = new Rotation();
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) r.add(new BlockOffset(x, y));
        rs.add(r);
        return rs;
    }

    public static get4BlockIRotationSet(type: RotationType): RotationSet {
        let name = "4 Block I";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rs = new RotationSet(name);

        if (type === RotationType.SRS || type === RotationType.DTET || type === RotationType.SEGA) {
            if (type === RotationType.SRS || type === RotationType.SEGA) {
                const r = new Rotation();
                r.add(new BlockOffset(-2, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0));
                rs.add(r);
            }
            if (type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(-2, 1)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1));
                rs.add(r);
            }
            {
                const r = new Rotation();
                r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 2));
                rs.add(r);
            }
            if (type === RotationType.SRS || type === RotationType.DTET) {
                { const r = new Rotation(); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(-2, 1)); rs.add(r); }
                { const r = new Rotation(); r.add(new BlockOffset(-1, 2)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, -1)); rs.add(r); }
            }
            if (type === RotationType.SEGA) {
                { const r = new Rotation(); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-2, 0)); rs.add(r); }
                { const r = new Rotation(); r.add(new BlockOffset(0, 2)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
            }
        }
        if (type === RotationType.GB) {
            { const r = new Rotation(); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(2, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, -2)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(2, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, -2)); rs.add(r); }
        }
        if (type === RotationType.NES) {
            { const r = new Rotation(); r.add(new BlockOffset(-2, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, -2)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-2, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, -2)); rs.add(r); }
        }
        return rs;
    }

    public static get4BlockJRotationSet(type: RotationType): RotationSet {
        let name = "4 Block J";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rs = new RotationSet(name);

        if (type === RotationType.SRS) {
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES || type === RotationType.DTET) {
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(-1, 0));
                rs.add(r);
            }
            if (type === RotationType.GB || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, -1));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(1, -1)); rs.add(r); }
        }
        return rs;
    }

    public static get4BlockLRotationSet(type: RotationType): RotationSet {
        let name = "4 Block L";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rs = new RotationSet(name);

        if (type === RotationType.SRS) {
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, -1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(-1, -1)); rs.add(r); }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES || type === RotationType.DTET) {
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(-1, -1));
                rs.add(r);
            }
            if (type === RotationType.GB || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(-1, -1));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        }
        return rs;
    }

    public static get4BlockSRotationSet(type: RotationType): RotationSet {
        let name = "4 Block S";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rs = new RotationSet(name);

        if (type === RotationType.SRS || type === RotationType.DTET) {
            if (type === RotationType.SRS) {
                const r = new Rotation();
                r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0));
                rs.add(r);
            }
            if (type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES) {
            { const r = new Rotation(); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, -1));
                rs.add(r);
            }
            if (type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1));
                rs.add(r);
            }
            if (type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, 1));
                rs.add(r);
            }
        }
        return rs;
    }

    public static get4BlockTRotationSet(type: RotationType): RotationSet {
        let name = "4 Block T";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rs = new RotationSet(name);

        if (type === RotationType.SRS) {
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES || type === RotationType.DTET) {
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 1));
                rs.add(r);
            }
            if (type === RotationType.GB || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(-1, 0));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        }
        return rs;
    }

    public static get4BlockZRotationSet(type: RotationType): RotationSet {
        let name = "4 Block Z";
        if (type === RotationType.DTET) name += " (DTET)";
        if (type === RotationType.SRS) name += " (SRS)";
        if (type === RotationType.SEGA) name += " (SEGA)";
        if (type === RotationType.NES) name += " (NES)";
        if (type === RotationType.GB) name += " (GB)";
        const rs = new RotationSet(name);

        if (type === RotationType.SRS || type === RotationType.DTET) {
            if (type === RotationType.SRS) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, -1)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0));
                rs.add(r);
            } else if (type === RotationType.DTET) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        }
        if (type === RotationType.SEGA || type === RotationType.GB || type === RotationType.NES) {
            { const r = new Rotation(); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(1, -1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1));
                rs.add(r);
            }
            if (type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, 1));
                rs.add(r);
            }
            { const r = new Rotation(); r.add(new BlockOffset(1, 1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
            if (type === RotationType.SEGA || type === RotationType.NES) {
                const r = new Rotation();
                r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, -1));
                rs.add(r);
            }
            if (type === RotationType.GB) {
                const r = new Rotation();
                r.add(new BlockOffset(-1, 1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1));
                rs.add(r);
            }
        }
        return rs;
    }
}
