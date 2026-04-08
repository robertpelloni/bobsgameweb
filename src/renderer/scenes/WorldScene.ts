import { Scene, SceneConfig } from '../state/Scene';
import { World } from '../engine/ecs/World';
import { GameMap } from '../engine/map/GameMap';
import { MapData } from '../../shared/MapData';
import { RenderSystem } from '../engine/ecs/systems/RenderSystem';
import { BehaviorSystem } from '../engine/ecs/systems/BehaviorSystem';
import { PathfindingSystem } from '../engine/ecs/systems/PathfindingSystem';
import { TeleportSystem } from '../engine/ecs/systems/TeleportSystem';
import { MapGenSystem } from '../engine/ecs/systems/MapGenSystem';
import { WeatherSystem } from '../engine/ecs/systems/WeatherSystem';
import { AudioReactiveSystem } from '../engine/ecs/systems/AudioReactiveSystem';
import { TweenSystem } from '../engine/ecs/systems/TweenSystem';
import { TransformComponent } from '../engine/ecs/components/TransformComponent';
import { SpriteComponent } from '../engine/ecs/components/SpriteComponent';
import { BehaviorComponent } from '../engine/ecs/components/BehaviorComponent';
import { PathfindingComponent } from '../engine/ecs/components/PathfindingComponent';
import { CombatComponent } from '../engine/ecs/components/CombatComponent';
import { QuestComponent } from '../engine/ecs/components/QuestComponent';
import { InventoryComponent } from '../engine/ecs/components/InventoryComponent';
import { ShopComponent } from '../engine/ecs/components/ShopComponent';
import { SkillTreeComponent } from '../engine/ecs/components/SkillTreeComponent';
import { AudioReactiveComponent } from '../engine/ecs/components/AudioReactiveComponent';
import { TeleportComponent } from '../engine/ecs/components/TeleportComponent';
import { MapGenComponent } from '../engine/ecs/components/MapGenComponent';
import { WeatherComponent, WeatherType } from '../engine/ecs/components/WeatherComponent';
import { TweenComponent } from '../engine/ecs/components/TweenComponent';
import { InteractionComponent } from '../engine/ecs/components/InteractionComponent';
import { AIComponent } from '../engine/ecs/components/AIComponent';

import { NPCBehavior } from '../engine/ecs/behaviors/NPCBehavior';
import { BattleScene } from './BattleScene';
import { QuestLogScene } from './QuestLogScene';
import { InventoryScene } from './InventoryScene';
import { ShopScene } from './ShopScene';
import { SkillTreeScene } from './SkillTreeScene';
import { Sprite, Graphics, Texture, Container, Text, TextStyle } from 'pixi.js';
import { InputManager, Key } from '../input/InputManager';
import { StateManager } from '../state/StateManager';
import { SceneTransition } from '../state/SceneTransition';
import { Tileset } from '../../shared/Tileset';
import { Palette } from '../../shared/Palette';
import { AudioManager } from '../audio/AudioManager';
import { LightingSystem } from '../engine/ecs/systems/LightingSystem';
import { LightComponent } from '../engine/ecs/components/LightComponent';
import { ParticleSystem } from '../engine/ecs/systems/ParticleSystem';
import { ParticleComponent } from '../engine/ecs/components/ParticleComponent';
import { TouchControls } from '../ui/TouchControls';
import { Localization, Language } from '../../shared/Localization';
import { Easing } from '../../shared/Easing';
import { networkManager } from '../puzzle';
import { SERVER_URL } from '../../shared/Config';
import { AchievementManager } from '../data/AchievementManager';
import { getPersistenceIdentity, getPlayerDisplayName } from '../data/AchievementIdentity';

export class WorldScene extends Scene {
    private world: World;
    private map: GameMap | null = null;
    private tileset: Tileset;
    private palette: Palette;
    public playerTransform: TransformComponent | null = null;
    private remotePlayers: Map<string, { entityId: number, transform: TransformComponent }> = new Map();
    private dialogueContainer: Container | null = null;
    private dialogueText: Text | null = null;
    private worker: Worker | null = null;
    
