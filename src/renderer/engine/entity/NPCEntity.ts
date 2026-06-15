import { BaseEntity } from './BaseEntity';
import { SpriteAtlas } from '../map/SpriteAtlas';

/**
 * NPCEntity — Generic NPC entity.
 */
export class NPCEntity extends BaseEntity {
    constructor(spriteAtlas: SpriteAtlas, assetName: string, config?: { height?: number }) {
        super(spriteAtlas, assetName, { width: 16, height: config?.height ?? 32 });

        // Children typically have asset names containing 'kid' or similar,
        // but we'll default to 30 and allow WorldScene to override if it detects a child.
        this.hitBoxOffset = 30;
    }

    protected updateIdle(dt: number): void {
        if (!this.sprite) return;

        // NPCs alternate standing frames occasionally
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
            this.idleTimer = 1.0 + Math.random() * 2.0;
            this.idleFrame = (this.idleFrame === 0) ? 1 : 0;
        }
        this.sprite.gotoAndStop(this.idleFrame);
    }
}
