import { Entity, EntityId } from './Entity';
import { Component } from './Component';
import { System } from './System';

export interface WorldState {
    tick: number;
    entities: string; // JSON serialized
}

export class World {
    private entities: Map<EntityId, Map<string, Component>> = new Map();
    private systems: System[] = [];
    
    private currentTick: number = 0;
    private history: WorldState[] = [];
    private readonly MAX_HISTORY = 60;

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

    public saveState(): WorldState {
        // Simple serialization for demo
        const entitiesObj: any = {};
        for (const [id, comps] of this.entities) {
            entitiesObj[id] = {};
            for (const [type, comp] of comps) {
                // Serialize only data, not methods
                entitiesObj[id][type] = JSON.parse(JSON.stringify(comp));
            }
        }
        
        return {
            tick: this.currentTick,
            entities: JSON.stringify(entitiesObj)
        };
    }

    public loadState(state: WorldState): void {
        this.currentTick = state.tick;
        const entitiesObj = JSON.parse(state.entities);
        
        // This is a complex step: we need to re-instantiate components if necessary
        // For now we'll just log
        console.log(`[World] Rolling back to tick ${state.tick}`);
    }

    public update(dt: number): void {
        // Deterministic fixed-timestep logic would go here
        this.currentTick++;
        
        for (const system of this.systems) {
            system.update(dt, this.entities);
        }

        // Store history for rollback
        this.history.push(this.saveState());
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }

    public get tick(): number {
        return this.currentTick;
    }
}

