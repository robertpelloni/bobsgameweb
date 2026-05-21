import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { TransformComponent } from '../components/TransformComponent';
import { SpriteComponent } from '../components/SpriteComponent';
import { Container } from 'pixi.js';

export class RenderSystem extends System {
  public stage: Container;

  constructor(stage: Container) {
    super();
    this.stage = stage;
    this.stage.sortableChildren = true;
  }

  /** Update the stage container (e.g. switch to entitySpriteContainer) */
  public setStage(stage: Container): void {
    this.stage = stage;
    this.stage.sortableChildren = true;
  }

  public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
    for (const [entityId, components] of entities) {
      const transform = components.get('Transform') as TransformComponent;
      const spriteComp = components.get('Sprite') as SpriteComponent;
      if (transform && spriteComp && spriteComp.sprite) {
        const s = spriteComp.sprite;
        if (!s.parent) {
          this.stage.addChild(s);
        }
        s.position.set(transform.x, transform.y);
        s.rotation = transform.rotation;
        s.visible = spriteComp.visible;
        s.alpha = spriteComp.alpha;

        // Y-based depth sorting for proper overlapping
        // Objects lower on screen (higher Y) should appear in front
        s.zIndex = transform.y;

        // Apply facing direction scale from the facingRight flag
        // This allows the movement code to set facing via transform.scaleX
        s.scale.set(transform.scaleX, transform.scaleY);
      }
    }

    // Sort children by zIndex for proper depth ordering
    this.stage.sortChildren();
  }
}
