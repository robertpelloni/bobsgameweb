/**
 * Physics — Lightweight 2D physics engine for bob's game.
 *
 * Provides AABB collision detection, raycasting, and simple rigid body dynamics.
 * Can be swapped for Matter.js integration for full physics.
 *
 * Parity: Phaser (Arcade + Matter.js), LÖVE (Box2D), GameMaker (built-in),
 *         Construct (multiple), Defold (Box2D), RPG Maker (basic)
 */

export interface PhysicsBody {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    mass: number;
    restitution: number;     // bounciness 0-1
    friction: number;        // 0-1
    isStatic: boolean;
    isTrigger: boolean;      // no physical response, just overlap detection
    tag: string;
    userData?: unknown;
}

export interface RaycastResult {
    x: number;
    y: number;
    body: PhysicsBody | null;
    distance: number;
    normalX: number;
    normalY: number;
}

export interface CollisionPair {
    a: PhysicsBody;
    b: PhysicsBody;
    overlapX: number;
    overlapY: number;
}

export class Physics {
    private bodies: PhysicsBody[] = [];
    private gravityX = 0;
    private gravityY = 400; // pixels/sec² downward
    private iterations = 4;

    /** Set gravity vector */
    setGravity(x: number, y: number): void {
        this.gravityX = x;
        this.gravityY = y;
    }

    /** Add a physics body to the world */
    addBody(body: PhysicsBody): PhysicsBody {
        this.bodies.push(body);
        return body;
    }

    /** Remove a body */
    removeBody(body: PhysicsBody): void {
        const idx = this.bodies.indexOf(body);
        if (idx >= 0) this.bodies.splice(idx, 1);
    }

    /** Get all bodies */
    getBodies(): readonly PhysicsBody[] {
        return this.bodies;
    }

