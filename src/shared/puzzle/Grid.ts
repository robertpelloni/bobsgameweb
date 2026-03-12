import { Block } from "./Block";
import { GameLogic } from "./GameLogic";
import { Piece } from "./Piece";
import { GameType } from "./GameType";
import { PieceType } from "./PieceType";
import { BlockType } from "./BlockType";
import { BobColor } from "../BobColor";
import { Easing } from "../Easing";

export class Grid {
    public game: GameLogic;
    public blocks: (Block | null)[] = [];

    public screenX: number = 0;
    public screenY: number = 0;

    public wigglePlayingFieldX: number = 0;
    public wigglePlayingFieldY: number = 0;
    public wigglePlayingFieldMaxX: number = 2;
    public wigglePlayingFieldTicksSpeed: number = 40;
    private wigglePlayingFieldTicks: number = 0;
    private wigglePlayingFieldLeftRightToggle: boolean = false;

    private shakePlayingFieldMaxX: number = 0;
    private shakePlayingFieldMaxY: number = 0;
    private shakePlayingFieldTicksPerShake: number = 0;
    private shakePlayingFieldTicksDuration: number = 0;
    private shakePlayingFieldStartTime: number = 0;
    private shakePlayingFieldTicksPerShakeXCounter: number = 0;
    private shakePlayingFieldTicksPerShakeYCounter: number = 0;
    private shakePlayingFieldScreenTicksCounter: number = 0;
    private shakePlayingFieldX: number = 0;
    private shakePlayingFieldY: number = 0;
    private shakePlayingFieldLeftRightToggle: boolean = false;
    private shakePlayingFieldUpDownToggle: boolean = false;

    public scrollPlayingFieldY: number = 0;
    public scrollBlockIncrement: number = 60;

    private scrollPlayingFieldBackgroundTicksSpeed: number = 30;
    private backgroundScrollX: number = 0;
    private backgroundScrollY: number = 0;
    private scrollPlayingFieldBackgroundTicks: number = 0;

    private lastGarbageHoleX: number = 0;
    private garbageHoleDirectionToggle: boolean = false;

    private deadX: number = 0;
    private deadY: number = 0;

    public randomBag: Piece[] = [];

    constructor(gameInstance: GameLogic) {
        this.game = gameInstance;
        const size = this.getWidth() * this.getHeight();
        for (let i = 0; i < size; i++) this.blocks.push(null);
    }

    public getXInFBO(): number { return this.getXInFBONoShake() + this.wigglePlayingFieldX + this.shakePlayingFieldX; }
    public getYInFBO(): number { return this.getYInFBONoShake() + this.wigglePlayingFieldY + this.shakePlayingFieldY; }
    public getXInFBONoShake(): number { return (this.game.playingFieldX1 - this.game.playingFieldX0) / 2 - this.getWidth() * this.cellW() / 2; }
    public getYInFBONoShake(): number { return 5 * this.cellH(); }
    public getXOnScreenNoShake(): number { return this.screenX; }
    public getYOnScreenNoShake(): number { return this.screenY; }
    public bgX(): number { return this.getXInFBO() + this.backgroundScrollX; }
    public bgY(): number { return this.getYInFBO() + this.backgroundScrollY; }
    public getHeight(): number { return (this.getGameType() ? this.getGameType()!.gridHeight : 20) + GameLogic.aboveGridBuffer; }
    public getWidth(): number { return this.getGameType() ? this.getGameType()!.gridWidth : 10; }

    public update(): void {
        const piecesInGrid = this.getArrayOfPiecesOnGrid();
        for (const p of piecesInGrid) p.update();
        this.updateShake();
    }

    public reformat(oldWidth: number, oldHeight: number): void {
        const blockList: Block[] = [];
        if (this.blocks.length > 0) {
            for (let y = oldHeight - 1; y >= 0; y--) {
                for (let x = 0; x < oldWidth; x++) {
                    const index = y * oldWidth + x;
                    if (index < this.blocks.length && this.blocks[index]) {
                        const b = this.blocks[index]!;
                        this.blocks[index] = null;
                        b.xInPiece = 0; b.yInPiece = 0;
                        b.connectedBlocksByColor = [];
                        b.connectedBlocksByPiece = [];
                        blockList.push(b);
                    }
                }
            }
        }
        this.blocks = [];
        const newSize = this.getWidth() * this.getHeight();
        for (let i = 0; i < newSize; i++) this.blocks.push(null);
        let x = 0; let y = this.getHeight() - 1;
        while (blockList.length > 0 && y >= 0) {
            this.add(x, y, blockList.shift()!);
            x++;
            if (x >= this.getWidth()) { y--; x = 0; }
        }
    }

