import { Block } from "./Block";
import { Piece } from "./Piece";
import { GameType, DifficultyType, GameMode, GarbageType } from "./GameType";
import { MovementType } from "./MovementType";
import { GameLogic } from "./GameLogic";
import { PieceType } from "./PieceType";
import { BlockType } from "./BlockType";
import { Easing } from "../Easing";
import { BobColor } from "../BobColor";

export class Grid {
    public game: GameLogic;
    public blocks: (Block | null)[][] = [];
    public screenX: number = 0;
    public screenY: number = 0;
    public scrollPlayingFieldY: number = 0;
    public scrollBlockIncrement: number = 100;

    public deadX: number = 0;
    public deadY: number = 0;

    public lastGarbageHoleX: number = 0;
    public garbageHoleDirectionToggle: boolean = true;

    public shakePlayingFieldX: number = 0;
    public shakePlayingFieldY: number = 0;
    public shakePlayingFieldScreenTicksCounter: number = 0;
    public shakePlayingFieldTicksDuration: number = 0;
    public shakePlayingFieldMaxX: number = 0;
    public shakePlayingFieldMaxY: number = 0;
    public shakePlayingFieldTicksPerShake: number = 0;
    public shakePlayingFieldStartTime: number = 0;
    public shakePlayingFieldTicksPerShakeXCounter: number = 0;
    public shakePlayingFieldTicksPerShakeYCounter: number = 0;
    public shakePlayingFieldLeftRightToggle: boolean = false;
    public shakePlayingFieldUpDownToggle: boolean = false;

    public wigglePlayingFieldX: number = 0;
    public wigglePlayingFieldTicks: number = 0;
    public wigglePlayingFieldTicksSpeed: number = 50;
    public wigglePlayingFieldMaxX: number = 2;
    public wigglePlayingFieldLeftRightToggle: boolean = false;

    constructor(game: GameLogic) {
        this.game = game;
    }

