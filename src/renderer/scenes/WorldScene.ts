import { Scene, SceneConfig } from '../state/Scene';
import { World } from '../engine/ecs/World';
import { GameMap } from '../engine/map/GameMap';
import { MapData } from '../../shared/MapData';
import { RenderSystem } from '../engine/ecs/systems/RenderSystem';
import { BehaviorSystem } from '../engine/ecs/systems/BehaviorSystem';
import { TransformComponent } from '../engine/ecs/components/TransformComponent';
import { SpriteComponent } from '../engine/ecs/components/SpriteComponent';
import { BehaviorComponent } from '../engine/ecs/components/BehaviorComponent';
import { EightDirectionBehavior } from '../engine/ecs/behaviors/EightDirectionBehavior';
import { NPCBehavior } from '../engine/ecs/behaviors/NPCBehavior';
import { AudioManager } from '../audio/AudioManager';
import { Sprite, Graphics, Texture, Container, Text, TextStyle } from 'pixi.js';
import { InputManager, Key } from '../input/InputManager';
import { StateManager } from '../state/StateManager';
import { Tileset } from '../../shared/Tileset';
import { Palette } from '../../shared/Palette';

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

    constructor(config: SceneConfig) {
        super(config);
        this.world = new World();
        this.tileset = new Tileset(5000);
        this.palette = new Palette(256);
        this.createDummyTiles();
    }

    private createDummyTiles() {
        // Just for demo purposes
        for (let i = 1; i < 10; i++) {
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    this.tileset.setPixel(i, x, y, i);
                }
            }
        }
    }

    public async create(): Promise<void> {
        // Setup systems
        (this.world as any).scene = this;
        this.world.addSystem(new BehaviorSystem());
        this.world.addSystem(new RenderSystem(this.container));

        // Load a default map
        const mapData = new MapData(-1, "MMO World", 100, 100);
        this.map = new GameMap(mapData);
        this.container.addChild(this.map.container);
        this.map.render(this.tileset, this.palette);

        // Create the local player entity
        const playerEntity = this.world.createEntity();
        const transform = new TransformComponent();
        transform.x = 400;
        transform.y = 300;
        this.world.addComponent(playerEntity, transform);

        const sprite = new SpriteComponent();
        const g = new Graphics();
        g.rect(-16, -24, 32, 48); // Tall character shape
        g.fill(0x3366ff);
        const tex = this.app.renderer.generateTexture(g);
        sprite.sprite = new Sprite(tex);
        this.world.addComponent(playerEntity, sprite);

        const behavior = new BehaviorComponent();
        behavior.behaviors.push(new EightDirectionBehavior(this.world));
        this.world.addComponent(playerEntity, behavior);

        this.playerTransform = transform;

        // Center camera on player
        if (this.camera) {
            this.camera.clearTargets();
            this.camera.addTarget(transform);
            this.camera.setLerp(0.1);
        }

        // Networking
        networkManager.connect(SERVER_URL);
        networkManager.on('remotePlayerMove', (data: any) => this.handleRemotePlayerMove(data));

        this.createNPCs();
        this.createDialogueUI();
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
            g.fill(0x00aa00); // Green for NPCs
            const tex = this.app.renderer.generateTexture(g);
            sprite.sprite = new Sprite(tex);
            this.world.addComponent(entity, sprite);

            const behavior = new BehaviorComponent();
            behavior.behaviors.push(new NPCBehavior(this.world));
            this.world.addComponent(entity, behavior);
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
            g.fill(0xffcc00); // Yellow for remote players
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

    protected onUpdate(dt: number): void {
        this.world.update(dt);
        if (this.map) this.map.update(dt);

        // Update spatial audio listener position
        if (this.playerTransform) {
            AudioManager.updateListener(this.playerTransform.x, this.playerTransform.y, 0);
        }

        // Broadcast local position
        if (this.playerTransform && networkManager.connected) {
            networkManager.emit('playerMove', {
                x: this.playerTransform.x,
                y: this.playerTransform.y
            });
        }

        if (InputManager.isKeyPressed(Key.Escape)) {
            if (this.camera) {
                this.camera.clearTargets();
                this.camera.setPosition(0, 0);
            }
            StateManager.pop();
        }
    }
}
