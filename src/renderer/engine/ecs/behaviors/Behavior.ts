/**
 * Behavior — base class for entity AI behaviors.
 * Behaviors are components that can be attached to entities to define their actions.
 *
 * Ported from okgame C++ Engine/ecs/behaviors/Behavior.
 */
import type { Entity } from '../../ecs/Entity';

export abstract class Behavior {
    protected entity: Entity | null = null;
    protected enabled = true;
    protected priority = 0;

    /** Called when the behavior is first attached to an entity */
    onInit(): void { }

    /** Called every frame while enabled */
    abstract onUpdate(dt: number): void;

    /** Called when the behavior is removed */
    onDestroy(): void { }

    /** Set the entity this behavior acts on */
    setEntity(entity: Entity | null): void {
        this.entity = entity;
    }

    getEntity(): Entity | null { return this.entity; }
    isEnabled(): boolean { return this.enabled; }
    setEnabled(b: boolean): void { this.enabled = b; }
    getPriority(): number { return this.priority; }
    setPriority(p: number): void { this.priority = p; }
}

// ============================================================
// Built-in Behaviors
// ============================================================

/**
 * WanderBehavior — makes an entity walk randomly around a defined area.
 */
export class WanderBehavior extends Behavior {
    private centerX: number;
    private centerY: number;
    private range: number;
    private waitTimer = 0;
    private waitDuration = 0;

    constructor(centerX: number, centerY: number, range = 64) {
        super();
        this.centerX = centerX;
        this.centerY = centerY;
        this.range = range;
    }

    override onUpdate(dt: number): void {
        if (!this.entity || !this.enabled) return;

        if (this.waitTimer > 0) {
            this.waitTimer -= dt;
            return;
        }

        // Random direction change or idle
        if (Math.random() < 0.02) {
            this.waitDuration = Math.random() * 3000 + 500;
            this.waitTimer = this.waitDuration;
        }
    }
}

/**
 * FollowBehavior — makes an entity follow a target entity.
 */
export class FollowBehavior extends Behavior {
    private targetX = 0;
    private targetY = 0;
    private followDistance = 32;
    private speed = 1;

    constructor(followDistance = 32, speed = 1) {
        super();
        this.followDistance = followDistance;
        this.speed = speed;
    }

    setTarget(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;
    }

    override onUpdate(dt: number): void {
        if (!this.entity || !this.enabled) return;
        void dt;
        // Movement handled by the entity using targetX/targetY
    }

    getTargetX(): number { return this.targetX; }
    getTargetY(): number { return this.targetY; }
}

/**
 * PatrolBehavior — makes an entity patrol between waypoints.
 */
export class PatrolBehavior extends Behavior {
    private waypoints: { x: number; y: number }[];
    private currentWaypoint = 0;
    private waitAtWaypoint = 0;
    private waitTimer = 0;

    constructor(waypoints: { x: number; y: number }[], waitAtWaypoint = 2000) {
        super();
        this.waypoints = waypoints;
        this.waitAtWaypoint = waitAtWaypoint;
    }

    override onUpdate(dt: number): void {
        if (!this.entity || !this.enabled || this.waypoints.length === 0) return;

        if (this.waitTimer > 0) {
            this.waitTimer -= dt;
            return;
        }

        const target = this.waypoints[this.currentWaypoint];
        if (!target) return;

        // Check if arrived
        const dx = target.x - 0; // entity.x
        const dy = target.y - 0; // entity.y
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) {
            this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
            this.waitTimer = this.waitAtWaypoint;
        }
    }

    getCurrentTarget(): { x: number; y: number } | undefined {
        return this.waypoints[this.currentWaypoint];
    }
}
