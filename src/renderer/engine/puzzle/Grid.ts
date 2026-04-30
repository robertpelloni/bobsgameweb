/**
 * Grid — puzzle game grid with block management, line clearing, gravity, and garbage.
 *
 * Ported from okgame C++ Puzzle/Grid.h
 */
import { Block, BlockType, AnimationState, Piece } from './PuzzleTypes';
import type { GameTypeDefinition } from './PuzzleTypes';

export class Grid {
    width: number;
    height: number;
    cells: (Block | null)[][];

    screenX = 0;
    screenY = 0;

    // Shake
    private shakeDuration = 0;
    private shakeX = 0;
    private shakeY = 0;
    private shakeMaxX = 0;
    private shakeMaxY = 0;
    private shakeRate = 0;
    private shakeCounter = 0;
    private shakeToggleX = false;
    private shakeToggleY = false;

    // Scroll (for stack-based games)
    scrollY = 0;

    private gameType: GameTypeDefinition;

    constructor(gameType: GameTypeDefinition) {
        this.gameType = gameType;
        this.width = gameType.gridWidth;
        this.height = gameType.gridHeight;
        this.cells = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => null),
        );
    }

    // ============================================================
    // Block Access
    // ============================================================

    contains(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    get(x: number, y: number): Block | null {
        if (!this.contains(x, y)) return null;
        return this.cells[y][x];
    }

    add(x: number, y: number, block: Block): void {
        if (!this.contains(x, y)) return;
        block.x = x;
        block.y = y;
        this.cells[y][x] = block;
    }

    remove(x: number, y: number): Block | null {
        if (!this.contains(x, y)) return null;
        const block = this.cells[y][x];
        this.cells[y][x] = null;
        return block;
    }

    // ============================================================
    // Line Checking
    // ============================================================

    /** Check if an entire row is filled */
    checkLine(y: number): boolean {
        for (let x = 0; x < this.width; x++) {
            const block = this.cells[y][x];
            if (!block || block.isEmpty() || block.isPopping()) return false;
        }
        return true;
    }

    /** Get indices of all completed lines */
    getCompletedLines(): number[] {
        const lines: number[] = [];
        for (let y = 0; y < this.height; y++) {
            if (this.checkLine(y)) lines.push(y);
        }
        return lines;
    }

    /** Clear completed lines and return the count */
    clearCompletedLines(): number {
        const lines = this.getCompletedLines();
        for (const y of lines) {
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = null;
            }
        }
        // Apply gravity: shift everything down
        for (const clearedY of lines) {
            this.shiftDownAbove(clearedY);
        }
        return lines.length;
    }

    // ============================================================
    // Match Checking (Puyo-style connected groups)
    // ============================================================

    /** Find connected groups of same-color blocks above minimum size */
    findConnectedGroups(ignoreTypes: BlockType[] = []): Block[][] {
        const visited = new Set<string>();
        const groups: Block[][] = [];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const block = this.cells[y][x];
                if (!block || block.isEmpty() || block.isPopping()) continue;
                const key = `${x},${y}`;
                if (visited.has(key)) continue;

                // BFS to find connected same-color blocks
                const group: Block[] = [];
                const queue: { x: number; y: number }[] = [{ x, y }];

                while (queue.length > 0) {
                    const pos = queue.shift()!;
                    const posKey = `${pos.x},${pos.y}`;
                    if (visited.has(posKey)) continue;
                    visited.add(posKey);

                    const b = this.cells[pos.y][pos.x];
                    if (!b || b.isEmpty() || b.color !== block.color) continue;
                    if (ignoreTypes.includes(b.type)) continue;

                    group.push(b);

                    // Check neighbors
                    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    for (const [dx, dy] of dirs) {
                        const nx = pos.x + dx;
                        const ny = pos.y + dy;
                        if (this.contains(nx, ny) && !visited.has(`${nx},${ny}`)) {
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }

                if (group.length >= this.gameType.minimumMatchSize) {
                    groups.push(group);
                }
            }
        }

        return groups;
    }

    /** Clear matched connected groups */
    clearConnectedGroups(ignoreTypes: BlockType[] = []): number {
        const groups = this.findConnectedGroups(ignoreTypes);
        let total = 0;
        for (const group of groups) {
            for (const block of group) {
                this.cells[block.y][block.x] = null;
            }
            total += group.length;
        }
        return total;
    }

    // ============================================================
    // Gravity
    // ============================================================

    /** Apply gravity — move blocks down to fill empty spaces */
    applyGravity(): boolean {
        let moved = false;
        for (let y = this.height - 2; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                const block = this.cells[y][x];
                if (block && !block.isEmpty() && !block.isPopping()) {
                    if (y + 1 < this.height && this.cells[y + 1][x] === null) {
                        this.cells[y + 1][x] = block;
                        block.y = y + 1;
                        this.cells[y][x] = null;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    private shiftDownAbove(fromY: number): void {
        for (let y = fromY; y > 0; y--) {
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = this.cells[y - 1][x];
                if (this.cells[y][x]) this.cells[y][x]!.y = y;
            }
        }
        // Top row is empty
        for (let x = 0; x < this.width; x++) {
            this.cells[0][x] = null;
        }
    }

    // ============================================================
    // Garbage
    // ============================================================

    /** Add garbage row from the bottom */
    addGarbageRow(color: number = 0x888888): void {
        // Shift everything up
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = this.cells[y + 1][x];
                if (this.cells[y][x]) this.cells[y][x]!.y = y;
            }
        }
        // Fill bottom row with garbage
        const holeX = Math.floor(Math.random() * this.width);
        for (let x = 0; x < this.width; x++) {
            if (x !== holeX) {
                this.cells[this.height - 1][x] = new Block(BlockType.SQUARE, color);
                this.cells[this.height - 1][x]!.y = this.height - 1;
                this.cells[this.height - 1][x]!.x = x;
            }
        }
    }

    // ============================================================
    // Query
    // ============================================================

    getFilledCellCount(): number {
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x]) count++;
            }
        }
        return count;
    }

    isAnythingAboveThreshold(thresholdPercent: number): boolean {
        const thresholdY = Math.floor(this.height * (1 - thresholdPercent));
        for (let y = 0; y < thresholdY; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x]) return true;
            }
        }
        return false;
    }

    areAnyBlocksPopping(): boolean {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x]?.isPopping()) return true;
            }
        }
        return false;
    }

    // ============================================================
    // Piece Placement Check
    // ============================================================

    /** Check if a piece can be placed at the given position */
    canPlace(piece: Piece, px: number, py: number): boolean {
        for (const cell of piece.getCells(px, py)) {
            if (cell.x < 0 || cell.x >= this.width || cell.y < 0 || cell.y >= this.height) return false;
            if (this.cells[cell.y][cell.x] !== null) return false;
        }
        return true;
    }

    removeAllBlocks(): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = null;
            }
        }
    }

    // ============================================================
    // Shake Effects
    // ============================================================

    shakeSmall(): void { this.setShake(300, 2, 2, 50); }
    shakeMedium(): void { this.setShake(500, 4, 4, 40); }
    shakeHard(): void { this.setShake(800, 6, 6, 30); }

    private setShake(duration: number, maxX: number, maxY: number, rate: number): void {
        this.shakeDuration = duration;
        this.shakeMaxX = maxX;
        this.shakeMaxY = maxY;
        this.shakeRate = rate;
        this.shakeCounter = 0;
    }

    updateShake(dt: number): void {
        if (this.shakeDuration <= 0) {
            this.shakeX = 0;
            this.shakeY = 0;
            return;
        }
        this.shakeDuration -= dt;
        this.shakeCounter += dt;

        if (this.shakeCounter > this.shakeRate) {
            this.shakeCounter = 0;
            this.shakeToggleX = !this.shakeToggleX;
            this.shakeToggleY = !this.shakeToggleY;
        }

        const progress = Math.max(0, this.shakeDuration) / 800;
        this.shakeX = (this.shakeToggleX ? 1 : -1) * this.shakeMaxX * progress;
        this.shakeY = (this.shakeToggleY ? 1 : -1) * this.shakeMaxY * progress;
    }

    getShakeX(): number { return this.shakeX; }
    getShakeY(): number { return this.shakeY; }

    // ============================================================
    // Serialization
    // ============================================================

    getState(): (number | null)[][] {
        return this.cells.map(row =>
            row.map(block => block ? block.color : null),
        );
    }

    toString(): string {
        let s = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                s += this.cells[y][x] ? '■' : '·';
            }
            s += '\n';
        }
        return s;
    }
}
