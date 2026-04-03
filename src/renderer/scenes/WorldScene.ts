import { Scene, SceneConfig } from '../state/Scene';
import { World } from '../engine/ecs/World';
import { GameMap } from '../engine/map/GameMap';
import { MapData } from '../../shared/MapData';
import { RenderSystem } from '../engine/ecs/systems/RenderSystem';
import { BehaviorSystem } from '../engine/ecs/systems/BehaviorSystem';
import { PathfindingSystem } from '../engine/ecs/systems/PathfindingSystem';
import { TransformComponent } from '../engine/ecs/components/TransformComponent';
import { SpriteComponent } from '../engine/ecs/components/SpriteComponent';
import { BehaviorComponent } from '../engine/ecs/components/BehaviorComponent';
import { PathfindingComponent } from '../engine/ecs/components/PathfindingComponent';
import { CombatComponent } from '../engine/ecs/components/CombatComponent';
import { EightDirectionBehavior } from '../engine/ecs/behaviors/EightDirectionBehavior';
import { NPCBehavior } from '../engine/ecs/behaviors/NPCBehavior';
import { BattleScene } from './BattleScene';
import { Sprite, Graphics, Texture, Container, Text, TextStyle } from 'pixi.js';
import { InputManager, Key } from '../input/InputManager';
import { StateManager } from '../state/StateManager';
import { SceneTransition } from '../state/SceneTransition';
import { Tileset } from '../../shared/Tileset';
import { Palette } from '../../shared/Palette';
import { AudioManager } from '../audio/AudioManager';
import { LightingSystem } from '../engine/ecs/systems/LightingSystem';
import { LightComponent } from '../engine/ecs/components/LightComponent';
import { TouchControls } from '../ui/TouchControls';

import { networkManager } from '../puzzle';
import { SERVER_URL } from '../../shared/Config';

export class WorldScene extends Scene {
    private world: World;
    private map: GameMap | null = null;
    private tileset: Tileset;
    private palette: Palette;
    private playerTransform: TransformComponent | null = null;
    private remotePlayers: Map<string, { entityId: number, transform: TransformComponent }> = new Map();
    private dialogueContainer: Container | null = null;
    private dialogueText: Text | null = null;
    private worker: Worker | null = null;
    
    private consoleContainer: Container | null = null;
    private consoleInput: HTMLInputElement | null = null;
    private consoleActive: boolean = false;
    private worldContainer: Container;
    private touchControls: TouchControls | null = null;

    private lightingSystem: LightingSystem | null = null;

    constructor(config: SceneConfig) {
        super(config);
        this.worldContainer = new Container();
        this.container.addChild(this.worldContainer);
        this.world = new World();
        this.tileset = new Tileset(5000);
        this.palette = new Palette(256);
        this.createDummyTiles();
    }

