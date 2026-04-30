import { Behavior } from '../components/BehaviorComponent';
import { TransformComponent } from '../components/TransformComponent';
import { InputManager } from '../../../input/InputManager';
import { World } from '../World';

export class PlatformerBehavior extends Behavior {
    public readonly typeName = 'Platformer';
    private world: World;
    
    private vx: number = 0;
    private vy: number = 0;
    private gravity: number = 1000;
    private jumpForce: number = -500;
    private moveSpeed: number = 300;
    private friction: number = 10;
    private isGrounded: boolean = false;

    constructor(world: World) {
        super();
        this.world = world;
    }

    public onInit(): void {}

    public onUpdate(dt: number): void {
        const transform = this.world.getComponent<TransformComponent>(this.entityId, 'Transform');
        if (!transform) return;

        // Simple horizontal movement
        if (InputManager.isLeftHeld()) {
            this.vx = -this.moveSpeed;
        } else if (InputManager.isRightHeld()) {
            this.vx = this.moveSpeed;
        } else {
            this.vx *= (1 - this.friction * dt);
        }

        // Gravity
        this.vy += this.gravity * dt;

        // Jump
        if (this.isGrounded && InputManager.isActionPressed()) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
        }

        transform.x += this.vx * dt;
        transform.y += this.vy * dt;

        // Dummy floor collision for demo
        if (transform.y > 500) {
            transform.y = 500;
            this.vy = 0;
            this.isGrounded = true;
        }
    }
}