    public getArrayOfPiecesOnGrid(): Piece[] {
        const pieces = new Set<Piece>();
        for (let y = 0; y < this.getHeight(); y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b && b.piece) pieces.add(b.piece);
            }
        }
        return Array.from(pieces);
    }

    public getWidth(): number { return this.game.gridW(); }
    public getHeight(): number { return this.game.gridH(); }

    public reformat(w: number, h: number): void {
        this.blocks = Array.from({ length: h }, () => Array(w).fill(null));
    }

    public get(x: number, y: number): Block | null {
        if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) return null;
        return this.blocks[y][x];
    }

    public set(x: number, y: number, b: Block | null): void {
        if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) return;
        this.blocks[y][x] = b;
        if (b) { b.xGrid = x; b.yGrid = y; }
    }

    public add(x: number, y: number, b: Block): void { this.set(x, y, b); }

    public remove(x: number, y: number, destroy: boolean, explode: boolean): Block | null {
        const b = this.get(x, y);
        if (b) {
            this.blocks[y][x] = null;
        }
        return b;
    }

    public removeBlock(b: Block, destroy: boolean, explode: boolean): void {
        this.remove(b.xGrid, b.yGrid, destroy, explode);
    }

    public contains(x: number, y: number): boolean {
        return this.get(x, y) !== null;
    }

    public getNumberOfFilledCells(): number {
        let count = 0;
        for (let y = 0; y < this.getHeight(); y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                if (this.contains(x, y)) count++;
            }
        }
        return count;
    }

    public doesPieceFit(p: Piece, gridX: number = p.xGrid, gridY: number = p.yGrid, rot: number = p.currentRotation): boolean {
        const rs = p.pieceType.rotationSet;
        if (!rs || rot >= rs.size()) return false;
        const r = rs.get(rot);
        for (const bo of r.blockOffsets) {
            const x = gridX + bo.x; const y = gridY + bo.y;
            if (x < 0 || x >= this.getWidth() || y >= this.getHeight()) return false;
            if (y >= 0 && this.get(x, y) !== null) return false;
        }
        return true;
    }

    public setPiece(p: Piece, gridX: number = p.xGrid, gridY: number = p.yGrid): void {
        for (const b of p.blocks) {
            this.add(gridX + b.xInPiece, gridY + b.yInPiece, b);
        }
    }

    public cursorSwapBetweenTwoBlocksHorizontal(cursor: Piece): void {
        const a = this.get(cursor.xGrid, cursor.yGrid);
        const b = this.get(cursor.xGrid + 1, cursor.yGrid);
        if (a && a.interpolateSwappingWithX === 0 && !a.flashingToBeRemoved) {
            if (!b || b.interpolateSwappingWithX === 0) a.interpolateSwappingWithX = 1;
        }
        if (b && b.interpolateSwappingWithX === 0 && !b.flashingToBeRemoved) {
            if (!a || a.interpolateSwappingWithX === 1) b.interpolateSwappingWithX = -1;
        }
    }

    public cursorSwapBetweenTwoBlocksVertical(cursor: Piece): void {
        const a = this.get(cursor.xGrid, cursor.yGrid);
        const b = this.get(cursor.xGrid, cursor.yGrid + 1);
        if (a && a.interpolateSwappingWithY === 0 && !a.flashingToBeRemoved) {
            if (!b || b.interpolateSwappingWithY === 0) a.interpolateSwappingWithY = 1;
        }
        if (b && b.interpolateSwappingWithY === 0 && !b.flashingToBeRemoved) {
            if (!a || a.interpolateSwappingWithY === 1) b.interpolateSwappingWithY = -1;
        }
    }

    public cursorSwapBetweenThreeBlocksHorizontal(cursor: Piece, rotation: MovementType): void {
        const a = this.get(cursor.xGrid - 1, cursor.yGrid);
        const b = this.get(cursor.xGrid, cursor.yGrid);
        const c = this.get(cursor.xGrid + 1, cursor.yGrid);
        if (rotation === MovementType.ROTATE_CLOCKWISE) {
            if (a && a.interpolateSwappingWithX === 0 && !a.flashingToBeRemoved) if (!b || b.interpolateSwappingWithX === 0) a.interpolateSwappingWithX = 1;
            if (b && b.interpolateSwappingWithX === 0 && !b.flashingToBeRemoved) if (!c || c.interpolateSwappingWithX === -2) b.interpolateSwappingWithX = 1;
            if (c && c.interpolateSwappingWithX === 0 && !c.flashingToBeRemoved) if (!a || a.interpolateSwappingWithX === 1) c.interpolateSwappingWithX = -2;
        }
        if (rotation === MovementType.ROTATE_COUNTERCLOCKWISE) {
            if (a && a.interpolateSwappingWithX === 0 && !a.flashingToBeRemoved) if (!c || c.interpolateSwappingWithX === -1) a.interpolateSwappingWithX = 2;
            if (b && b.interpolateSwappingWithX === 0 && !b.flashingToBeRemoved) if (!a || a.interpolateSwappingWithX === 2) b.interpolateSwappingWithX = -1;
            if (c && c.interpolateSwappingWithX === 0 && !c.flashingToBeRemoved) if (!b || b.interpolateSwappingWithX === -1) c.interpolateSwappingWithX = -1;
        }
    }

    public cursorSwapBetweenThreeBlocksVertical(cursor: Piece, rotation: MovementType): void {
        const a = this.get(cursor.xGrid, cursor.yGrid - 1);
        const b = this.get(cursor.xGrid, cursor.yGrid);
        const c = this.get(cursor.xGrid, cursor.yGrid + 1);
        if (rotation === MovementType.ROTATE_CLOCKWISE) {
            if (a && a.interpolateSwappingWithY === 0 && !a.flashingToBeRemoved) if (!b || b.interpolateSwappingWithY === 0) a.interpolateSwappingWithY = 1;
            if (b && b.interpolateSwappingWithY === 0 && !b.flashingToBeRemoved) if (!c || c.interpolateSwappingWithY === -2) b.interpolateSwappingWithY = 1;
            if (c && c.interpolateSwappingWithY === 0 && !c.flashingToBeRemoved) if (!a || a.interpolateSwappingWithY === 1) c.interpolateSwappingWithY = -2;
        }
        if (rotation === MovementType.ROTATE_COUNTERCLOCKWISE) {
            if (a && a.interpolateSwappingWithY === 0 && !a.flashingToBeRemoved) if (!c || c.interpolateSwappingWithY === -1) a.interpolateSwappingWithY = 2;
            if (b && b.interpolateSwappingWithY === 0 && !b.flashingToBeRemoved) if (!a || a.interpolateSwappingWithY === 2) b.interpolateSwappingWithY = -1;
            if (c && c.interpolateSwappingWithY === 0 && !c.flashingToBeRemoved) if (!b || b.interpolateSwappingWithY === -1) c.interpolateSwappingWithY = -1;
        }
    }

    public cursorSwapHoldingBlockWithGrid(cursor: Piece): void {
        const x = cursor.xGrid; const y = cursor.yGrid;
        const gridBlock = this.get(x, y);
        if (gridBlock && gridBlock.flashingToBeRemoved) return;
        const heldBlock = cursor.holdingBlock;
        cursor.holdingBlock = gridBlock;
        if (gridBlock) this.remove(x, y, false, false);
        if (heldBlock) this.add(x, y, heldBlock);
    }

    public cursorRotateBlocks(cursor: Piece, rotation: MovementType): void {
        const x = cursor.xGrid; const y = cursor.yGrid;
        const a = this.get(x, y); const b = this.get(x + 1, y);
        const c = this.get(x, y + 1); const d = this.get(x + 1, y + 1);
        if ((a && a.flashingToBeRemoved) || (b && b.flashingToBeRemoved) || (c && c.flashingToBeRemoved) || (d && d.flashingToBeRemoved)) return;
        
        this.remove(x, y, false, false); this.remove(x + 1, y, false, false);
        this.remove(x, y + 1, false, false); this.remove(x + 1, y + 1, false, false);

        if (rotation === MovementType.ROTATE_CLOCKWISE) {
            if (a) this.add(x + 1, y, a); if (b) this.add(x + 1, y + 1, b);
            if (c) this.add(x, y, c); if (d) this.add(x, y + 1, d);
        } else {
            if (a) this.add(x, y + 1, a); if (b) this.add(x, y, b);
            if (c) this.add(x + 1, y + 1, c); if (d) this.add(x + 1, y, d);
        }
    }

    public moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignore: BlockType[]): boolean {
        let moved = false;
        for (let y = this.getHeight() - 2; y >= 0; y--) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b && !ignore.includes(b.blockType) && this.get(x, y + 1) === null) {
                    this.remove(x, y, false, false);
                    this.add(x, y + 1, b);
                    moved = true;
                }
            }
        }
        return moved;
    }

    public moveDownAnyBlocksAboveBlankSpacesOneLine(ignore: BlockType[]): boolean {
        return this.moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignore);
    }

    public moveDownLinesAboveBlankLinesOneLine(): boolean {
        let moved = false;
        for (let y = this.getHeight() - 2; y >= 0; y--) {
            let isFull = true;
            for (let x = 0; x < this.getWidth(); x++) if (this.get(x, y) === null) { isFull = false; break; }
            if (isFull) {
                let isEmptyBelow = true;
                for (let x = 0; x < this.getWidth(); x++) if (this.get(x, y + 1) !== null) { isEmptyBelow = false; break; }
                if (isEmptyBelow) {
                    for (let x = 0; x < this.getWidth(); x++) {
                        const b = this.remove(x, y, false, false)!;
                        this.add(x, y + 1, b);
                    }
                    moved = true;
                }
            }
        }
        return moved;
    }

    public checkLines(ignore: BlockType[], mustContain: BlockType[]): Block[] {
        const chain: Block[] = [];
        for (let y = 0; y < this.getHeight(); y++) {
            let isFull = true;
            let containsMust = mustContain.length === 0;
            const line: Block[] = [];
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b === null || ignore.includes(b.blockType)) { isFull = false; break; }
                if (!containsMust && mustContain.includes(b.blockType)) containsMust = true;
                line.push(b);
            }
            if (isFull && containsMust) chain.push(...line);
        }
        return chain;
    }

    public setColorConnections(ignore: BlockType[]): void {
        for (let y = 0; y < this.getHeight(); y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b) {
                    b.connectedUp = this.doBlocksMatchColor(b, this.get(x, y - 1), ignore);
                    b.connectedDown = this.doBlocksMatchColor(b, this.get(x, y + 1), ignore);
                    b.connectedLeft = this.doBlocksMatchColor(b, this.get(x - 1, y), ignore);
                    b.connectedRight = this.doBlocksMatchColor(b, this.get(x + 1, y), ignore);
                }
            }
        }
    }

    public doBlocksMatchColor(a: Block, b: Block | null, ignore: BlockType[]): boolean {
        if (!b || ignore.includes(b.blockType)) return false;
        return a.getColor() === b.getColor();
    }

    public recursivelyGetAllMatchingBlocksConnectedToBlockToArrayIfNotInItAlready(b: Block, arr: Block[], ignore: BlockType[]): void {
        if (!arr.includes(b)) arr.push(b);
        for (const n of this.getConnectedBlocksUpDownLeftRight(b)) {
            if (this.doBlocksMatchColor(b, n, ignore) && !arr.includes(n)) {
                this.recursivelyGetAllMatchingBlocksConnectedToBlockToArrayIfNotInItAlready(n, arr, ignore);
            }
        }
    }

    public addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(b: Block, arr: Block[], amount: number, x0: number, x1: number, y0: number, y1: number, ignore: BlockType[], mustContain: BlockType[]): void {
        const row: Block[] = [b];
        for (let x = b.xGrid - 1; x >= x0; x--) { const next = this.get(x, b.yGrid); if (this.doBlocksMatchColor(b, next, ignore)) row.push(next!); else break; }
        for (let x = b.xGrid + 1; x < x1; x++) { const next = this.get(x, b.yGrid); if (this.doBlocksMatchColor(b, next, ignore)) row.push(next!); else break; }
        if (row.length >= amount) {
            if (mustContain.length > 0 && !row.some(r => mustContain.includes(r.blockType))) return;
            for (const r of row) if (!arr.includes(r)) arr.push(r);
        }
    }

    public addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(b: Block, arr: Block[], amount: number, x0: number, x1: number, y0: number, y1: number, ignore: BlockType[], mustContain: BlockType[]): void {
        const col: Block[] = [b];
        for (let y = b.yGrid - 1; y >= y0; y--) { const next = this.get(b.xGrid, y); if (this.doBlocksMatchColor(b, next, ignore)) col.push(next!); else break; }
        for (let y = b.yGrid + 1; y < y1; y++) { const next = this.get(b.xGrid, y); if (this.doBlocksMatchColor(b, next, ignore)) col.push(next!); else break; }
        if (col.length >= amount) {
            if (mustContain.length > 0 && !col.some(c => mustContain.includes(c.blockType))) return;
            for (const c of col) if (!arr.includes(c)) arr.push(c);
        }
    }

    public addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfDiagonalAtLeastAmount(b: Block, arr: Block[], amount: number, x0: number, x1: number, y0: number, y1: number, ignore: BlockType[], mustContain: BlockType[]): void {
        const d1: Block[] = [b];
        for (let x = 1, y = 1; b.xGrid + x < x1 && b.yGrid + y < y1; x++, y++) { const n = this.get(b.xGrid + x, b.yGrid + y); if (this.doBlocksMatchColor(b, n, ignore)) d1.push(n!); else break; }
        for (let x = 1, y = 1; b.xGrid - x >= x0 && b.yGrid - y >= y0; x++, y--) { const n = this.get(b.xGrid - x, b.yGrid - y); if (this.doBlocksMatchColor(b, n, ignore)) d1.push(n!); else break; }
        if (d1.length >= amount) { if (mustContain.length > 0 && !d1.some(r => mustContain.includes(r.blockType))) return; for (const r of d1) if (!arr.includes(r)) arr.push(r); }

        const d2: Block[] = [b];
        for (let x = 1, y = 1; b.xGrid - x >= x0 && b.yGrid + y < y1; x++, y++) { const n = this.get(b.xGrid - x, b.yGrid + y); if (this.doBlocksMatchColor(b, n, ignore)) d2.push(n!); else break; }
        for (let x = 1, y = 1; b.xGrid + x < x1 && b.yGrid - y >= y0; x++, y--) { const n = this.get(b.xGrid + x, b.yGrid - y); if (this.doBlocksMatchColor(b, n, ignore)) d2.push(n!); else break; }
        if (d2.length >= amount) { if (mustContain.length > 0 && !d2.some(r => mustContain.includes(r.blockType))) return; for (const r of d2) if (!arr.includes(r)) arr.push(r); }
    }

    public checkRecursiveConnectedRowOrColumn(arr: Block[], amount: number, x0: number, x1: number, y0: number, y1: number, ignore: BlockType[], mustContain: BlockType[]): void {
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const b = this.get(x, y);
                if (b && !ignore.includes(b.blockType)) {
                    const connected: Block[] = [];
                    this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(b, connected, 2, x0, x1, y0, y1, ignore, mustContain);
                    this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(b, connected, 2, x0, x1, y0, y1, ignore, mustContain);
                    if (connected.length > 0) {
                        let size = connected.length;
                        for (let i = 0; i < size; i++) {
                            this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(connected[i], connected, 2, x0, x1, y0, y1, ignore, mustContain);
                            this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(connected[i], connected, 2, x0, x1, y0, y1, ignore, mustContain);
                            if (connected.length > size) { size = connected.length; i = -1; }
                        }
                        if (connected.length >= amount) for (const c of connected) if (!arr.includes(c)) arr.push(c);
                    }
                }
            }
        }
    }

    public checkBreakerBlocks(toRow: number, ignore: BlockType[], mustContain: BlockType[]): Block[] {
        const breakBlocks: Block[] = [];
        for (let y = 0; y < toRow; y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b && b.blockType.isBreaker) {
                    const connected: Block[] = [];
                    this.recursivelyGetAllMatchingBlocksConnectedToBlockToArrayIfNotInItAlready(b, connected, ignore);
                    if (connected.length >= 2) {
                        for (const c of connected) if (!breakBlocks.includes(c)) breakBlocks.push(c);
                        for (const d of this.getConnectedBlocksUpDownLeftRight(b)) if (ignore.includes(d.blockType)) if (!breakBlocks.includes(d)) breakBlocks.push(d);
                    }
                }
            }
        }
        return breakBlocks;
    }

    public getConnectedBlocksUpDownLeftRight(b: Block): Block[] {
        const res: Block[] = [];
        const u = this.get(b.xGrid, b.yGrid - 1); if (u) res.push(u);
        const d = this.get(b.xGrid, b.yGrid + 1); if (d) res.push(d);
        const l = this.get(b.xGrid - 1, b.yGrid); if (l) res.push(l);
        const r = this.get(b.xGrid + 1, b.yGrid); if (r) res.push(r);
        return res;
    }

    public areAnyBlocksPopping(): boolean {
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) { const b = this.get(x, y); if (b && b.popping) return true; }
        return false;
    }

    public update(): void {
        this.updateShake();
        this.wigglePlayingField();
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) { const b = this.get(x, y); if (b) b.update(); }
    }

    public scrollBackground(): void {}

    public setShakePlayingField(ticksDuration: number, maxX: number, maxY: number, ticksPerShake: number): void {
        if (this.shakePlayingFieldScreenTicksCounter === 0) this.shakePlayingFieldStartTime = Date.now();
        this.shakePlayingFieldScreenTicksCounter += ticksDuration;
        this.shakePlayingFieldTicksDuration = this.shakePlayingFieldScreenTicksCounter;
        this.shakePlayingFieldMaxX = maxX;
        this.shakePlayingFieldMaxY = maxY;
        this.shakePlayingFieldTicksPerShake = ticksPerShake;
    }

    public shakeSmall(): void { this.setShakePlayingField(120, 2, 2, 40); }
    public shakeMedium(): void { this.setShakePlayingField(300, 4, 2, 60); }
    public shakeHard(): void { this.setShakePlayingField(600, 10, 10, 60); }

    public updateShake(): void {
        if (this.shakePlayingFieldScreenTicksCounter > 0) {
            this.shakePlayingFieldScreenTicksCounter -= this.game.ticks();
            if (this.shakePlayingFieldScreenTicksCounter < 0) this.shakePlayingFieldScreenTicksCounter = 0;
            const ticksPassed = Date.now() - this.shakePlayingFieldStartTime;
            const xOverShakeTime = Easing.easeInOutCircular(this.shakePlayingFieldTicksDuration / 2 + ticksPassed, 0, this.shakePlayingFieldMaxX, this.shakePlayingFieldTicksDuration * 2);
            const yOverShakeTime = Easing.easeInOutCircular(this.shakePlayingFieldTicksDuration / 2 + ticksPassed, 0, this.shakePlayingFieldMaxY, this.shakePlayingFieldTicksDuration * 2);
            this.shakePlayingFieldTicksPerShakeXCounter += this.game.ticks();
            if (this.shakePlayingFieldTicksPerShakeXCounter > this.shakePlayingFieldTicksPerShake) {
                this.shakePlayingFieldTicksPerShakeXCounter = 0;
                this.shakePlayingFieldLeftRightToggle = !this.shakePlayingFieldLeftRightToggle;
            }
            this.shakePlayingFieldTicksPerShakeYCounter += this.game.ticks();
            if (this.shakePlayingFieldTicksPerShakeYCounter > this.shakePlayingFieldTicksPerShake * 2) {
                this.shakePlayingFieldTicksPerShakeYCounter = 0;
                this.shakePlayingFieldUpDownToggle = !this.shakePlayingFieldUpDownToggle;
            }
            const xThisTime = Easing.easeInOutCircular(this.shakePlayingFieldTicksPerShakeXCounter, 0, xOverShakeTime, this.shakePlayingFieldTicksPerShake);
            const yThisTime = Easing.easeInOutCircular(this.shakePlayingFieldTicksPerShakeYCounter, 0, yOverShakeTime, this.shakePlayingFieldTicksPerShake * 2);
            this.shakePlayingFieldX = this.shakePlayingFieldLeftRightToggle ? Math.floor(xThisTime) : Math.floor(-xThisTime);
            this.shakePlayingFieldY = this.shakePlayingFieldUpDownToggle ? Math.floor(yThisTime) : Math.floor(-yThisTime);
        } else {
            this.shakePlayingFieldX = 0; this.shakePlayingFieldY = 0;
        }
    }

    public wigglePlayingField(): void {
        this.wigglePlayingFieldTicks += this.game.ticks();
        if (this.wigglePlayingFieldTicks > this.wigglePlayingFieldTicksSpeed) {
            this.wigglePlayingFieldTicks = 0;
            if (this.wigglePlayingFieldLeftRightToggle === false) {
                this.wigglePlayingFieldX++;
                if (this.wigglePlayingFieldX > this.wigglePlayingFieldMaxX) { this.wigglePlayingFieldLeftRightToggle = true; this.wigglePlayingFieldX--; }
            } else {
                this.wigglePlayingFieldX--;
                if (this.wigglePlayingFieldX < -this.wigglePlayingFieldMaxX) { this.wigglePlayingFieldLeftRightToggle = false; this.wigglePlayingFieldX++; }
            }
        }
    }

    public replaceAllBlocksWithNewGameBlocks(): void {
        this.reformat(this.getWidth(), this.getHeight());
    }

    public randomlyFillGridWithPlayingFieldPieces(amount: number, startY: number): void {
        const bt = this.game.currentGameType.getPlayingFieldBlockTypes(this.game.getCurrentDifficulty());
        const pt = this.game.currentGameType.getPlayingFieldPieceTypes(this.game.getCurrentDifficulty());
        for (let i = 0; i < amount; i++) {
            const x = this.game.getRandomIntLessThan(this.getWidth(), "randomFill");
            const y = startY + this.game.getRandomIntLessThan(this.getHeight() - startY, "randomFill");
            if (this.get(x, y) === null) this.putOneBlockPieceInGridCheckingForFillRules(x, y, pt, bt);
        }
    }

    public buildRandomStackRetainingExistingBlocks(amount: number, startY: number): void {
        this.randomlyFillGridWithPlayingFieldPieces(amount, startY);
    }

    public getRandomPiece(): Piece {
        const pt = this.game.currentGameType.getNormalPieceTypes(this.game.getCurrentDifficulty());
        const bt = this.game.currentGameType.getNormalBlockTypes(this.game.getCurrentDifficulty());
        const p = new Piece(this.game, this, pt[this.game.getRandomIntLessThan(pt.length, "getRandomPiece")], bt);
        return p;
    }

    public putOneBlockPieceInGridCheckingForFillRules(x: number, y: number, pt: PieceType[], bt: BlockType[]): Piece {
        const p = new Piece(this.game, this, pt[this.game.getRandomIntLessThan(pt.length, "putOneBlock")], bt);
        p.init();
        p.xGrid = x; p.yGrid = y;
        this.setPiece(p);
        return p;
    }

    public continueSwappingBlocks(): boolean {
        let swappingAny = false;
        for (let y = 0; y < this.getHeight(); y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                const a = this.get(x, y);
                if (a) {
                    if (a.interpolateSwappingWithX !== 0) {
                        const b = this.get(x + a.interpolateSwappingWithX, y);
                        swappingAny = true;
                        if (a.swapTicks < 17 * 6) { a.swapTicks += this.game.ticks(); if (b) b.swapTicks = a.swapTicks; }
                        else {
                            a.swapTicks = 0; if (b) b.swapTicks = 0;
                            this.remove(x, y, false, false);
                            if (this.contains(x + a.interpolateSwappingWithX, y)) this.remove(x + a.interpolateSwappingWithX, y, false, false);
                            if (b) this.add(x, y, b);
                            this.add(x + a.interpolateSwappingWithX, y, a);
                            a.interpolateSwappingWithX = 0; if (b) b.interpolateSwappingWithX = 0;
                        }
                    }
                    if (a.interpolateSwappingWithY !== 0) {
                        const b = this.get(x, y + a.interpolateSwappingWithY);
                        swappingAny = true;
                        if (a.swapTicks < 17 * 6) { a.swapTicks += this.game.ticks(); if (b) b.swapTicks = a.swapTicks; }
                        else {
                            a.swapTicks = 0; if (b) b.swapTicks = 0;
                            this.remove(x, y, false, false);
                            if (this.contains(x, y + a.interpolateSwappingWithY)) this.remove(x, y + a.interpolateSwappingWithY, false, false);
                            if (b) this.add(x, y, b);
                            this.add(x, y + a.interpolateSwappingWithY, a);
                            a.interpolateSwappingWithY = 0; if (b) b.interpolateSwappingWithY = 0;
                        }
                    }
                }
            }
        }
        return swappingAny;
    }

    public scrollUpStack(cursorPiece: Piece | null, amt: number): boolean {
        this.scrollPlayingFieldY -= amt;
        if (this.scrollPlayingFieldY < 0 - this.scrollBlockIncrement) {
            for (let x = 0; x < this.getWidth(); x++) if (this.get(x, GameLogic.aboveGridBuffer) !== null) { this.scrollPlayingFieldY = 0 - this.scrollBlockIncrement; return false; }
            if (cursorPiece) {
                cursorPiece.yGrid -= 1;
                if (cursorPiece.yGrid < 1 + GameLogic.aboveGridBuffer) cursorPiece.yGrid += 1;
            }
            this.scrollPlayingFieldY += this.scrollBlockIncrement;
            this.moveAllRowsUpOne();
            const bt = this.game.currentGameType.getPlayingFieldBlockTypes(this.game.getCurrentDifficulty());
            const pt = this.game.currentGameType.getPlayingFieldPieceTypes(this.game.getCurrentDifficulty());
            const y = this.getHeight() - 1;
            for (let x = 0; x < this.getWidth(); x++) this.putOneBlockPieceInGridCheckingForFillRules(x, y, pt, bt);
            this.game.piecesMadeThisGame++;
        }
        return true;
    }

    public getXInFBO(): number { return this.screenX; }
    public getYInFBO(): number { return this.screenY; }

    public removeAllBlocksOfPieceFromGrid(p: Piece, destroy: boolean): void {
        for (const b of p.blocks) this.removeBlock(b, destroy, false);
    }

    public getNumberOfFilledCellsInRow(y: number): number {
        let count = 0;
        for (let x = 0; x < this.getWidth(); x++) if (this.contains(x, y)) count++;
        return count;
    }

    public isAnythingAboveThreeQuarters(): boolean {
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < (this.getHeight() - GameLogic.aboveGridBuffer) / 4; y++) {
                if (this.get(x, y + GameLogic.aboveGridBuffer) !== null) return true;
            }
        }
        return false;
    }

    public moveAllRowsUpOne(): void {
        for (let x = 0; x < this.getWidth(); x++) {
            if (this.contains(x, 0)) {
                const b = this.get(x, 0)!;
                this.removeBlock(b, true, true);
            }
        }
        for (let y = 0; y < this.getHeight() - 1; y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                if (this.contains(x, y + 1)) {
                    const b = this.remove(x, y + 1, false, false)!;
                    this.add(x, y, b);
                }
            }
        }
    }

    public putGarbageBlock(x: number, y: number): Piece {
        const bt = this.game.currentGameType.getGarbageBlockTypes(this.game.getCurrentDifficulty());
        const pt = this.game.currentGameType.getGarbagePieceTypes(this.game.getCurrentDifficulty());
        if (pt.length === 0) pt.push(PieceType.emptyPieceType);
        return this.putOneBlockPieceInGridCheckingForFillRules(x, y, pt, bt);
    }

    public putGarbageBlockFromFloor(x: number, y: number): void {
        const p = this.putGarbageBlock(x, y);
        if (p) {
            for (const b of p.blocks) {
                b.ticksSinceLastMovement = 0;
            }
        }
    }

    public makeGarbageRowFromFloor(): void {
        this.moveAllRowsUpOne();
        const y = this.getHeight() - 1;
        const rule = this.game.currentGameType.playingFieldGarbageType;
        if (rule === GarbageType.MATCH_BOTTOM_ROW) {
            for (let x = 0; x < this.getWidth(); x++) if (this.get(x, y - 1) !== null) this.putGarbageBlockFromFloor(x, y);
        } else if (rule === GarbageType.RANDOM) {
            for (let x = 0; x < this.getWidth(); x++) if (this.game.getRandomIntLessThan(2, "makeGarbageRowFromFloor") === 0) this.putGarbageBlockFromFloor(x, y);
        } else if (rule === GarbageType.ZIGZAG_PATTERN) {
            for (let x = 0; x < this.getWidth(); x++) if (x !== this.lastGarbageHoleX) this.putGarbageBlockFromFloor(x, y);
            if (this.garbageHoleDirectionToggle) {
                this.lastGarbageHoleX++;
                if (this.lastGarbageHoleX >= this.getWidth()) { this.lastGarbageHoleX = this.getWidth() - 1; this.garbageHoleDirectionToggle = false; }
            } else {
                this.lastGarbageHoleX--;
                if (this.lastGarbageHoleX < 0) { this.lastGarbageHoleX = 0; this.garbageHoleDirectionToggle = true; }
            }
        }
    }

    public makeGarbageRowFromCeiling(): void {
        const y = 0;
        for (let x = 0; x < this.getWidth(); x++) {
            const p = this.putGarbageBlock(x, y);
            if (p) {
                for (const b of p.blocks) {
                    b.lastScreenX = this.getXInFBO() + b.xGrid * this.cellW();
                    b.lastScreenY = this.getYInFBO() + b.yInPiece * this.cellH();
                    b.ticksSinceLastMovement = 0;
                }
            }
        }
    }

    public cellW(): number { return this.game.cellW(); }
    public cellH(): number { return this.game.cellH(); }

    public getState(): (number | null)[][] {
        const h = this.getHeight();
        const w = this.getWidth();
        const state: (number | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const b = this.get(x, y);
                if (b) {
                    const color = b.getColor();
                    if (color) state[y][x] = color.toInt();
                }
            }
        }
        return state;
    }

    public applyState(state: (number | null)[][]): void {
        const h = state.length;
        const w = state[0].length;
        this.reformat(w, h);
        const bt = this.game.currentGameType.getNormalBlockTypes(this.game.getCurrentDifficulty())[0];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const colorInt = state[y][x];
                if (colorInt !== null) {
                    const b = new Block(this.game, this, bt);
                    const color = b.getColor();
                    if (color) color.copyFrom(BobColor.fromInt(colorInt));
                    this.set(x, y, b);
                }
            }
        }
    }
}
