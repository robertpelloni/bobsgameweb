import { Block } from "./Block";
import { BlockType } from "./BlockType";
import { GameLogic } from "./GameLogic";
import { Grid } from "./Grid";
import { PieceType } from "./PieceType";
import { GamePlayMode } from "./GameType";

export enum RotationType { SRS, SEGA, NES, GB, DTET }

export class BlockOffset {
    constructor(public x: number = 0, public y: number = 0) {}
}

export class Rotation {
    public blockOffsets: BlockOffset[] = [];
    public add(b: BlockOffset): void { this.blockOffsets.push(b); }
    public fromGrid(grid: number[][]): void {
        this.blockOffsets = [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] === 1) this.blockOffsets.push(new BlockOffset(x, y));
            }
        }
    }
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
    public pieceType: PieceType;
    public holdingBlock: Block | null = null;

    constructor(public game: GameLogic, public grid: Grid, pieceType: PieceType, blockTypes: BlockType[] | any) {
        this.pieceType = pieceType;
        const bts = Array.isArray(blockTypes) ? blockTypes : [BlockType.emptyBlockType];
        
        const numBlocks = pieceType.rotationSet.rotations[0].blockOffsets.length;
        for (let b = 0; b < numBlocks; b++) {
            const bt = bts[Math.floor(Math.random() * bts.length)];
            this.blocks.push(new Block(game, grid, bt));
        }
        this.setRotation(0);
    }

    public init(): void {
        this.blocks.forEach(b => b.setRandomBlockTypeColor());
    }

    public setRotation(rot: number): void {
        this.currentRotation = rot % this.pieceType.rotationSet.size();
        const r = this.pieceType.rotationSet.get(this.currentRotation);
        r.blockOffsets.forEach((o, i) => {
            if (this.blocks[i]) {
                this.blocks[i].xInPiece = o.x;
                this.blocks[i].yInPiece = o.y;
            }
        });
    }

    public rotateCW(): void { this.setRotation(this.currentRotation + 1); }
    public rotateCCW(): void { this.setRotation(this.currentRotation + this.pieceType.rotationSet.size() - 1); }

    public getWidth(): number {
        const r = this.pieceType.rotationSet.get(this.currentRotation);
        return Math.max(...r.blockOffsets.map(o => o.x)) + 1;
    }

    public getHeight(): number {
        const r = this.pieceType.rotationSet.get(this.currentRotation);
        return Math.max(...r.blockOffsets.map(o => o.y)) + 1;
    }

    // Parity with Java: Rotation Set Generators
    public static get4BlockIRotationSet(type: RotationType): RotationSet {
        const rs = new RotationSet("4 Block I");
        if (type === RotationType.SRS) {
            { const r = new Rotation(); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(2, 0)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 2)); rs.add(r); }
        } else {
            // SEGA, NES, GB, DTET...
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(0, 2)); r.add(new BlockOffset(0, 3)); rs.add(r); }
            { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(2, 0)); r.add(new BlockOffset(3, 0)); rs.add(r); }
        }
        return rs;
    }

    public static get4BlockORotationSet(): RotationSet {
        const rs = new RotationSet("4 Block O");
        const r = new Rotation();
        r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1));
        rs.add(r);
        return rs;
    }

    public static get4BlockTRotationSet(type: RotationType): RotationSet {
        const rs = new RotationSet("4 Block T");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 0)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 0)); rs.add(r); }
        return rs;
    }

    public static get4BlockSRotationSet(type: RotationType): RotationSet {
        const rs = new RotationSet("4 Block S");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(-1, -1)); rs.add(r); }
        return rs;
    }

    public static get4BlockZRotationSet(type: RotationType): RotationSet {
        const rs = new RotationSet("4 Block Z");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, -1)); rs.add(r); }
        return rs;
    }

    public static get4BlockJRotationSet(type: RotationType): RotationSet {
        const rs = new RotationSet("4 Block J");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
        return rs;
    }

    public static get4BlockLRotationSet(type: RotationType): RotationSet {
        const rs = new RotationSet("4 Block L");
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(1, -1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(-1, 0)); r.add(new BlockOffset(1, 0)); r.add(new BlockOffset(-1, 1)); rs.add(r); }
        { const r = new Rotation(); r.add(new BlockOffset(0, 0)); r.add(new BlockOffset(0, -1)); r.add(new BlockOffset(0, 1)); r.add(new BlockOffset(-1, -1)); rs.add(r); }
        return rs;
    }
}
