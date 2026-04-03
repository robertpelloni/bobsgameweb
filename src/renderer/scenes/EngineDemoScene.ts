import { Scene, SceneConfig } from '../state/Scene';
import { World } from '../engine/ecs/World';
import { RenderSystem } from '../engine/ecs/systems/RenderSystem';
import { BehaviorSystem } from '../engine/ecs/systems/BehaviorSystem';
import { TransformComponent } from '../engine/ecs/components/TransformComponent';
import { SpriteComponent } from '../engine/ecs/components/SpriteComponent';
import { BehaviorComponent } from '../engine/ecs/components/BehaviorComponent';
import { EventSheetComponent } from '../engine/ecs/components/EventSheetComponent';
import { VisualScriptSystem } from '../engine/ecs/systems/VisualScriptSystem';
import { EightDirectionBehavior } from '../engine/ecs/behaviors/EightDirectionBehavior';
import { PlatformerBehavior } from '../engine/ecs/behaviors/PlatformerBehavior';
import { GraphicsComponent } from '../engine/ecs/components/GraphicsComponent';
import { GraphicsSystem } from '../engine/ecs/systems/GraphicsSystem';
import { ScriptComponent } from '../engine/ecs/components/ScriptComponent';
import { ScriptSystem } from '../engine/ecs/systems/ScriptSystem';
import { Sprite, Graphics, Text } from 'pixi.js';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';

export class EngineDemoScene extends Scene {
    private world: World;
    private followTarget: TransformComponent | null = null;

    constructor(config: SceneConfig) {
        super(config);
        this.world = new World();
    }

    public async create(): Promise<void> {
        // Setup systems
        this.world.addSystem(new BehaviorSystem());
        this.world.addSystem(new VisualScriptSystem());
        const scriptSystem = new ScriptSystem(this.world);
        this.world.addSystem(scriptSystem);
        this.world.addSystem(new GraphicsSystem(this.container));
        this.world.addSystem(new RenderSystem(this.container));

        // Add a title
        const title = new Text({
            text: 'Omni-Engine ECS Demo (Camera Follow Platformer)',
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

        // Make camera follow the platformer entity
        this.followTarget = transform2;
        if (this.camera) {
            this.camera.setContainer(this.container);
            this.camera.clearTargets();
            this.camera.addTarget(this.followTarget);
            this.camera.setLerp(0.05);
        }

        // 3. Create an Event-driven entity (Log every 100 ticks)
        const entity3 = this.world.createEntity();
        const esComp = new EventSheetComponent();
        esComp.variables.set('counter', 0);
        
        const sheet = {
            name: "Test Sheet",
            blocks: [
                {
                    conditions: [{ type: 'Always', params: {} }],
                    actions: [{ type: 'AddVariable', params: { name: 'counter', value: 1 } }]
                },
                {
                    conditions: [{ type: 'VariableGreaterThan', params: { name: 'counter', value: 100 } }],
                    actions: [
                        { type: 'Log', params: { message: "Counter reached 100! Resetting." } },
                        { type: 'SetVariable', params: { name: 'counter', value: 0 } }
                    ]
                }
            ]
        };
        esComp.eventSheets.push(sheet);
        this.world.addComponent(entity3, esComp);

        // 4. Create a LÖVE-style immediate mode entity (Spinning Star)
        const entity4 = this.world.createEntity();
        const transform4 = new TransformComponent();
        transform4.x = 600;
        transform4.y = 300;
        this.world.addComponent(entity4, transform4);

        const gfxComp = new GraphicsComponent();
        let rotation = 0;
        gfxComp.renderCallback = (g) => {
            rotation += 0.05;
            const points = [];
            for (let i = 0; i < 5; i++) {
                const angle = rotation + (i * Math.PI * 2) / 5;
                points.push(Math.cos(angle) * 30, Math.sin(angle) * 30);
                const angle2 = rotation + ((i + 0.5) * Math.PI * 2) / 5;
                points.push(Math.cos(angle2) * 15, Math.sin(angle2) * 15);
            }
            g.fillPolygon(points, 0xffff00);
            g.strokePolygon(points, 0xffffff, 1, 2);
        };
        this.world.addComponent(entity4, gfxComp);

        // 5. Create a Scripted entity (Hot-reloadable circular movement)
        const entity5 = this.world.createEntity();
        const transform5 = new TransformComponent();
        transform5.x = 200;
        transform5.y = 400;
        this.world.addComponent(entity5, transform5);

        const sprite5 = new SpriteComponent();
        const g5 = new Graphics();
        g5.circle(0, 0, 10);
        g5.fill(0x00ffff);
        const tex5 = this.app.renderer.generateTexture(g5);
        sprite5.sprite = new Sprite(tex5);
        this.world.addComponent(entity5, sprite5);

        const scriptComp = new ScriptComponent();
        scriptComp.scriptName = 'CircularMove';
        scriptComp.sourceCode = `
            const transform = world.getComponent(entityId, 'Transform');
            if (transform) {
                const t = Date.now() / 1000;
                transform.x = 200 + Math.cos(t) * 50;
                transform.y = 400 + Math.sin(t) * 50;
            }
        `;
        scriptComp.updateFn = new Function('dt', 'entityId', 'world', scriptComp.sourceCode) as any;
        this.world.addComponent(entity5, scriptComp);

        // Demo hot-reload on key press
        this.app.stage.on('hot-reload-test', () => {
            scriptSystem.hotReload(entity5, `
                const transform = world.getComponent(entityId, 'Transform');
                if (transform) {
                    const t = Date.now() / 500;
                    transform.x = 200 + Math.cos(t) * 100;
                    transform.y = 400 + Math.sin(t) * 20;
                    transform.rotation += 0.1;
                }
            `);
        });
    }

    protected onUpdate(dt: number): void {
        this.world.update(dt);
        
        if (InputManager.isKeyPressed(Key.Num1)) this.app.stage.emit('hot-reload-test');

        if (InputManager.isKeyPressed(Key.Escape)) {
            if (this.camera) {
                this.camera.clearTargets();
                this.camera.setPosition(0, 0);
                this.camera.zoom = 1.0;
            }
            StateManager.pop();
        }
    }
}
