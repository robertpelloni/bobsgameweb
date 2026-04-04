import { Behavior } from '../components/BehaviorComponent';
import { TransformComponent } from '../components/TransformComponent';
import { InputManager } from '../../../input/InputManager';
import { World } from '../World';

export class EightDirectionBehavior extends Behavior {
    public readonly typeName = 'EightDirection';
    private world: World;
    private speed: number = 200;

    constructor(world: World) {
        super();
        this.world = world;
    }

    public onInit(): void {}

    public onUpdate(dt: number): void {
        const transform = this.world.getComponent<TransformComponent>(this.entityId, 'Transform');
        if (!transform) return;

        let dx = 0;
        let dy = 0;

        if (InputManager.isLeftHeld()) dx -= 1;
        if (InputManager.isRightHeld()) dx += 1;
        if (InputManager.isUpHeld()) dy -= 1;
        if (InputManager.isDownHeld()) dy += 1;

        if (dx !== 0 || dy !== 0) {
            const mag = Math.sqrt(dx * dx + dy * dy);
            transform.x += (dx / mag) * this.speed * dt;
            transform.y += (dy / mag) * this.speed * dt;
        }

        if (InputManager.isActionPressed()) {
            // Check for nearby NPCs to battle
            const entities = (this.world as any).entities as Map<number, Map<string, any>>;
            for (const [id, components] of entities) {
                if (id === this.entityId) continue;
                const npcTransform = components.get('Transform') as TransformComponent;
                if (npcTransform) {
                    const dx = npcTransform.x - transform.x;
                    const dy = npcTransform.y - transform.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 40) {
                        (this.world as any).scene?.startBattle(id);
                        return;
                    }
                }
            }
            
            (this.world as any).scene?.showDialogue("Hello! Welcome to the Omni-Engine MMO World!", true);
        }
    }
}
