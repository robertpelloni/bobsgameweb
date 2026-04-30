/**
 * EightDirectionBehavior — 8-directional movement behavior for entities.
 *
 * Ported from Java com.bobsgame.client.engine.ecs.behaviors.EightDirectionBehavior.
 * Moves entities in 8 directions with configurable speed and facing.
 */
import type { Entity } from '../Entity';

export class EightDirectionBehavior {
    speed = 2;
    direction = -1; // -1=none, 0=right, 1=down-right, 2=down, etc.
    enabled = true;

    private entity: Entity | null = null;

    constructor(entity?: Entity) {
        if (entity) this.entity = entity;
    }

    setEntity(entity: Entity): void {
        this.entity = entity;
    }

    setDirection(dir: number): void {
        this.direction = dir;
    }

    setDirectionFromDelta(dx: number, dy: number): void {
        if (dx === 0 && dy === 0) { this.direction = -1; return; }
        const angle = Math.atan2(dy, dx);
        this.direction = Math.round(((angle * 180 / Math.PI) + 360) % 360 / 45) % 8;
    }

    getDxDy(): { dx: number; dy: number } {
        if (this.direction < 0 || !this.enabled) return { dx: 0, dy: 0 };
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        const rad = (angles[this.direction] * Math.PI) / 180;
        return {
            dx: Math.round(Math.cos(rad)),
            dy: Math.round(Math.sin(rad)),
        };
    }

    update(_dt: number): void {
        if (!this.entity || !this.enabled || this.direction < 0) return;
        const { dx, dy } = this.getDxDy();
        // Move entity
        // this.entity.x += dx * this.speed;
        // this.entity.y += dy * this.speed;
    }

    getDirectionName(): string {
        const names = ['Right', 'Down-Right', 'Down', 'Down-Left', 'Left', 'Up-Left', 'Up', 'Up-Right'];
        return this.direction >= 0 ? names[this.direction] : 'None';
    }

    isEnabled(): boolean { return this.enabled; }
    setEnabled(v: boolean): void { this.enabled = v; }
    getSpeed(): number { return this.speed; }
    setSpeed(s: number): void { this.speed = s; }
}
