import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { AIComponent } from '../components/AIComponent';
import { TransformComponent } from '../components/TransformComponent';
import { PathfindingComponent } from '../components/PathfindingComponent';

export class AISystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        const playerEntity = Array.from(entities.values()).find(c => c.has('Behavior'));
        if (!playerEntity) return;
        const playerTransform = playerEntity.get('Transform') as TransformComponent;

        for (const [entityId, components] of entities) {
            const ai = components.get('AI') as AIComponent;
            const transform = components.get('Transform') as TransformComponent;
            const pathComp = components.get('Pathfinding') as PathfindingComponent;

            if (ai && transform && pathComp) {
                this.updateNPCState(ai, transform, playerTransform, pathComp);
            }
        }
    }

    private updateNPCState(ai: AIComponent, transform: TransformComponent, playerTransform: TransformComponent, pathComp: PathfindingComponent): void {
        const dx = playerTransform.x - transform.x;
        const dy = playerTransform.y - transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ai.detectionRadius) {
            ai.state = 'chase';
            pathComp.targetX = Math.floor(playerTransform.x / 8);
            pathComp.targetY = Math.floor(playerTransform.y / 8);
            // In a real app, we would request a path update here
        } else if (ai.state === 'chase') {
            ai.state = 'patrol';
        }
    }
}
