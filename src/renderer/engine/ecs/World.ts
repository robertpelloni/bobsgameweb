import { Entity, EntityId } from './Entity';
import { Component } from './Component';
import { System } from './System';

export class World {
    private entities: Map<EntityId, Map<string, Component>> = new Map();
    private systems: System[] = [];

    public createEntity(): EntityId {
        const entity = new Entity();
        this.entities.set(entity.id, new Map());
        return entity.id;
    }

    public addComponent(entityId: EntityId, component: Component): void {
        const entityComponents = this.entities.get(entityId);
        if (entityComponents) {
            component.entityId = entityId;
            entityComponents.set(component.typeName, component);
        }
    }

    public getComponent<T extends Component>(entityId: EntityId, typeName: string): T | undefined {
        return this.entities.get(entityId)?.get(typeName) as T;
    }

    public addSystem(system: System): void {
        this.systems.push(system);
    }

    public update(dt: number): void {
        for (const system of this.systems) {
            system.update(dt, this.entities);
        }
    }
}
