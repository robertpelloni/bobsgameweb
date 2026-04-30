import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { GraphicsComponent } from '../components/GraphicsComponent';
import { TransformComponent } from '../components/TransformComponent';
import { Container } from 'pixi.js';

export class GraphicsSystem extends System {
    private stage: Container;

    constructor(stage: Container) {
        super();
        this.stage = stage;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const gfxComp = components.get('Graphics') as GraphicsComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (gfxComp && gfxComp.renderCallback) {
                if (!gfxComp.graphics.parent) {
                    this.stage.addChild(gfxComp.graphics);
                }

                if (transform) {
                    gfxComp.graphics.position.set(transform.x, transform.y);
                    gfxComp.graphics.rotation = transform.rotation;
                    gfxComp.graphics.scale.set(transform.scaleX, transform.scaleY);
                }

                if (gfxComp.clearOnUpdate) {
                    gfxComp.graphics.clear();
                }

                gfxComp.graphics.updateShaders(dt);
                gfxComp.renderCallback(gfxComp.graphics);
            }
        }
    }
}
