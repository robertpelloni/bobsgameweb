import { Behavior } from '../components/BehaviorComponent';
import { TransformComponent } from '../components/TransformComponent';
import { AudioManager } from '../../../audio/AudioManager';
import { World } from '../World';

export class NPCBehavior extends Behavior {
    public readonly typeName = 'NPC';
    private world: World;
    private timer: number = 0;
    private state: 'idle' | 'walking' = 'idle';
    private walkTimer: number = 0;
    private vx: number = 0;
    private vy: number = 0;

    constructor(world: World) {
        super();
        this.world = world;
    }

    public onInit(): void {}

    public onUpdate(dt: number): void {
        const transform = this.world.getComponent<TransformComponent>(this.entityId, 'Transform');
        if (!transform) return;

        this.timer += dt;

        if (this.state === 'idle' && this.timer > 2) {
            this.state = 'walking';
            this.timer = 0;
            this.walkTimer = 1 + Math.random() * 2;
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * 50;
            this.vy = Math.sin(angle) * 50;
        } else if (this.state === 'walking') {
            transform.x += this.vx * dt;
            transform.y += this.vy * dt;

            // Play spatial footstep sound every few frames
            if (Math.random() < 0.02) {
                AudioManager.playSpatialSound('piece_move', transform.x, transform.y, 0, { volume: 0.2 });
            }

            if (this.timer > this.walkTimer) {
                this.state = 'idle';
                this.timer = 0;
            }
        }
    }
}
