import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { ParticleComponent } from '../components/ParticleComponent';
import { TransformComponent } from '../components/TransformComponent';
import { Container } from 'pixi.js';
import { ParticleEmitter } from '../../graphics/ParticleSystem';

export class ParticleSystem extends System {
    private container: Container;
    private emitters: Map<EntityId, ParticleEmitter[]> = new Map();

    constructor(container: Container) {
        super();
        this.container = container;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const partComp = components.get('Particle') as ParticleComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (partComp && transform) {
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
                });
            }
        }

        // Clean up emitters for removed entities
        for (const entityId of this.emitters.keys()) {
            if (!entities.has(entityId)) {
                this.emitters.get(entityId)?.forEach(e => e.destroy());
                this.emitters.delete(entityId);
            }
        }
    }
}
