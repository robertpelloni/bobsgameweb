import { BaseEntity } from './BaseEntity';
import { SpriteAtlas } from '../map/SpriteAtlas';

/**
 * YuuEntity — Main protagonist entity.
 * Implements specific idle jitter and breathing.
 */
export class YuuEntity extends BaseEntity {
    constructor(spriteAtlas: SpriteAtlas) {
        super(spriteAtlas, 'yuu', { width: 16, height: 32 });
        this.hitBoxOffset = 30; // Adult
    }

    protected updateIdle(dt: number): void {
        if (!this.sprite) return;

        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
            this.idleTimer = 0.5 + Math.random() * 1.0;
            this.idleFrame = (this.idleFrame === 0) ? 3 : 0;
        }
        this.sprite.gotoAndStop(this.idleFrame);

        // Subtle jitter
        if (Math.random() < 0.3) {
            this.sprite.x = this.x + (Math.random() < 0.5 ? -0.5 : 0.5);
        } else {
            this.sprite.x = this.x;
        }
    }
}
