import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { BehaviorComponent } from '../components/BehaviorComponent';

export class BehaviorSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const behaviorComp = components.get('Behavior') as BehaviorComponent;
            if (behaviorComp) {
                for (const behavior of behaviorComp.behaviors) {
                    behavior.onUpdate(dt);
                }
            }
        }
    }
}
