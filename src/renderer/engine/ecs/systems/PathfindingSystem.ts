import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { PathfindingComponent } from '../components/PathfindingComponent';
import { TransformComponent } from '../components/TransformComponent';

export class PathfindingSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const pathComp = components.get('Pathfinding') as PathfindingComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (pathComp && transform && pathComp.path.length > 0) {
                const target = pathComp.path[0];
                const targetX = target.x * 8; // Assuming 8x8 tiles
                const targetY = target.y * 8;

                const dx = targetX - transform.x;
                const dy = targetY - transform.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 2) {
                    pathComp.path.shift();
                } else {
                    transform.x += (dx / dist) * pathComp.moveSpeed * dt;
                    transform.y += (dy / dist) * pathComp.moveSpeed * dt;
                }
            }
        }
    }
}
