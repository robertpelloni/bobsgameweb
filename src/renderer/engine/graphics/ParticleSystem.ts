/**
 * ParticleSystem — Reusable particle engine for bob's game.
 *
 * Supports emitters with configurable:
 *  - emission rate, lifetime, gravity, drag
 *  - color/size/alpha over lifetime
 *  - burst and continuous modes
 *  - shape-based emission (point, circle, rect)
 *
 * Parity: Phaser (7/7 particles), LÖVE (full), GameMaker (full), Construct (full)
 */

import { Container, Graphics } from 'pixi.js';

export interface ParticleConfig {
    // Emission
    rate?: number;             // particles per second (continuous) or total count (burst)
    lifetime?: number;         // particle life in seconds
    lifetimeVariance?: number; // random +/- seconds

    // Physics
    speed?: number;            // initial speed
    speedVariance?: number;
    angle?: number;            // emission angle in radians (0 = right)
    angleVariance?: number;    // random +/- radians (PI = full circle)
    gravityX?: number;
    gravityY?: number;         // positive = down
    drag?: number;             // velocity damping per second (0-1)

    // Appearance
    startSize?: number;
    endSize?: number;
    startAlpha?: number;
    endAlpha?: number;
    startColor?: number;       // 0xRRGGBB
    endColor?: number;

    // Shape
    shape?: 'point' | 'circle' | 'rect';
    shapeRadius?: number;
    shapeWidth?: number;
    shapeHeight?: number;

    // Mode
    burst?: boolean;           // single burst or continuous
    maxParticles?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
    maxAge: number;
    startSize: number;
    endSize: number;
    startAlpha: number;
    endAlpha: number;
    startColor: number;
    endColor: number;
    alive: boolean;
}

export class ParticleEmitter {
    public container = new Container();
    public active = true;

    private particles: Particle[] = [];
    private config: Required<ParticleConfig>;
    private emitAccumulator = 0;

    constructor(
        public x: number,
        public y: number,
        config: ParticleConfig = {},
    ) {
        // Fill defaults
        this.config = {
            rate: config.rate ?? 10,
            lifetime: config.lifetime ?? 2,
            lifetimeVariance: config.lifetimeVariance ?? 0.5,
            speed: config.speed ?? 50,
            speedVariance: config.speedVariance ?? 20,
            angle: config.angle ?? -Math.PI / 2,
            angleVariance: config.angleVariance ?? Math.PI,
            gravityX: config.gravityX ?? 0,
            gravityY: config.gravityY ?? 50,
            drag: config.drag ?? 0.02,
            startSize: config.startSize ?? 4,
            endSize: config.endSize ?? 1,
            startAlpha: config.startAlpha ?? 1,
            endAlpha: config.endAlpha ?? 0,
            startColor: config.startColor ?? 0xffffff,
            endColor: config.endColor ?? 0xffffff,
            shape: config.shape ?? 'point',
            shapeRadius: config.shapeRadius ?? 10,
            shapeWidth: config.shapeWidth ?? 20,
            shapeHeight: config.shapeHeight ?? 20,
            burst: config.burst ?? false,
            maxParticles: config.maxParticles ?? 500,
        };

        // Burst mode: emit all at once
        if (this.config.burst) {
            for (let i = 0; i < this.config.rate; i++) {
                this.emitParticle();
            }
        }
    }