    private createDummyTiles() {
        for (let i = 1; i < 10; i++) {
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    this.tileset.setPixel(i, x, y, i);
                }
            }
        }
    }

    public async create(): Promise<void> {
        (this.world as any).scene = this;
        
        // Initialize Worker for heavy pathfinding
        this.worker = new Worker(new URL('../engine/GameWorker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
        (this.world as any).worker = this.worker;

        this.world.addSystem(new BehaviorSystem());
        this.world.addSystem(new PathfindingSystem());
        this.world.addSystem(new RenderSystem(this.worldContainer));
        
        this.lightingSystem = new LightingSystem(this.app, this.worldContainer);
        this.world.addSystem(this.lightingSystem);

        const mapData = new MapData(-1, "MMO World", 100, 100);
        this.map = new GameMap(mapData);
        this.worldContainer.addChild(this.map.container);
        this.map.render(this.tileset, this.palette);

        const playerEntity = this.world.createEntity();
        (this.world as any).playerEntityId = playerEntity;
        const transform = new TransformComponent();
        transform.x = 400;
        transform.y = 300;
        this.world.addComponent(playerEntity, transform);

        const sprite = new SpriteComponent();
        const g = new Graphics();
        g.rect(-16, -24, 32, 48);
        g.fill(0x3366ff);
        const tex = this.app.renderer.generateTexture(g);
        sprite.sprite = new Sprite(tex);
        this.world.addComponent(playerEntity, sprite);

        const behavior = new BehaviorComponent();
        behavior.behaviors.push(new EightDirectionBehavior(this.world));
        this.world.addComponent(playerEntity, behavior);

        const playerCombat = new CombatComponent();
        playerCombat.isPlayer = true;
        this.world.addComponent(playerEntity, playerCombat);

        const playerLight = new LightComponent();
        playerLight.radius = 150;
        playerLight.baseRadius = 150;
        playerLight.color = 0xffaa55;
        playerLight.flicker = true;
        this.world.addComponent(playerEntity, playerLight);

        this.playerTransform = transform;

        if (this.camera) {
            this.camera.setContainer(this.worldContainer);
            this.camera.clearTargets();
            this.camera.addTarget(transform);
            this.camera.setLerp(0.1);
        }

        networkManager.connect(SERVER_URL);
        networkManager.on('remotePlayerMove', (data: any) => this.handleRemotePlayerMove(data));
        networkManager.on('remotePlayerAction', (data: any) => this.handleRemotePlayerAction(data));

        this.createNPCs();
        this.createDialogueUI();
        this.createConsoleUI();
        
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.touchControls = new TouchControls(this.width, this.height);
            this.container.addChild(this.touchControls);
        }
    }

    private handleWorkerMessage(msg: any): void {
        if (msg.type === 'pathResult') {
            const components = (this.world as any).entities.get(msg.data.entityId);
            const pathComp = components?.get('Pathfinding') as PathfindingComponent;
            if (pathComp) {
                pathComp.path = msg.data.path;
                pathComp.isCalculating = false;
            }
        }
    }

    private createDialogueUI(): void {
        this.dialogueContainer = new Container();
        this.dialogueContainer.visible = false;
        this.container.addChild(this.dialogueContainer);

        const bg = new Graphics();
        bg.rect(50, this.height - 150, this.width - 100, 100);
        bg.fill({ color: 0x000000, alpha: 0.8 });
        bg.stroke({ color: 0xffffff, width: 2 });
        this.dialogueContainer.addChild(bg);

        const style = new TextStyle({
            fill: '#ffffff',
            fontSize: 18,
            wordWrap: true,
            wordWrapWidth: this.width - 140
        });

        this.dialogueText = new Text({ text: '', style });
        this.dialogueText.position.set(70, this.height - 130);
        this.dialogueContainer.addChild(this.dialogueText);
    }

    public showDialogue(message: string): void {
        if (this.dialogueText && this.dialogueContainer) {
            this.dialogueText.text = message;
            this.dialogueContainer.visible = true;
            setTimeout(() => {
                if (this.dialogueContainer) this.dialogueContainer.visible = false;
            }, 3000);
        }
    }

    public startBattle(npcEntityId: number): void {
        const playerCombat = this.world.getComponent<CombatComponent>((this.world as any).playerEntityId, 'Combat');
        const npcCombat = this.world.getComponent<CombatComponent>(npcEntityId, 'Combat');

        if (playerCombat && npcCombat) {
            const battleScene = new BattleScene({
                name: 'battle',
                app: this.app,
                camera: this.camera ?? undefined,
                player: playerCombat,
                enemy: npcCombat
            });
            SceneTransition.pushWithFade(this.app, battleScene);
        }
    }

    private createNPCs(): void {
        for (let i = 0; i < 5; i++) {
            const entity = this.world.createEntity();
            const transform = new TransformComponent();
            transform.x = 200 + Math.random() * 400;
            transform.y = 200 + Math.random() * 400;
            this.world.addComponent(entity, transform);

            const sprite = new SpriteComponent();
            const g = new Graphics();
            g.rect(-16, -24, 32, 48);
            g.fill(0x00aa00);
            const tex = this.app.renderer.generateTexture(g);
            sprite.sprite = new Sprite(tex);
            this.world.addComponent(entity, sprite);

            const behavior = new BehaviorComponent();
            behavior.behaviors.push(new NPCBehavior(this.world));
            this.world.addComponent(entity, behavior);
            
            const pathComp = new PathfindingComponent();
            this.world.addComponent(entity, pathComp);

            const npcCombat = new CombatComponent();
            npcCombat.hp = 30;
            this.world.addComponent(entity, npcCombat);

            const npcLight = new LightComponent();
            npcLight.radius = 80;
            npcLight.baseRadius = 80;
            npcLight.color = 0x00ff00;
            npcLight.flicker = false;
            this.world.addComponent(entity, npcLight);
        }
    }

    private handleRemotePlayerMove(data: any): void {
        if (!this.remotePlayers.has(data.id)) {
            const entity = this.world.createEntity();
            const transform = new TransformComponent();
            transform.x = data.x;
            transform.y = data.y;
            this.world.addComponent(entity, transform);

            const sprite = new SpriteComponent();
            const g = new Graphics();
            g.rect(-16, -24, 32, 48);
            g.fill(0xffcc00);
            const tex = this.app.renderer.generateTexture(g);
            sprite.sprite = new Sprite(tex);
            this.world.addComponent(entity, sprite);
            
            this.remotePlayers.set(data.id, { entityId: entity, transform });
        } else {
            const p = this.remotePlayers.get(data.id)!;
            p.transform.x = data.x;
            p.transform.y = data.y;
        }
    }

    private handleRemotePlayerAction(data: any): void {
        const p = this.remotePlayers.get(data.id);
        if (p) {
            switch (data.type) {
                case 'emote':
                    this.showEmoteBubble(p.entityId, data.data.text);
                    break;
            }
        }
    }

    public showEmoteBubble(entityId: number, text: string): void {
        const components = (this.world as any).entities.get(entityId);
        const transform = components?.get('Transform') as TransformComponent;
        if (transform) {
            const bubble = new Container();
            const bg = new Graphics();
            bg.roundRect(-50, -30, 100, 25, 10);
            bg.fill({ color: 0xffffff, alpha: 0.9 });
            bubble.addChild(bg);
            
            const txt = new Text({ text, style: { fill: 0x000000, fontSize: 12 } });
            txt.anchor.set(0.5);
            txt.position.set(0, -17.5);
            bubble.addChild(txt);
            
            bubble.position.set(transform.x, transform.y - 60);
            this.worldContainer.addChild(bubble);
            
            setTimeout(() => bubble.destroy(), 2000);
        }
    }

    private createConsoleUI(): void {
        this.consoleContainer = new Container();
        this.consoleContainer.visible = false;
        this.container.addChild(this.consoleContainer);

        const bg = new Graphics();
        bg.rect(0, 0, this.width, 200);
        bg.fill({ color: 0x000000, alpha: 0.8 });
        this.consoleContainer.addChild(bg);

        this.consoleInput = document.createElement('input');
        this.consoleInput.type = 'text';
        this.consoleInput.placeholder = 'Enter console command...';
        this.consoleInput.style.position = 'absolute';
        this.consoleInput.style.left = '10px';
        this.consoleInput.style.top = '10px';
        this.consoleInput.style.width = (this.width - 20) + 'px';
        this.consoleInput.style.background = 'transparent';
        this.consoleInput.style.color = '#00ff00';
        this.consoleInput.style.border = 'none';
        this.consoleInput.style.fontFamily = 'monospace';
        this.consoleInput.style.outline = 'none';
        this.consoleInput.style.display = 'none';
        document.body.appendChild(this.consoleInput);

        this.consoleInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(this.consoleInput!.value);
                this.consoleInput!.value = '';
                this.toggleConsole();
            } else if (e.key === 'Escape') {
                this.toggleConsole();
            }
        };
    }

    private toggleConsole(): void {
        this.consoleActive = !this.consoleActive;
        this.consoleContainer!.visible = this.consoleActive;
        this.consoleInput!.style.display = this.consoleActive ? 'block' : 'none';
        if (this.consoleActive) {
            this.consoleInput!.focus();
            InputManager.setLocked(true);
        } else {
            InputManager.setLocked(false);
        }
    }

    private executeCommand(cmd: string): void {
        console.log(`[Console] Executing: ${cmd}`);
        const args = cmd.split(' ');
        const action = args[0].toLowerCase();

        switch (action) {
            case 'tp':
                if (this.playerTransform) {
                    this.playerTransform.x = parseInt(args[1]) || 0;
                    this.playerTransform.y = parseInt(args[2]) || 0;
                }
                break;
            case 'spawn':
                this.createNPCs(); 
                break;
            case 'msg':
                this.showDialogue(args.slice(1).join(' '));
                break;
            default:
                this.showDialogue(`Unknown command: ${action}`);
        }
    }

    protected onUpdate(dt: number): void {
        this.world.update(dt);
        if (this.map) this.map.update(dt);

        if (this.playerTransform) {
            AudioManager.updateListener(this.playerTransform.x, this.playerTransform.y, 0);
        }

        if (this.playerTransform && networkManager.connected) {
            networkManager.emit('playerMove', {
                x: this.playerTransform.x,
                y: this.playerTransform.y
            });

            if (InputManager.isKeyPressed(Key.E)) {
                const text = "Hello!";
                this.showEmoteBubble((this.world as any).playerEntityId, text);
                networkManager.emit('playerAction', { type: 'emote', data: { text } });
            }
        }

        if (InputManager.isKeyPressed(Key.Tilde)) {
            this.toggleConsole();
        }

        if (InputManager.isKeyPressed(Key.Escape)) {
            if (this.camera) {
                this.camera.clearTargets();
                this.camera.setPosition(0, 0);
            }
            StateManager.pop();
        }
    }

    public onResize(width: number, height: number): void {
        super.onResize(width, height);
        this.touchControls?.resize(width, height);
        if (this.lightingSystem) {
            this.lightingSystem.resize(width, height);
        }
        if (this.dialogueContainer) {
            this.dialogueContainer.children[0].width = width - 100;
            this.dialogueContainer.children[0].y = height - 150;
            if (this.dialogueText) {
                this.dialogueText.y = height - 130;
                this.dialogueText.style.wordWrapWidth = width - 140;
            }
        }
    }
    
    protected async destroy(): Promise<void> {
        if (this.worker) this.worker.terminate();
        if (this.consoleInput) this.consoleInput.remove();
        await super.destroy();
    }
}