    private consoleContainer: Container | null = null;
    private consoleInput: HTMLInputElement | null = null;
    private consoleActive: boolean = false;
    private worldContainer: Container;
    private touchControls: TouchControls | null = null;
    private minimapContainer: Container | null = null;
    private minimapGraphics: Graphics | null = null;
    
    private hudContainer: Container | null = null;
    private hpText: Text | null = null;
    private goldText: Text | null = null;

    public isActionJustPressed: boolean = false;
    
    private dialoguePages: string[] = [];
    private currentDialoguePage: number = 0;
    private dialogueTypingIndex: number = 0;
    private dialogueTimer: number = 0;
    public isDialogueActive: boolean = false;
    
    private saveTimer: number = 0;
    private readonly SAVE_INTERVAL = 10;

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
        
        Localization.register('greeting', { en: 'Hello!', jp: 'こんにちは!', es: '¡Hola!' });
        Localization.register('welcome', { en: 'Welcome to the MMO World!', jp: 'MMOワールドへようこそ!', es: '¡Bienvenido al mundo MMO!' });

        this.worker = new Worker(new URL('../engine/GameWorker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
        (this.world as any).worker = this.worker;

        this.world.addSystem(new BehaviorSystem());
        this.world.addSystem(new PathfindingSystem());
        this.world.addSystem(new TweenSystem());
        
        const teleportSystem = new TeleportSystem(); (teleportSystem as any).scene = this; this.world.addSystem(teleportSystem);
        const mapGenSystem = new MapGenSystem(); (mapGenSystem as any).scene = this; this.world.addSystem(mapGenSystem);
        this.world.addSystem(new WeatherSystem(this.app, this.worldContainer));
        this.world.addSystem(new AudioReactiveSystem());
        this.world.addSystem(new ParticleSystem(this.worldContainer));
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
        this.world.addComponent(playerEntity, transform);

        const identity = getPersistenceIdentity();
        networkManager.connect(SERVER_URL);
        networkManager.emit('loadCharacter', identity);
        networkManager.once('characterLoaded', (data: any) => {
            if (data.success) { transform.x = data.charData.x; transform.y = data.charData.y; }
            else { transform.x = 400; transform.y = 300; }
        });

        const sprite = new SpriteComponent(); const g = new Graphics(); g.rect(-16, -24, 32, 48); g.fill(0x3366ff);
        const tex = this.app.renderer.generateTexture(g); sprite.sprite = new Sprite(tex); this.world.addComponent(playerEntity, sprite);

        const playerCombat = new CombatComponent(); playerCombat.isPlayer = true; this.world.addComponent(playerEntity, playerCombat);
        const playerQuests = new QuestComponent(); this.world.addComponent(playerEntity, playerQuests);
        const playerInv = new InventoryComponent(); playerInv.gold = 500; this.world.addComponent(playerEntity, playerInv);
        const playerSkills = new SkillTreeComponent(); playerSkills.skills.push({ id: 's1', name: 'Fast Move', description: 'Increases speed.', unlocked: false, cost: 100, prerequisites: [] });
        this.world.addComponent(playerEntity, playerSkills);
        const playerLight = new LightComponent(); playerLight.radius = 150; playerLight.baseRadius = 150; playerLight.color = 0xffaa55; playerLight.flicker = true;
        this.world.addComponent(playerEntity, playerLight);
        this.world.addComponent(playerEntity, new ParticleComponent());

        const spawnTween = new TweenComponent();
        spawnTween.activeTweens.push({ property: 'Transform.scaleX', startValue: 0, endValue: 1, duration: 0.5, currentTime: 0, easing: (t) => t });
        spawnTween.activeTweens.push({ property: 'Transform.scaleY', startValue: 0, endValue: 1, duration: 0.5, currentTime: 0, easing: (t) => t });
        this.world.addComponent(playerEntity, spawnTween);

        this.playerTransform = transform;

        if (this.camera) {
            this.camera.setContainer(this.worldContainer);
            this.camera.clearTargets();
            this.camera.addTarget(transform);
            this.camera.setLerp(0.1);
        }

        networkManager.on('remotePlayerMove', (data: any) => this.handleRemotePlayerMove(data));
        networkManager.on('remotePlayerAction', (data: any) => this.handleRemotePlayerAction(data));

        this.createNPCs(); this.createTorches(); this.createShops(); this.createTeleports(); this.createDialogueUI(); this.createConsoleUI(); this.createMinimapUI(); this.createHudUI();
        
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.touchControls = new TouchControls(this.width, this.height);
            this.container.addChild(this.touchControls);
        }
    }

