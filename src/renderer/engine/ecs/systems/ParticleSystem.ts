import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
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

    constructor(container: Container) {
        super();
        this.container = container;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const partComp = components.get('Particle') as ParticleComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (partComp && transform) {
                // Emit new particles
                if (!this.particles.has(entityId)) this.particles.set(entityId, []);
                const active = this.particles.get(entityId)!;

                partComp.emitters.forEach(config => {
                    if (Math.random() < 0.3) { // Emission rate
                        this.spawnParticle(active, transform, config);
                    }
                });
            }
        }

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
}