    /** Step the physics simulation */
    step(dt: number): CollisionPair[] {
        const pairs: CollisionPair[] = [];
        const cappedDt = Math.min(dt, 1 / 30); // Cap at 30fps equivalent

        // Apply gravity to dynamic bodies
        for (const body of this.bodies) {
            if (!body.isStatic) {
                body.vx += this.gravityX * cappedDt;
                body.vy += this.gravityY * cappedDt;
            }
        }

        // Integrate positions
        for (const body of this.bodies) {
            if (!body.isStatic) {
                body.x += body.vx * cappedDt;
                body.y += body.vy * cappedDt;
            }
        }

        // Detect and resolve collisions (multiple iterations for stability)
        for (let iter = 0; iter < this.iterations; iter++) {
            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const a = this.bodies[i];
                    const b = this.bodies[j];

                    // Skip static-static pairs
                    if (a.isStatic && b.isStatic) continue;

                    const collision = this.checkAABB(a, b);
                    if (collision) {
                        pairs.push(collision);
                        this.resolveCollision(a, b, collision);
                    }
                }
            }
        }

        return pairs;
    }

    /** AABB overlap test */
    private checkAABB(a: PhysicsBody, b: PhysicsBody): CollisionPair | null {
        const overlapX = Math.min(
            a.x + a.width - b.x,
            b.x + b.width - a.x,
        );
        const overlapY = Math.min(
            a.y + a.height - b.y,
            b.y + b.height - a.y,
        );

        if (overlapX > 0 && overlapY > 0) {
            return { a, b, overlapX, overlapY };
        }
        return null;
    }

    /** Resolve collision between two bodies */
    private resolveCollision(a: PhysicsBody, b: PhysicsBody, col: CollisionPair): void {
        // Triggers don't get physical response
        if (a.isTrigger || b.isTrigger) return;

        const totalMass = a.mass + b.mass;

        if (col.overlapX < col.overlapY) {
            // Resolve on X axis
            const sign = (a.x + a.width / 2) < (b.x + b.width / 2) ? -1 : 1;
            if (!a.isStatic) a.x += sign * col.overlapX * (b.mass / totalMass);
            if (!b.isStatic) b.x -= sign * col.overlapX * (a.mass / totalMass);

            // Velocity exchange with restitution
            const restitution = Math.min(a.restitution, b.restitution);
            if (!a.isStatic && !b.isStatic) {
                const newVxA = ((a.vx * (a.mass - b.mass) + 2 * b.mass * b.vx) / totalMass) * (1 - restitution);
                const newVxB = ((b.vx * (b.mass - a.mass) + 2 * a.mass * a.vx) / totalMass) * (1 - restitution);
                a.vx = newVxA;
                b.vx = newVxB;
            } else if (a.isStatic) {
                b.vx *= -(restitution);
            } else {
                a.vx *= -(restitution);
            }

            // Friction
            if (!a.isStatic) a.vy *= (1 - b.friction * 0.1);
            if (!b.isStatic) b.vy *= (1 - a.friction * 0.1);
        } else {
            // Resolve on Y axis
            const sign = (a.y + a.height / 2) < (b.y + b.height / 2) ? -1 : 1;
            if (!a.isStatic) a.y += sign * col.overlapY * (b.mass / totalMass);
            if (!b.isStatic) b.y -= sign * col.overlapY * (a.mass / totalMass);

            const restitution = Math.min(a.restitution, b.restitution);
            if (!a.isStatic && !b.isStatic) {
                const newVyA = ((a.vy * (a.mass - b.mass) + 2 * b.mass * b.vy) / totalMass) * (1 - restitution);
                const newVyB = ((b.vy * (b.mass - a.mass) + 2 * a.mass * a.vy) / totalMass) * (1 - restitution);
                a.vy = newVyA;
                b.vy = newVyB;
            } else if (a.isStatic) {
                b.vy *= -(restitution);
            } else {
                a.vy *= -(restitution);
            }

            if (!a.isStatic) a.vx *= (1 - b.friction * 0.1);
            if (!b.isStatic) b.vx *= (1 - a.friction * 0.1);
        }
    }

    /** Raycast from origin in direction, returns first hit */
    raycast(
        originX: number,
        originY: number,
        dirX: number,
        dirY: number,
        maxDistance = 1000,
        excludeTags: string[] = [],
    ): RaycastResult | null {
        let closest: RaycastResult | null = null;
        let closestDist = maxDistance;

        // Normalize direction
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len === 0) return null;
        const ndx = dirX / len;
        const ndy = dirY / len;

        for (const body of this.bodies) {
            if (excludeTags.includes(body.tag)) continue;

            // Slab method for AABB
            let tmin = 0;
            let tmax = closestDist;

            // X slab
            if (ndx !== 0) {
                const t1 = (body.x - originX) / ndx;
                const t2 = (body.x + body.width - originX) / ndx;
                tmin = Math.max(tmin, Math.min(t1, t2));
                tmax = Math.min(tmax, Math.max(t1, t2));
            } else {
                if (originX < body.x || originX > body.x + body.width) continue;
            }

            // Y slab
            if (ndy !== 0) {
                const t1 = (body.y - originY) / ndy;
                const t2 = (body.y + body.height - originY) / ndy;
                tmin = Math.max(tmin, Math.min(t1, t2));
                tmax = Math.min(tmax, Math.max(t1, t2));
            } else {
                if (originY < body.y || originY > body.y + body.height) continue;
            }

            if (tmin <= tmax && tmin < closestDist) {
                const hitX = originX + ndx * tmin;
                const hitY = originY + ndy * tmin;

                // Determine normal
                const cx = body.x + body.width / 2;
                const cy = body.y + body.height / 2;
                const dx = hitX - cx;
                const dy = hitY - cy;
                const absDx = Math.abs(dx) / body.width;
                const absDy = Math.abs(dy) / body.height;

                let normalX = 0;
                let normalY = 0;
                if (absDx > absDy) {
                    normalX = dx > 0 ? 1 : -1;
                } else {
                    normalY = dy > 0 ? 1 : -1;
                }

                closest = {
                    x: hitX,
                    y: hitY,
                    body,
                    distance: tmin,
                    normalX,
                    normalY,
                };
                closestDist = tmin;
            }
        }

        return closest;
    }

    /** Query all bodies overlapping a rectangular area */
    queryArea(x: number, y: number, w: number, h: number, tag?: string): PhysicsBody[] {
        const results: PhysicsBody[] = [];
        for (const body of this.bodies) {
            if (tag && body.tag !== tag) continue;
            if (
                x < body.x + body.width &&
                x + w > body.x &&
                y < body.y + body.height &&
                y + h > body.y
            ) {
                results.push(body);
            }
        }
        return results;
    }

    /** Query all bodies at a point */
    queryPoint(px: number, py: number, tag?: string): PhysicsBody[] {
        const results: PhysicsBody[] = [];
        for (const body of this.bodies) {
            if (tag && body.tag !== tag) continue;
            if (px >= body.x && px <= body.x + body.width &&
                py >= body.y && py <= body.y + body.height) {
                results.push(body);
            }
        }
        return results;
    }

    /** Get all collision pairs for this frame (no resolution) */
    overlapCheck(): CollisionPair[] {
        const pairs: CollisionPair[] = [];
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const col = this.checkAABB(this.bodies[i], this.bodies[j]);
                if (col) pairs.push(col);
            }
        }
        return pairs;
    }

    /** Clear all bodies */
    clear(): void {
        this.bodies = [];
    }

    /** Get body count */
    get bodyCount(): number {
        return this.bodies.length;
    }
}
