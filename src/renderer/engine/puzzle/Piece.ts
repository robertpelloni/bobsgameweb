/**
 * Piece — puzzle piece definition with rotations, offsets, and kick tables.
 *
 * Ported from okgame C++ Puzzle/Piece.h.
 * Supports SRS, SEGA, NES, GB, DTET rotation systems.
 */

export enum RotationType {
    SRS = 'SRS',
    SEGA = 'SEGA',
    NES = 'NES',
    GB = 'GB',
    DTET = 'DTET',
}

export interface BlockOffset {
    x: number;
    y: number;
}

export class Rotation {
    blockOffsets: BlockOffset[] = [];

    add(offset: BlockOffset): void {
        this.blockOffsets.push(offset);
    }

    getBlockOffsets(): readonly BlockOffset[] {
        return this.blockOffsets;
    }

    clone(): Rotation {
        const r = new Rotation();
        r.blockOffsets = this.blockOffsets.map(o => ({ ...o }));
        return r;
    }
}

export class PieceType {
    name = '';
    uuid = '';
    rotations: Rotation[] = [];
    blockTypeUUIDs: string[] = []; // UUIDs of BlockTypes for each block in the piece
    spawnOffset: BlockOffset = { x: 0, y: 0 };

    // Kick table data (wall kick offsets per rotation transition)
    kickTable: Map<string, BlockOffset[]> = new Map();

    constructor(init?: Partial<PieceType>) {
        Object.assign(this, init);
    }

    getRotation(index: number): Rotation {
        return this.rotations[index % this.rotations.length] ?? this.rotations[0];
    }

    getNumRotations(): number {
        return this.rotations.length;
    }

    static tetromino_I(): PieceType {
        return new PieceType({
            name: 'I',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }] }),
            ],
            spawnOffset: { x: 3, y: -1 },
        });
    }

    static tetromino_O(): PieceType {
        return new PieceType({
            name: 'O',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] }),
            ],
            spawnOffset: { x: 4, y: -1 },
        });
    }

    static tetromino_T(): PieceType {
        return new PieceType({
            name: 'T',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }] }),
            ],
            spawnOffset: { x: 3, y: -1 },
        });
    }

    static tetromino_S(): PieceType {
        return new PieceType({
            name: 'S',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }] }),
            ],
            spawnOffset: { x: 3, y: -1 },
        });
    }

    static tetromino_Z(): PieceType {
        return new PieceType({
            name: 'Z',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }] }),
            ],
            spawnOffset: { x: 3, y: -1 },
        });
    }

    static tetromino_J(): PieceType {
        return new PieceType({
            name: 'J',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] }),
            ],
            spawnOffset: { x: 3, y: -1 },
        });
    }

    static tetromino_L(): PieceType {
        return new PieceType({
            name: 'L',
            rotations: [
                Object.assign(new Rotation(), { blockOffsets: [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }] }),
                Object.assign(new Rotation(), { blockOffsets: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }] }),
            ],
            spawnOffset: { x: 3, y: -1 },
        });
    }

    /** All 7 standard tetromino piece types */
    static allTetrominos(): PieceType[] {
        return [
            PieceType.tetromino_I(),
            PieceType.tetromino_O(),
            PieceType.tetromino_T(),
            PieceType.tetromino_S(),
            PieceType.tetromino_Z(),
            PieceType.tetromino_J(),
            PieceType.tetromino_L(),
        ];
    }
}

export class Piece {
    type: PieceType;
    rotationIndex = 0;
    x: number;
    y: number;

    // State
    isHeld = false;
    isLocked = false;
    lockDelay = 0;
    lockDelayMax = 30; // frames before forced lock
    moveCount = 0;
    maxMoveResetCount = 15;

    constructor(type: PieceType, x = 0, y = 0) {
        this.type = type;
        this.x = x + type.spawnOffset.x;
        this.y = y + type.spawnOffset.y;
    }

    getCurrentRotation(): Rotation {
        return this.type.getRotation(this.rotationIndex);
    }

    getBlockOffsets(): readonly BlockOffset[] {
        return this.getCurrentRotation().getBlockOffsets();
    }

    getWorldOffsets(): BlockOffset[] {
        return this.getBlockOffsets().map(o => ({
            x: this.x + o.x,
            y: this.y + o.y,
        }));
    }

    rotateCW(): void {
        this.rotationIndex = (this.rotationIndex + 1) % this.type.getNumRotations();
        this.resetLockDelay();
    }

    rotateCCW(): void {
        this.rotationIndex = (this.rotationIndex - 1 + this.type.getNumRotations()) % this.type.getNumRotations();
        this.resetLockDelay();
    }

    moveLeft(): void { this.x--; this.resetLockDelay(); }
    moveRight(): void { this.x++; this.resetLockDelay(); }
    moveDown(): void { this.y++; }
    moveUp(): void { this.y--; }

    slam(): void { this.isLocked = true; }

    resetLockDelay(): void {
        if (this.moveCount < this.maxMoveResetCount) {
            this.lockDelay = 0;
            this.moveCount++;
        }
    }

    clone(): Piece {
        const p = new Piece(this.type, this.x - this.type.spawnOffset.x, this.y - this.type.spawnOffset.y);
        p.rotationIndex = this.rotationIndex;
        p.isHeld = this.isHeld;
        p.lockDelay = this.lockDelay;
        p.moveCount = this.moveCount;
        return p;
    }
}