    public onMapGenerated(mapData: MapData): void {
        this.map = new GameMap(mapData);
        this.worldContainer.removeChildAt(0);
        this.worldContainer.addChildAt(this.map.container, 0);
        this.map.render(this.tileset, this.palette);
        this.showDialogue(Localization.get('welcome'));
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

    private createMinimapUI(): void {
        this.minimapContainer = new Container();
        this.minimapContainer.position.set(this.width - 160, 20);
        this.container.addChild(this.minimapContainer);
        const bg = new Graphics(); bg.rect(0, 0, 140, 140); bg.fill({ color: 0x000000, alpha: 0.6 }); bg.stroke({ color: 0xffffff, width: 2 });
        this.minimapContainer.addChild(bg);
        this.minimapGraphics = new Graphics();
        this.minimapContainer.addChild(this.minimapGraphics);
    }

    private createHudUI(): void {
        this.hudContainer = new Container();
        this.hudContainer.position.set(20, 20);
        this.container.addChild(this.hudContainer);

        const bg = new Graphics();
        bg.roundRect(0, 0, 180, 60, 10);
        bg.fill({ color: 0x000000, alpha: 0.6 });
        bg.stroke({ color: 0x3366ff, width: 2 });
        this.hudContainer.addChild(bg);

        const style = new TextStyle({ fill: '#ffffff', fontSize: 16, fontWeight: 'bold' });
        this.hpText = new Text({ text: 'HP: 100/100', style });
        this.hpText.position.set(15, 10);
        this.goldText = new Text({ text: 'GOLD: 500', style: { fill: '#ffd700', fontSize: 16, fontWeight: 'bold' } });
        this.goldText.position.set(15, 35);
        
        this.hudContainer.addChild(this.hpText, this.goldText);
    }

    private updateHud(): void {
        if (!this.hudContainer) return;
        const combat = this.world.getComponent<CombatComponent>((this.world as any).playerEntityId, 'Combat');
        const inv = this.world.getComponent<InventoryComponent>((this.world as any).playerEntityId, 'Inventory');
        
        if (combat && this.hpText) this.hpText.text = `HP: ${combat.hp}/${combat.maxHp}`;
        if (inv && this.goldText) this.goldText.text = `GOLD: ${inv.gold}`;
    }

    private updateMinimap(): void {
        if (!this.minimapGraphics || !this.playerTransform || !this.map) return;
        this.minimapGraphics.clear();
        const scale = 1.4;
        for (let y = 0; y < this.map.data.heightTiles1X; y += 2) {
            for (let x = 0; x < this.map.data.widthTiles1X; x += 2) {
                const tile = this.map.data.getTileIndex(0, x, y);
                if (tile !== 0) { this.minimapGraphics.rect(x * scale, y * scale, scale * 2, scale * 2); this.minimapGraphics.fill(0x444444); }
            }
        }
        const px = (this.playerTransform.x / 8) * scale, py = (this.playerTransform.y / 8) * scale;
        this.minimapGraphics.circle(px, py, 3); this.minimapGraphics.fill(0x3366ff);
    }

    private createDialogueUI(): void {
        this.dialogueContainer = new Container(); this.dialogueContainer.visible = false;
        this.container.addChild(this.dialogueContainer);
        const bg = new Graphics(); bg.rect(50, this.height - 150, this.width - 100, 100); bg.fill({ color: 0x000000, alpha: 0.8 }); bg.stroke({ color: 0xffffff, width: 2 });
        this.dialogueContainer.addChild(bg);
        const style = new TextStyle({ fill: '#ffffff', fontSize: 18, wordWrap: true, wordWrapWidth: this.width - 140 });
        this.dialogueText = new Text({ text: '', style }); this.dialogueText.position.set(70, this.height - 130);
        this.dialogueContainer.addChild(this.dialogueText);
        
        const prompt = new Text({ text: 'Press A to continue', style: { fill: '#888888', fontSize: 14 } });
        prompt.position.set(this.width - 250, this.height - 70);
        this.dialogueContainer.addChild(prompt);
    }

    public showDialogue(messages: string | string[], countAsNpcInteraction: boolean = false): void {
        if (!this.dialogueText || !this.dialogueContainer) return;
        
        if (countAsNpcInteraction) {
            AchievementManager.incrementStat('npcsInteracted');
        }
        this.dialoguePages = Array.isArray(messages) ? messages : [messages];
        this.currentDialoguePage = 0;
        this.dialogueTypingIndex = 0;
        this.dialogueTimer = 0;
        this.isDialogueActive = true;
        this.dialogueContainer.visible = true;
        this.dialogueText.text = '';
    }

    private updateDialogue(dt: number): void {
        if (!this.isDialogueActive || !this.dialogueText || !this.dialogueContainer) return;

        const currentText = this.dialoguePages[this.currentDialoguePage];
        
        if (this.dialogueTypingIndex < currentText.length) {
            this.dialogueTimer += dt;
            if (this.dialogueTimer > 0.02) { // Typwriter speed
                this.dialogueTimer = 0;
                this.dialogueTypingIndex++;
                this.dialogueText.text = currentText.substring(0, this.dialogueTypingIndex);
                if (AudioManager.isLoaded('menu_move')) AudioManager.playSound('menu_move', { volume: 0.1 });
            }
            if (this.isActionJustPressed) {
                // Skip typing
                this.dialogueTypingIndex = currentText.length;
                this.dialogueText.text = currentText;
                this.isActionJustPressed = false; // consume
            }
        } else {
            if (this.isActionJustPressed) {
                this.currentDialoguePage++;
                if (this.currentDialoguePage >= this.dialoguePages.length) {
                    this.isDialogueActive = false;
                    this.dialogueContainer.visible = false;
                } else {
                    this.dialogueTypingIndex = 0;
                    this.dialogueText.text = '';
                }
                this.isActionJustPressed = false; // consume
            }
        }
    }

    public async changeMap(mapId: string, targetX: number, targetY: number): Promise<void> {
        if (this.playerTransform) { this.playerTransform.x = targetX; this.playerTransform.y = targetY; this.showDialogue(`Entering ${mapId}...`); }
    }

    public startBattle(npcEntityId: number): void {
        AchievementManager.incrementStat('battlesStarted');
        const playerCombat = this.world.getComponent<CombatComponent>((this.world as any).playerEntityId, 'Combat');
        const npcCombat = this.world.getComponent<CombatComponent>(npcEntityId, 'Combat');
        if (playerCombat && npcCombat) {
            const battleScene = new BattleScene({ name: 'battle', app: this.app, camera: this.camera ?? undefined, player: playerCombat, enemy: npcCombat });
            SceneTransition.pushWithFade(this.app, battleScene);
        }
    }

    public openQuestLog(): void {
        const playerQuests = this.world.getComponent<QuestComponent>((this.world as any).playerEntityId, 'Quest');
        if (playerQuests) {
            const questLog = new QuestLogScene({ name: 'quest-log', app: this.app, camera: this.camera ?? undefined, quests: playerQuests });
            StateManager.push(questLog);
        }
    }

    public openInventory(): void {
        const playerInv = this.world.getComponent<InventoryComponent>((this.world as any).playerEntityId, 'Inventory');
        if (playerInv) {
            const inventoryScene = new InventoryScene({ name: 'inventory', app: this.app, camera: this.camera ?? undefined, inventory: playerInv });
            StateManager.push(inventoryScene);
        }
    }

    public openShop(shopComp: ShopComponent): void {
        const playerInv = this.world.getComponent<InventoryComponent>((this.world as any).playerEntityId, 'Inventory');
        if (playerInv) {
            const shopScene = new ShopScene({ name: 'shop', app: this.app, camera: this.camera ?? undefined, shop: shopComp, playerInventory: playerInv });
            StateManager.push(shopScene);
        }
    }

    public openSkillTree(): void {
        const playerSkills = this.world.getComponent<SkillTreeComponent>((this.world as any).playerEntityId, 'SkillTree');
        const playerInv = this.world.getComponent<InventoryComponent>((this.world as any).playerEntityId, 'Inventory');
        if (playerSkills && playerInv) {
            const skillTree = new SkillTreeScene({ name: 'skill-tree', app: this.app, camera: this.camera ?? undefined, skillTree: playerSkills, playerInventory: playerInv });
            StateManager.push(skillTree);
        }
    }

    private createTeleports(): void {
        const entity = this.world.createEntity(); const transform = new TransformComponent(); transform.x = 800; transform.y = 100;
        this.world.addComponent(entity, transform);
        const sprite = new SpriteComponent(); const g = new Graphics(); g.rect(-32, -32, 64, 64); g.fill({ color: 0x3366ff, alpha: 0.5 });
        const tex = this.app.renderer.generateTexture(g); sprite.sprite = new Sprite(tex); this.world.addComponent(entity, sprite);
        const teleport = new TeleportComponent(); teleport.targetMapId = "Forest Map"; teleport.targetX = 100; teleport.targetY = 100;
        this.world.addComponent(entity, teleport);
    }

    private createShops(): void {
        const entity = this.world.createEntity(); const transform = new TransformComponent(); transform.x = 600; transform.y = 200;
        this.world.addComponent(entity, transform);
        const sprite = new SpriteComponent(); const g = new Graphics(); g.rect(-20, -20, 40, 40); g.fill(0xff00ff);
        const tex = this.app.renderer.generateTexture(g); sprite.sprite = new Sprite(tex); this.world.addComponent(entity, sprite);
        const shop = new ShopComponent(); shop.shopName = "Bobs Store"; shop.inventory.push({ itemId: 1, priceOverride: 20 });
        this.world.addComponent(entity, shop);
        const inter = new InteractionComponent(); inter.interactions.push({ type: 'dialogue', params: { text: ["Welcome to my store!", "Would you like to buy something?"] } }); inter.interactions.push({ type: 'shop', params: {} });
        this.world.addComponent(entity, inter);
    }

    private createTorches(): void {
        for (let i = 0; i < 3; i++) {
            const entity = this.world.createEntity(); const transform = new TransformComponent(); transform.x = 300 + i * 200; transform.y = 400;
            this.world.addComponent(entity, transform);
            const particles = new ParticleComponent(); particles.emitters.push({ count: 1, color: 0xff4400, life: 1.0, speed: 40, size: 6, gravity: -50 });
            this.world.addComponent(entity, particles);
            const light = new LightComponent(); light.radius = 120; light.baseRadius = 120; light.color = 0xff6600; light.flicker = true;
            this.world.addComponent(entity, light);
            const reactive = new AudioReactiveComponent(); reactive.frequencyBin = 2; reactive.sensitivity = 0.5;
            this.world.addComponent(entity, reactive);
        }
    }

    private createNPCs(): void {
        for (let i = 0; i < 5; i++) {
            const entity = this.world.createEntity(); const transform = new TransformComponent(); transform.x = 200 + Math.random() * 400; transform.y = 200 + Math.random() * 400;
            this.world.addComponent(entity, transform);
            const sprite = new SpriteComponent(); const g = new Graphics(); g.rect(-16, -24, 32, 48); g.fill(i === 0 ? 0xff0000 : 0x00aa00);
            const tex = this.app.renderer.generateTexture(g); sprite.sprite = new Sprite(tex); this.world.addComponent(entity, sprite);
            this.world.addComponent(entity, new NPCBehavior(this.world)); this.world.addComponent(entity, new PathfindingComponent());
            if (i === 0) { const ai = new AIComponent(); ai.detectionRadius = 200; this.world.addComponent(entity, ai); }
            const npcCombat = new CombatComponent(); npcCombat.hp = 30; this.world.addComponent(entity, npcCombat);
            const npcLight = new LightComponent(); npcLight.radius = 80; npcLight.color = 0x00ff00; this.world.addComponent(entity, npcLight);
            const inter = new InteractionComponent(); inter.interactions.push({ type: 'dialogue', params: { text: ["Hello there, traveler.", "This world is quite large, isn't it?"] } }); this.world.addComponent(entity, inter);
        }
    }

    private handleRemotePlayerMove(data: any): void {
        if (!this.remotePlayers.has(data.id)) {
            const entity = this.world.createEntity(); const transform = new TransformComponent(); transform.x = data.x; transform.y = data.y;
            this.world.addComponent(entity, transform);
            const sprite = new SpriteComponent(); const g = new Graphics(); g.rect(-16, -24, 32, 48); g.fill(0xffcc00);
            const tex = this.app.renderer.generateTexture(g); sprite.sprite = new Sprite(tex); this.world.addComponent(entity, sprite);
            this.remotePlayers.set(data.id, { entityId: entity, transform });
        } else {
            const p = this.remotePlayers.get(data.id)!; p.transform.x = data.x; p.transform.y = data.y;
        }
    }

    private handleRemotePlayerAction(data: any): void {
        const p = this.remotePlayers.get(data.id);
        if (p) { switch (data.type) { case 'emote': this.showEmoteBubble(p.entityId, data.data.text); break; } }
    }

    public showEmoteBubble(entityId: number, text: string): void {
        const transform = this.world.getComponent<TransformComponent>(entityId, 'Transform');
        if (transform) {
            const bubble = new Container(); const bg = new Graphics(); bg.roundRect(-50, -30, 100, 25, 10); bg.fill({ color: 0xffffff, alpha: 0.9 });
            bubble.addChild(bg); const txt = new Text({ text, style: { fill: 0x000000, fontSize: 12 } }); txt.anchor.set(0.5); txt.position.set(0, -17.5);
            bubble.addChild(txt); bubble.position.set(transform.x, transform.y - 60); this.worldContainer.addChild(bubble);
            setTimeout(() => bubble.destroy(), 2000);
        }
    }

    private createConsoleUI(): void {
        this.consoleContainer = new Container(); this.consoleContainer.visible = false; this.container.addChild(this.consoleContainer);
        const bg = new Graphics(); bg.rect(0, 0, this.width, 200); bg.fill({ color: 0x000000, alpha: 0.8 });
        this.consoleContainer.addChild(bg); this.consoleInput = document.createElement('input'); this.consoleInput.type = 'text'; this.consoleInput.placeholder = 'Enter command...';
        this.consoleInput.style.position = 'absolute'; this.consoleInput.style.left = '10px'; this.consoleInput.style.top = '10px'; this.consoleInput.style.width = (this.width - 20) + 'px';
        this.consoleInput.style.background = 'transparent'; this.consoleInput.style.color = '#00ff00'; this.consoleInput.style.border = 'none'; this.consoleInput.style.fontFamily = 'monospace';
        this.consoleInput.style.outline = 'none'; this.consoleInput.style.display = 'none'; document.body.appendChild(this.consoleInput);
        this.consoleInput.onkeydown = (e) => { if (e.key === 'Enter') { this.executeCommand(this.consoleInput!.value); this.consoleInput!.value = ''; this.toggleConsole(); } else if (e.key === 'Escape') { this.toggleConsole(); } };
    }

    private toggleConsole(): void {
        this.consoleActive = !this.consoleActive; this.consoleContainer!.visible = this.consoleActive; this.consoleInput!.style.display = this.consoleActive ? 'block' : 'none';
        if (this.consoleActive) { this.consoleInput!.focus(); InputManager.setLocked(true); } else { InputManager.setLocked(false); }
    }

    private executeCommand(cmd: string): void {
        const args = cmd.split(' '); const action = args[0].toLowerCase();
        switch (action) {
            case 'tp': if (this.playerTransform) { this.playerTransform.x = parseInt(args[1]) || 0; this.playerTransform.y = parseInt(args[2]) || 0; } break;
            case 'spawn': this.createNPCs(); break;
            case 'msg': this.showDialogue(args.slice(1).join(' ')); break;
            case 'gen': this.world.addComponent((this.world as any).playerEntityId, new MapGenComponent()); break;
            case 'weather': this.world.addComponent((this.world as any).playerEntityId, new WeatherComponent()); break;
            case 'lang': Localization.setLanguage((args[1] as Language) || 'en'); this.showDialogue(Localization.get('greeting')); break;
            case 'save': this.saveCharacterToCloud(); break;
            default: this.showDialogue(`Unknown command: ${action}`);
        }
    }

    protected onUpdate(dt: number): void {
        this.isActionJustPressed = InputManager.isActionPressed();
        
        if (this.isDialogueActive) {
            this.updateDialogue(dt);
            if (InputManager.isKeyPressed(Key.Tilde)) this.toggleConsole();
            return;
        }

        this.world.update(dt); if (this.map) this.map.update(dt); this.updateMinimap(); this.updateHud();
        this.saveTimer += dt; if (this.saveTimer >= this.SAVE_INTERVAL) { this.saveTimer = 0; this.saveCharacterToCloud(); }
        if (this.playerTransform) { AudioManager.updateListener(this.playerTransform.x, this.playerTransform.y, 0); }
        if (this.playerTransform && networkManager.connected) {
            networkManager.emit('playerMove', { x: this.playerTransform.x, y: this.playerTransform.y });
            if (InputManager.isKeyPressed(Key.E)) { const text = "Hello!"; this.showEmoteBubble((this.world as any).playerEntityId, text); networkManager.emit('playerAction', { type: 'emote', data: { text } }); }
        }
        if (InputManager.isKeyPressed(Key.Tilde)) this.toggleConsole(); if (InputManager.isKeyPressed(Key.Q)) this.openQuestLog(); if (InputManager.isKeyPressed(Key.I)) this.openInventory(); if (InputManager.isKeyPressed(Key.K)) this.openSkillTree();
        if (InputManager.isKeyPressed(Key.Escape)) { if (this.camera) { this.camera.clearTargets(); this.camera.setPosition(0, 0); this.camera.zoom = 1.0; } this.saveCharacterToCloud(); StateManager.pop(); }
    }

    private saveCharacterToCloud(): void {
        const identity = getPersistenceIdentity();
        if (this.playerTransform && networkManager.connected) { networkManager.emit('saveCharacter', { identity, charData: { x: this.playerTransform.x, y: this.playerTransform.y } }); }
    }

    public onResize(width: number, height: number): void {
        super.onResize(width, height); this.touchControls?.resize(width, height); if (this.minimapContainer) this.minimapContainer.position.set(width - 160, 20); if (this.lightingSystem) this.lightingSystem.resize(width, height);
        if (this.dialogueContainer) { this.dialogueContainer.children[0].width = width - 100; this.dialogueContainer.children[0].y = height - 150; if (this.dialogueText) { this.dialogueText.y = height - 130; this.dialogueText.style.wordWrapWidth = width - 140; } }
    }
    
    protected async destroy(): Promise<void> { if (this.worker) this.worker.terminate(); if (this.consoleInput) this.consoleInput.remove(); await super.destroy(); }
}
