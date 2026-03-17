import { Block } from "./Block";
import { BlockType } from "./BlockType";
import { GameLogic } from "./GameLogic";
import { Grid } from "./Grid";
import { PieceType } from "./PieceType";

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

    constructor(public game: GameLogic, public grid: Grid, pieceType: PieceType, blockTypes: BlockType[] | BlockType) {
        this.pieceType = pieceType;
        const bts = Array.isArray(blockTypes) ? blockTypes : [blockTypes];
        const rs = pieceType.rotationSet.get(0);
        for (const bo of rs.blockOffsets) {
            const bt = bts[Math.floor(Math.random() * bts.length)];
            const b = new Block(game, grid, bt);
            b.piece = this;
            b.xInPiece = bo.x; b.yInPiece = bo.y;
            this.blocks.push(b);
        }
    }

    public init(): void {
        this.initColors();
        this.setPieceBlockConnections();
    }

    public initColors(): void {
        if (this.pieceType.color) {
            for (const b of this.blocks) {
                if (b.getColor() === null) b.setColor(this.pieceType.color);
            }
        }
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
        // Handle alpha fading
        this.cursorFadeTicks += this.game.ticks();
        if (this.cursorFadeTicks > this.cursorFadeTicksPerPhase) {
            this.cursorFadeTicks = 0;
            this.cursorFadeInOutToggle = !this.cursorFadeInOutToggle;
        }
        this.cursorAlpha = this.cursorFadeInOutToggle ? 
            this.cursorAlphaFrom + (this.cursorAlphaTo - this.cursorAlphaFrom) * (this.cursorFadeTicks / this.cursorFadeTicksPerPhase) :
            this.cursorAlphaTo - (this.cursorAlphaTo - this.cursorAlphaFrom) * (this.cursorFadeTicks / this.cursorFadeTicksPerPhase);

        for (const b of this.blocks) b.update();
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
        for (let i = 0; i < this.blocks.length; i++) {
            this.blocks[i].xInPiece = rs.blockOffsets[i].x;
            this.blocks[i].yInPiece = rs.blockOffsets[i].y;
        }
    }

    public getWidth(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minX = 0, maxX = 0;
        for (const bo of rs.blockOffsets) {
            minX = Math.min(minX, bo.x);
            maxX = Math.max(maxX, bo.x);
        }
        return maxX - minX + 1;
    }

    public getHeight(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minY = 0, maxY = 0;
        for (const bo of rs.blockOffsets) {
            minY = Math.min(minY, bo.y);
            maxY = Math.max(maxY, bo.y);
        }
        return maxY - minY + 1;
    }

    public getLowestOffsetX(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minX = 0;
        for (const bo of rs.blockOffsets) minX = Math.min(minX, bo.x);
        return minX;
    }

    public getLowestOffsetY(): number {
        const rs = this.pieceType.rotationSet.get(this.currentRotation);
        let minY = 0;
        for (const bo of rs.blockOffsets) minY = Math.min(minY, bo.y);
        return minY;
    }

    public static get4BlockIRotationSet(type: number): RotationSet {
        const rs = new RotationSet("I");
        const r0 = new Rotation(); r0.add(new BlockOffset(0, 0)); r0.add(new BlockOffset(-1, 0)); r0.add(new BlockOffset(1, 0)); r0.add(new BlockOffset(2, 0)); rs.add(r0);
        const r1 = new Rotation(); r1.add(new BlockOffset(1, 0)); r1.add(new BlockOffset(1, -1)); r1.add(new BlockOffset(1, 1)); r1.add(new BlockOffset(1, 2)); rs.add(r1);
        const r2 = new Rotation(); r2.add(new BlockOffset(0, 1)); r2.add(new BlockOffset(-1, 1)); r2.add(new BlockOffset(1, 1)); r2.add(new BlockOffset(2, 1)); rs.add(r2);
        const r3 = new Rotation(); r3.add(new BlockOffset(0, 0)); r3.add(new BlockOffset(0, -1)); r3.add(new BlockOffset(0, 1)); r3.add(new BlockOffset(0, 2)); rs.add(r3);
        return rs;
    }

    public static get4BlockORotationSet(): RotationSet {
        const rs = new RotationSet("O");
        const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r);
        return rs;
    }

    public static get4BlockTRotationSet(type: number): RotationSet {
        const rs = new RotationSet("T");
        const r0 = new Rotation(); r0.add(new BlockOffset(0, 0)); r0.add(new BlockOffset(-1, 0)); r0.add(new BlockOffset(1, 0)); r0.add(new BlockOffset(0, -1)); rs.add(r0);
        const r1 = new Rotation(); r1.add(new BlockOffset(0, 0)); r1.add(new BlockOffset(0, -1)); r1.add(new BlockOffset(0, 1)); r1.add(new BlockOffset(1, 0)); rs.add(r1);
        const r2 = new Rotation(); r2.add(new BlockOffset(0, 0)); r2.add(new BlockOffset(-1, 0)); r2.add(new BlockOffset(1, 0)); r2.add(new BlockOffset(0, 1)); rs.add(r2);
        const r3 = new Rotation(); r3.add(new BlockOffset(0, 0)); r3.add(new BlockOffset(0, -1)); r3.add(new BlockOffset(0, 1)); r3.add(new BlockOffset(-1, 0)); rs.add(r3);
        return rs;
    }

    public static get4BlockSRotationSet(type: number): RotationSet {
        const rs = new RotationSet("S");
        const r0 = new Rotation(); r0.add(new BlockOffset(0, 0)); r0.add(new BlockOffset(1, 0)); r0.add(new BlockOffset(0, 1)); r0.add(new BlockOffset(-1, 1)); rs.add(r0);
        const r1 = new Rotation(); r1.add(new BlockOffset(0, 0)); r1.add(new BlockOffset(0, -1)); r1.add(new BlockOffset(1, 0)); r1.add(new BlockOffset(1, 1)); rs.add(r1);
        const r2 = new Rotation(); r2.add(new BlockOffset(0, 0)); r2.add(new BlockOffset(-1, 0)); r2.add(new BlockOffset(0, -1)); r2.add(new BlockOffset(1, -1)); rs.add(r2);
        const r3 = new Rotation(); r3.add(new BlockOffset(0, 0)); r3.add(new BlockOffset(0, 1)); r3.add(new BlockOffset(-1, 0)); r3.add(new BlockOffset(-1, -1)); rs.add(r3);
        return rs;
    }

    public static get4BlockZRotationSet(type: number): RotationSet {
        const rs = new RotationSet("Z");
        const r0 = new Rotation(); r0.add(new BlockOffset(0, 0)); r0.add(new BlockOffset(-1, 0)); r0.add(new BlockOffset(0, 1)); r0.add(new BlockOffset(1, 1)); rs.add(r0);
        const r1 = new Rotation(); r1.add(new BlockOffset(0, 0)); r1.add(new BlockOffset(0, 1)); r1.add(new BlockOffset(1, 0)); r1.add(new BlockOffset(1, -1)); rs.add(r1);
        const r2 = new Rotation(); r2.add(new BlockOffset(0, 0)); r2.add(new BlockOffset(1, 0)); r2.add(new BlockOffset(0, -1)); r2.add(new BlockOffset(-1, -1)); rs.add(r2);
        const r3 = new Rotation(); r3.add(new BlockOffset(0, 0)); r3.add(new BlockOffset(0, -1)); r3.add(new BlockOffset(-1, 0)); r3.add(new BlockOffset(-1, 1)); rs.add(r3);
        return rs;
    }

    public static get4BlockJRotationSet(type: number): RotationSet {
        const rs = new RotationSet("J");
        const r0 = new Rotation(); r0.add(new BlockOffset(0, 0)); r0.add(new BlockOffset(-1, 0)); r0.add(new BlockOffset(1, 0)); r0.add(new BlockOffset(-1, -1)); rs.add(r0);
        const r1 = new Rotation(); r1.add(new BlockOffset(0, 0)); r1.add(new BlockOffset(0, -1)); r1.add(new BlockOffset(0, 1)); r1.add(new BlockOffset(1, -1)); rs.add(r1);
        const r2 = new Rotation(); r2.add(new BlockOffset(0, 0)); r2.add(new BlockOffset(-1, 0)); r2.add(new BlockOffset(1, 0)); r2.add(new BlockOffset(1, 1)); rs.add(r2);
        const r3 = new Rotation(); r3.add(new BlockOffset(0, 0)); r3.add(new BlockOffset(0, -1)); r3.add(new BlockOffset(0, 1)); r3.add(new BlockOffset(-1, 1)); rs.add(r3);
        return rs;
    }

    public static get4BlockLRotationSet(type: number): RotationSet {
        const rs = new RotationSet("L");
        const r0 = new Rotation(); r0.add(new BlockOffset(0, 0)); r0.add(new BlockOffset(-1, 0)); r0.add(new BlockOffset(1, 0)); r0.add(new BlockOffset(1, -1)); rs.add(r0);
        const r1 = new Rotation(); r1.add(new BlockOffset(0, 0)); r1.add(new BlockOffset(0, -1)); r1.add(new BlockOffset(0, 1)); r1.add(new BlockOffset(1, 1)); rs.add(r1);
        const r2 = new Rotation(); r2.add(new BlockOffset(0, 0)); r2.add(new BlockOffset(-1, 0)); r2.add(new BlockOffset(1, 0)); r2.add(new BlockOffset(-1, 1)); rs.add(r2);
        const r3 = new Rotation(); r3.add(new BlockOffset(0, 0)); r3.add(new BlockOffset(0, -1)); r3.add(new BlockOffset(0, 1)); r3.add(new BlockOffset(-1, -1)); rs.add(r3);
        return rs;
    }
}
