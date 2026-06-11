import { Character } from './Character';
import { SpriteAtlas } from '../map/SpriteAtlas';
import { AnimatedSprite } from 'pixi.js';

/**
 * BaseEntity — Generic base class for all game entities (Yuu, NPCs).
 * Handles common movement state, animation direction, and collision hitboxes.
 */
export abstract class BaseEntity extends Character {
    public static readonly DIR_NAMES = [
        'Up', 'Down', 'Left', 'Right',
        'UpLeft', 'UpRight', 'DownLeft', 'DownRight'
    ] as const;

    protected sprite: AnimatedSprite | null = null;
    protected spriteAtlas: SpriteAtlas;
    protected assetName: string;

    // Animation state
    public animDirection: number = 1; // 0=Up, 1=Down, 2=Left, 3=Right, 4=UpLeft, 5=UpRight, 6=DownLeft, 7=DownRight
    public moveDirection: number = 1;
    public isTurning: boolean = false;
    protected turnTimer: number = 0;
    protected turnDelay: number = 0.06;
    protected idleTimer: number = 0;
    protected idleFrame: number = 0;
    protected currentAnimName: string = '';

    // Hitbox metadata
    public hitBoxOffset: number = 30; // Default for adults

    constructor(spriteAtlas: SpriteAtlas, assetName: string, config?: { width?: number, height?: number }) {
        super({ name: assetName, width: config?.width ?? 16, height: config?.height ?? 32 });
        this.spriteAtlas = spriteAtlas;
        this.assetName = assetName;
        this.pixelsPerTick = 80;
    }

    public updateEntity(dt: number, dx: number, dy: number, sprinting: boolean): void {
        const moving = (dx !== 0 || dy !== 0);

        // Update target movement direction from input
        if (moving) {
            if (dx === 0 && dy > 0) this.moveDirection = 1;
            else if (dx === 0 && dy < 0) this.moveDirection = 0;
            else if (dx < 0 && dy === 0) this.moveDirection = 2;
            else if (dx > 0 && dy === 0) this.moveDirection = 3;
            else if (dx < 0 && dy < 0) this.moveDirection = 4;
            else if (dx > 0 && dy < 0) this.moveDirection = 5;
            else if (dx < 0 && dy > 0) this.moveDirection = 6;
            else if (dx > 0 && dy > 0) this.moveDirection = 7;
        }

        const has8Dir = this.spriteAtlas.has8Directions(this.assetName);
        let displayDir = this.animDirection;

        // Turning System
        if (moving && this.animDirection !== this.moveDirection) {
            if (!this.isTurning) {
                this.isTurning = true;
                this.turnTimer = 0;
            }
            this.turnTimer -= dt;
            if (this.turnTimer <= 0) {
                this.turnTimer = this.turnDelay;
                displayDir = this.getNextTurnDirection(this.animDirection, this.moveDirection, has8Dir);
                this.animDirection = displayDir;
                if (displayDir === this.moveDirection) this.isTurning = false;
            } else {
                displayDir = this.animDirection;
            }
        } else {
            this.isTurning = false;
            displayDir = this.animDirection;
        }

        // Map direction index to animation name
        let animName = BaseEntity.DIR_NAMES[displayDir] || 'Down';
        if (!has8Dir && displayDir >= 4) {
            animName = (displayDir === 4 || displayDir === 5) ? 'Up' : 'Down';
        }

        this.syncAnimation(animName, moving, sprinting, dt);

        if (this.sprite) {
            this.sprite.x = this.x;
            this.sprite.y = this.y;
            this.sprite.zIndex = this.y;
        }

        super.update(dt);
    }

    protected syncAnimation(animName: string, moving: boolean, sprinting: boolean, dt: number): void {
        if (!this.sprite) {
            if (this.spriteAtlas.loaded) {
                this.sprite = this.spriteAtlas.createAnimatedSprite(this.assetName, animName, 0.15);
                if (this.sprite) this.sprite.anchor.set(0.5, 1.0);
            }
            if (!this.sprite) return;
        }

        if (this.currentAnimName !== animName) {
            const frames = this.spriteAtlas.getAnimationFrames(this.assetName, animName);
            if (frames.length > 0) {
                this.sprite.textures = frames;
                this.currentAnimName = animName;
            }
        }

        if (moving && !this.isTurning) {
            this.idleFrame = 0;
            this.idleTimer = 0;
            this.sprite.animationSpeed = sprinting ? 0.4 : 0.2;
            if (!this.sprite.playing) this.sprite.play();
        } else if (!moving) {
            this.updateIdle(dt);
        } else if (this.isTurning) {
            this.sprite.gotoAndStop(0);
        }
    }

    protected abstract updateIdle(dt: number): void;

    protected getNextTurnDirection(current: number, target: number, has8Dir: boolean): number {
        if (current === target || !has8Dir) return target;

        const TURN_TABLE: Record<string, number> = {
            "0-1": 4, "1-1": 1, "2-1": 6, "3-1": 7, "4-1": 2, "5-1": 3, "6-1": 1, "7-1": 1,
            "0-0": 0, "1-0": 6, "2-0": 4, "3-0": 5, "4-0": 0, "5-0": 0, "6-0": 2, "7-0": 3,
            "0-2": 4, "1-2": 6, "2-2": 2, "3-2": 4, "4-2": 2, "5-2": 0, "6-2": 2, "7-2": 1,
            "0-3": 5, "1-3": 7, "2-3": 5, "3-3": 3, "4-3": 0, "5-3": 3, "6-3": 1, "7-3": 3,
            "0-4": 4, "1-4": 6, "2-4": 4, "3-4": 5, "4-4": 4, "5-4": 0, "6-4": 2, "7-4": 3,
            "0-5": 5, "1-5": 7, "2-5": 4, "3-5": 5, "4-5": 0, "5-5": 5, "6-5": 2, "7-5": 3,
            "0-6": 4, "1-6": 6, "2-6": 6, "3-6": 7, "4-6": 2, "5-6": 0, "6-6": 6, "7-6": 1,
            "0-7": 5, "1-7": 7, "2-7": 6, "3-7": 7, "4-7": 2, "5-7": 3, "6-7": 1, "7-7": 7
        };

        const key = `${current}-${target}`;
        let next = TURN_TABLE[key];
        if (next === undefined) next = target;

        if ((current === 0 && target === 1) || (current === 1 && target === 0) ||
            (current === 2 && target === 3) || (current === 3 && target === 2)) {
            const goLeft = Math.random() < 0.5;
            if (current === 1 && target === 0) next = goLeft ? 6 : 7; // Down->Up: via DownLeft or DownRight
            else if (current === 0 && target === 1) next = goLeft ? 4 : 5; // Up->Down: via UpLeft or UpRight
            else if (current === 2 && target === 3) next = goLeft ? 4 : 6; // Left->Right: via UpLeft or DownLeft
            else if (current === 3 && target === 2) next = goLeft ? 5 : 7; // Right->Left: via UpRight or DownRight
        }
        return next;
    }

    public getSprite(): AnimatedSprite | null {
        if (!this.sprite && this.spriteAtlas.loaded) {
            this.syncAnimation('Down', false, false, 0);
        }
        return this.sprite;
    }

    public getCollisionY(): number {
        return this.y - (this.height || 32) + this.hitBoxOffset;
    }

    public setPosition(pxX: number, pxY: number): void {
        this.x = pxX;
        this.y = pxY;
        if (this.sprite) {
            this.sprite.x = pxX;
            this.sprite.y = pxY;
        }
    }
}
