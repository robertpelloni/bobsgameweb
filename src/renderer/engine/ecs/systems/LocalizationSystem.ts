import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { LocalizationComponent } from '../components/LocalizationComponent';
import { Localization } from '../../../../shared/Localization';

export class LocalizationSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const loc = components.get('Localization') as LocalizationComponent;
            // In a real app, this would update the Dialogue text if the language changed
        }
    }
}
