import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { TeleportComponent } from '../components/TeleportComponent';
import { TransformComponent } from '../components/TransformComponent';

export class TeleportSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        const playerEntity = Array.from(entities.values()).find(comps => {
            const transform = comps.get('Transform') as TransformComponent;
            // Assuming player has some specific marker or we use the known player ID
            return comps.has('Behavior'); // Simple check for demo
        });
        
        if (!playerEntity) return;
        const playerTransform = playerEntity.get('Transform') as TransformComponent;

        for (const [entityId, components] of entities) {
            const teleport = components.get('Teleport') as TeleportComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (teleport && transform) {
                // Check AABB collision
                if (playerTransform.x < transform.x + teleport.width &&
                    playerTransform.x + 32 > transform.x &&
                    playerTransform.y < transform.y + teleport.height &&
                    playerTransform.y + 48 > transform.y) {
                    
                    // Trigger teleport
                    console.log(`[TeleportSystem] Triggering teleport to ${teleport.targetMapId}`);
                    (this as any).scene?.changeMap(teleport.targetMapId, teleport.targetX, teleport.targetY);
                }
            }
        }
    }
}
