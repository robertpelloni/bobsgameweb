import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { ScriptComponent } from '../components/ScriptComponent';
import { World } from '../World';

export class ScriptSystem extends System {
    private world: World;

    constructor(world: World) {
        super();
        this.world = world;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const scriptComp = components.get('Script') as ScriptComponent;
            if (scriptComp && scriptComp.updateFn) {
                try {
                    scriptComp.updateFn(dt, entityId, this.world);
                } catch (e) {
                    console.error(`Error in script ${scriptComp.scriptName}:`, e);
                }
            }
        }
    }

    public hotReload(entityId: EntityId, newSource: string): void {
        const components = (this.world as any).entities.get(entityId);
        if (components) {
            const scriptComp = components.get('Script') as ScriptComponent;
            if (scriptComp) {
                console.log(`[ScriptSystem] Hot-reloading ${scriptComp.scriptName}...`);
                scriptComp.sourceCode = newSource;
                // Dangerous but useful for Omni-Engine demo
                scriptComp.updateFn = new Function('dt', 'entityId', 'world', newSource) as any;
            }
        }
    }
}
