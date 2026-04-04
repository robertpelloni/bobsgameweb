import { Behavior } from '../components/BehaviorComponent';
import { TransformComponent } from '../components/TransformComponent';
import { PathfindingComponent } from '../components/PathfindingComponent';
import { InteractionComponent } from '../components/InteractionComponent';
import { ShopComponent } from '../components/ShopComponent';
import { AIComponent } from '../components/AIComponent';
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
        const interactionComp = this.world.getComponent<InteractionComponent>(this.entityId, 'Interaction');
        const aiComp = this.world.getComponent<AIComponent>(this.entityId, 'AI');
        
        if (!transform) return;

        this.timer += dt;

        // AI State Logic
        if (aiComp && pathComp && aiComp.state === 'chase' && this.timer > 0.5) {
            this.timer = 0;
            const playerTransform = (this.world as any).scene?.playerTransform as TransformComponent;
            if (playerTransform) {
                this.requestPathToTarget(transform, pathComp, playerTransform.x / 8, playerTransform.y / 8);
            }
        }

        // Check for player proximity and interaction
        const playerTransform = (this.world as any).scene?.playerTransform as TransformComponent;
        if (playerTransform && interactionComp) {
            const dx = playerTransform.x - transform.x;
            const dy = playerTransform.y - transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 40 && (this.world as any).scene?.isActionJustPressed) {
                this.triggerInteractions(interactionComp);
            }
        }

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
                    // Add quest logic
                    break;
            }
        }
    }

    private requestPathToRandom(transform: TransformComponent, pathComp: PathfindingComponent): void {
        const targetX = Math.floor(Math.random() * 100);
        const targetY = Math.floor(Math.random() * 100);
        this.requestPathToTarget(transform, pathComp, targetX, targetY);
    }

    private requestPathToTarget(transform: TransformComponent, pathComp: PathfindingComponent, tx: number, ty: number): void {
        const worker = (this.world as any).worker as Worker;
        if (!worker) return;

        pathComp.isCalculating = true;
        worker.postMessage({
            type: 'findPath',
            data: {
                entityId: this.entityId,
                start: { x: Math.floor(transform.x / 8), y: Math.floor(transform.y / 8) },
                end: { x: tx, y: ty },
                grid: new Int32Array(100 * 100),
                width: 100, height: 100
            }
        });
    }
}

