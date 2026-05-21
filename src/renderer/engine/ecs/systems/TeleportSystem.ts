import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { TeleportComponent } from '../components/TeleportComponent';
import { TransformComponent } from '../components/TransformComponent';
import { CombatComponent } from '../components/CombatComponent';

export class TeleportSystem extends System {
  /** Cooldown to prevent re-triggering the same door */
  private cooldown = 0;

  public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }

    // Find the player entity by CombatComponent.isPlayer
    let playerTransform: TransformComponent | null = null;
    for (const [, components] of entities) {
      const combat = components.get('Combat') as CombatComponent | undefined;
      if (combat?.isPlayer) {
        playerTransform = components.get('Transform') as TransformComponent;
        break;
      }
    }
    if (!playerTransform) return;

    // Player collision box (matches movement system: centered, feet area)
    const playerX = playerTransform.x - 4; // OX = -4
    const playerY = playerTransform.y;
    const playerW = 8;
    const playerH = 8;

    // Check all entities with TeleportComponent
    for (const [entityId, components] of entities) {
      const teleport = components.get('Teleport') as TeleportComponent | undefined;
      const transform = components.get('Transform') as TransformComponent | undefined;
      if (!teleport || !transform) continue;

      // Skip if no destination
      if (!teleport.targetMapId) continue;

      // AABB collision check (with padding for easier door entry)
      const PADDING = 4;
      const doorX = transform.x - PADDING;
      const doorY = transform.y - PADDING;
      const doorW = (teleport.width || 8) + PADDING * 2;
      const doorH = (teleport.height || 8) + PADDING * 2;

      const overlaps = (
        playerX < doorX + doorW &&
        playerX + playerW > doorX &&
        playerY < doorY + doorH &&
        playerY + playerH > doorY
      );

      if (overlaps) {
        console.log(`[TeleportSystem] Door "${teleport.targetMapId}" at (${doorX},${doorY})`);
        this.cooldown = 1000; // 1s cooldown
        const scene = (this as any).scene;
        if (scene?.changeMap) {
          scene.changeMap(teleport.targetMapId, teleport.targetX, teleport.targetY);
        }
        return;
      }
    }
  }
}
