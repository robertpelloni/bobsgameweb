
import { Container } from 'pixi.js';

export abstract class BehaviorComponent {
    protected gameObject: any; // Will be typed properly

    constructor(gameObject: any) {
        this.gameObject = gameObject;
    }

    abstract update(delta: number): void;
}

export class PlatformerBehavior extends BehaviorComponent {
    public velocityY: number = 0;
    public velocityX: number = 0;
    public gravity: number = 0.5;
    public jumpStrength: number = -10;
    public speed: number = 3;
    public isGrounded: boolean = false;

    update(delta: number): void {
        this.velocityY += this.gravity * delta;
        this.gameObject.y += this.velocityY * delta;
        this.gameObject.x += this.velocityX * delta;

        // Simple floor collision mock
        if (this.gameObject.y > 500) {
            this.gameObject.y = 500;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    jump(): void {
        if (this.isGrounded) {
            this.velocityY = this.jumpStrength;
        }
    }
}

export class EightDirectionBehavior extends BehaviorComponent {
    public speed: number = 4;
    public velocityX: number = 0;
    public velocityY: number = 0;

    update(delta: number): void {
        this.gameObject.x += this.velocityX * this.speed * delta;
        this.gameObject.y += this.velocityY * this.speed * delta;
    }

    move(dx: number, dy: number): void {
        this.velocityX = dx;
        this.velocityY = dy;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            this.velocityX /= length;
            this.velocityY /= length;
        }
    }
}
