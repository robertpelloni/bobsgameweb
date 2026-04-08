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
import { CinematicsManager } from '../engine/cinematics/CinematicsManager';
import { PathFinder, TilePath, type TileDataProvider } from '../engine/entity/PathFinder';
import { EventManager, EventTrigger, BobEvent, EventCommand, Flag, Skill, Dialogue } from '../engine/rpg/event';
import { GameClock } from '../engine/rpg/Clock';
import { Wallet } from '../engine/rpg/Wallet';
import { Item } from '../engine/rpg/Item';
import { Easing } from '../engine/rpg/Easing';
import { DialogueBox, FloatingTextManager } from '../engine/text';
import { Sprite, Graphics, Text, TextStyle, Container } from 'pixi.js';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';

export class EngineDemoScene extends Scene {
    private world: World;
    private followTarget: TransformComponent | null = null;
    private cinematics: CinematicsManager;
    private gameClock: GameClock;
    private wallet: Wallet;
    private eventManager: EventManager;
    private floatingText: FloatingTextManager;
    private dialogueBox: DialogueBox;
    private pathDisplay: Graphics;

    constructor(config: SceneConfig) {
        super(config);
        this.world = new World();
        this.cinematics = new CinematicsManager(this.width, this.height);
        this.gameClock = new GameClock();
        this.wallet = new Wallet(99.99);
        this.eventManager = new EventManager();
        this.floatingText = new FloatingTextManager(this.container);
        this.dialogueBox = new DialogueBox({ width: this.width - 40 });
        this.dialogueBox.setPosition(20, this.height - 140);
        this.pathDisplay = new Graphics();
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

        // Help text
        const helpStyle = new TextStyle({ fill: 0x88aacc, fontSize: 12 });
        const helpText = new Text({
            text: '[1] Hot-Reload  [2] Fade to Black  [3] Letterbox  [4] Test Dialogue  [5] Drop Money  [6] Pathfind  [Esc] Back',
            style: helpStyle
        });
        helpText.position.set(20, 45);
        this.container.addChild(helpText);

        // Add cinematics overlay
        this.container.addChild(this.cinematics.getContainer());

        // Add pathfinding display
        this.container.addChild(this.pathDisplay);
        this.pathDisplay.position.set(20, 70);

        // Add dialogue box
        this.container.addChild(this.dialogueBox.getDisplayObject());

        // Setup RPG systems demo
        this.setupRPGDemo();

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

    private setupRPGDemo(): void {
        // Flags
        this.eventManager.setFlag(1, true); // 'entered_area'
        this.eventManager.setFlag(2, false); // 'boss_defeated'

        // Skills
        this.eventManager.setSkill(1, 42.5); // 'strength'
        this.eventManager.setSkill(2, 15.0); // 'charisma'

        // Dialogues
        this.eventManager.setDialogueDone(1, true); // 'intro_conversation'

        // Items
        const sword = new Item(1, 'Wooden Sword', 'A basic training sword.');
        sword.setAcquired(true);
        const shield = new Item(2, 'Iron Shield', 'Sturdy and reliable.');

        // Register a test event
        const testEvent = new BobEvent(1, 'on_enter_area', EventTrigger.ENTER_AREA);
        testEvent.commands.push(EventCommand.parse('SHOW_TEXT:Welcome to the omni-engine demo!'));
        this.eventManager.registerEvent(testEvent);
    }

    protected override onUpdate(dt: number): void {
        this.world.update(dt);
        this.cinematics.update(dt);
        this.gameClock.update(dt);
        this.floatingText.update(dt);
        this.dialogueBox.update(dt);

        // Render cinematics
        this.cinematics.renderAll();

        if (InputManager.isKeyPressed(Key.Num1)) this.app.stage.emit('hot-reload-test');

        // Cinematic effects
        if (InputManager.isKeyPressed(Key.Num2)) {
            this.cinematics.fadeToBlack(500);
            setTimeout(() => this.cinematics.fadeFromBlack(500), 1500);
        }
        if (InputManager.isKeyPressed(Key.Num3)) {
            this.cinematics.setLetterbox(true, 1000, 60);
            setTimeout(() => this.cinematics.setLetterbox(false, 1000), 3000);
        }

        // Dialogue demo
        if (InputManager.isKeyPressed(Key.Num4)) {
            const time = this.gameClock.getTimeString();
            const money = this.wallet.getMoneyString();
            const str = this.eventManager.checkFlag(1) ? 'entered' : 'not entered';
            this.dialogueBox.show(
                `In-game time: ${time} | Money: ${money} | Area: ${str}\n` +
                `Strength: ${this.eventManager.getSkillValue(1).toFixed(1)} | ` +
                `Intro done: ${this.eventManager.isDialogueDone(1)}`,
            );
        }

        // Drop money
        if (InputManager.isKeyPressed(Key.Num5)) {
            this.wallet.add(5);
            this.floatingText.addText('+$5.00', this.centerX, this.height * 0.6, {
                color: 0x00ff00, fontSize: 20, duration: 2000,
            });
        }

        // Pathfinding demo
        if (InputManager.isKeyPressed(Key.Num6)) {
            this.demoPathfinding();
        }

        // Cancel
        if (InputManager.isCancelPressed()) {
            this.dialogueBox.hide();
            if (this.camera) {
                this.camera.clearTargets();
                this.camera.setPosition(0, 0);
                this.camera.zoom = 1.0;
            }
            StateManager.pop();
        }
    }

    private demoPathfinding(): void {
        const mapW = 20;
        const mapH = 10;
        const tileSize = 6;

        // Simple tile data with some walls
        const walls = new Set<string>();
        for (let x = 5; x <= 5; x++)
            for (let y = 1; y <= 6; y++) walls.add(`${x},${y}`);
        for (let x = 10; x <= 15; x++)
            walls.add(`${x},5`);

        const tileData: TileDataProvider = {
            isBlocked: (x, y) => walls.has(`${x},${y}`) || x < 0 || y < 0 || x >= mapW || y >= mapH,
            getTileCost: () => 1,
        };

        const finder = new PathFinder(tileData, mapW, mapH, 200, false);
        const path = finder.findPath(1, 1, 18, 8);

        this.pathDisplay.clear();

        // Draw map grid
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const blocked = walls.has(`${x},${y}`);
                this.pathDisplay.rect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
                this.pathDisplay.fill(blocked ? 0x880000 : 0x222244);
            }
        }

        // Draw path
        if (path) {
            for (let i = 0; i < path.getLength(); i++) {
                const tx = path.getTileXForIndex(i);
                const ty = path.getTileYForIndex(i);
                this.pathDisplay.rect(tx * tileSize, ty * tileSize, tileSize - 1, tileSize - 1);
                this.pathDisplay.fill(i === 0 ? 0x00ff00 : i === path.getLength() - 1 ? 0xff0000 : 0xffff00);
            }
        }
    }
}
