import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
import { ParticleComponent, ParticleConfig } from '../components/ParticleComponent';
import { TransformComponent } from '../components/TransformComponent';
import { Container, Graphics } from 'pixi.js';

interface ActiveParticle {
    g: Graphics;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    gravity: number;
}

export class ParticleSystem extends System {
    private container: Container;
    private particles: Map<EntityId, ActiveParticle[]> = new Map();
<<<<<<< HEAD
=======
import { ParticleComponent } from '../components/ParticleComponent';
import { TransformComponent } from '../components/TransformComponent';
import { Container } from 'pixi.js';
import { ParticleEmitter } from '../../graphics/ParticleSystem';

export class ParticleSystem extends System {
    private container: Container;
    private emitters: Map<EntityId, ParticleEmitter[]> = new Map();
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677

    constructor(container: Container) {
        super();
        this.container = container;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const partComp = components.get('Particle') as ParticleComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (partComp && transform) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
                // Emit new particles
                if (!this.particles.has(entityId)) this.particles.set(entityId, []);
                const active = this.particles.get(entityId)!;

                partComp.emitters.forEach(config => {
                    if (Math.random() < 0.3) { // Emission rate
                        this.spawnParticle(active, transform, config);
                    }
<<<<<<< HEAD
=======
                if (!this.emitters.has(entityId)) {
                    this.emitters.set(entityId, partComp.emitters.map(config => {
                        const emitter = new ParticleEmitter(transform.x, transform.y, config);
                        this.container.addChild(emitter.container);
                        return emitter;
                    }));
                }

                const entityEmitters = this.emitters.get(entityId)!;
                entityEmitters.forEach(emitter => {
                    emitter.setPosition(transform.x, transform.y);
                    emitter.update(dt / 1000);
                    emitter.render();
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
                });
            }
        }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
        // Update active particles
        for (const [entityId, active] of this.particles) {
            for (let i = active.length - 1; i >= 0; i--) {
                const p = active[i];
                p.life -= dt;
                if (p.life <= 0) {
                    p.g.destroy();
                    active.splice(i, 1);
                } else {
                    p.vy += p.gravity * dt;
                    p.g.x += p.vx * dt;
                    p.g.y += p.vy * dt;
                    p.g.alpha = p.life / p.maxLife;
                    p.g.scale.set(p.life / p.maxLife);
                }
            }
        }
    }

    private spawnParticle(active: ActiveParticle[], transform: TransformComponent, config: ParticleConfig): void {
        const g = new Graphics();
        g.rect(-config.size/2, -config.size/2, config.size, config.size);
        g.fill(config.color);
        g.position.set(transform.x, transform.y);
        
        this.container.addChild(g);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.speed;

        active.push({
            g,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - config.speed * 0.5,
            life: config.life,
            maxLife: config.life,
            gravity: config.gravity
        });
    }
<<<<<<< HEAD
=======
        // Clean up emitters for removed entities
        for (const entityId of this.emitters.keys()) {
            if (!entities.has(entityId)) {
                this.emitters.get(entityId)?.forEach(e => e.destroy());
                this.emitters.delete(entityId);
            }
        }
    }
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
}
