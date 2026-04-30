/**
 * Character — base class for all moving entities (player, NPCs, random characters).
 * Handles movement, animation direction, pathfinding, collision, and appearance.
 *
 * Ported from okgame C++ Engine/entity/Character.
 */
import { PathFinder } from './PathFinder';

export enum Direction {
    DOWN = 0,
    LEFT = 1,
    RIGHT = 2,
    UP = 3,
    DOWNLEFT = 4,
    DOWNRIGHT = 5,
    UPLEFT = 6,
    UPRIGHT = 7,
}

export interface CharacterConfig {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export class Character {
    // Position
    x = 0;
    y = 0;
    width = 16;
    height = 24;

    // Movement state
    moved = false;
    standing = true;
    running = false;
    direction: Direction = Direction.DOWN;
    pixelsToWalk = 0;
    xPixelCounter = 0;
    yPixelCounter = 0;
    ticksToStand = 0;
    standingCycles = 0;

    // Speed
    pixelsPerTick = 1;
    rotationAnimationSpeedTicks = 160;

    // Pathfinding
    pathfinder: PathFinder | null = null;
    pathPosition = 0;
    pathFindWaitTicks = 0;
    targetX = -1;
    targetY = -1;

    // Tracking
    lastX = 0;
    lastY = 0;
    ticksSinceMoved = 0;

    // Display
    name = '';
    showName = false;
    nameColor = 0xffffff;
    isMale = false;
    isFemale = false;

    // Map collision
    private mapWidth = 0;
    private mapHeight = 0;
    private collisionCheck: ((x: number, y: number, w: number, h: number) => boolean) | null = null;

    constructor(config?: CharacterConfig) {
        this.name = config?.name ?? '';
        this.x = config?.x ?? 0;
        this.y = config?.y ?? 0;
        this.width = config?.width ?? 16;
        this.height = config?.height ?? 24;
        this.lastX = this.x;
        this.lastY = this.y;
    }

    setCollisionChecker(checker: (x: number, y: number, w: number, h: number) => boolean): void {
        this.collisionCheck = checker;
    }

    setMapBounds(width: number, height: number): void {
        this.mapWidth = width;
        this.mapHeight = height;
    }

    // ============================================================
    // Movement
    // ============================================================

    walkDirection(direction: Direction): boolean {
        const speed = this.pixelsPerTick;
        let nx = this.x;
        let ny = this.y;

        switch (direction) {
            case Direction.UP: ny -= speed; break;
            case Direction.DOWN: ny += speed; break;
            case Direction.LEFT: nx -= speed; break;
            case Direction.RIGHT: nx += speed; break;
            case Direction.UPLEFT: nx -= speed; ny -= speed; break;
            case Direction.UPRIGHT: nx += speed; ny -= speed; break;
            case Direction.DOWNLEFT: nx -= speed; ny += speed; break;
            case Direction.DOWNRIGHT: nx += speed; ny += speed; break;
        }

        this.direction = direction;

        if (this.canMoveTo(nx, ny)) {
            this.x = nx;
            this.y = ny;
            this.moved = true;
            this.standing = false;
            return true;
        }
        return false;
    }

    walkToXY(tx: number, ty: number, checkHit = true): boolean {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.pixelsPerTick) {
            this.x = tx;
            this.y = ty;
            return true;
        }

        const nx = this.x + (dx / dist) * this.pixelsPerTick;
        const ny = this.y + (dy / dist) * this.pixelsPerTick;

        if (!checkHit || this.canMoveTo(nx, ny)) {
            this.x = nx;
            this.y = ny;
            this.moved = true;
            this.standing = false;
            this.updateDirection(dx, dy);
            return true;
        }
        return false;
    }

    walkRandomly(range: number): void {
        if (this.ticksToStand > 0) {
            this.ticksToStand--;
            return;
        }

        if (Math.random() < 0.02) {
            this.targetX = this.x + (Math.random() - 0.5) * range * 2;
            this.targetY = this.y + (Math.random() - 0.5) * range * 2;
            this.targetX = Math.max(0, Math.min(this.mapWidth - this.width, this.targetX));
            this.targetY = Math.max(0, Math.min(this.mapHeight - this.height, this.targetY));
        }

        if (this.targetX >= 0) {
            const arrived = this.walkToXY(this.targetX, this.targetY);
            if (arrived || !this.moved) {
                this.targetX = -1;
                this.ticksToStand = Math.floor(Math.random() * 120) + 30;
            }
        }
    }

    walkAwayFrom(fx: number, fy: number): void {
        const dx = this.x - fx;
        const dy = this.y - fy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;

        const nx = this.x + (dx / dist) * this.pixelsPerTick;
        const ny = this.y + (dy / dist) * this.pixelsPerTick;
        if (this.canMoveTo(nx, ny)) {
            this.x = nx;
            this.y = ny;
        }
    }

    // ============================================================
    // Pathfinding
    // ============================================================

    walkToXYWithPathfinding(tx: number, ty: number): number {
        if (!this.pathfinder) return -1;
        const path = this.pathfinder.findPath(
            Math.floor(this.x / 16), Math.floor(this.y / 16),
            Math.floor(tx / 16), Math.floor(ty / 16),
        );
        if (!path) return -1;
        const pathLength = path.getLength();
        if (pathLength === 0) return -1;

        this.targetX = tx;
        this.targetY = ty;
        return pathLength;
    }

    // ============================================================
    // Direction & Animation
    // ============================================================

    lookAt(targetX: number, targetY: number): void {
        const dx = targetX - this.x;
        const dy = targetY - this.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
            this.direction = dy > 0 ? Direction.DOWN : Direction.UP;
        }
    }

    lookAwayFrom(targetX: number, targetY: number): void {
        this.lookAt(this.x * 2 - targetX, this.y * 2 - targetY);
    }

    private updateDirection(dx: number, dy: number): void {
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else if (Math.abs(dy) > 0) {
            this.direction = dy > 0 ? Direction.DOWN : Direction.UP;
        }
    }

    getDirectionName(): string {
        const names = ['down', 'left', 'right', 'up', 'downleft', 'downright', 'upleft', 'upright'];
        return names[this.direction] ?? 'down';
    }

    // ============================================================
    // Collision
    // ============================================================

    private canMoveTo(nx: number, ny: number): boolean {
        // Map bounds
        if (nx < 0 || ny < 0 || nx + this.width > this.mapWidth || ny + this.height > this.mapHeight) {
            return false;
        }
        // Custom collision check
        if (this.collisionCheck) {
            return this.collisionCheck(nx, ny, this.width, this.height);
        }
        return true;
    }

    isTouching(other: Character, range = 0): boolean {
        return Math.abs(this.x - other.x) < this.width + range &&
            Math.abs(this.y - other.y) < this.height + range;
    }

    distanceTo(ox: number, oy: number): number {
        return Math.sqrt((this.x - ox) ** 2 + (this.y - oy) ** 2);
    }

    distanceToCharacter(other: Character): number {
        return this.distanceTo(other.x, other.y);
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        // Track movement
        if (this.x !== this.lastX || this.y !== this.lastY) {
            this.ticksSinceMoved = 0;
            this.moved = true;
            this.standing = false;
        } else {
            this.ticksSinceMoved += dt;
            this.moved = false;
            this.standing = true;
        }
        this.lastX = this.x;
        this.lastY = this.y;
    }

    teleport(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.lastX = x;
        this.lastY = y;
        this.targetX = -1;
        this.targetY = -1;
    }
}
