import { Behavior } from '../components/BehaviorComponent';
import { TransformComponent } from '../components/TransformComponent';
import { PathfindingComponent } from '../components/PathfindingComponent';
import { InteractionComponent } from '../components/InteractionComponent';
import { ShopComponent } from '../components/ShopComponent';
import { AIComponent } from '../components/AIComponent';
import { AudioManager } from '../../../audio/AudioManager';
import { World } from '../World';

import { MapData } from '../../../../shared/MapData';
export class NPCBehavior extends Behavior {
    public readonly typeName = 'NPC';
    private world: World;
    private timer: number = 0;
    private state: 'idle' | 'walking' | 'pathing' = 'idle';
    private walkTimer: number = 0;
    private vx: number = 0;
    private vy: number = 0;
    private facingDirection: number = 0; // 0=down, 1=left, 2=right, 3=up

    constructor(world: World) {
        super();
        this.world = world;
    }

    public onInit(): void {}

    public onUpdate(dt: number): void {
        const transform = this.world.getComponent<TransformComponent>(this.entityId, 'Transform');
        if (!transform) return;

        this.timer += dt;

        // Check for player proximity and interaction
        const scene = (this.world as any).scene;
        const playerTransform = scene?.playerTransform as TransformComponent;
        const interactionComp = this.world.getComponent<InteractionComponent>(this.entityId, 'Interaction');

        if (playerTransform && interactionComp) {
            const dx = playerTransform.x - transform.x;
            const dy = playerTransform.y - transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Face the player when close
            if (dist < 48) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.facingDirection = dx > 0 ? 2 : 1; // right : left
                } else {
                    this.facingDirection = dy > 0 ? 0 : 3; // down : up
                }
                this.updateSpriteAnimation(false);
            }

            if (dist < 40 && scene?.isActionJustPressed) {
                // this.triggerInteractions(interactionComp); // Handled by WorldScene
            }
        }

        if (this.state === 'idle' && this.timer > 2 + Math.random() * 3) {
            // Random idle: change facing direction occasionally
            if (Math.random() > 0.6) {
                this.facingDirection = Math.floor(Math.random() * 4);
                this.updateSpriteAnimation(false);
            }
            // Decide to walk
            if (Math.random() > 0.4) {
                this.state = 'walking';
                this.timer = 0;
                this.walkTimer = 0.8 + Math.random() * 1.5;
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * 40;
                this.vy = Math.sin(angle) * 40;
                // Update facing direction based on walk direction
                if (Math.abs(this.vx) > Math.abs(this.vy)) {
                    this.facingDirection = this.vx > 0 ? 2 : 1;
                } else {
                    this.facingDirection = this.vy > 0 ? 0 : 3;
                }
                this.updateSpriteAnimation(true);
            } else {
                this.timer = 0;
            }
        } else if (this.state === 'walking') {
            const newX = transform.x + this.vx * dt;
            const newY = transform.y + this.vy * dt;
            // Check wall collision before moving
            const TILE_PX = 8;
            const scene = (this.world as any).scene;
            const map = scene?.map;
            if (map) {
                const testTx = Math.floor(newX / TILE_PX);
                const testTy = Math.floor(newY / TILE_PX);
                // Use hitBounds layer (authoritative) + void check
      const hitTile = map.data.getTileIndex(MapData.MAP_HIT_LAYER, testTx, testTy);
      let walkable = hitTile === 0;
      if (walkable) {
        const gndTile = map.data.getTileIndex(MapData.MAP_GROUND_LAYER, testTx, testTy);
        const objTile = map.data.getTileIndex(MapData.MAP_OBJECT_LAYER, testTx, testTy);
        if (gndTile === 0 && objTile === 0) walkable = false;
      }
      if (walkable) {
        const obj2Tile = map.data.getTileIndex(MapData.MAP_OBJECT_DETAIL_LAYER, testTx, testTy);
        if (obj2Tile !== 0) walkable = false;
      }

      if (walkable) {
        transform.x = newX;
        transform.y = newY;
      } else {
                    // Hit a wall, stop walking
                    this.state = 'idle';
                    this.timer = 0;
                    this.updateSpriteAnimation(false);
                }
            } else {
                transform.x = newX;
                transform.y = newY;
            }

            if (this.timer > this.walkTimer) {
                this.state = 'idle';
                this.timer = 0;
                this.updateSpriteAnimation(false);
            }
        }
    }

    /** Update sprite animation frames based on direction and movement */
    private updateSpriteAnimation(isMoving: boolean): void {
        const spriteComp = this.world.getComponent<any>(this.entityId, 'Sprite');
        if (!spriteComp?.sprite?.textures) return; // Not an AnimatedSprite

        const scene = (this.world as any).scene;
        if (!scene?.spriteAtlas) return;

        const entityName = spriteComp.assetId || '';
        const dirNames = ['Down', 'Up', 'Left', 'Right'];
  const dirName = dirNames[this.facingDirection] || 'Down';
  const frames = scene.spriteAtlas.getAnimationFrames(entityName, dirName);
        if (frames.length > 0 && spriteComp.sprite.textures !== frames) {
            spriteComp.sprite.textures = frames;
        }
        spriteComp.sprite.animationSpeed = isMoving ? 0.1 : 0;
    }

    private triggerInteractions(comp: InteractionComponent): void {
        for (const inter of comp.interactions) {
            switch (inter.type) {
                case 'dialogue':
                    (this.world as any).scene?.showDialogue(inter.params.text, true);
                    break;
                case 'battle':
                    (this.world as any).scene?.startBattle(this.entityId);
                    break;
                case 'shop':
                    const shopComp = this.world.getComponent<ShopComponent>(this.entityId, 'Shop');
                    if (shopComp) {
                        (this.world as any).scene?.openShop(shopComp);
                    }
                    break;
                case 'teleport':
                    (this.world as any).scene?.changeMap(inter.params.targetMapId, inter.params.targetX, inter.params.targetY);
                    break;
                case 'quest':
                    break;
            }
        }
    }
}