    public getNumberOfFilledCells(): number {
        let amt = 0;
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) if (this.get(x, y)) amt++;
        return amt;
    }

    public removeAllBlocksOfPieceFromGrid(p: Piece, fadeOut: boolean): void {
        for (const b of p.blocks) if (b.setInGrid) this.removeBlock(b, fadeOut, true);
    }

    public replaceAllBlocksWithNewGameBlocks(): void {
        const removedBlocks: Block[] = [];
        const maxHeight = GameLogic.aboveGridBuffer + Math.floor((this.getHeight() - GameLogic.aboveGridBuffer) / 3);
        for (let y = this.getHeight() - 1; y >= 0; y--) {
            for (let x = 0; x < this.getWidth(); x++) {
                const a = this.get(x, y);
                if (a) {
                    removedBlocks.push(a);
                    this.removeBlock(a, y < maxHeight, true);
                }
            }
        }
        const bt = this.getGameType()!.getPlayingFieldBlockTypes(this.game.getCurrentDifficulty());
        const pt = this.getGameType()!.getPlayingFieldPieceTypes(this.game.getCurrentDifficulty());
        for (const a of removedBlocks) {
            const x = a.xGrid; const y = a.yGrid;
            if (y >= maxHeight) {
                const p = this.putOneBlockPieceInGridCheckingForFillRules(x, y, pt, bt);
                if (p && p.blocks.length > 0) {
                    const b = p.blocks[0];
                    if (b) { b.lastScreenX = a.lastScreenX; b.lastScreenY = a.lastScreenY; b.ticksSinceLastMovement = 0; }
                }
            }
        }
    }

    public putOneBlockPieceInGridCheckingForFillRules(x: number, y: number, pieceTypes: PieceType[], blockTypes: BlockType[]): Piece | null {
        let p: Piece | null = null;
        if (this.getGameType()!.stackDontPutSameColorNextToEachOther) p = this.dontPutSameColorNextToEachOtherOrReturnNull(p, x, y, pieceTypes, blockTypes);
        if (this.getGameType()!.stackDontPutSameBlockTypeNextToEachOther) p = this.dontPutSameBlockTypeNextToEachOtherOrReturnNull(p, x, y, pieceTypes, blockTypes);
        if (this.getGameType()!.stackDontPutSameColorDiagonalOrNextToEachOtherReturnNull) p = this.dontPutSameColorDiagonalOrNextToEachOtherReturnNull(p, x, y, pieceTypes, blockTypes);
        if (p === null) {
            p = this.getRandomPiece(pieceTypes, blockTypes);
            while (p.blocks.length > 1) p.blocks.pop()!.breakConnectionsInPiece();
        }
        if (p) {
            this.setPiece(p, x, y);
            if (this.getGameType()!.stackLeaveAtLeastOneGapPerRow) {
                let isFull = true;
                for (let xx = 0; xx < this.getWidth(); xx++) if (this.get(xx, y) === null) { isFull = false; break; }
                if (isFull) this.remove(this.game.getRandomIntLessThan(this.getWidth(), "putOneBlockPieceInGridCheckingForFillRules"), y, false, true);
            }
        }
        return p;
    }

    public dontPutSameColorDiagonalOrNextToEachOtherReturnNull(p: Piece | null, x: number, y: number, pieceTypes: PieceType[], blockTypes: BlockType[]): Piece | null {
        let acceptableColors: BobColor[] = [];
        const maxC = this.game.getCurrentDifficulty().maximumBlockTypeColors;
        for (const bt of blockTypes) {
            const amt = Math.min(bt.colors.length, maxC);
            for (let i = 0; i < amt; i++) {
                const c = bt.colors[i];
                if (!acceptableColors.includes(c)) acceptableColors.push(c);
            }
        }
        if (x > 0 && y > 0 && this.get(x-1, y-1)) acceptableColors = acceptableColors.filter(c => c !== this.get(x-1, y-1)!.getColor());
        if (x > 0 && y < this.getHeight()-1 && this.get(x-1, y+1)) acceptableColors = acceptableColors.filter(c => c !== this.get(x-1, y+1)!.getColor());
        if (x > 0 && this.get(x-1, y)) acceptableColors = acceptableColors.filter(c => c !== this.get(x-1, y)!.getColor());
        if (y < this.getHeight()-1 && this.get(x, y+1)) acceptableColors = acceptableColors.filter(c => c !== this.get(x, y+1)!.getColor());
        if (y > 0 && this.get(x, y-1)) acceptableColors = acceptableColors.filter(c => c !== this.get(x, y-1)!.getColor());
        if (acceptableColors.length > 0) {
            const color = acceptableColors[this.game.getRandomIntLessThan(acceptableColors.length, "dontPutSameColorDiagonal")];
            if (p === null) {
                p = this.getRandomPiece(pieceTypes, blockTypes);
                while (p.blocks.length > 1) p.blocks.pop()!.breakConnectionsInPiece();
            }
            for (const b of p.blocks) b.setColor(color);
            return p;
        }
        return null;
    }

    public dontPutSameColorNextToEachOtherOrReturnNull(p: Piece | null, x: number, y: number, pieceTypes: PieceType[], blockTypes: BlockType[]): Piece | null {
        let acceptableColors: BobColor[] = [];
        const maxC = this.game.getCurrentDifficulty().maximumBlockTypeColors;
        for (const bt of blockTypes) {
            const amt = Math.min(bt.colors.length, maxC);
            for (let i = 0; i < amt; i++) {
                const c = bt.colors[i];
                if (!acceptableColors.includes(c)) acceptableColors.push(c);
            }
        }
        if (x > 0 && this.get(x-1, y)) acceptableColors = acceptableColors.filter(c => c !== this.get(x-1, y)!.getColor());
        if (y < this.getHeight()-1 && this.get(x, y+1)) acceptableColors = acceptableColors.filter(c => c !== this.get(x, y+1)!.getColor());
        if (y > 0 && this.get(x, y-1)) acceptableColors = acceptableColors.filter(c => c !== this.get(x, y-1)!.getColor());
        if (acceptableColors.length > 0) {
            const color = acceptableColors[this.game.getRandomIntLessThan(acceptableColors.length, "dontPutSameColorNextToEachOther")];
            if (p === null) {
                p = this.getRandomPiece(pieceTypes, blockTypes);
                while (p.blocks.length > 1) p.blocks.pop()!.breakConnectionsInPiece();
                for (const b of p.blocks) b.setColor(color);
            } else {
                for (const b of p.blocks) if (!acceptableColors.includes(b.getColor()!)) b.setColor(color);
            }
            return p;
        }
        return null;
    }

    public dontPutSameBlockTypeNextToEachOtherOrReturnNull(p: Piece | null, x: number, y: number, pieceTypes: PieceType[], blockTypes: BlockType[]): Piece | null {
        let acceptableBlockTypes = [...blockTypes];
        if (x > 0 && this.get(x-1, y)) acceptableBlockTypes = acceptableBlockTypes.filter(bt => bt !== this.get(x-1, y)!.blockType);
        if (y < this.getHeight()-1 && this.get(x, y+1)) acceptableBlockTypes = acceptableBlockTypes.filter(bt => bt !== this.get(x, y+1)!.blockType);
        if (y > 0 && this.get(x, y-1)) acceptableBlockTypes = acceptableBlockTypes.filter(bt => bt !== this.get(x, y-1)!.blockType);
        if (acceptableBlockTypes.length > 0) {
            if (p !== null) { for (const b of p.blocks) if (!acceptableBlockTypes.includes(b.blockType)) { p = null; break; } }
            if (p === null) {
                const pt = this.getRandomPieceType(pieceTypes);
                const bt = acceptableBlockTypes[this.game.getRandomIntLessThan(acceptableBlockTypes.length, "dontPutSameBlockTypeNextToEachOther")];
                p = new Piece(this.game, this, pt, bt); p.init();
                while (p.blocks.length > 1) p.blocks.pop()!.breakConnectionsInPiece();
            }
            return p;
        }
        return null;
    }

    public removeAndDestroyAllBlocksInGrid(): void {
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) if (this.get(x, y)) this.remove(x, y, true, true);
    }

    public randomlyFillGridWithPlayingFieldPieces(numberOfBlocks: number, topY: number): void {
        topY += GameLogic.aboveGridBuffer;
        const fieldSize = this.getWidth() * Math.max((this.getHeight() - topY), 0);
        const num = this.getNumberOfFilledCells();
        if (num > 0 && num < numberOfBlocks) numberOfBlocks = num;
        if (numberOfBlocks >= fieldSize) numberOfBlocks = fieldSize - 1;
        if (numberOfBlocks < 0) numberOfBlocks = 0;
        const blockList: Block[] = [];
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) {
            const b = this.remove(x, y, false, true);
            if (b && !blockList.includes(b)) blockList.push(b);
        }
        const bt = this.getGameType()!.getPlayingFieldBlockTypes(this.game.getCurrentDifficulty());
        const pt = this.getGameType()!.getPlayingFieldPieceTypes(this.game.getCurrentDifficulty());
        for (let i = 0; i < numberOfBlocks; i++) {
            let r = this.game.getRandomIntLessThan(fieldSize, "randomlyFillGridWithPlayingFieldPieces");
            let x = r % this.getWidth(); let y = Math.floor(r / this.getWidth()) + topY;
            let attempt = 0;
            while (this.get(x, y) !== null && attempt < fieldSize) {
                r = this.game.getRandomIntLessThan(fieldSize, "randomlyFillGridWithPlayingFieldPieces");
                x = r % this.getWidth(); y = Math.floor(r / this.getWidth()) + topY;
                attempt++;
            }
            if (this.get(x, y) === null) { const p = this.putOneBlockPieceInGridCheckingForFillRules(x, y, pt, bt); if (p) i += p.blocks.length - 1; }
        }
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) {
            const b = this.get(x, y);
            if (b && blockList.length > 0) { const a = blockList.shift()!; b.lastScreenX = a.lastScreenX; b.lastScreenY = a.lastScreenY; b.ticksSinceLastMovement = 0; }
        }
    }

    public scrollUpStack(cursorPiece: Piece, amt: number): boolean {
        this.scrollPlayingFieldY -= amt;
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) { const b = this.get(x, y); if (b) b.lastScreenY = b.getScreenY(); }
        if (this.scrollPlayingFieldY < 0 - this.scrollBlockIncrement) {
            for (let x = 0; x < this.getWidth(); x++) if (this.get(x, GameLogic.aboveGridBuffer)) { this.scrollPlayingFieldY = 0 - this.scrollBlockIncrement; return false; }
            cursorPiece.yGrid -= 1;
            if (cursorPiece.yGrid < 1 + GameLogic.aboveGridBuffer) cursorPiece.yGrid += 1;
            this.scrollPlayingFieldY += this.scrollBlockIncrement;
            for (let y = 0; y < this.getHeight() - 1; y++) for (let x = 0; x < this.getWidth(); x++) { const b = this.remove(x, y + 1, false, false); if (b) this.add(x, y, b); }
            const bt = this.getGameType()!.getNormalBlockTypes(this.game.getCurrentDifficulty());
            const pt = this.getGameType()!.getNormalPieceTypes(this.game.getCurrentDifficulty());
            for (let x = 0; x < this.getWidth(); x++) this.putOneBlockPieceInGridCheckingForFillRules(x, this.getHeight() - 1, pt, bt);
            this.game.piecesMadeThisGame++;
        }
        return true;
    }

    public makeGarbageRowFromFloor(): void {
        this.moveAllRowsUpOne();
        const y = this.getHeight() - 1;
        if (this.getGameType()!.playingFieldGarbageType === "MATCH_BOTTOM_ROW") { for (let x = 0; x < this.getWidth(); x++) if (this.get(x, y - 1)) this.putGarbageBlockFromFloor(x, y); }
        else if (this.getGameType()!.playingFieldGarbageType === "RANDOM") { for (let x = 0; x < this.getWidth(); x++) if (this.game.getRandomIntLessThan(2, "makeGarbageRowFromFloor") === 0) this.putGarbageBlockFromFloor(x, y); }
        else if (this.getGameType()!.playingFieldGarbageType === "ZIGZAG_PATTERN") {
            for (let x = 0; x < this.getWidth(); x++) if (x !== this.lastGarbageHoleX) this.putGarbageBlockFromFloor(x, y);
            if (this.garbageHoleDirectionToggle) { this.lastGarbageHoleX++; if (this.lastGarbageHoleX >= this.getWidth()) { this.lastGarbageHoleX = this.getWidth() - 1; this.garbageHoleDirectionToggle = false; } }
            else { this.lastGarbageHoleX--; if (this.lastGarbageHoleX < 0) { this.lastGarbageHoleX = 0; this.garbageHoleDirectionToggle = true; } }
        }
    }

    public moveAllRowsUpOne(): void {
        for (let x = 0; x < this.getWidth(); x++) { const b = this.get(x, 0); if (b) this.removeBlock(b, true, true); }
        for (let y = 0; y < this.getHeight() - 1; y++) for (let x = 0; x < this.getWidth(); x++) { const b = this.remove(x, y + 1, false, false); if (b) this.add(x, y, b); }
    }

    public putGarbageBlockFromFloor(x: number, y: number): void {
        const bt = this.getGameType()!.getGarbageBlockTypes(this.game.getCurrentDifficulty());
        const pt = this.getGameType()!.getGarbagePieceTypes(this.game.getCurrentDifficulty());
        const p = this.putOneBlockPieceInGridCheckingForFillRules(x, y, pt, bt);
        if (p) for (const b of p.blocks) { b.lastScreenX = this.getXInFBO() + b.xGrid * this.cellW(); b.lastScreenY = this.getYInFBO() + b.yInPiece * this.cellH() + this.getHeight() * this.cellH(); b.ticksSinceLastMovement = 0; }
    }

    public continueSwappingBlocks(): boolean {
        let swappingAny = false;
        for (let y = 0; y < this.getHeight(); y++) for (let x = 0; x < this.getWidth(); x++) {
            const a = this.get(x, y); if (!a) continue;
            if (a.interpolateSwappingWithX !== 0) {
                const b = this.get(x + a.interpolateSwappingWithX, y); swappingAny = true;
                if (a.swapTicks < 17 * 6) { a.swapTicks += this.game.ticks(); if (b) b.swapTicks = a.swapTicks; }
                else { a.swapTicks = 0; if (b) b.swapTicks = 0; this.remove(x, y, false, false); this.remove(x + a.interpolateSwappingWithX, y, false, false); if (b) this.add(x, y, b); this.add(x + a.interpolateSwappingWithX, y, a); a.interpolateSwappingWithX = 0; if (b) b.interpolateSwappingWithX = 0; }
            }
            if (a.interpolateSwappingWithY !== 0) {
                const b = this.get(x, y + a.interpolateSwappingWithY); swappingAny = true;
                if (a.swapTicks < 17 * 6) { a.swapTicks += this.game.ticks(); if (b) b.swapTicks = a.swapTicks; }
                else { a.swapTicks = 0; if (b) b.swapTicks = 0; this.remove(x, y, false, false); this.remove(x, y + a.interpolateSwappingWithY, false, false); if (b) this.add(x, y, b); this.add(x, y + a.interpolateSwappingWithY, a); a.interpolateSwappingWithY = 0; if (b) b.interpolateSwappingWithY = 0; }
            }
        }
        return swappingAny;
    }

    public updateShake(): void {
        if (this.shakePlayingFieldScreenTicksCounter > 0) {
            this.shakePlayingFieldScreenTicksCounter -= this.game.ticks();
            if (this.shakePlayingFieldScreenTicksCounter < 0) this.shakePlayingFieldScreenTicksCounter = 0;
            const ticksPassed = Date.now() - this.shakePlayingFieldStartTime;
            const xOver = Easing.easeInOutCircular(this.shakePlayingFieldTicksDuration / 2 + ticksPassed, 0, this.shakePlayingFieldMaxX, this.shakePlayingFieldTicksDuration * 2);
            const yOver = Easing.easeInOutCircular(this.shakePlayingFieldTicksDuration / 2 + ticksPassed, 0, this.shakePlayingFieldMaxY, this.shakePlayingFieldTicksDuration * 2);
            this.shakePlayingFieldTicksPerShakeXCounter += this.game.ticks();
            if (this.shakePlayingFieldTicksPerShakeXCounter > this.shakePlayingFieldTicksPerShake) { this.shakePlayingFieldTicksPerShakeXCounter = 0; this.shakePlayingFieldLeftRightToggle = !this.shakePlayingFieldLeftRightToggle; }
            this.shakePlayingFieldTicksPerShakeYCounter += this.game.ticks();
            if (this.shakePlayingFieldTicksPerShakeYCounter > this.shakePlayingFieldTicksPerShake * 2) { this.shakePlayingFieldTicksPerShakeYCounter = 0; this.shakePlayingFieldUpDownToggle = !this.shakePlayingFieldUpDownToggle; }
            const xThis = Easing.easeInOutCircular(this.shakePlayingFieldTicksPerShakeXCounter, 0, xOver, this.shakePlayingFieldTicksPerShake);
            const yThis = Easing.easeInOutCircular(this.shakePlayingFieldTicksPerShakeYCounter, 0, yOver, this.shakePlayingFieldTicksPerShake * 2);
            this.shakePlayingFieldX = this.shakePlayingFieldLeftRightToggle ? xThis : -xThis;
            this.shakePlayingFieldY = this.shakePlayingFieldUpDownToggle ? yThis : -yThis;
        } else { this.shakePlayingFieldX = 0; this.shakePlayingFieldY = 0; }
    }

    public add(x: number, y: number, b: Block): void {
        if (!b) return;
        b.xGrid = x; b.yGrid = y; b.grid = this;
        if (x < 0 || y < 0 || x >= this.getWidth() || y >= this.getHeight()) return;
        this.blocks[y * this.getWidth() + x] = b;
    }

    public get(x: number, y: number): Block | null {
        if (x < 0 || y < 0 || x >= this.getWidth() || y >= this.getHeight()) return null;
        return this.blocks[y * this.getWidth() + x];
    }

    public remove(x: number, y: number, fadeOut: boolean, breakConnections: boolean): Block | null {
        if (x < 0 || y < 0 || x >= this.getWidth() || y >= this.getHeight()) return null;
        const b = this.blocks[y * this.getWidth() + x];
        if (!b) return null;
        this.blocks[y * this.getWidth() + x] = null;
        if (fadeOut) { b.fadingOut = true; if (!this.game.fadingOutBlocks.includes(b)) this.game.fadingOutBlocks.push(b); }
        if (breakConnections) b.breakConnectionsInPiece();
        return b;
    }

    public removeBlock(b: Block, fadeOut: boolean, breakConnections: boolean): void {
        if (b.xGrid < 0 || b.yGrid < 0) return;
        this.remove(b.xGrid, b.yGrid, fadeOut, breakConnections);
    }

    public getArrayOfPiecesOnGrid(): Piece[] {
        const res: Piece[] = [];
        for (const b of this.blocks) if (b && b.piece && !res.includes(b.piece)) res.push(b.piece);
        return res;
    }

    public checkLines(ignore: BlockType[] | null, mustContain: BlockType[] | null): Block[] {
        const result: Block[] = [];
        for (let y = 0; y < this.getHeight(); y++) {
            const row: Block[] = [];
            let full = true;
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b === null || (ignore && ignore.includes(b.blockType))) { full = false; break; }
                row.push(b);
            }
            if (full) {
                if (mustContain && mustContain.length > 0) {
                    let ok = false; for (const b of row) if (mustContain.includes(b.blockType)) { ok = true; break; }
                    if (!ok) continue;
                }
                for (const b of row) if (!result.includes(b)) result.push(b);
            }
        }
        return result;
    }

    public addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfDiagonalAtLeastAmount(b: Block, connectedBlocks: Block[], leastInARow: number, startX: number, endX: number, startY: number, endY: number, ignoreTypes: BlockType[], mustContainAtLeastOneTypes: BlockType[]): void {
        // Diagonal \
        const diag1: Block[] = []; diag1.push(b);
        for (let i = 1; b.xGrid + i < endX && b.yGrid + i < endY; i++) { const n = this.get(b.xGrid + i, b.yGrid + i); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) diag1.push(n); else break; }
        for (let i = 1; b.xGrid - i >= startX && b.yGrid - i >= startY; i++) { const n = this.get(b.xGrid - i, b.yGrid - i); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) diag1.push(n); else break; }
        if (diag1.length >= leastInARow) {
            if (mustContainAtLeastOneTypes.length > 0) {
                let ok = false; for (const d of diag1) if (mustContainAtLeastOneTypes.includes(d.blockType)) { ok = true; break; }
                if (!ok) diag1.length = 0;
            }
            for (const c of diag1) if (!connectedBlocks.includes(c)) connectedBlocks.push(c);
        }
        // Diagonal /
        const diag2: Block[] = []; diag2.push(b);
        for (let i = 1; b.xGrid + i < endX && b.yGrid - i >= startY; i++) { const n = this.get(b.xGrid + i, b.yGrid - i); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) diag2.push(n); else break; }
        for (let i = 1; b.xGrid - i >= startX && b.yGrid + i < endY; i++) { const n = this.get(b.xGrid - i, b.yGrid + i); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) diag2.push(n); else break; }
        if (diag2.length >= leastInARow) {
            if (mustContainAtLeastOneTypes.length > 0) {
                let ok = false; for (const d of diag2) if (mustContainAtLeastOneTypes.includes(d.blockType)) { ok = true; break; }
                if (!ok) diag2.length = 0;
            }
            for (const c of diag2) if (!connectedBlocks.includes(c)) connectedBlocks.push(c);
        }
    }

    public checkBreakerBlocks(toRow: number, ignore: BlockType[], breakers: BlockType[]): Block[] {
        const result: Block[] = [];
        for (let y = 0; y < toRow; y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b && breakers.includes(b.blockType)) {
                    const connected: Block[] = [];
                    this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(b, connected, 2, 0, this.getWidth(), 0, this.getHeight(), ignore, breakers);
                    this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(b, connected, 2, 0, this.getWidth(), 0, this.getHeight(), ignore, breakers);
                    if (connected.length > 0) {
                        let size = connected.length;
                        for (let i = 0; i < size; i++) {
                            this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(connected[i], connected, 2, 0, this.getWidth(), 0, this.getHeight(), ignore, []);
                            this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(connected[i], connected, 2, 0, this.getWidth(), 0, this.getHeight(), ignore, []);
                            if (connected.length > size) { size = connected.length; i = -1; }
                        }
                        if (connected.length >= 2) {
                            for (const c of connected) if (!result.includes(c)) result.push(c);
                            for (const s of this.getConnectedBlocksUpDownLeftRight(b)) if (ignore.includes(s.blockType)) if (!result.includes(s)) result.push(s);
                        }
                    }
                }
            }
        }
        return result;
    }

    public checkRecursiveConnectedRowOrColumn(connectedBlocks: Block[], leastAmountConnected: number, startX: number, endX: number, startY: number, endY: number, ignoreTypes: BlockType[], mustContainAtLeastOneTypes: BlockType[]): void {
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const connectedToThisBlock: Block[] = [];
                const b = this.get(x, y);
                if (b && !ignoreTypes.includes(b.blockType)) {
                    this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(b, connectedToThisBlock, 2, startX, endX, startY, endY, ignoreTypes, mustContainAtLeastOneTypes);
                    this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(b, connectedToThisBlock, 2, startX, endX, startY, endY, ignoreTypes, mustContainAtLeastOneTypes);
                    if (connectedToThisBlock.length > 0) {
                        let size = connectedToThisBlock.length;
                        for (let i = 0; i < size; i++) {
                            this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(connectedToThisBlock[i], connectedToThisBlock, 2, startX, endX, startY, endY, ignoreTypes, mustContainAtLeastOneTypes);
                            this.addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(connectedToThisBlock[i], connectedToThisBlock, 2, startX, endX, startY, endY, ignoreTypes, mustContainAtLeastOneTypes);
                            if (connectedToThisBlock.length > size) { size = connectedToThisBlock.length; i = -1; }
                        }
                        if (connectedToThisBlock.length >= leastAmountConnected) {
                            for (const c of connectedToThisBlock) if (!connectedBlocks.includes(c)) connectedBlocks.push(c);
                        }
                    }
                }
            }
        }
    }

    public doBlocksMatchColor(a: Block | null, b: Block | null, ignore: BlockType[] | null): boolean {
        if (!a || !b) return false;
        if (a.interpolateSwappingWithX !== 0 || b.interpolateSwappingWithX !== 0 || a.flashingToBeRemoved || b.flashingToBeRemoved) return false;
        if (ignore && (ignore.includes(a.blockType) || ignore.includes(b.blockType))) return false;
        if (a.getColor() && b.getColor() && (a.getColor() === b.getColor())) return true;
        if (a.blockType.matchAnyColor || b.blockType.matchAnyColor) return true;
        return false;
    }

    public getConnectedBlocksUpDownLeftRight(b: Block): Block[] {
        const connectedBlocks: Block[] = [];
        const xOffset = 1;
        if (b.xGrid + xOffset < this.getWidth()) { const n = this.get(b.xGrid + xOffset, b.yGrid); if (n) connectedBlocks.push(n); }
        if (b.xGrid - xOffset >= 0) { const n = this.get(b.xGrid - xOffset, b.yGrid); if (n) connectedBlocks.push(n); }
        const yOffset = 1;
        if (b.yGrid + yOffset < this.getHeight()) { const n = this.get(b.xGrid, b.yGrid + yOffset); if (n) connectedBlocks.push(n); }
        if (b.yGrid - yOffset >= 0) { const n = this.get(b.xGrid, b.yGrid - yOffset); if (n) connectedBlocks.push(n); }
        return connectedBlocks;
    }

    public addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInRowAtLeastAmount(b: Block, connectedBlocks: Block[], leastInARow: number, startX: number, endX: number, startY: number, endY: number, ignoreTypes: BlockType[], mustContainAtLeastOneTypes: BlockType[]): void {
        const row: Block[] = []; row.push(b);
        for (let xOffset = 1; b.xGrid + xOffset < endX; xOffset++) { const n = this.get(b.xGrid + xOffset, b.yGrid); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) row.push(n); else break; }
        for (let xOffset = 1; b.xGrid - xOffset >= startX; xOffset++) { const n = this.get(b.xGrid - xOffset, b.yGrid); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) row.push(n); else break; }
        if (row.length >= leastInARow) {
            if (mustContainAtLeastOneTypes.length > 0) {
                let ok = false; for (const r of row) if (mustContainAtLeastOneTypes.includes(r.blockType)) { ok = true; break; }
                if (!ok) row.length = 0;
            }
            for (const c of row) if (!connectedBlocks.includes(c)) connectedBlocks.push(c);
        }
    }

    public addBlocksConnectedToBlockToArrayIfNotInItAlreadyIfInColumnAtLeastAmount(b: Block, connectedBlocks: Block[], leastInARow: number, startX: number, endX: number, startY: number, endY: number, ignoreTypes: BlockType[], mustContainAtLeastOneTypes: BlockType[]): void {
        const column: Block[] = []; column.push(b);
        for (let yOffset = 1; b.yGrid + yOffset < endY; yOffset++) { const n = this.get(b.xGrid, b.yGrid + yOffset); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) column.push(n); else break; }
        for (let yOffset = 1; b.yGrid - yOffset >= startY; yOffset++) { const n = this.get(b.xGrid, b.yGrid - yOffset); if (n && this.doBlocksMatchColor(b, n, ignoreTypes)) column.push(n); else break; }
        if (column.length >= leastInARow) {
            if (mustContainAtLeastOneTypes.length > 0) {
                let ok = false; for (const c of column) if (mustContainAtLeastOneTypes.includes(c.blockType)) { ok = true; break; }
                if (!ok) column.length = 0;
            }
            for (const c of column) if (!connectedBlocks.includes(c)) connectedBlocks.push(c);
        }
    }

    public render(renderer: any): void {
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                const b = this.get(x, y);
                if (b) {
                    b.render(renderer, this.getXInFBO() + x * this.cellW(), this.getYInFBO() + (this.scrollPlayingFieldY / this.scrollBlockIncrement) * this.cellH() + y * this.cellH(), 1.0, 1.0, true, false);
                }
            }
        }
    }

    public renderBackground(renderer: any): void {
        const alpha = 0.85;
        let h = this.getHeight();
        if (this.getGameType()!.gameMode === "STACK") h--;

        for (let x = -1; x < this.getWidth(); x++) {
            for (let y = -1; y < h; y++) {
                const color = (y % 2 === 0) ? (x % 2 === 0 ? 0x222222 : 0x444444) : (x % 2 === 0 ? 0x444444 : 0x222222);
                const fbgX = this.bgX() + (x * this.cellW());
                const fbgY = this.bgY() + (y * this.cellH());
                renderer.fillRect(fbgX, fbgY, this.cellW(), this.cellH(), color, alpha);
            }
        }
    }

    public renderBorder(renderer: any): void {
        const x0 = this.getXInFBO();
        const y0 = this.getYInFBO();
        const w = this.getWidth() * this.cellW();
        let h = this.getHeight() * this.cellH();
        if (this.getGameType()!.gameMode === "STACK") h -= this.cellH();
        renderer.strokeRect(x0 - 1, y0 - 1, w + 2, h + 2, 0xffffff, 1.0, 1);
    }

    public renderBlockOutlines(renderer: any): void {
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                const b = this.get(x, y);
                if (b) {
                    b.renderOutlines(renderer, this.getXInFBO() + x * this.cellW(), this.getYInFBO() + (this.scrollPlayingFieldY / this.scrollBlockIncrement) * this.cellH() + y * this.cellH(), 1.0);
                }
            }
        }
    }

    public renderGhostPiece(renderer: any, currentPiece: Piece): void {
        let ghostY = currentPiece.yGrid;
        for (let y = ghostY; y < this.getHeight(); y++) {
            if (this.game.grid.doesPieceFit(currentPiece, currentPiece.xGrid, y)) ghostY = y;
            else break;
        }
        if (ghostY !== currentPiece.yGrid) {
            const x = this.getXInFBO() + currentPiece.xGrid * this.cellW();
            const y = this.getYInFBO() + ghostY * this.cellH();
            let alpha = (ghostY - currentPiece.yGrid) / (this.getHeight() * 0.6);
            if (alpha > 1) alpha = 1;
            currentPiece.renderGhost(renderer, x, y, alpha);
        }
    }

    public setPiece(p: Piece, x: number, y: number): void {
        if (p.pieceType && p.pieceType.fadeOutOnceSetInsteadOfAddedToGrid) {
            for (const b of p.blocks) { b.fadingOut = true; if (!this.game.fadingOutBlocks.includes(b)) this.game.fadingOutBlocks.push(b); }
            return;
        }
        for (const b of p.blocks) { this.add(x + b.xInPiece, y + b.yInPiece, b); b.setInGrid = true; b.locking = true; }
        p.setInGrid = true;
    }

    public shakeSmall(): void {
        this.setShakePlayingField(200, 2, 2, 20);
    }

    public setShakePlayingField(ticksDuration: number, maxX: number, maxY: number, ticksPerShake: number): void {
        this.shakePlayingFieldTicksDuration = ticksDuration;
        this.shakePlayingFieldMaxX = maxX;
        this.shakePlayingFieldMaxY = maxY;
        this.shakePlayingFieldTicksPerShake = ticksPerShake;
        this.shakePlayingFieldStartTime = Date.now();
        this.shakePlayingFieldScreenTicksCounter = ticksDuration;
    }

    public checkLines(ignoreTypes: BlockType[], mustContainAtLeastOneTypes: BlockType[]): Block[] {
        const blocksOnFullLines: Block[] = [];
        for (let y = this.getHeight() - 1; y >= 0; y--) {
            let lineFull = true;
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b === null || (ignoreTypes.length > 0 && ignoreTypes.includes(b.blockType))) {
                    lineFull = false;
                    break;
                }
            }
            if (lineFull) {
                const lineBlocks: Block[] = [];
                for (let x = 0; x < this.getWidth(); x++) {
                    const b = this.get(x, y)!;
                    lineBlocks.push(b);
                    if (!blocksOnFullLines.includes(b)) blocksOnFullLines.push(b);

                    if (b.piece?.pieceType?.clearEveryRowPieceIsOnIfAnySingleRowCleared && !b.piece.overrideAnySpecialBehavior) {
                        for (const connected of b.connectedBlocksByPiece) {
                            for (let cx = 0; cx < this.getWidth(); cx++) {
                                const otherLineBlock = this.get(cx, connected.yGrid);
                                if (otherLineBlock && !blocksOnFullLines.includes(otherLineBlock)) {
                                    blocksOnFullLines.push(otherLineBlock);
                                }
                            }
                        }
                        this.shakeSmall();
                    }
                }
                if (mustContainAtLeastOneTypes.length > 0) {
                    let ok = false;
                    for (const b of lineBlocks) if (mustContainAtLeastOneTypes.includes(b.blockType)) { ok = true; break; }
                    if (!ok) {
                        // If line was full but didn't have required block, don't clear it
                        for (const b of lineBlocks) {
                            const idx = blocksOnFullLines.indexOf(b);
                            if (idx > -1) blocksOnFullLines.splice(idx, 1);
                        }
                    }
                }
            }
        }
        return blocksOnFullLines;
    }

    public getRandomPiece(pt: PieceType[], bt: BlockType[]): Piece {
        const p = new Piece(this.game, this, this.getRandomPieceType(pt), bt); p.init(); return p;
    }

    public getRandomPieceType(pt: PieceType[]): PieceType {
        return pt[this.game.getRandomIntLessThan(pt.length, "getRandomPieceType")];
    }

    public cellW(): number { return this.game.cellW(); }
    public cellH(): number { return this.game.cellH(); }
    public getGameType(): GameType | undefined { return this.game.currentGameType; }

    public isWithinBounds(piece: Piece, x: number, y: number): boolean {
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            if (x + b.xInPiece >= this.getWidth() || x + b.xInPiece < 0 || y + b.yInPiece >= this.getHeight()) {
                return false;
            }
        }
        return true;
    }

    public isHittingLeft(piece: Piece, x: number = piece.xGrid, y: number = piece.yGrid): boolean {
        if (x < 0) return true;
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            if (x + b.xInPiece < 0) return true;
        }
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            const gridBlock = this.get(x + b.xInPiece, y + b.yInPiece);
            if (x + b.xInPiece < x && gridBlock !== null) return true;
        }
        return false;
    }

    public isHittingRight(piece: Piece, x: number = piece.xGrid, y: number = piece.yGrid): boolean {
        if (x >= this.getWidth()) return true;
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            if (x + b.xInPiece >= this.getWidth()) return true;
        }
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            const gridBlock = this.get(x + b.xInPiece, y + b.yInPiece);
            if (x + b.xInPiece > x && gridBlock !== null) return true;
        }
        return false;
    }

    public doesPieceFit(piece: Piece, x: number = piece.xGrid, y: number = piece.yGrid): boolean {
        if (!this.isWithinBounds(piece, x, y)) return false;
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            if (x + b.xInPiece < 0 || x + b.xInPiece >= this.getWidth()) return false;
        }
        for (let i = 0; i < piece.getNumBlocksInCurrentRotation() && i < piece.blocks.length; i++) {
            const b = piece.blocks[i];
            if (y + b.yInPiece >= 0 && this.get(x + b.xInPiece, y + b.yInPiece) !== null) return false;
        }
        return true;
    }

    public moveDownLinesAboveBlankLinesOneLine(): boolean {
        let moved = false;
        for (let y = this.getHeight() - 1; y > 0; y--) {
            let lineIsBlank = true;
            for (let x = 0; x < this.getWidth(); x++) {
                if (this.get(x, y) !== null) {
                    lineIsBlank = false;
                    break;
                }
            }
            if (lineIsBlank) {
                for (let x = 0; x < this.getWidth(); x++) {
                    const b = this.get(x, y - 1);
                    if (b !== null) {
                        this.remove(x, y - 1, false, false);
                        this.add(x, y, b);
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    public moveDownDisconnectedBlocksAboveBlankSpacesOneLine(ignoreTypes: BlockType[]): boolean {
        let moved = false;
        for (let y = this.getHeight() - 2; y >= 0; y--) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b !== null && (ignoreTypes.length === 0 || !ignoreTypes.includes(b.blockType))) {
                    let connectedInGrid: Block | null = null;
                    for (const temp of b.connectedBlocksByPiece) {
                        if (this.blocks.includes(temp)) {
                            connectedInGrid = temp;
                            break;
                        }
                    }
                    if (connectedInGrid === null) {
                        if (this.get(x, y + 1) === null) {
                            this.removeBlock(b, false, false);
                            this.add(x, y + 1, b);
                            moved = true;
                        }
                    } else {
                        for (const c of b.connectedBlocksByPiece) {
                            if (!this.blocks.includes(c) || c === b) continue;
                            if (c.yGrid === b.yGrid - 1 && c.xGrid === b.xGrid) {
                                if (this.get(x, y + 1) === null) {
                                    this.removeBlock(b, false, false);
                                    this.add(x, y + 1, b);
                                    this.removeBlock(c, false, false);
                                    this.add(x, y, c);
                                    moved = true;
                                }
                            } else if ((c.xGrid === b.xGrid - 1 || c.xGrid === b.xGrid + 1) && c.yGrid === b.yGrid) {
                                if (this.get(b.xGrid, y + 1) === null && this.get(c.xGrid, y + 1) === null) {
                                    this.removeBlock(b, false, false);
                                    this.add(b.xGrid, y + 1, b);
                                    this.removeBlock(c, false, false);
                                    this.add(c.xGrid, y + 1, c);
                                    moved = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return moved;
    }

    public moveDownAnyBlocksAboveBlankSpacesOneLine(ignoreTypes: BlockType[]): boolean {
        let moved = false;
        for (let y = this.getHeight() - 2; y >= 0; y--) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b !== null && (ignoreTypes.length === 0 || !ignoreTypes.includes(b.blockType))) {
                    if (this.get(x, y + 1) === null) {
                        this.remove(x, y, false, false);
                        this.add(x, y + 1, b);
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    public setRandomBlockColors(): void {
        // Logic as per C++ (mostly empty/TODO in source)
    }

    public setRandomMatrixBlockColors(): void {
        // Logic as per C++ (mostly empty/TODO in source)
    }

    public setRandomWholePieceColors(grayscale: boolean, currentPiece: Piece | null, nextPieces: Piece[]): void {
        const previousColors: BobColor[] = [];
        for (const b of this.blocks) {
            if (b && b.getColor()) {
                if (!previousColors.includes(b.getColor()!)) previousColors.push(b.getColor()!);
            }
        }
        if (currentPiece) {
            for (const b of currentPiece.blocks) {
                if (b.getColor() && !previousColors.includes(b.getColor()!)) previousColors.push(b.getColor()!);
            }
        }
        if (nextPieces) {
            for (const p of nextPieces) {
                for (const b of p.blocks) {
                    if (b.getColor() && !previousColors.includes(b.getColor()!)) previousColors.push(b.getColor()!);
                }
            }
        }
    }

    public setRandomPieceGrayscaleColors(currentPiece: Piece | null, nextPieces: Piece[]): void {
        this.setRandomWholePieceColors(true, currentPiece, nextPieces);
    }

    public isAnythingAboveThreeQuarters(): boolean {
        for (let x = 0; x < this.getWidth(); x++) {
            for (let y = 0; y < this.getHeight(); y++) {
                if (this.get(x, y) !== null) {
                    if (y < GameLogic.aboveGridBuffer + ((this.getHeight() - GameLogic.aboveGridBuffer) / 4)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public doDeathSequence(): void {
        if (this.deadX < this.getWidth()) {
            const p = this.getRandomPiece(this.getGameType()!.getNormalPieceTypes(this.game.getCurrentDifficulty()), this.getGameType()!.getNormalBlockTypes(this.game.getCurrentDifficulty()));
            for (const b of p.blocks) {
                b.lastScreenX = this.getXInFBO() + (this.deadX + b.xInPiece) * this.cellW();
                b.lastScreenY = this.getYInFBO() + (this.deadY + b.yInPiece) * this.cellH() + (this.scrollPlayingFieldY / this.scrollBlockIncrement) * this.cellH();
            }
            const d = this.get(this.deadX, this.deadY);
            if (d) this.removeAllBlocksOfPieceFromGrid(d.piece!, true);

            if (this.doesPieceFit(p, this.deadX, this.deadY) && this.deadY + p.getLowestOffsetY() > 2) {
                this.setPiece(p, this.deadX, this.deadY);
                this.deadX += p.getWidth();
                this.deadY -= 1;
            } else {
                this.deadX += this.game.getRandomIntLessThan(3, "doDeathSequence");
                this.deadY -= this.game.getRandomIntLessThan(3, "doDeathSequence");
            }
            if (this.deadY < 0) this.deadY = this.getHeight() - 1;
            if (this.deadX >= this.getWidth()) this.deadX = 0;
        }
    }

    public checkLine(y: number): boolean {
        for (let x = 0; x < this.getWidth(); x++) {
            if (this.get(x, y) === null) return false;
        }
        return true;
    }

    public recursivelyGetAllMatchingBlocksConnectedToBlockToArrayIfNotInItAlready(b: Block, connectedBlocks: Block[], ignoreTypes: BlockType[]): void {
        if (!connectedBlocks.includes(b)) connectedBlocks.push(b);
        const udlr = this.getConnectedBlocksUpDownLeftRight(b);
        for (const n of udlr) {
            if (this.doBlocksMatchColor(b, n, ignoreTypes)) {
                if (!connectedBlocks.includes(n)) {
                    connectedBlocks.push(n);
                    this.recursivelyGetAllMatchingBlocksConnectedToBlockToArrayIfNotInItAlready(n, connectedBlocks, ignoreTypes);
                }
            }
        }
    }

    public setColorConnections(ignoreTypes: BlockType[]): void {
        for (const b of this.blocks) if (b) b.connectedBlocksByColor = [];
        for (let y = 0; y < this.getHeight(); y++) {
            for (let x = 0; x < this.getWidth(); x++) {
                const b = this.get(x, y);
                if (b && (ignoreTypes.length === 0 || !ignoreTypes.includes(b.blockType))) {
                    if (b.connectedBlocksByColor.length > 0) continue;
                    const connectedList: Block[] = [];
                    this.recursivelyGetAllMatchingBlocksConnectedToBlockToArrayIfNotInItAlready(b, connectedList, ignoreTypes);
                    for (const c of connectedList) {
                        if (b !== c && !b.connectedBlocksByColor.includes(c)) b.connectedBlocksByColor.push(c);
                    }
                }
            }
        }
    }

    public getRandomBlockType(arr: BlockType[]): BlockType {
        let bt = this.getRandomSpecialBlockTypeFromArrayExcludingNormalBlocksOrNull(arr);
        if (!bt) bt = this.getRandomBlockTypeFromArrayExcludingSpecialBlockTypes(arr);
        return bt || arr[0];
    }

    public getRandomBlockTypeDisregardingSpecialFrequency(arr: BlockType[]): BlockType {
        const bt = arr[this.game.getRandomIntLessThan(arr.length, "getRandomBlockTypeDisregardingSpecialFrequency")];
        return bt || arr[0];
    }

    public getRandomSpecialBlockTypeFromArrayExcludingNormalBlocksOrNull(arr: BlockType[]): BlockType | null {
        const bag: BlockType[] = [];
        for (const b of arr) {
            if (b.frequencySpecialBlockTypeOnceEveryNPieces !== 0) {
                if (this.game.createdPiecesCounterForFrequencyPieces >= b.frequencySpecialBlockTypeOnceEveryNPieces - 1) {
                    bag.push(b);
                }
            }
        }
        if (bag.length > 0) {
            this.game.createdPiecesCounterForFrequencyPieces = 0;
            return bag[this.game.getRandomIntLessThan(bag.length, "getRandomSpecialBlockType")];
        }
        for (const b of arr) {
            if (b.randomSpecialBlockChanceOneOutOf > 0) {
                if (this.game.getRandomIntLessThan(b.randomSpecialBlockChanceOneOutOf, "getRandomSpecialBlockType") === 0) {
                    bag.push(b);
                }
            }
        }
        if (bag.length > 0) return bag[this.game.getRandomIntLessThan(bag.length, "getRandomSpecialBlockType")];
        return null;
    }

    public getRandomBlockTypeFromArrayExcludingSpecialBlockTypes(arr: BlockType[]): BlockType {
        const bag = arr.filter(b => !b.isSpecialType());
        if (bag.length > 0) return bag[this.game.getRandomIntLessThan(bag.length, "getRandomBlockTypeExcludingSpecial")];
        return arr[0];
    }

    public getRandomSpecialPieceTypeFromArrayExcludingNormalPiecesOrNull(pieceTypes: PieceType[]): PieceType | null {
        const bag: PieceType[] = [];
        for (const p of pieceTypes) {
            if (p.frequencySpecialPieceTypeOnceEveryNPieces !== 0) {
                if (this.game.createdPiecesCounterForFrequencyPieces >= p.frequencySpecialPieceTypeOnceEveryNPieces) {
                    bag.push(p);
                }
            }
        }
        if (bag.length > 0) {
            this.game.createdPiecesCounterForFrequencyPieces = 0;
            return bag[this.game.getRandomIntLessThan(bag.length, "getRandomSpecialPieceType")];
        }
        for (const p of pieceTypes) {
            if (p.randomSpecialPieceChanceOneOutOf > 0) {
                if (this.game.getRandomIntLessThan(p.randomSpecialPieceChanceOneOutOf, "getRandomSpecialPieceType") === 0) {
                    bag.push(p);
                }
            }
        }
        if (bag.length > 0) return bag[this.game.getRandomIntLessThan(bag.length, "getRandomSpecialPieceType")];
        return null;
    }

    public getRandomPieceTypeFromArrayExcludingSpecialPieceTypes(arr: PieceType[]): PieceType | null {
        const bag = arr.filter(p => p.randomSpecialPieceChanceOneOutOf === 0 && p.frequencySpecialPieceTypeOnceEveryNPieces === 0);
        if (bag.length > 0) return bag[this.game.getRandomIntLessThan(bag.length, "getRandomPieceTypeExcludingSpecial")];
        return null;
    }

    public getBagOfOneOfEachNonRandomNormalPieces(): Piece[] {
        const pt = this.getGameType()!.getNormalPieceTypes(this.game.getCurrentDifficulty());
        const bt = this.getGameType()!.getNormalBlockTypes(this.game.getCurrentDifficulty());
        const tempBag: Piece[] = [];
        for (const type of pt) {
            if (type.randomSpecialPieceChanceOneOutOf === 0 && type.frequencySpecialPieceTypeOnceEveryNPieces === 0) {
                const p = new Piece(this.game, this, type, bt[0]);
                p.init();
                tempBag.push(p);
            }
        }
        return tempBag;
    }

    public getPieceFromNormalPieceRandomBag(): Piece {
        if (this.randomBag.length === 0) {
            const tempBag = this.getBagOfOneOfEachNonRandomNormalPieces();
            while (tempBag.length > 0) {
                let i = this.game.getRandomIntLessThan(tempBag.length, "getPieceFromBag");
                if (this.randomBag.length === 0) {
                    const anyAllowed = tempBag.some(p => !p.pieceType.disallowAsFirstPiece);
                    if (anyAllowed) while (tempBag[i].pieceType.disallowAsFirstPiece) i = this.game.getRandomIntLessThan(tempBag.length, \"getPieceFromBag\");
                }
                this.randomBag.push(tempBag.splice(i, 1)[0]);
            }
        }
        return this.randomBag.shift()!;
    }
}
