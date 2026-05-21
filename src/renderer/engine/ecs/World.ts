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

    
 public removeEntity(entityId: EntityId): void {
 this.entities.delete(entityId);
 }

 public saveState(): WorldState {
        // Safe serializer that skips PixiJS objects and circular refs
        const safeStringify = (obj: any, seen = new WeakSet()): any => {
            if (obj === null || typeof obj !== 'object') return obj;
            if (seen.has(obj)) return '[Circular]';
            seen.add(obj);
            if (obj.constructor?.name && [
                'Container','Graphics','Sprite','Text','Texture','Renderer',
                'Application','Ticker','EventEmitter','DisplayObject','Canvas',
                'WebGLRenderer','Shader','Filter','Geometry','Mesh','Particle'
            ].includes(obj.constructor.name)) return '[' + obj.constructor.name + ']';
            if (Array.isArray(obj)) return obj.map((v: any) => safeStringify(v, seen));
            const result: any = {};
            for (const key of Object.keys(obj)) {
                try { result[key] = safeStringify(obj[key], seen); }
                catch { result[key] = '[Error]'; }
            }
            return result;
        };
        const entitiesObj: any = {};
        for (const [id, comps] of this.entities) {
            entitiesObj[id] = {};
            for (const [type, comp] of comps) {
                try { entitiesObj[id][type] = safeStringify(comp); }
                catch { entitiesObj[id][type] = { typeName: (comp as any).typeName || 'unknown' }; }
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

        // Store history for rollback (disabled - loadState is stub, serialization too expensive per-frame)
        // this.history.push(this.saveState());
        // if (this.history.length > this.MAX_HISTORY) {
        //     this.history.shift();
        // }
    }

    public get tick(): number {
        return this.currentTick;
    }
}