    private emitParticle(): void {
        if (this.particles.length >= this.config.maxParticles) return;

        const angle = this.config.angle + (Math.random() - 0.5) * this.config.angleVariance * 2;
        const speed = this.config.speed + (Math.random() - 0.5) * this.config.speedVariance * 2;

        let px = this.x;
        let py = this.y;

        if (this.config.shape === 'circle') {
            const r = Math.random() * this.config.shapeRadius;
            const a = Math.random() * Math.PI * 2;
            px += Math.cos(a) * r;
            py += Math.sin(a) * r;
        } else if (this.config.shape === 'rect') {
            px += (Math.random() - 0.5) * this.config.shapeWidth;
            py += (Math.random() - 0.5) * this.config.shapeHeight;
        }

        const lifeVar = this.config.lifetimeVariance;
        const maxAge = Math.max(0.1, this.config.lifetime + (Math.random() - 0.5) * lifeVar * 2);

        this.particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            age: 0,
            maxAge,
            startSize: this.config.startSize,
            endSize: this.config.endSize,
            startAlpha: this.config.startAlpha,
            endAlpha: this.config.endAlpha,
            startColor: this.config.startColor,
            endColor: this.config.endColor,
            alive: true,
        });
    }

    update(dt: number): void {
        if (!this.active) return;

        // Continuous emission
        if (!this.config.burst) {
            this.emitAccumulator += dt * this.config.rate;
            while (this.emitAccumulator >= 1) {
                this.emitParticle();
                this.emitAccumulator -= 1;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;

            if (p.age >= p.maxAge) {
                this.particles.splice(i, 1);
                continue;
            }

            // Physics
            p.vx += this.config.gravityX * dt;
            p.vy += this.config.gravityY * dt;
            p.vx *= (1 - this.config.drag);
            p.vy *= (1 - this.config.drag);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    }

    render(): void {
        this.container.removeChildren();
        const g = new Graphics();

        for (const p of this.particles) {
            const t = p.age / p.maxAge; // 0..1

            // Interpolate size
            const size = p.startSize + (p.endSize - p.startSize) * t;
            if (size <= 0) continue;

            // Interpolate alpha
            const alpha = p.startAlpha + (p.endAlpha - p.startAlpha) * t;
            if (alpha <= 0.01) continue;

            // Interpolate color
            const color = this.lerpColor(p.startColor, p.endColor, t);

            g.circle(p.x, p.y, size);
            g.fill({ color, alpha });
        }

        this.container.addChild(g);
    }

    private lerpColor(a: number, b: number, t: number): number {
        const ar = (a >> 16) & 0xff;
        const ag = (a >> 8) & 0xff;
        const ab = a & 0xff;
        const br = (b >> 16) & 0xff;
        const bg = (b >> 8) & 0xff;
        const bb = b & 0xff;
        const r = Math.round(ar + (br - ar) * t);
        const gv = Math.round(ag + (bg - ag) * t);
        const bv = Math.round(ab + (bb - ab) * t);
        return (r << 16) | (gv << 8) | bv;
    }

    /** Get particle count */
    get count(): number {
        return this.particles.length;
    }

    /** Move emitter position */
    setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    /** Destroy emitter and clean up */
    destroy(): void {
        this.active = false;
        this.particles = [];
        this.container.destroy({ children: true });
    }
}

// ============================================================
// Preset Emitters
// ============================================================

export class ParticlePresets {
    static fire(x: number, y: number): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 25,
            lifetime: 0.8,
            lifetimeVariance: 0.3,
            speed: 40,
            speedVariance: 20,
            angle: -Math.PI / 2,
            angleVariance: 0.3,
            gravityY: -30,
            drag: 0.05,
            startSize: 6,
            endSize: 2,
            startAlpha: 0.9,
            endAlpha: 0,
            startColor: 0xff6600,
            endColor: 0xff0000,
            shape: 'circle',
            shapeRadius: 5,
        });
    }

    static smoke(x: number, y: number): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 8,
            lifetime: 3,
            lifetimeVariance: 1,
            speed: 15,
            speedVariance: 10,
            angle: -Math.PI / 2,
            angleVariance: 0.5,
            gravityY: -5,
            drag: 0.01,
            startSize: 8,
            endSize: 20,
            startAlpha: 0.3,
            endAlpha: 0,
            startColor: 0x888888,
            endColor: 0x444444,
            shape: 'point',
        });
    }

    static sparkles(x: number, y: number): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 15,
            lifetime: 0.6,
            lifetimeVariance: 0.2,
            speed: 80,
            speedVariance: 40,
            angle: -Math.PI / 2,
            angleVariance: Math.PI,
            gravityY: 100,
            drag: 0.03,
            startSize: 3,
            endSize: 1,
            startAlpha: 1,
            endAlpha: 0,
            startColor: 0xffff44,
            endColor: 0xffffff,
            shape: 'point',
        });
    }

    static confetti(x: number, y: number, count = 40): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: count,
            lifetime: 2,
            lifetimeVariance: 0.5,
            speed: 120,
            speedVariance: 60,
            angle: -Math.PI / 2,
            angleVariance: Math.PI,
            gravityY: 200,
            drag: 0.01,
            startSize: 5,
            endSize: 3,
            startAlpha: 1,
            endAlpha: 0.5,
            startColor: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff][Math.floor(Math.random() * 6)],
            endColor: 0xffffff,
            burst: true,
        });
    }

    static rain(x: number, y: number, width: number): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 60,
            lifetime: 1,
            lifetimeVariance: 0.2,
            speed: 200,
            speedVariance: 50,
            angle: Math.PI / 2 + 0.15,
            angleVariance: 0.05,
            gravityY: 100,
            drag: 0,
            startSize: 1,
            endSize: 1,
            startAlpha: 0.4,
            endAlpha: 0.1,
            startColor: 0x6688bb,
            endColor: 0x4466aa,
            shape: 'rect',
            shapeWidth: width,
            shapeHeight: 10,
        });
    }

    static snow(x: number, y: number, width: number): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 30,
            lifetime: 4,
            lifetimeVariance: 1,
            speed: 30,
            speedVariance: 15,
            angle: Math.PI / 2,
            angleVariance: 0.3,
            gravityY: 20,
            drag: 0.01,
            startSize: 3,
            endSize: 2,
            startAlpha: 0.8,
            endAlpha: 0.2,
            startColor: 0xffffff,
            endColor: 0xccccdd,
            shape: 'rect',
            shapeWidth: width,
            shapeHeight: 10,
        });
    }

    static torchFlame(x: number, y: number): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 12,
            lifetime: 0.5,
            lifetimeVariance: 0.15,
            speed: 25,
            speedVariance: 10,
            angle: -Math.PI / 2,
            angleVariance: 0.4,
            gravityY: -40,
            drag: 0.08,
            startSize: 5,
            endSize: 2,
            startAlpha: 0.8,
            endAlpha: 0,
            startColor: 0xffaa22,
            endColor: 0xff4400,
            shape: 'circle',
            shapeRadius: 3,
        });
    }

    static explosion(x: number, y: number, color = 0xff8800): ParticleEmitter {
        return new ParticleEmitter(x, y, {
            rate: 30,
            lifetime: 0.8,
            lifetimeVariance: 0.3,
            speed: 100,
            speedVariance: 60,
            angle: 0,
            angleVariance: Math.PI,
            gravityY: 50,
            drag: 0.05,
            startSize: 6,
            endSize: 1,
            startAlpha: 1,
            endAlpha: 0,
            startColor: color,
            endColor: 0x333333,
            burst: true,
            shape: 'point',
        });
    }
}
