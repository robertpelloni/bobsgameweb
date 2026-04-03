import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { TransformComponent } from '../components/TransformComponent';
import { SpriteComponent } from '../components/SpriteComponent';
import { Container } from 'pixi.js';

export class RenderSystem extends System {
    private stage: Container;

    constructor(stage: Container) {
        super();
        this.stage = stage;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const transform = components.get('Transform') as TransformComponent;
            const spriteComp = components.get('Sprite') as SpriteComponent;

            if (transform && spriteComp && spriteComp.sprite) {
                const s = spriteComp.sprite;
                if (!s.parent) {
                    this.stage.addChild(s);
                }
                
                s.position.set(transform.x, transform.y);
                s.rotation = transform.rotation;
                s.scale.set(transform.scaleX, transform.scaleY);
                s.visible = spriteComp.visible;
                s.alpha = spriteComp.alpha;
            }
        }
    }
}
