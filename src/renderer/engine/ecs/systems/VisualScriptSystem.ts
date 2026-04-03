import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { EventSheetComponent } from '../components/EventSheetComponent';
import { EventCondition, EventAction, EventBlock } from '../../eventsheet/EventSheet';

export class VisualScriptSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const esComp = components.get('EventSheet') as EventSheetComponent;
            if (esComp) {
                for (const sheet of esComp.eventSheets) {
                    for (const block of sheet.blocks) {
                        if (this.checkConditions(block.conditions, esComp)) {
                            this.runActions(block.actions, esComp);
                            // Process sub-events
                            if (block.subEvents) {
                                // Nested logic would go here
                            }
                        }
                    }
                }
            }
        }
    }

    private checkConditions(conditions: EventCondition[], comp: EventSheetComponent): boolean {
        for (const cond of conditions) {
            switch (cond.type) {
                case 'Always':
                    break;
                case 'VariableEquals':
                    if (comp.variables.get(cond.params.name) !== cond.params.value) return false;
                    break;
                case 'VariableGreaterThan':
                    if (comp.variables.get(cond.params.name) <= cond.params.value) return false;
                    break;
                default:
                    console.warn(`Unknown condition type: ${cond.type}`);
                    return false;
            }
        }
        return true;
    }

    private runActions(actions: EventAction[], comp: EventSheetComponent): void {
        for (const action of actions) {
            switch (action.type) {
                case 'Log':
                    console.log(`[ECS Event] ${action.params.message}`);
                    break;
                case 'SetVariable':
                    comp.variables.set(action.params.name, action.params.value);
                    break;
                case 'AddVariable':
                    const cur = comp.variables.get(action.params.name) || 0;
                    comp.variables.set(action.params.name, cur + action.params.value);
                    break;
                default:
                    console.warn(`Unknown action type: ${action.type}`);
            }
        }
    }
}
