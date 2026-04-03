import { Behavior } from '../components/BehaviorComponent';
import { TransformComponent } from '../components/TransformComponent';
import { PathfindingComponent } from '../components/PathfindingComponent';
import { AudioManager } from '../../../audio/AudioManager';
import { World } from '../World';

export class NPCBehavior extends Behavior {
    public readonly typeName = 'NPC';
    private world: World;
    private timer: number = 0;
    private state: 'idle' | 'walking' | 'pathing' = 'idle';
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
        const pathComp = this.world.getComponent<PathfindingComponent>(this.entityId, 'Pathfinding');
        if (!transform) return;

        this.timer += dt;

        if (this.state === 'idle' && this.timer > 2) {
            // Decide between random walk or pathing to a specific location
            if (pathComp && Math.random() > 0.5) {
                this.state = 'pathing';
                this.timer = 0;
                this.requestPathToRandom(transform, pathComp);
            } else {
                this.state = 'walking';
                this.timer = 0;
                this.walkTimer = 1 + Math.random() * 2;
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * 50;
                this.vy = Math.sin(angle) * 50;
            }
        } else if (this.state === 'walking') {
            transform.x += this.vx * dt;
            transform.y += this.vy * dt;

            if (Math.random() < 0.02) {
                AudioManager.playSpatialSound('piece_move', transform.x, transform.y, 0, { volume: 0.2 });
            }

            if (this.timer > this.walkTimer) {
                this.state = 'idle';
                this.timer = 0;
            }
        } else if (this.state === 'pathing') {
            if (pathComp && pathComp.path.length === 0 && !pathComp.isCalculating) {
                this.state = 'idle';
                this.timer = 0;
            }
        }
    }

    private requestPathToRandom(transform: TransformComponent, pathComp: PathfindingComponent): void {
        const worker = (this.world as any).worker as Worker;
        if (!worker) return;

        const targetX = Math.floor(Math.random() * 100);
        const targetY = Math.floor(Math.random() * 100);
        
        pathComp.isCalculating = true;
        worker.postMessage({
            type: 'findPath',
            data: {
                entityId: this.entityId,
                start: { x: Math.floor(transform.x / 8), y: Math.floor(transform.y / 8) },
                end: { x: targetX, y: targetY },
                grid: new Int32Array(100 * 100), // In a real app, this would be the actual map grid
                width: 100,
                height: 100
            }
        });
    }
}

