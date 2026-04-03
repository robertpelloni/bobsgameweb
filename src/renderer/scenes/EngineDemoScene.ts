import { Scene, SceneConfig } from '../state/Scene';
import { World } from '../engine/ecs/World';
import { RenderSystem } from '../engine/ecs/systems/RenderSystem';
import { BehaviorSystem } from '../engine/ecs/systems/BehaviorSystem';
import { TransformComponent } from '../engine/ecs/components/TransformComponent';
import { SpriteComponent } from '../engine/ecs/components/SpriteComponent';
import { BehaviorComponent } from '../engine/ecs/components/BehaviorComponent';
import { EightDirectionBehavior } from '../engine/ecs/behaviors/EightDirectionBehavior';
import { PlatformerBehavior } from '../engine/ecs/behaviors/PlatformerBehavior';
import { Sprite, Graphics, Text } from 'pixi.js';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';

export class EngineDemoScene extends Scene {
    private world: World;

    constructor(config: SceneConfig) {
        super(config);
        this.world = new World();
    }

    public async create(): Promise<void> {
        // Setup systems
        this.world.addSystem(new BehaviorSystem());
        this.world.addSystem(new RenderSystem(this.container));

        // Add a title
        const title = new Text({
            text: 'Omni-Engine ECS Demo (8-Direction & Platformer)',
            style: { fill: 0xffffff, fontSize: 18 }
        });
        title.position.set(20, 20);
        this.container.addChild(title);

        // 1. Create an 8-Direction entity
        const entity1 = this.world.createEntity();
        
        const transform1 = new TransformComponent();
        transform1.x = 200;
        transform1.y = 200;
        this.world.addComponent(entity1, transform1);

        const sprite1 = new SpriteComponent();
        // Create a dummy graphics object for now
        const g1 = new Graphics();
        g1.rect(-16, -16, 32, 32);
        g1.fill(0x00ff00);
        const tex1 = this.app.renderer.generateTexture(g1);
        sprite1.sprite = new Sprite(tex1);
        this.world.addComponent(entity1, sprite1);

        const behaviors1 = new BehaviorComponent();
        behaviors1.behaviors.push(new EightDirectionBehavior(this.world));
        this.world.addComponent(entity1, behaviors1);

        // 2. Create a Platformer entity
        const entity2 = this.world.createEntity();

        const transform2 = new TransformComponent();
        transform2.x = 400;
        transform2.y = 100;
        this.world.addComponent(entity2, transform2);

        const sprite2 = new SpriteComponent();
        const g2 = new Graphics();
        g2.rect(-16, -16, 32, 32);
        g2.fill(0xff0000);
        const tex2 = this.app.renderer.generateTexture(g2);
        sprite2.sprite = new Sprite(tex2);
        this.world.addComponent(entity2, sprite2);

        const behaviors2 = new BehaviorComponent();
        behaviors2.behaviors.push(new PlatformerBehavior(this.world));
        this.world.addComponent(entity2, behaviors2);
    }

    protected onUpdate(dt: number): void {
        this.world.update(dt);
        
        if (InputManager.isKeyPressed(Key.Escape)) {
            StateManager.pop();
        }
    }
}
