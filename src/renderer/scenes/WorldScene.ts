import { Scene, type SceneConfig } from "../state/Scene";
import { World } from "../engine/ecs/World";
import { GameMap } from "../engine/map/GameMap";
import { MapData } from "../../shared/MapData";
import { RenderSystem } from "../engine/ecs/systems/RenderSystem";
import { BehaviorSystem } from "../engine/ecs/systems/BehaviorSystem";
import { PathfindingSystem } from "../engine/ecs/systems/PathfindingSystem";
import { TeleportSystem } from "../engine/ecs/systems/TeleportSystem";
import { MapGenSystem } from "../engine/ecs/systems/MapGenSystem";
import { WeatherSystem } from "../engine/ecs/systems/WeatherSystem";
import { AudioReactiveSystem } from "../engine/ecs/systems/AudioReactiveSystem";
import { TweenSystem } from "../engine/ecs/systems/TweenSystem";
import { TransformComponent } from "../engine/ecs/components/TransformComponent";
import { SpriteComponent } from "../engine/ecs/components/SpriteComponent";
import { BehaviorComponent } from "../engine/ecs/components/BehaviorComponent";
import type { PathfindingComponent } from "../engine/ecs/components/PathfindingComponent";
import { CombatComponent } from "../engine/ecs/components/CombatComponent";
import { QuestComponent } from "../engine/ecs/components/QuestComponent";
import { InventoryComponent } from "../engine/ecs/components/InventoryComponent";
import type { ShopComponent } from "../engine/ecs/components/ShopComponent";
import { SkillTreeComponent } from "../engine/ecs/components/SkillTreeComponent";
// AudioReactiveComponent - reserved for future use
import { TeleportComponent } from "../engine/ecs/components/TeleportComponent";
import { MapGenComponent } from "../engine/ecs/components/MapGenComponent";
import { WeatherComponent } from "../engine/ecs/components/WeatherComponent";
// TweenComponent - reserved for future use
import { InteractionComponent } from "../engine/ecs/components/InteractionComponent";
// AIComponent - reserved for future use
import { NPCBehavior } from "../engine/ecs/behaviors/NPCBehavior";
import { BattleScene } from "./BattleScene";
import { QuestLogScene } from "./QuestLogScene";
import { InventoryScene } from "./InventoryScene";
import { ShopScene } from "./ShopScene";
import { SkillTreeScene } from "./SkillTreeScene";
import { Sprite, Graphics, Texture, Container, Text, TextStyle } from "pixi.js";
import { InputManager, Key } from "../input/InputManager";
import { StateManager } from "../state/StateManager";
import { SceneTransition } from "../state/SceneTransition";
import type { Tileset } from "../../shared/Tileset";
import type { Palette } from "../../shared/Palette";
import { AudioManager } from "../audio/AudioManager";
import { LightingSystem } from "../engine/ecs/systems/LightingSystem";
import { LightComponent } from "../engine/ecs/components/LightComponent";
import { ParticleSystem } from "../engine/ecs/systems/ParticleSystem";
import { ParticleComponent } from "../engine/ecs/components/ParticleComponent";
import { TouchControls } from "../ui/TouchControls";
import { Localization, type Language } from "../../shared/Localization";
// Easing - reserved for future use
import { networkManager } from "../puzzle";
import { SERVER_URL } from "../../shared/Config";
import { AchievementManager } from "../data/AchievementManager";
import { getPersistenceIdentity } from "../data/AchievementIdentity";
import { LegacyMapLoader } from "../engine/map/LegacyMapLoader";
import {
	loadDoorGraph,
	getDoorGraphForMap,
} from "../engine/map/DoorGraphLoader";
import { TilesetBuilder } from "../engine/map/TilesetBuilder";
import { RealTileset } from "../engine/map/RealTileset";
import { SpriteAtlas } from "../engine/map/SpriteAtlas";
import {
	loadGameScript,
	getNPCDialogue,
	hasDialogue,
	getAreaDialogue,
	AREA_TRIGGERS,
	getMapEntities,
	getWarpAreasForMap,
	getDoorAreasForMap,
	getOriginalDialogue,
} from "../engine/map/NPCDialogue";
import { DialogueTracker } from "../engine/event/DialogueTracker";
import { FlagManager } from "../engine/event/FlagManager";
import { AmbientMusicGenerator } from "../audio/AmbientMusicGenerator";
export class WorldScene extends Scene {
	private world: World;
	private map: GameMap | null = null;
	private tileset: Tileset;
	private palette: Palette;
	private realTileset: RealTileset = new RealTileset();
	private spriteAtlas: SpriteAtlas = new SpriteAtlas();
	private entityColliders: { x: number; y: number; w: number; h: number }[] =
		[];
	public playerTransform: TransformComponent | null = null;
	private remotePlayers: Map<
		string,
		{ entityId: number; transform: TransformComponent }
	> = new Map();
	private dialogueContainer: Container | null = null;
	private dialogueText: Text | null = null;
	private dialogueCaption: Text | null = null;
	private worker: Worker | null = null;
	private consoleContainer: Container | null = null;
	private consoleInput: HTMLInputElement | null = null;
	private consoleActive: boolean = false;
	private worldContainer: Container;
	private touchControls: TouchControls | null = null;
	private minimapContainer: Container | null = null;
	private minimapGraphics: Graphics | null = null;
	private hudContainer: Container | null = null;
	private vignetteOverlay: Sprite | null = null;
	private hpText: Text | null = null;
	private goldText: Text | null = null;
	private mapNameText: Text | null = null;
	public isActionJustPressed: boolean = false;
	private dialoguePages: string[] = [];
	private currentDialoguePage: number = 0;
	private dialogueTypingIndex: number = 0;
	private dialogueTimer: number = 0;
	public isDialogueActive: boolean = false;
	private saveTimer: number = 0;
	private readonly SAVE_INTERVAL = 30000; // 30 seconds
	private lightingSystem: LightingSystem | null = null;
	private currentMapName: string = "";
	private mapTransitioning: boolean = false;
	private fadeOverlay: Graphics | null = null;
	private roomBanner: Text | null = null;
	private roomBannerTimer: number = 0;
	private interactionHint: Text | null = null;
	private debugHud: Text | null = null;
	private _doorCooldown: number = 0;
	private controlsOverlay: Container | null = null;
	private footstepTimer: number = 0;
	private footstepIndex: number = 0;
	private _ambientMusic: AmbientMusicGenerator = new AmbientMusicGenerator();
	private weatherContainer: Container | null = null;
	private rainDrops: { x: number; y: number; speed: number }[] = [];
	private isExteriorMap: boolean = false;
	private isPaused: boolean = false;
	private _autoSaveTimer: number = 0;
	private pauseContainer: Container | null = null;
	private static readonly TILE_PX = 8; // pixels per tile at 1X (matches Tileset.TILE_SIZE)
	private playerIsMoving: boolean = false;
	private playerIsSprinting: boolean = false;
	private godMode: boolean = false;

	// Debug layer visibility state (Java: F-keys toggled per-layer)
	private debugShowHitLayer: boolean = false;
	private _debugShowBoundsLayer: boolean = false;
	private debugLayerCycleIndex: number = 0;
	private debugLightingEnabled: boolean = true;
	private debugHudVisible: boolean = false;
	private static readonly DEBUG_LAYER_NAMES: string[] = [
		"ground",
		"groundDetail",
		"groundShadow",
		"objects",
		"objects2",
		"objectShadow",
		"above",
		"aboveDetail",
		"spriteShadow",
		"hitBounds",
		"lightMask",
		"cameraBounds",
		"entity",
		"light",
	];

	// Animation state: 8-direction turning + idle breathing
	private animDirection: number = 1; // 0=Up,1=Down,2=Left,3=Right,4=UpLeft,5=UpRight,6=DownLeft,7=DownRight
	private moveDirection: number = 1; // Target direction from input
	private isTurning: boolean = false;
	private turnTimer: number = 0;
	private turnDelay: number = 0.06; // seconds between turn steps
	private idleTimer: number = 0;
	private idleFrame: number = 0; // alternates between standing poses
	private versionText: Text | null = null;
	private fpsText: Text | null = null;
	private fpsFrameCount: number = 0;
	private fpsLastTime: number = 0;
	private fpsDisplay: number = 60;
	constructor(config: SceneConfig) {
		super(config);
		this.worldContainer = new Container();
		this.worldContainer.zIndex = 0;
		this.worldContainer.sortableChildren = true;
		this.container.addChild(this.worldContainer);
		this.world = new World();
		// Build the interpretive legacy tileset with proper palette
		const built = TilesetBuilder.build();
		this.tileset = built.tileset;
		this.palette = built.palette;
	}
	public async create(): Promise<void> {
		console.log("[WorldScene] create() started");
		// Enable zIndex sorting so HUD/banners render above the game world
		this.container.sortableChildren = true;

		console.log(
			"[WorldScene] App screen:",
			this.app.screen.width,
			"x",
			this.app.screen.height,
		);
		console.log("[WorldScene] Container:", this.container ? "exists" : "null");
		(this.world as any).scene = this;
		Localization.register("greeting", {
			en: "Hello!",
			jp: "こんにちは!",
			es: "¡Hola!",
		});
		Localization.register("welcome", {
			en: "Welcome to the MMO World!",
			jp: "MMOワールドへようこそ!",
			es: "¡Bienvenido al mundo MMO!",
		});
		try {
			this.worker = new Worker(
				new URL("../engine/GameWorker.ts", import.meta.url),
				{ type: "module" },
			);
			this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
			(this.world as any).worker = this.worker;
		} catch (e) {
			console.warn("[WorldScene] Worker creation failed:", e);
		}
		// ============================================================
		// Register audio tracks
		// ============================================================
		// Load varied footstep sounds
		for (let fi = 0; fi < 4; fi++) {
			AudioManager.load(`footstep_${fi}`, "audio/sfx/footstep.wav");
		}
		AudioManager.load("door_open", "audio/sfx/door_open.wav");
		AudioManager.load("dialogue_beep", "audio/sfx/dialogue_beep.wav");
		AudioManager.load("menu_select", "audio/sfx/menu_select.wav");
		AudioManager.load("menu_cancel", "audio/sfx/menu_cancel.wav");
		AudioManager.load("rpg_save", "audio/sfx/save.wav");
		AudioManager.load("item_pickup", "audio/sfx/item_pickup.wav");
		AudioManager.load("rpg_error", "audio/sfx/error.wav");
		AudioManager.load("interior_music", "audio/music/interior.wav");
		AudioManager.load("exterior_music", "audio/music/exterior.wav");
		this.world.addSystem(new BehaviorSystem());
		this.world.addSystem(new PathfindingSystem());
		this.world.addSystem(new TweenSystem());
		const teleportSystem = new TeleportSystem();
		(teleportSystem as any).scene = this;
		this.world.addSystem(teleportSystem);
		const mapGenSystem = new MapGenSystem();
		(mapGenSystem as any).scene = this;
		this.world.addSystem(mapGenSystem);
		this.world.addSystem(new WeatherSystem(this.app, this.worldContainer));
		this.world.addSystem(new AudioReactiveSystem());
		this.world.addSystem(new ParticleSystem(this.worldContainer));
		const renderSystem = new RenderSystem(this.worldContainer);
		this.world.addSystem(renderSystem);
		(this as any)._renderSystem = renderSystem;
		this.lightingSystem = new LightingSystem(this.app, this.container);
		try {
			this.world.addSystem(this.lightingSystem);
		} catch (e) {
			console.warn("[WorldScene] Lighting init failed:", e);
			this.lightingSystem = null;
		}
		// ============================================================
		// Load the real tileset atlas from extracted binary data
		// ============================================================
		try {
			await this.realTileset.load();
			console.log("[WorldScene] RealTileset loaded successfully");
		} catch (e) {
			console.warn(
				"[WorldScene] RealTileset failed to load, using synthetic fallback:",
				e,
			);
			console.warn(
				"[WorldScene] RealTileset error details:",
				(e as Error)?.message,
				(e as Error)?.stack,
			);
		}
		// ============================================================
		// Load the sprite atlas for character rendering
		// ============================================================
		try {
			await this.spriteAtlas.load();
			console.log("[WorldScene] SpriteAtlas loaded successfully");
		} catch (e) {
			console.warn("[WorldScene] SpriteAtlas failed to load:", e);
			console.warn(
				"[WorldScene] SpriteAtlas error details:",
				(e as Error)?.message,
			);
		}
		// ============================================================
		// Load the FIRST REAL ROOM: Yuu's Room (by real map name)
		// ============================================================
		// Load the complete door graph (682+ connections across 242 maps)
		await loadDoorGraph();
		await loadGameScript();
		// Check for local save (resume where player left off)
		const localSave = this.loadLocalSave();
		const startMap = localSave?.map || "TOWNYUUUpstairsYuusRoom";
		const loaded = await this.loadLegacyMapByName(startMap);
		if (!loaded) {
			const fb1 = await this.loadLegacyMapByName("TOWNYUUDownstairs");
			if (!fb1) await this.loadLegacyMapByName("TOWNYUUUpstairsYuusRoom");
		}
		// Create the player
		const playerEntity = this.world.createEntity();
		(this.world as any).playerEntityId = playerEntity;
		const transform = new TransformComponent();
		// Spawn at the map's default spawn point (in pixel coords)
		// Spawn position is already set by LegacyMapLoader's spiral search
		// (finds first walkable tile from center)
		// Use original game starting position for Yuu's Room
		let spawnX: number;
		let spawnY: number;
		const mapName = this.currentMapName || "";
		if (
			mapName === "TOWNYUUUpstairsYuusRoom" ||
			mapName === "INTROUpstairsYuusRoom"
		) {
			spawnX = 16;
			spawnY = 17; // Center of Yuu's room (walkable carpet area)
		} else {
			spawnX =
				this.map?.data.defaultSpawnX ??
				Math.floor((this.map?.data.widthTiles1X ?? 33) / 2);
			spawnY =
				this.map?.data.defaultSpawnY ??
				Math.floor((this.map?.data.heightTiles1X ?? 23) / 2);
		}
		// Override with local save position if available
		// Validate using full collision check for the feet (not just top-left)
		if (localSave?.x && localSave?.y) {
			const saveTileX = Math.floor(localSave.x / WorldScene.TILE_PX);
			const saveTileY = Math.floor(localSave.y / WorldScene.TILE_PX);
			if (!this.isHitTile(saveTileX, saveTileY)) {
				// Save position is walkable, use it
				transform.x = localSave.x;
				transform.y = localSave.y;
				console.log(
					`[WorldScene] Restored save at (${saveTileX},${saveTileY})`,
				);
			} else {
				// Save position is blocked, use default spawn
				console.warn(
					`[WorldScene] Save at (${saveTileX},${saveTileY}) is blocked, using default spawn (${spawnX},${spawnY})`,
				);
				transform.x = spawnX * WorldScene.TILE_PX;
				transform.y = spawnY * WorldScene.TILE_PX;
			}
		} else {
			transform.x = spawnX * WorldScene.TILE_PX;
			transform.y = spawnY * WorldScene.TILE_PX;
		}
		this.world.addComponent(playerEntity, transform);
		const identity = getPersistenceIdentity();
		networkManager.connect(SERVER_URL);
		networkManager.emit("loadCharacter", identity);
		networkManager.once("characterLoaded", (data: any) => {
			if (data.success && data.charData) {
				// Validate server position is on a walkable tile for feet
				const saveTileX = Math.floor(data.charData.x / WorldScene.TILE_PX);
				const saveTileY = Math.floor(
					(data.charData.y + 16) / WorldScene.TILE_PX,
				);
				if (!this.isHitTile(saveTileX, saveTileY)) {
					transform.x = data.charData.x;
					transform.y = data.charData.y;
				}
			}
		});
		// Player sprite — animated Yuu sprite with walk cycles
		const sprite = new SpriteComponent();
		// Auto-detect frames per direction for yuu (32 frames in atlas = 4 dirs x 8)
		let yuuAnim = null;
		try {
			yuuAnim = this.spriteAtlas.createAnimatedSprite("yuu", "Down", 0.15);
		} catch (e) {
			console.warn("[WorldScene] Animated sprite creation failed:", e);
		}
		if (yuuAnim) {
			yuuAnim.anchor.set(0.5, 1.0);
			yuuAnim.play();
			sprite.sprite = yuuAnim;
			sprite.currentAnimation = "Down";
			(this as any).lastAnimDir = "Down";
			console.log("[WorldScene] Using animated Yuu sprite");

			// Player shadow: upside-down shrunken version of the sprite (from Java: shadowSize=0.65, shadowAlpha=0.60)
			// Create a shadow that mirrors the player's current frame, flipped vertically
			const shadowSprite = new Sprite(yuuAnim.textures[0]);
			shadowSprite.anchor.set(0.5, 1.0); // bottom-center (feet), same as player
			shadowSprite.scale.y = -0.65; // flip upside-down, squish to 65% height (shadowSize from Java)
			shadowSprite.tint = 0x000000; // black
			shadowSprite.alpha = 0.5; // Java ref: 0.60 shadow alpha
			(this as any).playerShadowSprite = shadowSprite;
			(this as any).playerShadowTextures = yuuAnim.textures;
		} else {
			// Fallback: static sprite frame
			const yuuSprite = this.spriteAtlas.createSprite("yuu", 0);
			if (yuuSprite) {
				yuuSprite.anchor.set(0.5, 1.0);
				sprite.sprite = yuuSprite;
				console.log("[WorldScene] Using static Yuu sprite");
			} else {
				// Fallback: draw a simple character
				const g = new Graphics();
				// Body (blue hoodie)
				g.rect(-6, -18, 12, 18);
				g.fill(0x3366ff);
				// Head
				g.circle(0, -24, 6);
				g.fill(0xffcc88);
				// Hair
				g.rect(-6, -30, 12, 4);
				g.fill(0x332200);
				// Legs
				g.rect(-5, 0, 4, 8);
				g.fill(0x222244);
				g.rect(1, 0, 4, 8);
				g.fill(0x222244);
				const tex = this.app.renderer.generateTexture(g);
				sprite.sprite = new Sprite(tex);
				console.log("[WorldScene] Using fallback drawn sprite");
			}
		} // end fallback yuuSprite check
		this.world.addComponent(playerEntity, sprite);
		const playerCombat = new CombatComponent();
		playerCombat.isPlayer = true;
		this.world.addComponent(playerEntity, playerCombat);
		const playerQuests = new QuestComponent();
		this.world.addComponent(playerEntity, playerQuests);
		const playerInv = new InventoryComponent();
		playerInv.gold = 19.99;
		this.world.addComponent(playerEntity, playerInv);
		const playerSkills = new SkillTreeComponent();
		playerSkills.skills.push({
			id: "s1",
			name: "Fast Move",
			description: "Increases speed.",
			unlocked: false,
			cost: 100,
			prerequisites: [],
		});
		this.world.addComponent(playerEntity, playerSkills);
		const playerLight = new LightComponent();
		playerLight.radius = 150;
		playerLight.baseRadius = 150;
		playerLight.color = 0xffaa55;
		playerLight.flicker = true;
		this.world.addComponent(playerEntity, playerLight);
		this.world.addComponent(playerEntity, new ParticleComponent());
		// Spawn tween removed
		this.playerTransform = transform;
		if (this.camera) {
			this.camera.setContainer(this.worldContainer);
			this.camera.clearTargets();
			this.camera.addTarget(transform);
			this.camera.setLerp(0.1);
			// Interior maps use 3x zoom so 8px tiles render at 24px (readable)
			// Exterior maps use 2x zoom for wider view
			this.camera.zoom = this.map?.data.isOutside ? 2.0 : 3.0;
			// Set camera bounds to map size
			this.updateCameraBounds();
			// Center camera on player immediately
			this.camera.centerOn(transform.x, transform.y);
		}
		networkManager.on("remotePlayerMove", (data: any) =>
			this.handleRemotePlayerMove(data),
		);
		networkManager.on("remotePlayerAction", (data: any) =>
			this.handleRemotePlayerAction(data),
		);
		// Spawn door entities from the loaded map data
		this.createDoorEntities();
		// Spawn NPCs from the real placement data
		await this.createNPCs();
		this.createTorches();
		// Spawn map entity sprites (furniture, props) on initial load
		this.createMapEntities();
		this.createDialogueUI();

		this.createConsoleUI();
		this.createMinimapUI();
		this.createHudUI();
		if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
			this.touchControls = new TouchControls(this.width, this.height);
			this.container.addChild(this.touchControls as any);
		}
		// Show the room name
		this.showRoomBanner(
			WorldScene.friendlyMapName(this.currentMapName || "Unknown"),
		);
		// Ambient music disabled — was causing buzzing noise
		// const mood = AmbientMusicGenerator.getMoodFromMapName(
		//   this.currentMapName || "",
		// );
		// this.ambientMusic.play(mood);
		// Play background music
		try {
			if (AudioManager.isLoaded("game")) {
				AudioManager.playMusic("game", { loop: true, volume: 0.3 });
			}
		} catch (e) {
			console.warn("[WorldScene] Music playback failed:", e);
		}
		console.log(
			`[WorldScene] Map loaded: ${this.currentMapName} (${this.map?.data.widthTiles1X}x${this.map?.data.heightTiles1X}), spawn: (${this.map?.data.defaultSpawnX},${this.map?.data.defaultSpawnY}), zoom: ${this.camera?.zoom}`,
		);
	}
	// ============================================================
	// Legacy map loading
	// ============================================================
	/**
	 * Load a legacy map by filename, convert to MapData, and render it.
	 * Also sets up doors as teleport entities.
	 */
	private async loadLegacyMap(filename: string): Promise<void> {
		const legacy = await LegacyMapLoader.fetchByFilename(filename);
		if (!legacy) {
			console.error(
				`[WorldScene] Failed to load map: ${filename}, falling back to empty map`,
			);
			// Fallback: create a small empty map
			const fallbackData = new MapData(-1, "Empty", 20, 15);
			this.map = new GameMap(fallbackData, this.realTileset);
			this.worldContainer.addChild(this.map.container);
			this.map.loadAtlasPixels(); // async: will re-render when atlas pixels are ready
			this.map.loadAtlasPixels(); // async: will re-render when atlas pixels are ready
			this.map.render(this.tileset, this.palette);
			// Update RenderSystem to use the entity sprite layer (below rooftops)
			if ((this as any)._renderSystem && this.map?.entitySpriteContainer) {
				(this as any)._renderSystem.setStage(this.map.entitySpriteContainer);
			}
			// Move player sprite from worldContainer to entitySpriteContainer
			const psc = this.world.getComponent(
				(this as any).playerEntityId,
				"Sprite",
			) as SpriteComponent | undefined;
			if (psc?.sprite && psc.sprite.parent === this.worldContainer) {
				this.worldContainer.removeChild(psc.sprite);
			}
			this.currentMapName = "Empty";
			return;
		}
		const mapData = LegacyMapLoader.toMapData(legacy);
		this.currentMapName = legacy.name;
		// Remove old map container if exists
		if (this.map) {
			// Save player sprite from old map's entitySpriteContainer before destroying
			const playerSpriteComp = this.world.getComponent(
				(this.world as any).playerEntityId,
				"Sprite",
			) as SpriteComponent | undefined;
			if (playerSpriteComp?.sprite?.parent === this.map.entitySpriteContainer) {
				this.map.entitySpriteContainer.removeChild(playerSpriteComp.sprite);
				this.worldContainer.addChild(playerSpriteComp.sprite);
			}
			this.worldContainer.removeChild(this.map.container);
			this.map.container.destroy({ children: true });
		}
		this.map = new GameMap(mapData, this.realTileset);
		const spX =
			(mapData.defaultSpawnX ?? Math.floor(mapData.widthTiles1X / 2)) * 8;
		const spY =
			(mapData.defaultSpawnY ?? Math.floor(mapData.heightTiles1X / 2)) * 8;
		this.map.setSpawnPosition(spX, spY);
		this.worldContainer.addChildAt(this.map.container, 0);
		// Add player sprite to entitySpriteContainer for Y-sorting with NPCs
		if (this.map?.entitySpriteContainer) {
			const psc = this.world.getComponent(
				(this.world as any).playerEntityId,
				"Sprite",
			) as any;
			if (psc?.sprite) {
				this.map.entitySpriteContainer.addChild(psc.sprite);
			}
		}
		this.map.render(this.tileset, this.palette);
		// Update RenderSystem to use the entity sprite layer (below rooftops)
		if ((this as any)._renderSystem && this.map?.entitySpriteContainer) {
			(this as any)._renderSystem.setStage(this.map.entitySpriteContainer);
		}
		// Move player sprite from worldContainer to entitySpriteContainer
		const psc = this.world.getComponent(
			(this as any).playerEntityId,
			"Sprite",
		) as SpriteComponent | undefined;
		if (psc?.sprite && psc.sprite.parent === this.worldContainer) {
			this.worldContainer.removeChild(psc.sprite);
		}
		console.log(
			`[WorldScene] Loaded map: ${legacy.name} (${legacy.width}x${legacy.height}) — ${mapData.doorDataList.length} doors`,
		);
	}
	/**
	 * Load a legacy map by its destination name (used by door teleport).
	 */
	private async loadLegacyMapByName(mapName: string): Promise<boolean> {
		const legacy = await LegacyMapLoader.fetchByName(mapName);
		if (!legacy) {
			console.warn(`[WorldScene] Cannot find map named: "${mapName}"`);
			return false;
		}

		// Add player shadow sprite to entitySpriteContainer
		const shadow = (this as any).playerShadowSprite as Sprite | null;
		if (shadow && !shadow.parent && this.map?.entitySpriteContainer) {
			this.map.entitySpriteContainer.addChild(shadow);
		}
		// Find the filename to use the normal load path
		const filename = LegacyMapLoader.getFilenameForMap(mapName);
		if (filename) {
			await this.loadLegacyMap(filename);
			return true;
		}
		// Direct conversion if no filename mapping
		const mapData = LegacyMapLoader.toMapData(legacy);
		this.currentMapName = legacy.name;
		if (this.map) {
			// Save player sprite from old map's entitySpriteContainer before destroying
			const playerSpriteComp = this.world.getComponent(
				(this.world as any).playerEntityId,
				"Sprite",
			) as SpriteComponent | undefined;
			if (playerSpriteComp?.sprite?.parent === this.map.entitySpriteContainer) {
				this.map.entitySpriteContainer.removeChild(playerSpriteComp.sprite);
				this.worldContainer.addChild(playerSpriteComp.sprite);
			}
			this.worldContainer.removeChild(this.map.container);
			this.map.container.destroy({ children: true });
		}
		this.map = new GameMap(mapData, this.realTileset);
		const spX =
			(mapData.defaultSpawnX ?? Math.floor(mapData.widthTiles1X / 2)) * 8;
		const spY =
			(mapData.defaultSpawnY ?? Math.floor(mapData.heightTiles1X / 2)) * 8;
		this.map.setSpawnPosition(spX, spY);
		this.worldContainer.addChildAt(this.map.container, 0);
		// Add player sprite to entitySpriteContainer for Y-sorting
		if (this.map?.entitySpriteContainer) {
			const psc2 = this.world.getComponent(
				(this.world as any).playerEntityId,
				"Sprite",
			) as any;
			if (psc2?.sprite) {
				this.map.entitySpriteContainer.addChild(psc2.sprite);
			}
		}
		this.map.loadAtlasPixels(); // async: will re-render when atlas pixels are ready
		this.map.render(this.tileset, this.palette);
		return true;
	}
	/**
	 * Create ECS entities for each door/warp in the current map.
	 * These are used by the TeleportSystem for collision-based transitions.
	 */
	private createDoorEntities(): void {
		if (!this.map) return;
		const doorList = this.map.data.doorDataList;
		const W = this.map.data.widthTiles1X;
		const H = this.map.data.heightTiles1X;

		// Known door frame tile IDs (from LegacyMapLoader.DOOR_TILE_IDS + 832/1132)
		const DOOR_FRAME_IDS = new Set([
			732, 733, 734, 735, 736, 737, 741, 742, 1316, 1495, 1503, 1511, 14144,
			15440, 755, 756, 832, 1132,
		]);

		for (const door of doorList) {
			const entity = this.world.createEntity();
			const transform = new TransformComponent();

			// The door graph coordinates often point at a wall tile (839)
			// rather than the walkable walkway below/through the door.
			// Scan nearby tiles to find the actual walkable passage.
			let doorX: number = door.x ?? 0;
			let doorY: number = door.y ?? 0;
			let walkwayFound = false;

			// Check if the door graph position itself is walkable (empty on objects layer)
			const objTile = this.map.data.getTileIndex(
				MapData.MAP_OBJECT_LAYER,
				doorX,
				doorY,
			);
			if (objTile === 0) {
				walkwayFound = true;
			} else {
				// Search nearby for the walkway: empty tile adjacent to
				// door frame tiles that forms the passage through the wall.
				const offsets = [
					[0, 1],
					[1, 0],
					[-1, 0],
					[0, -1],
					[0, 2],
					[2, 0],
					[-2, 0],
					[0, -2],
					[1, 1],
					[-1, 1],
					[1, -1],
					[-1, -1],
				];
				for (const [ox, oy] of offsets) {
					const tx = doorX + ox;
					const ty = doorY + oy;
					if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
					const tile = this.map.data.getTileIndex(
						MapData.MAP_OBJECT_LAYER,
						tx,
						ty,
					);
					if (tile === 0) {
						// Verify it's near a door frame tile
						let nearFrame = false;
						for (const [fx, fy] of [
							[-1, 0],
							[1, 0],
							[0, -1],
							[0, 1],
						]) {
							const nx = tx + fx;
							const ny = ty + fy;
							if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
							const neighborTile = this.map.data.getTileIndex(
								MapData.MAP_OBJECT_LAYER,
								nx,
								ny,
							);
							if (DOOR_FRAME_IDS.has(neighborTile)) {
								nearFrame = true;
								break;
							}
						}
						// Also accept if the original door graph position was a frame tile
						if (nearFrame || DOOR_FRAME_IDS.has(objTile)) {
							doorX = tx;
							doorY = ty;
							walkwayFound = true;
							break;
						}
					}
				}
			}

			transform.x = doorX * WorldScene.TILE_PX;
			transform.y = doorY * WorldScene.TILE_PX;
			this.world.addComponent(entity, transform);

			// Door indicator: add directly to worldContainer for guaranteed visibility.
			const doorGfx = new Graphics();
			doorGfx.rect(0, 0, 24, 24);
			doorGfx.fill({ color: 0xff0000 });
			doorGfx.x = transform.x - 4;
			doorGfx.y = transform.y - 4;
			doorGfx.zIndex = 99999;
			this.worldContainer.addChild(doorGfx);
			console.log(
				`[WorldScene] Door: "${door.name}" at (${doorX},${doorY}) px(${transform.x},${transform.y}) worldChildren=${this.worldContainer.children.length}`,
			);

			const sprite = new SpriteComponent();
			this.world.addComponent(entity, sprite);

			const teleport = new TeleportComponent();
			teleport.targetMapId = door.destinationMapName ?? "";
			teleport.targetX = (door.destinationX ?? 0) * WorldScene.TILE_PX;
			teleport.targetY = (door.destinationY ?? 0) * WorldScene.TILE_PX;
			// Walkway is typically 2 tiles wide, 1 tile tall
			teleport.width = 16;
			teleport.height = 16;
			this.world.addComponent(entity, teleport);

			// Also add interaction for "press A to enter" feedback
			const inter = new InteractionComponent();
			inter.interactions.push({
				type: "dialogue",
				params: { text: [`Door: ${door.name}`] },
			});
			this.world.addComponent(entity, inter);

			// Clear wall collision at door walkway so player can walk through
			if (this.map) {
				// Ensure the door area is walkable (EXTRA=1 = interior)
				// Clear a wider area (3x2) so the player can approach the door
				for (let dy = 0; dy < 2; dy++) {
					for (let dx = -1; dx < 2; dx++) {
						const clearX = doorX + dx;
						const clearY = doorY + dy;
						if (
							clearX >= 0 &&
							clearX < this.map.data.widthTiles1X &&
							clearY >= 0 &&
							clearY < this.map.data.heightTiles1X
						) {
							this.map.data.setTileIndex(
								MapData.MAP_CAMERA_BOUNDS_LAYER,
								clearX,
								clearY,
								1,
							);
						}
					}
				}
			}

			console.log(
				`[WorldScene] Created door entity: "${door.name}" at (${doorX},${doorY}) px(${doorX * 8},${doorY * 8}) walkway=${walkwayFound} -> ${door.destinationMapName} dest(${door.destinationX},${door.destinationY})`,
			);
		}
	}

	/**
	 * Spawn NPCs from game_script.json (primary) or npc_placements.json (fallback).
	 */
	private async createNPCs(): Promise<void> {
		if (!this.map || !this.spriteAtlas.loaded) return;

		// Primary: use entities from game_script.json (loaded via NPCDialogue)
		const scriptEntities = getMapEntities(this.currentMapName || "");

		// Build placements list from primary or fallback source
		let placements: { sprite: string; x: number; y: number }[] = [];
		if (scriptEntities.length > 0) {
			placements = scriptEntities.map((e) => ({
				sprite: e.spriteName,
				x: e.x,
				y: e.y,
			}));
		} else {
			// Fallback: load from npc_placements.json
			try {
				const resp = await fetch("/npc_placements.json");
				if (resp.ok) {
					const allPlacements: Record<
						string,
						{ sprite: string; x: number; y: number }[]
					> = await resp.json();
					placements = allPlacements[this.currentMapName] || [];
				}
			} catch (e) {
				console.warn("[WorldScene] Failed to load NPC placements:", e);
			}
		}

		if (placements.length === 0) return;

		for (const npc of placements) {
			const npcSprite = this.spriteAtlas.createSprite(npc.sprite, 0);
			if (!npcSprite) {
				console.warn(`[WorldScene] NPC sprite not found: ${npc.sprite}`);
				continue;
			}

			const entity = this.world.createEntity();
			const transform = new TransformComponent();
			const atlasEntry = this.spriteAtlas.getEntry(npc.sprite);
			const fw = atlasEntry?.frameWidth ?? 16;
			const fh = atlasEntry?.frameHeight ?? 40;
			// Adjust NPC position to nearest walkable tile
			let npcX = npc.x;
			let npcY = npc.y;
			if (this.map) {
				const tileX = Math.floor(npcX / WorldScene.TILE_PX);
				const tileY = Math.floor(npcY / WorldScene.TILE_PX);
				const extraVal = this.map.data.getTileIndex(
					MapData.MAP_CAMERA_BOUNDS_LAYER,
					tileX,
					tileY,
				);
				if (extraVal === 0) {
					const W = this.map.data.widthTiles1X;
					const H = this.map.data.heightTiles1X;
					for (let r = 1; r < 15; r++) {
						let found = false;
						for (let dy = -r; dy <= r && !found; dy++) {
							for (let dx = -r; dx <= r && !found; dx++) {
								const tx = tileX + dx;
								const ty = tileY + dy;
								if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
									const val = this.map.data.getTileIndex(
										MapData.MAP_CAMERA_BOUNDS_LAYER,
										tx,
										ty,
									);
									if (val !== 0) {
										npcX = tx * WorldScene.TILE_PX;
										npcY = ty * WorldScene.TILE_PX;
										found = true;
									}
								}
							}
						}
						if (found) break;
					}
				}
			}
			transform.x = npcX + fw / 2;
			transform.y = npcY + fh;

			const spriteComp = new SpriteComponent();
			npcSprite.anchor.set(0.5, 1.0);
			spriteComp.sprite = npcSprite;

			const npcAnim = this.spriteAtlas.createAnimatedSprite(
				npc.sprite,
				"Down",
				0.1,
			);
			if (npcAnim) {
				npcAnim.anchor.set(0.5, 1.0);
				npcAnim.play();
				spriteComp.sprite = npcAnim;
			}

			(spriteComp as any).assetId = npc.sprite;
			this.world.addComponent(entity, transform);
			this.world.addComponent(entity, spriteComp);

			const behavior = new BehaviorComponent();
			behavior.behaviors = [new NPCBehavior(this.world)];
			this.world.addComponent(entity, behavior);

			const interaction = new InteractionComponent();
			const npcName = npc.sprite;
			interaction.interactions.push({
				type: "dialogue",
				params: { text: getNPCDialogue(npcName)?.lines || ["..."] },
			});
			this.world.addComponent(entity, interaction);

			if (this.map) {
				spriteComp.sprite.zIndex = transform.y;
				this.map.addEntity({
					id: entity,
					sprite: spriteComp.sprite,
					npcSpriteName: npc.sprite,
					update: () => {},
				} as any);
			}

			// Add name label above NPC
			const nameLabel = new Text({
				text: npc.sprite.replace(/([A-Z])/g, " $1").trim(),
				style: {
					fill: "#ffffff",
					fontSize: 8,
					fontWeight: "bold",
					stroke: { color: "#000000", width: 2 },
				},
			});
			nameLabel.anchor.set(0.5);
			nameLabel.position.set(fw / 2, -fh - 8);
			nameLabel.alpha = 0.8;
			spriteComp.sprite.addChild(nameLabel);
			console.log(
				`[WorldScene] Spawned NPC: ${npc.sprite} at (${transform.x},${transform.y})`,
			);
		}
	}

	/**
	 * Update camera bounds to match the current map dimensions.
	 */
	/** Spawn furniture/prop entity sprites from map_entities.json */
	/** Spawn furniture/prop entity sprites from per-map entity files */
	private createMapEntities(): void {
		if (!this.map || !this.spriteAtlas.loaded) return;
		const mapName = this.currentMapName || "";
		const safeMapName = mapName.replace(/\//g, "_");

		// Load entity data for this specific map (~5KB per map)
		fetch(`/map_entities/${safeMapName}.json`)
			.then((r) => (r.ok ? r.json() : []))
			.then((entities: any[]) => {
				// Guard: map may have changed during async fetch
				if ((this.currentMapName || "") !== mapName) return;
				if (!entities || entities.length === 0) return;

				let spawned = 0;
				this.entityColliders = [];
				for (const ent of entities) {
					// Use animated sprite for multi-frame entities (TVs, signs, etc.)
					const entry = this.spriteAtlas.getEntry(ent.sprite);
					const isAnimated = entry && entry.frames > 1;
					let sprite: any = null;
					if (isAnimated) {
						sprite = this.spriteAtlas.createAnimatedSpriteWithFallback(
							ent.sprite,
							["Frame0", "Down", "Frame0Copy", "First"],
							0.1,
						);
						if (sprite) sprite.play();
					}
					if (!sprite) {
						sprite = this.spriteAtlas.createSprite(ent.sprite, 0);
					}
					if (!sprite) continue;

					const entityEntry = this.spriteAtlas.getEntry(ent.sprite);
					const fw = entityEntry?.frameWidth ?? 16;
					const fh = entityEntry?.frameHeight ?? 16;

					// Entity position: anchor at top-left (utilityOffset is 0,0 for furniture)
					// Override the default anchor set by createAnimatedSprite
					sprite.anchor.set(0, 0);
					sprite.x = ent.x;
					sprite.y = ent.y;

					// Y-based depth sorting: use bottom of sprite as zIndex
					sprite.zIndex = ent.y + fh;

					// Store collision rectangle for nonWalkable entities
					if (ent.nonWalkable) {
						this.entityColliders.push({ x: ent.x, y: ent.y, w: fw, h: fh });
					}

					// Add to entity sprite container (renders below above-layer)
					if (this.map && (this.currentMapName || "") === mapName) {
						this.map.entitySpriteContainer.addChild(sprite);

						// Add dynamic light for TVs
						if (ent.sprite.toLowerCase().includes("tv")) {
							const lightEntity = this.world.createEntity();
							const ltransform = new TransformComponent();
							ltransform.x = ent.x + fw / 2;
							ltransform.y = ent.y + fh / 2;
							this.world.addComponent(lightEntity, ltransform);

							const light = new LightComponent();
							light.radius = 120;
							light.baseRadius = 120;
							light.color = 0xe7ffff; // TV light: warm white-blue (from map_lights.json: r=231, g=255, b=255)
							light.flicker = true;
							light.intensity = 0.6;
							this.world.addComponent(lightEntity, light);
						}
					}

					spawned++;
				}

				console.log(
					`[WorldScene] Spawned ${spawned} entity sprites for ${mapName}`,
				);
			})
			.catch(() => {
				// Entity file not found - non-critical, continue without entities
			});
	}

	private updateCameraBounds(): void {
		if (!this.camera || !this.map) return;
		const mapW = this.map.data.widthTiles1X * WorldScene.TILE_PX;
		const mapH = this.map.data.heightTiles1X * WorldScene.TILE_PX;
		this.camera.setBounds(0, 0, mapW, mapH);
		// Adjust zoom based on map type
		this.camera.zoom = this.map.data.isOutside ? 2.0 : 3.0;
	}
	/**
	 * Called by TeleportSystem when the player steps on a door/warp entity.
	 * Loads the destination map and moves the player.
	 */
	public async changeMap(
		mapId: string,
		targetX: number,
		targetY: number,
	): Promise<void> {
		if (this.mapTransitioning) return;
		this.mapTransitioning = true;
		console.log(
			`[WorldScene] changeMap: "${mapId}" at (${targetX}, ${targetY})`,
		);
		AudioManager.playSound("door_open", { volume: 0.3 });
		// Fade to black
		await this.fadeOut(200);
		// Clean up old map entities (doors, NPCs, torches) - keep only player
		if (this.map) {
			for (const entity of [...this.map.entities]) {
				const entityId = (entity as any).id;
				if (
					entityId !== undefined &&
					entityId !== (this.world as any).playerEntityId
				) {
					// Remove sprite from render system
					const spriteComp = this.world.getComponent(entityId, "Sprite") as
						| SpriteComponent
						| undefined;
					if (spriteComp?.sprite?.parent)
						spriteComp.sprite.parent.removeChild(spriteComp.sprite);
					this.world.removeEntity(entityId);
				}
			}
			this.map.entities = [];
		}
		// Show loading text for large maps
		const loadingText = new Text({
			text: "Loading...",
			style: { fill: "#ffffff", fontSize: 24, fontWeight: "bold" },
		});
		loadingText.anchor.set(0.5);
		loadingText.position.set(this.width / 2, this.height / 2);
		this.container.addChild(loadingText);
		// Try to load the map by name
		const loaded = await this.loadLegacyMapByName(mapId);
		// Remove loading text
		loadingText.destroy();
		if (!loaded) {
			this.showDialogue(`The way to "${mapId}" is not yet available...`);
			this.mapTransitioning = false;
			return;
		}
		// Set cooldown to prevent immediate re-trigger
		this._doorCooldown = 1500; // 1 second cooldown
		// Move player to target position
		// Validate the arrival position is on a walkable tile
		if (this.playerTransform && this.map) {
			let arrX = targetX;
			let arrY = targetY;
			const arrTX = Math.floor(arrX / WorldScene.TILE_PX);
			const arrTY = Math.floor(arrY / WorldScene.TILE_PX);
			const arrExtra = this.map.data.getTileIndex(
				MapData.MAP_CAMERA_BOUNDS_LAYER,
				arrTX,
				arrTY,
			);
			if (arrExtra === 0) {
				// Arrival position is on void/wall - find nearest walkable tile
				console.log(
					`[WorldScene] Arrival (${arrTX},${arrTY}) is on void, searching for walkable tile...`,
				);
				const W = this.map.data.widthTiles1X;
				const H = this.map.data.heightTiles1X;
				let found = false;
				for (let r = 1; r < 20 && !found; r++) {
					for (let dy = -r; dy <= r && !found; dy++) {
						for (let dx = -r; dx <= r && !found; dx++) {
							const tx = arrTX + dx;
							const ty = arrTY + dy;
							if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
								const e = this.map.data.getTileIndex(
									MapData.MAP_CAMERA_BOUNDS_LAYER,
									tx,
									ty,
								);
								if (e !== 0) {
									arrX = tx * WorldScene.TILE_PX;
									arrY = ty * WorldScene.TILE_PX;
									found = true;
									console.log(`[WorldScene] Adjusted arrival to (${tx},${ty})`);
								}
							}
						}
					}
				}
			}
			this.playerTransform.x = arrX;
			this.playerTransform.y = arrY;
			// Update map spawn position for viewport rendering of large maps
			if (this.map) this.map.setSpawnPosition(arrX, arrY);
			// Small camera shake for impact
			if (this.camera) {
				this.camera.setShake(150, 2, 2);
			}
		}
		// Rebuild door entities for the new map
		this.createDoorEntities();
		// Create torch lights for the new room
		this.createTorches();
		// Spawn NPCs for the new map
		await this.createNPCs();
		// Spawn map entity sprites (furniture, props)
		this.createMapEntities();
		// Update camera
		this.updateCameraBounds();
		// Adjust lighting and weather for indoor/outdoor
		this.isExteriorMap = this.map?.data.isOutside ?? false;
		if (this.vignetteOverlay) {
			this.vignetteOverlay.visible = !this.isExteriorMap;
		}
		// Music is handled by AmbientMusicGenerator (mood-based real-time audio)
		if (this.isExteriorMap && !this.weatherContainer) {
			this.createWeatherOverlay();
		}
		if (this.weatherContainer) {
			this.weatherContainer.visible = this.isExteriorMap;
		}
		// Adjust lighting for indoor/outdoor
		if (this.lightingSystem) {
			if (this.map?.data.isOutside) {
				this.lightingSystem.ambientColor = 0xeeeeff;
				this.lightingSystem.dayDuration = 60.0;
				this.lightingSystem.enableDayNightCycle = true;
			} else {
				this.lightingSystem.ambientColor = 0xffffff; // Indoor: full brightness, lights add warmth
				this.lightingSystem.dayDuration = 999999;
				this.lightingSystem.enableDayNightCycle = false;
			}
		}
		// Fade in from black (room transition effect)
		// Fade in from black
		await this.fadeIn(300);
		// Show room name banner
		this.showRoomBanner(
			WorldScene.friendlyMapName(this.currentMapName || "Unknown"),
		);
		// Switch ambient music to new room mood
		// Ambient music disabled — was causing buzzing noise
		// const newMood = AmbientMusicGenerator.getMoodFromMapName(
		//   this.currentMapName || "",
		// );
		// this.ambientMusic.play(newMood);
		this.mapTransitioning = false;
	}
	public onMapGenerated(mapData: MapData): void {
		this.map = new GameMap(mapData, this.realTileset);
		const spX =
			(mapData.defaultSpawnX ?? Math.floor(mapData.widthTiles1X / 2)) * 8;
		const spY =
			(mapData.defaultSpawnY ?? Math.floor(mapData.heightTiles1X / 2)) * 8;
		this.map.setSpawnPosition(spX, spY);
		this.worldContainer.removeChildAt(0);
		this.worldContainer.addChildAt(this.map.container, 0);
		this.map.loadAtlasPixels(); // async: will re-render when atlas pixels are ready
		this.map.render(this.tileset, this.palette);
		this.showDialogue(Localization.get("welcome"));
	}
	private handleWorkerMessage(msg: any): void {
		if (msg.type === "pathResult") {
			const components = (this.world as any).entities.get(msg.data.entityId);
			const pathComp = components?.get("Pathfinding") as PathfindingComponent;
			if (pathComp) {
				pathComp.path = msg.data.path;
				pathComp.isCalculating = false;
			}
		}
	}
	private createMinimapUI(): void {
		this.minimapContainer = new Container();
		this.minimapContainer.position.set(this.width - 160, 20);
		this.minimapContainer.zIndex = 9999;
		this.container.addChild(this.minimapContainer);
		const bg = new Graphics();
		bg.rect(0, 0, 140, 140);
		bg.fill({ color: 0x000000, alpha: 0.6 });
		bg.stroke({ color: 0x3366ff, width: 2 });
		this.minimapContainer.addChild(bg);
		this.minimapGraphics = new Graphics();
		this.minimapContainer.addChild(this.minimapGraphics);
	}
	private createHudUI(): void {
		this.hudContainer = new Container();
		this.hudContainer.position.set(20, 20);
		this.hudContainer.zIndex = 10000;
		this.container.addChild(this.hudContainer);

		// Vignette overlay for indoor maps (darker edges)
		const vignetteCanvas = document.createElement("canvas");
		vignetteCanvas.width = this.width;
		vignetteCanvas.height = this.height;
		const vCtx = vignetteCanvas.getContext("2d")!;
		const vGrad = vCtx.createRadialGradient(
			this.width / 2,
			this.height / 2,
			Math.min(this.width, this.height) * 0.3,
			this.width / 2,
			this.height / 2,
			Math.max(this.width, this.height) * 0.7,
		);
		vGrad.addColorStop(0, "rgba(0,0,0,0)");
		vGrad.addColorStop(1, "rgba(0,0,0,0.5)");
		vCtx.fillStyle = vGrad;
		vCtx.fillRect(0, 0, this.width, this.height);
		const vignetteTex = Texture.from(vignetteCanvas);
		this.vignetteOverlay = new Sprite(vignetteTex);
		this.vignetteOverlay.zIndex = 9990;
		this.vignetteOverlay.visible = false; // Only shown indoors
		this.container.addChild(this.vignetteOverlay);

		const bg = new Graphics();
		bg.roundRect(0, 0, 280, 80, 10);
		bg.fill({ color: 0x000000, alpha: 0.6 });
		bg.stroke({ color: 0x3366ff, width: 2 });
		this.hudContainer.addChild(bg);
		const style = new TextStyle({
			fill: "#ffffff",
			fontSize: 16,
			fontWeight: "bold",
		});
		this.hpText = new Text({ text: "HP: 100/100", style });
		this.hpText.position.set(15, 10);
		this.goldText = new Text({
			text: "GOLD: $19.99",
			style: { fill: "#ffd700", fontSize: 16, fontWeight: "bold" },
		});
		this.goldText.position.set(15, 35);
		this.mapNameText = new Text({
			text: this.currentMapName,
			style: { fill: "#88ccff", fontSize: 14, fontWeight: "bold" },
		});
		this.mapNameText.position.set(15, 58);
		this.hudContainer.addChild(this.hpText, this.goldText, this.mapNameText);
	}
	/** Get a friendly display name for a map ID */
	private static friendlyMapName(mapId: string): string {
		const names: Record<string, string> = {
			ALPHAStadiumBackstage: "Event Backstage",
			ALPHAStadiumMain: "Event Stadium",
			CITYBankElevator: "Bank Elevator",
			CITYBankEntrance: "Bank",
			CITYBobsAptInside: "Bob's Apartment",
			CITYBobsBathroom: "Bob's Bathroom",
			CITYCasinoBackroom: "Casino Backroom",
			CITYCasinoEntrance: "Casino Entrance",
			CITYCasinoMain: "Casino Floor",
			CITYCity: "City",
			CITYCityHallEntrance: "City Hall",
			CITYDeli: "Deli",
			CITYFashionStore: "Fashion Store",
			CITYFireDepartmentGarage: "Fire Dept. Garage",
			CITYFireDepartmentQuarters: "Fire Dept. Quarters",
			CITYFireDepartmentUpstairs: "Fire Department",
			CITYGroovyClub: "Groovy Club",
			CITYGroovyClubEntrance: "Groovy Club Entrance",
			CITYHospitalElevator: "Hospital Elevator",
			CITYHospitalEmergencyEntrance: "Emergency Entrance",
			CITYHospitalEntrance: "Hospital",
			CITYHospitalMorgue: "Morgue",
			CITYHospitalPsychiatricWard: "Psychiatric Ward",
			CITYHospitalSecretLab: "Secret Lab",
			CITYHotelEntrance: "Hotel",
			CITYHotelPool: "Hotel Pool",
			CITYHotelRoom: "Hotel Room",
			CITYHotelSauna: "Sauna",
			CITYHourlyMotel: "Hourly Motel",
			CITYLaundromat: "Laundromat",
			CITYMuseumExhibit: "Museum Exhibit",
			CITYMuseumGiftShop: "Gift Shop",
			CITYMuseumLobby: "Museum",
			CITYNorthSide: "North Side",
			CITYOfficeEntrance: "Office Building",
			CITYPartyStore: "Party Store",
			CITYPawnShop: "Pawn Shop",
			CITYPoliceStationEvidenceRoom: "Evidence Room",
			CITYPoliceStationHoldingCells: "Holding Cells",
			CITYPoliceStationInterrogationRoom: "Interrogation Room",
			CITYPoliceStationLobby: "Police Station",
			CITYPoliceStationPrisonVisitingRoom: "Visiting Room",
			CITYPoolHall: "Pool Hall",
			CITYStadiumBackstage: "Backstage",
			CITYStadiumLobby: "Stadium Lobby",
			CITYStadiumMain: "Stadium",
			CITYTheCafe: "The Cafe",
			CITYTheCafeEntrance: "Cafe Entrance",
			GENERIC1Downstairs: "House - Downstairs",
			GENERIC1Upstairs: "House - Upstairs",
			INTRODownstairs: "Strange Lower Hall",
			INTROUpstairs: "Strange Hallway",
			SCHOOLArtRoom: "Art Room",
			SCHOOLBackHallway: "Back Hallway",
			SCHOOLBoysBathroom: "Boys' Bathroom",
			SCHOOLClassHallway: "Classroom Hallway",
			SCHOOLClassroom1: "Classroom 1",
			SCHOOLClassroom2: "Classroom 2",
			SCHOOLClassroom3: "Classroom 3",
			SCHOOLClassroom4: "Classroom 4",
			SCHOOLClassroom5: "Classroom 5",
			SCHOOLClassroom6: "Classroom 6",
			SCHOOLClinic: "Nurse's Office",
			SCHOOLClinicBathroom: "Nurse's Bathroom",
			SCHOOLComputerLab: "Computer Lab",
			SCHOOLCustodian: "Custodian's Closet",
			SCHOOLDetention: "Detention",
			SCHOOLEntranceHallway: "Entrance Hall",
			SCHOOLGirlsBathroom: "Girls' Bathroom",
			SCHOOLGymCafeteria: "Cafeteria",
			SCHOOLGymGym: "Gymnasium",
			SCHOOLGymHallway: "Gym Hallway",
			SCHOOLKitchen: "Kitchen",
			SCHOOLLibrary: "Library",
			SCHOOLMainOffice: "Main Office",
			SCHOOLMusicRoom: "Music Room",
			SCHOOLPlayground: "Playground",
			SCHOOLPrincipalsOffice: "Principal's Office",
			SCHOOLTeachersLounge: "Teachers' Lounge",
			TOWNArcade: "Arcade",
			TOWNBeautySalon: "Beauty Salon",
			TOWNBeautySalonTanningRoom: "Tanning Room",
			TOWNBookstore: "Bookstore",
			TOWNBookstoreBathroom: "Bookstore Bathroom",
			TOWNCRAZYBasement: "Crazy House Basement",
			TOWNCRAZYDownstairs: "Crazy House",
			TOWNCRAZYDownstairsBathroom: "Crazy House Bathroom",
			TOWNCRAZYGarage: "Crazy House Garage",
			TOWNCRAZYUpstairs: "Crazy House Upstairs",
			TOWNCRAZYUpstairsBathroom: "Crazy Upstairs Bath",
			TOWNCRAZYUpstairsBedroom: "Crazy House Bedroom",
			TOWNCRAZYUpstairsHidden: "Crazy House Hidden Room",
			TOWNChurch: "Church",
			TOWNClubHouse: "Club House",
			TOWNCoffeeShop: "Coffee Shop",
			TOWNDepartmentStore: "Department Store",
			TOWNDoctorsOfficeBackHall: "Doctor's Back Hall",
			TOWNDoctorsOfficeBackRoom: "Doctor's Back Room",
			TOWNDoctorsOfficeEntrance: "Doctor's Office",
			TOWNElectronicsStore: "Electronics Store",
			TOWNElectronicsStoreBackRoom: "Electronics Back Room",
			TOWNFRIENDBasement: "Friend's Basement",
			TOWNFRIENDDownstairs: "Friend's House",
			TOWNFRIENDDownstairsBathroom: "Friend's Bathroom",
			TOWNFRIENDGarage: "Friend's Garage",
			TOWNFRIENDUpstairs: "Friend's Upstairs",
			TOWNFRIENDUpstairsBathroom: "Friend's Upstairs Bath",
			TOWNFRIENDUpstairsFriendsRoom: "Friend's Room",
			TOWNFRIENDUpstairsParentsRoom: "Friend's Parents' Room",
			TOWNFRIENDUpstairsSistersRoom: "Sister's Room",
			TOWNGameStore: "Game Store",
			TOWNGasStation: "Gas Station",
			TOWNGroceryStore: "Grocery Store",
			TOWNMANSIONDownstairs: "Mansion",
			TOWNMANSIONDownstairsKitchen: "Mansion Kitchen",
			TOWNMANSIONUpstairsVideoGameRoom: "Mansion Game Room",
			TOWNMovieTheatreInsideLeft: "Theater Left",
			TOWNMovieTheatreInsideRight: "Theater Right",
			TOWNMovieTheatreLobby: "Theatre Lobby",
			TOWNMovieTheatreMainHall: "Main Theater",
			TOWNMovieTheatreMensBathroom: "Men's Restroom",
			TOWNMovieTheatrePhotoBooth: "Photo Booth",
			TOWNMovieTheatreWomensBathroom: "Women's Restroom",
			TOWNOutsideForest: "Forest",
			TOWNOutsideNeighborhood: "Neighborhood",
			TOWNPets4Less: "Pets 4 Less",
			TOWNPizzaPlace: "Pizza Place",
			TOWNRecordStore: "Record Store",
			TOWNTacoBurger: "Taco Burger",
			TOWNTown: "Town",
			TOWNVideoRent: "Video Rent",
			TOWNVideoRentAdultRoom: "Video Back Room",
			TOWNYUUAttic: "Attic",
			TOWNYUUBackyard: "Backyard",
			TOWNYUUBackyardToolShed: "Tool Shed",
			TOWNYUUBasement: "Basement",
			TOWNYUUDownstairs: "Downstairs",
			TOWNYUUDownstairsBathroom: "Bathroom",
			TOWNYUUFrontYard: "Front Yard",
			TOWNYUUGarage: "Garage",
			TOWNYUUUpstairs: "Upstairs Hallway",
			TOWNYUUUpstairsBabyRoom: "Baby Room",
			TOWNYUUUpstairsBathroom: "Upstairs Bathroom",
			TOWNYUUUpstairsBrothersRoom: "Brother's Room",
			TOWNYUUUpstairsParentsRoom: "Parents' Room",
			TOWNYUUUpstairsYuusRoom: "Yuu's Room",
		};
		// Fallback: split camelCase and add spaces
		if (names[mapId]) return names[mapId];
		// Remove common prefixes
		let name = mapId.replace(
			/^(TOWN|CITY|SCHOOL|HOSPITAL|POLICE|INTRO|MISC|ALPHA|CRAZY)/,
			"",
		);
		// Split on capital letters
		name = name.replace(/([A-Z])/g, " $1").trim();
		return name || mapId;
	}
	private updateHud(): void {
		// Show version in corner
		if (!this.versionText && this.hudContainer) {
			const style = new TextStyle({ fill: "#888888", fontSize: 10 });
			this.versionText = new Text({ text: "v3.3.5", style });
			this.versionText.position.set(4, this.height - 16);
			this.container.addChild(this.versionText);
		}
		if (!this.hudContainer) return;
		const combat = this.world.getComponent<CombatComponent>(
			(this.world as any).playerEntityId,
			"Combat",
		);
		const inv = this.world.getComponent<InventoryComponent>(
			(this.world as any).playerEntityId,
			"Inventory",
		);
		if (combat && this.hpText)
			this.hpText.text = `HP: ${combat.hp}/${combat.maxHp}`;
		if (inv && this.goldText)
			this.goldText.text = `GOLD: $${inv.gold.toFixed(2)}`;
		if (this.mapNameText)
			this.mapNameText.text = WorldScene.friendlyMapName(
				this.currentMapName || "",
			);
		// Update debug HUD with door proximity info
		if (this.debugHud && this.playerTransform) {
			const ptx = Math.floor(this.playerTransform.x / WorldScene.TILE_PX);
			const pty = Math.floor(this.playerTransform.y / WorldScene.TILE_PX);
			const doorCount = this.map?.data.doorDataList.length ?? 0;
			let doorInfo = "";
			for (const door of this.map?.data.doorDataList ?? []) {
				const dx = (door.x ?? 0) - ptx;
				const dy = (door.y ?? 0) - pty;
				const dist = Math.abs(dx) + Math.abs(dy);
				doorInfo += ` [${door.name}@(${door.x},${door.y}) d=${dist}]`;
			}
			this.debugHud.text = `${this.currentMapName} (${ptx},${pty}) doors:${doorCount}${doorInfo}`;
			// Update page title with debug info (readable via agent-browser)
			document.title = `bg: ${this.currentMapName} (${ptx},${pty}) doors:${doorCount}${doorInfo}`;
		}
		// FPS counter
		this.fpsFrameCount++;
		const now = performance.now();
		if (now - this.fpsLastTime > 1000) {
			this.fpsDisplay = Math.round(
				(this.fpsFrameCount * 1000) / (now - this.fpsLastTime),
			);
			this.fpsFrameCount = 0;
			this.fpsLastTime = now;
			if (!this.fpsText && this.hudContainer) {
				this.fpsText = new Text({
					text: "",
					style: new TextStyle({ fill: "#666666", fontSize: 10 }),
				});
				this.fpsText.position.set(200, 65);
				this.hudContainer.addChild(this.fpsText);
			}
			if (this.fpsText) this.fpsText.text = `${this.fpsDisplay} FPS`;
		}
	}
	/** Toggle pause menu */
	private togglePause(): void {
		this.isPaused = !this.isPaused;
		if (this.isPaused) {
			this.createPauseMenu();
		} else if (this.pauseContainer) {
			this.pauseContainer.visible = false;
			AudioManager.playSound("menu_cancel", { volume: 0.2 });
		}
	}
	private createPauseMenu(): void {
		if (!this.pauseContainer) {
			this.pauseContainer = new Container();
			this.pauseContainer.zIndex = 9999;
			this.container.addChild(this.pauseContainer);
			const bg = new Graphics();
			bg.rect(0, 0, this.width, this.height);
			bg.fill({ color: 0x000000, alpha: 0.7 });
			this.pauseContainer.addChild(bg);
			const title = new Text({
				text: "PAUSED",
				style: new TextStyle({
					fill: "#3366ff",
					fontSize: 48,
					fontWeight: "bold",
				}),
			});
			title.anchor.set(0.5);
			title.position.set(this.width / 2, this.height / 2 - 100);
			this.pauseContainer.addChild(title);
			const options = ["Resume", "Save Game", "Controls", "Quit to Menu"];
			options.forEach((opt, idx) => {
				const btn = new Text({
					text: opt,
					style: new TextStyle({ fill: "#ffffff", fontSize: 24 }),
				});
				btn.anchor.set(0.5);
				btn.position.set(this.width / 2, this.height / 2 - 20 + idx * 50);
				btn.eventMode = "static";
				btn.cursor = "pointer";
				btn.on("pointerdown", () => {
					switch (idx) {
						case 0:
							this.togglePause();
							break;
						case 1:
							this.saveCharacterToCloud();
							AudioManager.playSound("rpg_save", { volume: 0.3 });
							this.showDialogue("Game saved!");
							this.togglePause();
							break;
						case 2:
							this.showDialogue([
								"WASD/Arrows - Move",
								"Shift - Sprint",
								"E - Interact",
								"Tilde - Console",
								"F5/F9 - Save/Load",
							]);
							this.togglePause();
							break;
						case 3:
							this.saveCharacterToCloud();
							StateManager.pop();
							break;
					}
				});
				this.pauseContainer?.addChild(btn);
			});
		}
		this.pauseContainer!.visible = true;
		AudioManager.playSound("menu_select", { volume: 0.2 });
	}
	private updateWeather(dt: number): void {
		if (!this.isExteriorMap || !this.weatherContainer) return;
		// Create rain drops if needed
		if (this.rainDrops.length === 0) {
			for (let i = 0; i < 80; i++) {
				this.rainDrops.push({
					x: Math.random() * this.width,
					y: Math.random() * this.height,
					speed: 300 + Math.random() * 200,
				});
			}
		}
		const g = this.weatherContainer.children[0] as any;
		if (!g) return;
		g.clear();
		// Update and draw rain
		for (const drop of this.rainDrops) {
			drop.y += drop.speed * dt;
			drop.x -= 30 * dt; // Slight wind
			if (drop.y > this.height) {
				drop.y = -10;
				drop.x = Math.random() * this.width;
			}
			if (drop.x < 0) drop.x = this.width;
			g.moveTo(drop.x, drop.y);
			g.lineTo(drop.x - 1, drop.y + 8);
			g.stroke({ color: 0x8899bb, width: 1, alpha: 0.4 });
		}
	}
	private createWeatherOverlay(): void {
		if (this.weatherContainer) {
			this.weatherContainer.destroy({ children: true });
		}
		this.weatherContainer = new Container();
		this.weatherContainer.zIndex = 9990;
		const g = new Graphics();
		this.weatherContainer.addChild(g);
		this.container.addChild(this.weatherContainer);
	}
	private updateMinimap(): void {
		if (!this.minimapGraphics || !this.playerTransform || !this.map) return;
		this.minimapGraphics.clear();
		const totalTiles = this.map.data.widthTiles1X * this.map.data.heightTiles1X;
		const skip = totalTiles > 20000 ? 4 : totalTiles > 5000 ? 2 : 1;
		const scale = Math.min(
			140 / (this.map.data.widthTiles1X * 2 * skip),
			140 / (this.map.data.heightTiles1X * 2 * skip),
		);
		for (let y = 0; y < this.map.data.heightTiles1X; y += skip) {
			for (let x = 0; x < this.map.data.widthTiles1X; x += skip) {
				const ground = this.map.data.getTileIndex(
					MapData.MAP_GROUND_LAYER,
					x,
					y,
				);
				const extra = this.map.data.getTileIndex(
					MapData.MAP_CAMERA_BOUNDS_LAYER,
					x,
					y,
				);
				const obj = this.map.data.getTileIndex(MapData.MAP_OBJECT_LAYER, x, y);
				if (extra === 0) {
					this.minimapGraphics.rect(x * scale, y * scale, scale, scale);
					this.minimapGraphics.fill(0x222233); // void/exterior
				} else if (obj === 839) {
					this.minimapGraphics.rect(x * scale, y * scale, scale, scale);
					this.minimapGraphics.fill(0x444466); // wall top
				} else if (ground === 839) {
					this.minimapGraphics.rect(x * scale, y * scale, scale, scale);
					this.minimapGraphics.fill(0x444466); // wall ground
				} else if (ground !== 0) {
					this.minimapGraphics.rect(x * scale, y * scale, scale, scale);
					this.minimapGraphics.fill(0x886644); // floor
				}
			}
		}
		// NPC dots (green)
		for (const entity of this.map.entities) {
			const transform = this.world.getComponent(
				(entity as any).id,
				"Transform",
			) as TransformComponent | undefined;
			if (
				transform &&
				this.world.getComponent((entity as any).id, "Behavior")
			) {
				const nx = (transform.x / WorldScene.TILE_PX) * scale;
				const ny = (transform.y / WorldScene.TILE_PX) * scale;
				this.minimapGraphics.circle(nx, ny, 2);
				this.minimapGraphics.fill(0x44ff44);
			}
		}
		// Door dots (orange)
		for (const entity of this.map.entities) {
			const transform = this.world.getComponent(
				(entity as any).id,
				"Transform",
			) as TransformComponent | undefined;
			const teleport = this.world.getComponent(
				(entity as any).id,
				"Teleport",
			) as TeleportComponent | undefined;
			if (transform && teleport?.targetMapId) {
				const dx = (transform.x / WorldScene.TILE_PX) * scale;
				const dy = (transform.y / WorldScene.TILE_PX) * scale;
				this.minimapGraphics.circle(dx, dy, 2);
				this.minimapGraphics.fill(0xff8800);
			}
		}
		// Player dot (blue, larger)
		const px = (this.playerTransform.x / WorldScene.TILE_PX) * scale;
		const py = (this.playerTransform.y / WorldScene.TILE_PX) * scale;
		this.minimapGraphics.circle(px, py, 3);
		this.minimapGraphics.fill(0x3366ff);
	}
	private createDialogueUI(): void {
		this.dialogueContainer = new Container();
		this.dialogueContainer.visible = false;
		this.container.addChild(this.dialogueContainer);
		const bg = new Graphics();
		bg.rect(50, this.height - 150, this.width - 100, 100);
		bg.fill({ color: 0x0a0a2e, alpha: 0.92 });
		bg.stroke({ color: 0xffffff, width: 2 });
		this.dialogueContainer.addChild(bg);
		const style = new TextStyle({
			fill: "#e0e0e0",
			fontSize: 18,
			wordWrap: true,
			wordWrapWidth: this.width - 140,
			lineHeight: 26,
			stroke: { color: "#000033", width: 1 },
		});
		this.dialogueCaption = new Text({
			text: "",
			style: {
				fill: "#66aaff",
				fontSize: 16,
				fontWeight: "bold",
				stroke: { color: "#000033", width: 2 },
			},
		});
		this.dialogueCaption.position.set(70, this.height - 150);
		this.dialogueContainer.addChild(this.dialogueCaption);

		this.dialogueText = new Text({ text: "", style });
		this.dialogueText.position.set(70, this.height - 130);
		this.dialogueContainer.addChild(this.dialogueText);
		const prompt = new Text({
			text: "[SPACE/E] Continue",
			style: {
				fill: "#668899",
				fontSize: 14,
				stroke: { color: "#000033", width: 1 },
			},
		});
		prompt.position.set(this.width - 250, this.height - 70);
		this.dialogueContainer.addChild(prompt);
	}
	public showDialogue(
		messages: string | string[],
		countAsNpcInteraction: boolean = false,
		caption?: string,
	): void {
		if (!this.dialogueText || !this.dialogueContainer) return;
		if (countAsNpcInteraction) {
			AchievementManager.incrementStat("npcsInteracted");
		}
		this.dialoguePages = Array.isArray(messages) ? messages : [messages];
		this.currentDialoguePage = 0;
		this.dialogueTypingIndex = 0;
		this.dialogueTimer = 0;
		this.isDialogueActive = true;
		this.dialogueContainer.visible = true;
		this.dialogueText.text = "";
		if (this.dialogueCaption) {
			this.dialogueCaption.text = caption || "";
		}
		AudioManager.playSound("dialogue_beep", { volume: 0.1 });
	}
	private updateDialogue(dt: number): void {
		if (!this.isDialogueActive || !this.dialogueText || !this.dialogueContainer)
			return;
		const currentText = this.dialoguePages[this.currentDialoguePage];
		if (this.dialogueTypingIndex < currentText.length) {
			this.dialogueTimer += dt;
			if (this.dialogueTimer > 0.02) {
				this.dialogueTimer = 0;
				this.dialogueTypingIndex++;
				this.dialogueText.text = currentText.substring(
					0,
					this.dialogueTypingIndex,
				);
				if (AudioManager.isLoaded("menu_move"))
					AudioManager.playSound("menu_move", { volume: 0.1 });
			}
			if (this.isActionJustPressed) {
				this.dialogueTypingIndex = currentText.length;
				this.dialogueText.text = currentText;
				this.isActionJustPressed = false;
			}
		} else {
			if (this.isActionJustPressed) {
				this.currentDialoguePage++;
				if (this.currentDialoguePage >= this.dialoguePages.length) {
					this.isDialogueActive = false;
					this.dialogueContainer.visible = false;
					AudioManager.playSound("menu_cancel", { volume: 0.1 });
				} else {
					this.dialogueTypingIndex = 0;
					this.dialogueText.text = "";
					AudioManager.playSound("menu_select", { volume: 0.1 });
				}
				this.isActionJustPressed = false;
			} else {
				// Show continue hint
				const page = this.currentDialoguePage + 1;
				const total = this.dialoguePages.length;
				this.dialogueText.text =
					currentText + "\n[Press E/Space " + page + "/" + total + "]";
			}
		}
	}
	public startBattle(npcEntityId: number): void {
		AchievementManager.incrementStat("battlesStarted");
		const playerCombat = this.world.getComponent<CombatComponent>(
			(this.world as any).playerEntityId,
			"Combat",
		);
		const npcCombat = this.world.getComponent<CombatComponent>(
			npcEntityId,
			"Combat",
		);
		if (playerCombat && npcCombat) {
			const battleScene = new BattleScene({
				name: "battle",
				app: this.app,
				camera: this.camera ?? undefined,
				player: playerCombat,
				enemy: npcCombat,
			});
			SceneTransition.pushWithFade(this.app, battleScene);
		}
	}
	public openQuestLog(): void {
		const playerQuests = this.world.getComponent<QuestComponent>(
			(this.world as any).playerEntityId,
			"Quest",
		);
		if (playerQuests) {
			const questLog = new QuestLogScene({
				name: "quest-log",
				app: this.app,
				camera: this.camera ?? undefined,
				quests: playerQuests as any,
			});
			StateManager.push(questLog);
		}
	}
	public openInventory(): void {
		const playerInv = this.world.getComponent<InventoryComponent>(
			(this.world as any).playerEntityId,
			"Inventory",
		);
		if (playerInv) {
			const inventoryScene = new InventoryScene({
				name: "inventory",
				app: this.app,
				camera: this.camera ?? undefined,
				inventory: playerInv as any,
			} as any);
			StateManager.push(inventoryScene);
		}
	}
	public openShop(shopComp: ShopComponent): void {
		const playerInv = this.world.getComponent<InventoryComponent>(
			(this.world as any).playerEntityId,
			"Inventory",
		);
		if (playerInv) {
			const shopScene = new ShopScene({
				name: "shop",
				app: this.app,
				camera: this.camera ?? undefined,
				shop: shopComp,
				playerInventory: playerInv,
			} as any);
			StateManager.push(shopScene);
		}
	}
	public openSkillTree(): void {
		const playerSkills = this.world.getComponent<SkillTreeComponent>(
			(this.world as any).playerEntityId,
			"SkillTree",
		);
		const playerInv = this.world.getComponent<InventoryComponent>(
			(this.world as any).playerEntityId,
			"Inventory",
		);
		if (playerSkills && playerInv) {
			const skillTree = new SkillTreeScene({
				name: "skill-tree",
				app: this.app,
				camera: this.camera ?? undefined,
				skillTree: playerSkills,
				playerInventory: playerInv,
			} as any);
			StateManager.push(skillTree);
		}
	}
	private _createControlsOverlay(): void {
		this.controlsOverlay = new Container();
		this.controlsOverlay.zIndex = 9998;
		this.container.addChild(this.controlsOverlay);
		this.controlsOverlay.visible = true;

		const bg = new Graphics();
		bg.rect(this.width / 2 - 150, this.height / 2 - 80, 300, 160);
		bg.fill({ color: 0x000000, alpha: 0.85 });
		bg.stroke({ color: 0x3366ff, width: 2 });
		this.controlsOverlay.addChild(bg);

		const title = new Text({
			text: "bob's game",
			style: new TextStyle({
				fill: "#3366ff",
				fontSize: 24,
				fontWeight: "bold",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, this.height / 2 - 55);
		this.controlsOverlay.addChild(title);

		const controls = new Text({
			text: "WASD / Arrows - Move\nShift - Sprint\nE - Talk / Interact\nEsc - Pause Menu\nI - Inventory\nQ - Quest Log\n` (Tilde) - Debug Console",
			style: new TextStyle({
				fill: "#cccccc",
				fontSize: 13,
				lineHeight: 22,
				align: "center",
			}),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height / 2 + 5);
		this.controlsOverlay.addChild(controls);

		const hint = new Text({
			text: "Press any key to start",
			style: new TextStyle({ fill: "#666666", fontSize: 12 }),
		});
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, this.height / 2 + 60);
		this.controlsOverlay.addChild(hint);
	}

	private createTorches(): void {
		if (!this.map || this.map.data.isOutside) return; // No torches outdoors
		// Scan the object layer for torch/lamp tiles
		const torchTileIds = [1383, 1384, 1385, 1386, 1387]; // Common torch/light tile IDs
		const torchPositions: { x: number; y: number }[] = [];

		for (let y = 0; y < this.map.data.heightTiles1X; y++) {
			for (let x = 0; x < this.map.data.widthTiles1X; x++) {
				const tileId = this.map.data.getTileIndex(
					MapData.MAP_OBJECT_LAYER,
					x,
					y,
				);
				if (torchTileIds.includes(tileId)) {
					torchPositions.push({ x: x * 8 + 4, y: y * 8 + 4 });
				}
			}
		}
		// If no torch tiles found, add ambient lights at room corners
		if (torchPositions.length === 0) {
			const w = this.map.data.widthTiles1X * 8;
			const h = this.map.data.heightTiles1X * 8;
			torchPositions.push(
				{ x: w * 0.25, y: h * 0.25 },
				{ x: w * 0.75, y: h * 0.25 },
				{ x: w * 0.5, y: h * 0.5 },
				{ x: w * 0.25, y: h * 0.75 },
				{ x: w * 0.75, y: h * 0.75 },
			);
		}
		// Create light entities at torch positions
		for (const pos of torchPositions) {
			const entity = this.world.createEntity();
			const transform = new TransformComponent();
			transform.x = pos.x;
			transform.y = pos.y;
			this.world.addComponent(entity, transform);
			const light = new LightComponent();
			light.radius = 100;
			light.baseRadius = 100;
			light.color = 0xff8833; // Warm torch color
			light.flicker = true;
			light.intensity = 0.8;
			this.world.addComponent(entity, light);
		}
		console.log(`[WorldScene] Created ${torchPositions.length} torch lights`);
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
				case "emote":
					this.showEmoteBubble(p.entityId, data.data.text);
					break;
			}
		}
	}
	public showEmoteBubble(entityId: number, text: string): void {
		const transform = this.world.getComponent<TransformComponent>(
			entityId,
			"Transform",
		);
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
		this.consoleInput = document.createElement("input");
		this.consoleInput.type = "text";
		this.consoleInput.placeholder =
			"Enter command... (tp x y | map filename | msg text)";
		this.consoleInput.style.position = "absolute";
		this.consoleInput.style.left = "10px";
		this.consoleInput.style.top = "10px";
		this.consoleInput.style.width = this.width - 20 + "px";
		this.consoleInput.style.background = "transparent";
		this.consoleInput.style.color = "#00ff00";
		this.consoleInput.style.border = "none";
		this.consoleInput.style.fontFamily = "monospace";
		this.consoleInput.style.outline = "none";
		this.consoleInput.style.display = "none";
		document.body.appendChild(this.consoleInput);
		this.consoleInput.onkeydown = (e) => {
			if (e.key === "Enter") {
				this.executeCommand(this.consoleInput!.value);
				this.consoleInput!.value = "";
				this.toggleConsole();
			} else if (e.key === "Escape") {
				this.toggleConsole();
			}
		};
	}
	private toggleConsole(): void {
		this.consoleActive = !this.consoleActive;
		this.consoleContainer!.visible = this.consoleActive;
		this.consoleInput!.style.display = this.consoleActive ? "block" : "none";
		if (this.consoleActive) {
			this.consoleInput!.focus();
			InputManager.setLocked(true);
		} else {
			InputManager.setLocked(false);
		}
	}
	private executeCommand(cmd: string): void {
		const args = cmd.split(" ");
		const action = args[0].toLowerCase();
		switch (action) {
			case "tp":
				if (this.playerTransform) {
					this.playerTransform.x = parseInt(args[1]) || 0;
					this.playerTransform.y = parseInt(args[2]) || 0;
				}
				break;
			case "map": {
				// Load a specific map file: "map map_5.json"
				const filename = args[1] || "map_12.json";
				this.loadLegacyMap(filename).then(() => {
					this.createDoorEntities();
					this.updateCameraBounds();
					if (this.playerTransform) {
						const spawnX = this.map?.data.defaultSpawnX ?? 10;
						const spawnY = this.map?.data.defaultSpawnY ?? 10;
						this.playerTransform.x = spawnX * WorldScene.TILE_PX;
						this.playerTransform.y = spawnY * WorldScene.TILE_PX;
					}
					this.showDialogue(`Loaded: ${this.currentMapName}`);
				});
				break;
			}
			case "maps": {
				const names = LegacyMapLoader.getAllMapNames();
				this.showDialogue(names.map((n, i) => `${i + 1}. ${n}`).join("\n"));
				break;
			}
			case "msg":
				this.showDialogue(args.slice(1).join(" "));
				break;
			case "gen":
				this.world.addComponent(
					(this.world as any).playerEntityId,
					new MapGenComponent(),
				);
				break;
			case "weather":
				this.world.addComponent(
					(this.world as any).playerEntityId,
					new WeatherComponent(),
				);
				break;
			case "lang":
				Localization.setLanguage((args[1] as Language) || "en");
				this.showDialogue(Localization.get("greeting"));
				break;
			case "warp": {
				// Warp to any map by name: "warp TOWNOutsideNeighborhood"
				const warpName = args.slice(1).join(" ");
				if (warpName) {
					this.changeMap(warpName, 0, 0).then(() => {
						if (this.playerTransform) {
							const sx = this.map?.data.defaultSpawnX ?? 10;
							const sy = this.map?.data.defaultSpawnY ?? 10;
							this.playerTransform.x = sx * WorldScene.TILE_PX;
							this.playerTransform.y = sy * WorldScene.TILE_PX;
						}
					});
				} else {
					const graphDoors = getDoorGraphForMap(this.currentMapName || "");
					const dests = graphDoors
						.map((d: any) => d.destMap)
						.filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);
					this.showDialogue(
						dests.length > 0
							? "Available warps: " + dests.join(", ")
							: "No doors found for current map",
					);
				}
				break;
			}
			case "door": {
				const doorMap = this.currentMapName;
				const doorInfo = getDoorGraphForMap(doorMap);
				if (doorInfo && doorInfo.length > 0) {
					const lines = doorInfo.map(
						(d: any) =>
							`  (${d.x},${d.y}) -> ${d.destMap} arrive(${d.arrivalX},${d.arrivalY})`,
					);
					this.showDialogue([`Doors on ${doorMap}:`, ...lines]);
				} else {
					this.showDialogue("No doors found on this map.");
				}
				break;
			}
			case "npc": {
				const npcsOnMap =
					this.map?.entities.filter((e: any) => e.npcSpriteName) ?? [];
				if (npcsOnMap.length > 0) {
					const lines = npcsOnMap.map(
						(e: any) =>
							`  ${e.npcSpriteName} at (${e.sprite?.x ?? 0},${e.sprite?.y ?? 0})`,
					);
					this.showDialogue([
						`NPCs on ${this.currentMapName} (${npcsOnMap.length}):`,
						...lines,
					]);
				} else {
					this.showDialogue("No NPCs on this map.");
				}
				break;
			}
			case "pos": {
				if (this.playerTransform) {
					const px = Math.floor(this.playerTransform.x / WorldScene.TILE_PX);
					const py = Math.floor(this.playerTransform.y / WorldScene.TILE_PX);
					const extra = this.map?.data.getTileIndex(
						MapData.MAP_CAMERA_BOUNDS_LAYER,
						px,
						py,
					);
					const hit = this.map?.data.getTileIndex(
						MapData.MAP_HIT_LAYER,
						px,
						py,
					);
					this.showDialogue([
						`Position: (${this.playerTransform.x.toFixed(0)}, ${this.playerTransform.y.toFixed(0)})px = tile (${px}, ${py})`,
						`Map: ${this.currentMapName}`,
						`Extra: ${extra} Hit: ${hit} GodMode: ${this.godMode}`,
						`Entities: ${this.map?.entities.length ?? 0} | Colliders: ${this.entityColliders.length}`,
						`Layer sprites: ${this.map?.layers.reduce((s, l) => s + l.children.length, 0) ?? 0}`,
						`ESC children: ${this.map?.entitySpriteContainer.children.length ?? 0} (tiles: ${this.map?.entitySpriteContainer.children.filter((c: any) => c._isTileSprite).length ?? 0})`,
					]);
				}
				break;
			}
			case "god": {
				this.godMode = !this.godMode;
				this.showDialogue(
					this.godMode ? "God mode ON - no collision" : "God mode OFF",
				);
				break;
			}
			case "speed": {
				const speed = parseFloat(args[1]);
				if (speed > 0 && speed <= 500) {
					(this as any)._customSpeed = speed;
					this.showDialogue(`Player speed set to ${speed}`);
				} else {
					this.showDialogue("Usage: speed <1-500>");
				}
				break;
			}
			case "save":
				this.saveCharacterToCloud();
				break;
			default:
				this.showDialogue(
					`Unknown command: ${action}\nAvailable: tp, map, maps, warp, door, npc, msg, gen, weather, lang, pos, god, speed, save`,
				);
		}
	}
	protected onUpdate(dt: number): void {
		this.isActionJustPressed =
			InputManager.isActionPressed() || InputManager.isKeyPressed(Key.E);
		// Dismiss controls overlay on any input
		if (this.controlsOverlay && this.controlsOverlay.visible) {
			if (
				InputManager.isUpPressed() ||
				InputManager.isDownPressed() ||
				InputManager.isLeftPressed() ||
				InputManager.isRightPressed() ||
				InputManager.isActionPressed()
			) {
				this.controlsOverlay.visible = false;
			}
			return; // Don't process game input while overlay is visible
		}
		if (this.isDialogueActive) {
			this.updateDialogue(dt);
			if (InputManager.isKeyPressed(Key.Tilde)) this.toggleConsole();
			return;
		}
		this.world.update(dt);
		// === Player Movement with hit-collision ===
		if (this.playerTransform && this.map && !this.isDialogueActive) {
			const PLAYER_SPEED = (this as any)._customSpeed ?? 80; // pixels per second at 1X
			const SPRINT_MULT = this.playerIsSprinting ? 1.8 : 1.0;
			let dx = 0,
				dy = 0;
			if (InputManager.isUpHeld()) dy -= 1;
			if (InputManager.isDownHeld()) dy += 1;
			if (InputManager.isLeftHeld()) dx -= 1;
			if (InputManager.isRightHeld()) dx += 1;
			// === 8-Direction Animation System (from original game) ===
			// Direction constants: 0=Up, 1=Down, 2=Left, 3=Right, 4=UpLeft, 5=UpRight, 6=DownLeft, 7=DownRight
			const DIR_NAMES = [
				"Up",
				"Down",
				"Left",
				"Right",
				"UpLeft",
				"UpRight",
				"DownLeft",
				"DownRight",
			] as const;

			// Calculate movement direction from input (8 directions + diagonal)
			let targetDir = this.animDirection;
			if (dx !== 0 || dy !== 0) {
				if (dx === 0 && dy > 0)
					targetDir = 1; // Down
				else if (dx === 0 && dy < 0)
					targetDir = 0; // Up
				else if (dx < 0 && dy === 0)
					targetDir = 2; // Left
				else if (dx > 0 && dy === 0)
					targetDir = 3; // Right
				else if (dx < 0 && dy < 0)
					targetDir = 4; // UpLeft
				else if (dx > 0 && dy < 0)
					targetDir = 5; // UpRight
				else if (dx < 0 && dy > 0)
					targetDir = 6; // DownLeft
				else if (dx > 0 && dy > 0) targetDir = 7; // DownRight
				this.moveDirection = targetDir;
			}

			this.playerIsSprinting = InputManager.isKeyHeld("Shift");
			this.playerIsMoving = dx !== 0 || dy !== 0;

			const playerSpriteComp = this.world.getComponent(
				(this.world as any).playerEntityId,
				"Sprite",
			) as any;

			if (playerSpriteComp?.sprite) {
				const has8Dir = this.spriteAtlas.has8Directions("yuu");
				let displayDir = this.animDirection;

				// === Turning System ===
				// When direction changes, turn through intermediate directions
				if (this.playerIsMoving && this.animDirection !== this.moveDirection) {
					if (!this.isTurning) {
						this.isTurning = true;
						this.turnTimer = 0;
					}
					this.turnTimer -= dt;
					if (this.turnTimer <= 0) {
						this.turnTimer = this.turnDelay;
						displayDir = this.getNextTurnDirection(
							this.animDirection,
							this.moveDirection,
							has8Dir,
						);
						this.animDirection = displayDir;
						if (displayDir === this.moveDirection) this.isTurning = false;
					} else {
						displayDir = this.animDirection;
					}
				} else if (this.playerIsMoving) {
					this.isTurning = false;
					displayDir = this.animDirection;
				} else {
					this.isTurning = false;
					displayDir = this.animDirection;
				}

				// Map direction index to animation name
				let animName = DIR_NAMES[displayDir] || "Down";
				if (!has8Dir && displayDir >= 4) {
					if (displayDir === 4 || displayDir === 5) animName = "Up";
					else animName = "Down";
				}

				// Apply animation direction
				if (playerSpriteComp.currentAnimation !== animName) {
					const frames = this.spriteAtlas.getAnimationFrames("yuu", animName);
					if (frames.length > 0) {
						playerSpriteComp.sprite.textures = frames;
						playerSpriteComp.currentAnimation = animName;
					}
				}

				// === Walk/Run Animation ===
				if (this.playerIsMoving && !this.isTurning) {
					// Reset idle state when starting to move
					this.idleFrame = 0;
					this.idleTimer = 0;
					playerSpriteComp.sprite.animationSpeed = this.playerIsSprinting
						? 0.4
						: 0.2; // Match Java: normal=80ms/frame, sprint=30ms/frame
					playerSpriteComp.sprite.play();
				}
				// === Idle Animation (from original game's doStandingAnimation) ===
				else if (!this.playerIsMoving) {
					this.idleTimer -= dt;
					if (this.idleTimer <= 0) {
						// Random delay between idle frames (~0.5-1.5 seconds)
						this.idleTimer = 0.5 + Math.random() * 1.0;
						// Idle: alternate between standing (0) and breathing (3)
						// Frame 0 = neutral stand, Frame 3 = breathing pose
						// Skip frame 7 which is a walk-cycle extreme, not an idle pose
						if (this.idleFrame === 0) {
							this.idleFrame = 3;
						} else {
							this.idleFrame = 0;
						}
						// Subtle pixel jitter (1px, matching original game)
						if (Math.random() < 0.3) {
							playerSpriteComp.sprite.x =
								this.playerTransform.x + (Math.random() < 0.5 ? -0.5 : 0.5);
						} else {
							playerSpriteComp.sprite.x = this.playerTransform.x;
						}
					}
					playerSpriteComp.sprite.gotoAndStop(this.idleFrame);
					playerSpriteComp.sprite.stop();
				}
				// === Turning Animation ===
				else if (this.isTurning) {
					playerSpriteComp.sprite.gotoAndStop(0);
					playerSpriteComp.sprite.stop();
				}
			}

			// Footstep sounds
			if (this.playerIsMoving) {
				this.footstepTimer -= dt;
				if (this.footstepTimer <= 0) {
					this.footstepTimer = this.playerIsSprinting ? 180 : 280;
					this.footstepIndex = (this.footstepIndex + 1) % 4;
					AudioManager.playSound(`footstep_${this.footstepIndex}`, {
						volume: 0.15,
					});
				}
			} else {
				this.footstepTimer = 0;
			}
			// Normalize diagonal movement
			if (dx !== 0 && dy !== 0) {
				const inv = 1 / Math.SQRT2;
				dx *= inv;
				dy *= inv;
			}
			const newX =
				this.playerTransform.x + dx * PLAYER_SPEED * SPRINT_MULT * dt;
			const newY =
				this.playerTransform.y + dy * PLAYER_SPEED * SPRINT_MULT * dt;
			// Hit-collision check using the map's hitBounds layer
			const PW = 8; // player half-width (collision box)
			const PH = 8; // player collision height (feet only)
			const OX = -4; // offset from transform origin
			// Check X movement
			if (dx !== 0) {
				const testX = newX + OX;
				const feetY = this.playerTransform.y; // feet position
				const tileL = Math.floor(testX / WorldScene.TILE_PX);
				const tileR = Math.floor((testX + PW - 1) / WorldScene.TILE_PX);
				const tileT = Math.floor(feetY / WorldScene.TILE_PX);
				const tileB = Math.floor((feetY + PH - 1) / WorldScene.TILE_PX);
				let blocked = false;
				for (let ty = tileT; ty <= tileB; ty++) {
					for (let tx = tileL; tx <= tileR; tx++) {
						if (!this.godMode && this.isHitTile(tx, ty)) {
							blocked = true;
							break;
						}
					}
					if (blocked) break;
				}
				if (!blocked) {
					this.playerTransform.x = newX;
				}
			}
			// Check Y movement
			if (dy !== 0) {
				const feetX = this.playerTransform.x + OX;
				const testY = newY;
				const tileL = Math.floor(feetX / WorldScene.TILE_PX);
				const tileR = Math.floor((feetX + PW - 1) / WorldScene.TILE_PX);
				const tileT = Math.floor(testY / WorldScene.TILE_PX);
				const tileB = Math.floor((testY + PH - 1) / WorldScene.TILE_PX);
				let blocked = false;
				for (let ty = tileT; ty <= tileB; ty++) {
					for (let tx = tileL; tx <= tileR; tx++) {
						if (!this.godMode && this.isHitTile(tx, ty)) {
							blocked = true;
							break;
						}
					}
					if (blocked) break;
				}
				if (!blocked) {
					this.playerTransform.y = newY;
				}
			}
			// Clamp player to map bounds
			if (this.map) {
				const maxPx = (this.map.data.widthTiles1X - 1) * WorldScene.TILE_PX;
				const maxPy = (this.map.data.heightTiles1X - 1) * WorldScene.TILE_PX;
				this.playerTransform.x = Math.max(
					0,
					Math.min(maxPx, this.playerTransform.x),
				);
				this.playerTransform.y = Math.max(
					0,
					Math.min(maxPy, this.playerTransform.y),
				);
			}
			// Sync sprite position
			if (playerSpriteComp?.sprite) {
				playerSpriteComp.sprite.x = this.playerTransform.x;
				playerSpriteComp.sprite.y = this.playerTransform.y;
				playerSpriteComp.sprite.zIndex = this.playerTransform.y;
			}
			// Update player shadow sprite (from Java: shadowSize=0.65, shadowAlpha=0.60)
			// Shadow is the same texture as the current frame, flipped upside-down at the player's feet
			const shadow = (this as any).playerShadowSprite as Sprite | null;
			if (shadow && this.playerTransform && this.map?.entitySpriteContainer) {
				const playerSprite = playerSpriteComp?.sprite as any;
				if (playerSprite?.texture) {
					shadow.texture = playerSprite.texture;
				}
				shadow.x = this.playerTransform.x;
				shadow.y = this.playerTransform.y - 5; // lift shadow 5 pixels to sit at player feet
				shadow.zIndex = this.playerTransform.y - 0.1;
				if (!shadow.parent) {
					this.map.entitySpriteContainer.addChild(shadow);
				}
			}
			// Direct door proximity check (backup for TeleportSystem)
			// Cooldown to prevent immediate re-trigger on arrival
			if (this._doorCooldown > 0) this._doorCooldown -= dt;

			if (!this.mapTransitioning && this.map && this._doorCooldown <= 0) {
				const ptx = Math.floor(this.playerTransform.x / WorldScene.TILE_PX);
				const pty = Math.floor(this.playerTransform.y / WorldScene.TILE_PX);
				for (const door of this.map.data.doorDataList) {
					const dx = Math.abs((door.x ?? 0) - ptx);
					const dy = Math.abs((door.y ?? 0) - pty);
					if (
						(dx <= 1 || dx <= (door.width ?? 1)) &&
						(dy <= 1 || dy <= (door.height ?? 1)) &&
						door.destinationMapName
					) {
						console.log(
							`[WorldScene] DOOR TRIGGERED: Player at (${ptx},${pty}) near door "${door.name}" at (${door.x},${door.y}) -> ${door.destinationMapName}`,
						);
						const destX = (door.destinationX ?? 1) * WorldScene.TILE_PX;
						const destY = (door.destinationY ?? 1) * WorldScene.TILE_PX;
						this.changeMap(door.destinationMapName, destX, destY);
						break;
					}
				}
			}
		}

		// === Roof Hiding ===
		// When the player walks under an above-layer tile, make above layers semi-transparent
		if (this.map && this.playerTransform) {
			const ptx = Math.floor(this.playerTransform.x / WorldScene.TILE_PX);
			const pty = Math.floor(this.playerTransform.y / WorldScene.TILE_PX);
			const aboveTile = this.map.data.getTileIndex(
				MapData.MAP_ABOVE_LAYER,
				ptx,
				pty,
			);
			// Only the above layer (rooftops/ceilings) triggers fade.
			// above2 (curtains, decorations) should NEVER fade - always fully visible.
			// Tile 839 is an invisible wall/collision marker, not a real rooftop.
			// Skip it to prevent false roof-fade when walking near walls.
			const underRoof = aboveTile !== 0 && aboveTile !== 839;
			const targetAlpha = underRoof ? 0.3 : 1.0;
			const aboveLayer = this.map.layers[MapData.MAP_ABOVE_LAYER];
			const aboveDetailLayer = this.map.layers[MapData.MAP_ABOVE_DETAIL_LAYER];
			if (aboveLayer)
				aboveLayer.alpha += (targetAlpha - aboveLayer.alpha) * 0.15; // smooth transition
			// above2 (curtains, decorations) ALWAYS stays fully opaque
			if (aboveDetailLayer)
				aboveDetailLayer.alpha += (1.0 - aboveDetailLayer.alpha) * 0.15;
		}

		// Set facing direction via Transform so RenderSystem picks it up
		// Direction handled by 8-dir sprite frames, no scaleX flip needed
		// Update room name banner
		if (this.roomBanner && this.roomBannerTimer > 0) {
			this.roomBannerTimer -= dt;
			const elapsed = 3000 - this.roomBannerTimer;
			if (elapsed < 300) {
				this.roomBanner.alpha = elapsed / 300; // Fade in
			} else if (this.roomBannerTimer < 300) {
				this.roomBanner.alpha = this.roomBannerTimer / 300; // Fade out
			} else {
				this.roomBanner.alpha = 1.0;
			}
			this.roomBanner.position.set(this.width / 2, 60);
		} else if (this.roomBanner) {
			this.roomBanner.alpha = 0;
		}
		// Update camera to follow player
		if (this.camera && this.playerTransform) {
			this.camera.update(dt);
			// Sync camera position to lighting system for correct light positions
			if (this.lightingSystem && this.camera) {
				this.lightingSystem.cameraX = this.camera.x;
				this.lightingSystem.cameraY = this.camera.y;
				this.lightingSystem.cameraZoom = this.camera.zoom;
			}
		}
		if (this.map) {
			this.map.update(dt);
			// Re-render viewport for large exterior maps
			if (this.playerTransform && (this.map as any).isLargeMap) {
				this.map.renderViewportAround(
					this.playerTransform.x,
					this.playerTransform.y,
					this.width,
					this.height,
					this.camera?.zoom ?? 2,
				);
			}
		}

		this.updateInteractionHint();
		this.checkWarpAreas();
		this.checkAreaTriggers();
		this.checkDoorAreas();
		this.updateMinimap();
		// Auto-save every 60 seconds
		this._autoSaveTimer = (this._autoSaveTimer || 0) + dt;
		if (this._autoSaveTimer > 60000) {
			this._autoSaveTimer = 0;
			this.saveCharacterToCloud();
			if (this.hudContainer) {
				const saveIcon = new Text({
					text: "*",
					style: { fill: "#44ff44", fontSize: 14, fontWeight: "bold" },
				});
				saveIcon.position.set(260, 65);
				this.hudContainer.addChild(saveIcon);
				setTimeout(() => {
					saveIcon.destroy();
				}, 2000);
			}
		}
		this.updateWeather(dt);
		this.updateHud();
		this.updateDebugHud();
		this.saveTimer += dt;
		if (this.saveTimer >= this.SAVE_INTERVAL) {
			this.saveTimer = 0;
			this.saveCharacterToCloud();
		}
		if (this.playerTransform) {
			AudioManager.updateListener(
				this.playerTransform.x,
				this.playerTransform.y,
				0,
			);
		}
		// NPC interaction works in both online and offline mode
		if (InputManager.isKeyPressed(Key.E) && !this.isDialogueActive) {
			const npcTalked = this.tryInteractWithNearbyNPC();
			if (!npcTalked) {
				this.showEmoteBubble((this.world as any).playerEntityId, "Hello!");
			}
		}
		if (this.playerTransform && networkManager.connected) {
			networkManager.emit("playerMove", {
				x: this.playerTransform.x,
				y: this.playerTransform.y,
			});
		}
		if (InputManager.isKeyPressed(Key.Tilde)) this.toggleConsole();
		if (InputManager.isKeyPressed(Key.Q)) this.openQuestLog();
		if (InputManager.isKeyPressed(Key.I)) this.openInventory();
		if (InputManager.isKeyPressed(Key.K)) this.openSkillTree();
		if (InputManager.isKeyPressed(Key.Escape)) {
			this.togglePause();
		}

		// +/- zoom keys
		if (
			InputManager.isKeyPressed(Key.Plus) ||
			InputManager.isKeyPressed("NumpadAdd")
		) {
			this.camera?.zoomIn();
		}
		if (
			InputManager.isKeyPressed(Key.Minus) ||
			InputManager.isKeyPressed("NumpadSubtract")
		) {
			this.camera?.zoomOut();
		}

		// === Debug Keys (from original Java game) ===
		this.handleDebugKeys();
	}
	/**
	 * Check if a tile position has a hit/collision tile.
	 */
	/** Show interaction hint near doors and NPCs */
	private updateInteractionHint(): void {
		if (!this.playerTransform || !this.map) return;
		// Create hint text if needed
		if (!this.interactionHint) {
			const style = new TextStyle({
				fill: "#ffffff",
				fontSize: 12,
				fontWeight: "bold",
				stroke: { color: "#000000", width: 3 },
			});
			this.interactionHint = new Text({ text: "", style });
			this.interactionHint.anchor.set(0.5);
			this.interactionHint.alpha = 0;
			this.container.addChild(this.interactionHint);
		}
		const px = this.playerTransform.x;
		const py = this.playerTransform.y;
		const RANGE = 24; // pixels
		let hintText = "";
		// Check for nearby doors
		for (const entity of this.map.entities) {
			const transform = this.world.getComponent(
				(entity as any).id,
				"Transform",
			) as TransformComponent | undefined;
			if (!transform) continue;
			const dx = Math.abs(transform.x - px);
			const dy = Math.abs(transform.y - py);
			if (dx < RANGE && dy < RANGE) {
				const teleport = this.world.getComponent(
					(entity as any).id,
					"Teleport",
				) as TeleportComponent | undefined;
				if (teleport?.targetMapId) {
					hintText = "Walk through";
					break;
				}
			}
		}
		// Check for nearby NPCs
		if (!hintText) {
			for (const entity of this.map.entities) {
				const transform = this.world.getComponent(
					(entity as any).id,
					"Transform",
				) as TransformComponent | undefined;
				if (!transform) continue;
				const dx = Math.abs(transform.x - px);
				const dy = Math.abs(transform.y - py);
				if (dx < RANGE && dy < RANGE) {
					const behavior = this.world.getComponent(
						(entity as any).id,
						"Behavior",
					);
					const npcName = (entity as any).npcSpriteName;
					if (behavior || npcName) {
						hintText = "Press E to talk";
						break;
					}
				}
			}
		}
		// Update hint visibility
		if (hintText) {
			this.interactionHint.text = hintText;
			// Position above the player in screen space
			this.interactionHint.position.set(this.width / 2, this.height / 2 - 40);
			this.interactionHint.alpha = Math.min(
				1,
				this.interactionHint.alpha + 0.1,
			);
		} else {
			this.interactionHint.alpha = Math.max(
				0,
				this.interactionHint.alpha - 0.1,
			);
		}
	}

	/** Show a room name banner that fades in/out */
	private showRoomBanner(name: string): void {
		if (!this.roomBanner) {
			const style = new TextStyle({
				fill: "#ffffff",
				fontSize: 28,
				fontWeight: "bold",
				stroke: { color: "#000000", width: 4 },
				dropShadow: { color: "#000000", blur: 4, distance: 2 },
			});
			this.roomBanner = new Text({ text: "", style });
			this.roomBanner.anchor.set(0.5, 0);
			this.container.addChild(this.roomBanner);
		}
		// Clean up the name - remove prefix like "TOWNYUU"
		const displayName = name
			.replace(/^(TOWN|CITY|SCHOOL|INTRO|ALPHA|BLANK|MISC)([A-Z])/g, "$2")
			.replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase to spaces
			.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"); // acronym before word
		this.roomBanner.text = displayName;
		this.roomBanner.position.set(this.width / 2, 60);
		this.roomBanner.alpha = 0;
		this.roomBannerTimer = 3000; // Show for 3 seconds
	}
	/** Fade screen to black over duration ms */
	private fadeOut(duration: number): Promise<void> {
		return new Promise((resolve) => {
			if (!this.fadeOverlay) {
				this.fadeOverlay = new Graphics();
				this.container.addChild(this.fadeOverlay);
			}
			this.fadeOverlay.clear();
			this.fadeOverlay.rect(0, 0, this.width, this.height);
			this.fadeOverlay.fill(0x000000);
			this.fadeOverlay.alpha = 0;
			this.fadeOverlay.zIndex = 9999;
			// Simple linear fade
			const start = performance.now();
			const step = () => {
				const elapsed = performance.now() - start;
				const t = Math.min(elapsed / duration, 1);
				this.fadeOverlay!.alpha = t;
				if (t < 1) requestAnimationFrame(step);
				else resolve();
			};
			requestAnimationFrame(step);
		});
	}
	/** Fade screen from black over duration ms */
	private fadeIn(duration: number): Promise<void> {
		return new Promise((resolve) => {
			if (!this.fadeOverlay) {
				resolve();
				return;
			}
			const start = performance.now();
			const step = () => {
				const elapsed = performance.now() - start;
				const t = Math.min(elapsed / duration, 1);
				this.fadeOverlay!.alpha = 1 - t;
				if (t < 1) requestAnimationFrame(step);
				else {
					this.fadeOverlay!.alpha = 0;
					resolve();
				}
			};
			requestAnimationFrame(step);
		});
	}
	/**
	 * Calculate the next direction when turning from current to target.
	 * Implements the original game's step-by-step turning logic:
	 * characters turn through intermediate directions rather than snapping.
	 * Directions: 0=Up, 1=Down, 2=Left, 3=Right, 4=UpLeft, 5=UpRight, 6=DownLeft, 7=DownRight
	 */
	private getNextTurnDirection(
		current: number,
		target: number,
		has8Dir: boolean,
	): number {
		if (current === target) return target;
		if (!has8Dir) return target; // 4-dir sprites snap immediately

		// Turning lookup table from the original Java game
		// Maps (currentDir, targetDir) -> nextDir
		// Each entry gives the immediate next direction to turn towards
		const TURN_TABLE: Record<string, number> = {
			// Target: Up
			"0-0": 0,
			"1-0": 6,
			"2-0": 4,
			"3-0": 5,
			"4-0": 0,
			"5-0": 0,
			"6-0": 2,
			"7-0": 3,
			// Target: Down
			"0-1": 4,
			"1-1": 1,
			"2-1": 6,
			"3-1": 7,
			"4-1": 2,
			"5-1": 3,
			"6-1": 1,
			"7-1": 1,
			// Target: Left
			"0-2": 4,
			"1-2": 6,
			"2-2": 2,
			"3-2": 4,
			"4-2": 2,
			"5-2": 0,
			"6-2": 2,
			"7-2": 1,
			// Target: Right
			"0-3": 5,
			"1-3": 7,
			"2-3": 5,
			"3-3": 3,
			"4-3": 0,
			"5-3": 3,
			"6-3": 1,
			"7-3": 3,
			// Target: UpLeft
			"0-4": 4,
			"1-4": 6,
			"2-4": 4,
			"3-4": 5,
			"4-4": 4,
			"5-4": 0,
			"6-4": 2,
			"7-4": 3,
			// Target: UpRight
			"0-5": 5,
			"1-5": 7,
			"2-5": 4,
			"3-5": 5,
			"4-5": 0,
			"5-5": 5,
			"6-5": 2,
			"7-5": 3,
			// Target: DownLeft
			"0-6": 4,
			"1-6": 6,
			"2-6": 6,
			"3-6": 7,
			"4-6": 2,
			"5-6": 0,
			"6-6": 6,
			"7-6": 1,
			// Target: DownRight
			"0-7": 5,
			"1-7": 7,
			"2-7": 6,
			"3-7": 7,
			"4-7": 2,
			"5-7": 3,
			"6-7": 1,
			"7-7": 7,
		};

		const key = `${current}-${target}`;
		let next = TURN_TABLE[key];

		// For 180-degree turns, randomly choose left or right path
		// (matching original game's behavior)
		if (next === undefined) {
			// Direct assignment for any missing entries
			next = target;
		}
		// Random 180-degree turn override
		if (
			(current === 0 && target === 1) ||
			(current === 1 && target === 0) ||
			(current === 2 && target === 3) ||
			(current === 3 && target === 2)
		) {
			// Flip a coin for which way to turn
			const goLeft = Math.random() < 0.5;
			if (current === 1 && target === 0)
				next = goLeft ? 6 : 7; // Down->Up: turn via DownLeft or DownRight
			else if (current === 0 && target === 1)
				next = goLeft ? 4 : 5; // Up->Down: turn via UpLeft or UpRight
			else if (current === 2 && target === 3)
				next = goLeft ? 4 : 6; // Left->Right: turn via UpLeft or DownLeft
			else if (current === 3 && target === 2) next = goLeft ? 5 : 7; // Right->Left: turn via UpRight or DownRight
		}

		return next;
	}

	// ============================================================
	// Debug Keys (from original Java game)
	// ============================================================
	private handleDebugKeys(): void {
		if (!this.map) return;

		// F1 — Toggle debug HUD (tile coords, layer info, entity count)
		if (InputManager.isKeyPressed(Key.F1)) {
			this.debugHudVisible = !this.debugHudVisible;
			if (this.debugHudVisible) {
				if (!this.debugHud) {
					this.debugHud = new Text({
						text: "",
						style: new TextStyle({
							fill: "#00ff00",
							fontSize: 10,
							fontFamily: "monospace",
							stroke: { color: "#000000", width: 2 },
						}),
					});
					this.debugHud.position.set(4, this.height - 120);
					this.container.addChild(this.debugHud);
				}
				this.debugHud.visible = true;
			} else if (this.debugHud) {
				this.debugHud.visible = false;
			}
		}

		// F2 — Toggle hit/collision layer visibility
		if (InputManager.isKeyPressed(Key.F2)) {
			this.debugShowHitLayer = !this.debugShowHitLayer;
			const hitLayer = this.map.layers[MapData.MAP_HIT_LAYER];
			if (hitLayer) {
				hitLayer.visible = this.debugShowHitLayer;
				hitLayer.alpha = this.debugShowHitLayer ? 0.4 : 1;
				hitLayer.zIndex = this.debugShowHitLayer ? 999 : 200;
				// Re-render hit layer with visible tint if toggling on
				if (this.debugShowHitLayer) {
					hitLayer.removeChildren();
					for (let y = 0; y < this.map.data.heightTiles1X; y++) {
						for (let x = 0; x < this.map.data.widthTiles1X; x++) {
							const tileId = this.map.data.getTileIndex(
								MapData.MAP_HIT_LAYER,
								x,
								y,
							);
							if (tileId === 0) continue;
							const g = new Graphics();
							g.rect(x * 8, y * 8, 8, 8);
							g.fill(0xff0000);
							hitLayer.addChild(g);
						}
					}
				}
			}
			// Also show camera bounds
			const boundsLayer = this.map.layers[MapData.MAP_CAMERA_BOUNDS_LAYER];
			if (boundsLayer) {
				boundsLayer.visible = this.debugShowHitLayer;
				boundsLayer.alpha = this.debugShowHitLayer ? 0.3 : 1;
				boundsLayer.zIndex = this.debugShowHitLayer ? 998 : 201;
				if (this.debugShowHitLayer) {
					boundsLayer.removeChildren();
					for (let y = 0; y < this.map.data.heightTiles1X; y++) {
						for (let x = 0; x < this.map.data.widthTiles1X; x++) {
							const tileId = this.map.data.getTileIndex(
								MapData.MAP_CAMERA_BOUNDS_LAYER,
								x,
								y,
							);
							if (tileId === 0) continue;
							const g = new Graphics();
							g.rect(x * 8, y * 8, 8, 8);
							g.fill(0x00ff00);
							boundsLayer.addChild(g);
						}
					}
				}
			}
			this.map.container.sortChildren();
			console.log(`[Debug] Hit layer visible: ${this.debugShowHitLayer}`);
		}

		// F4 — Toggle god mode (walk through walls)
		if (InputManager.isKeyPressed(Key.F4)) {
			this.godMode = !this.godMode;
			console.log(`[Debug] God mode: ${this.godMode}`);
		}

		// F6 — Cycle through layers, toggling each one's visibility
		if (InputManager.isKeyPressed(Key.F6)) {
			const layerIdx =
				this.debugLayerCycleIndex % WorldScene.DEBUG_LAYER_NAMES.length;
			const layerName = WorldScene.DEBUG_LAYER_NAMES[layerIdx];
			const layer = this.map.layers[layerIdx];
			if (layer) {
				layer.visible = !layer.visible;
				console.log(
					`[Debug] Layer ${layerIdx} (${layerName}): visible=${layer.visible}, children=${layer.children.length}, alpha=${layer.alpha}, zIndex=${layer.zIndex}`,
				);
			}
			this.debugLayerCycleIndex = layerIdx + 1;
		}

		// F7 — Cycle alpha of current debug layer (0.25 → 0.5 → 0.75 → 1.0)
		if (InputManager.isKeyPressed(Key.F7)) {
			const layerIdx =
				this.debugLayerCycleIndex > 0
					? (this.debugLayerCycleIndex - 1) %
						WorldScene.DEBUG_LAYER_NAMES.length
					: 0;
			const layerName = WorldScene.DEBUG_LAYER_NAMES[layerIdx];
			const layer = this.map.layers[layerIdx];
			if (layer) {
				const alphas = [0.25, 0.5, 0.75, 1.0];
				const currentIdx = alphas.indexOf(layer.alpha);
				const nextIdx = (currentIdx + 1) % alphas.length;
				layer.alpha = alphas[nextIdx];
				console.log(
					`[Debug] Layer ${layerIdx} (${layerName}) alpha: ${layer.alpha}`,
				);
			}
		}

		// F10 — Toggle lighting system
		if (InputManager.isKeyPressed(Key.F10)) {
			this.debugLightingEnabled = !this.debugLightingEnabled;
			if (this.lightingSystem) {
				(this.lightingSystem as any).lightLayer.visible =
					this.debugLightingEnabled;
			}
			console.log(`[Debug] Lighting: ${this.debugLightingEnabled}`);
		}

		// F12 — Log all layer states to console
		if (InputManager.isKeyPressed(Key.F12)) {
			console.log("=== Map Layer Debug ===");
			for (let i = 0; i < this.map.layers.length; i++) {
				const l = this.map.layers[i];
				const name =
					i < WorldScene.DEBUG_LAYER_NAMES.length
						? WorldScene.DEBUG_LAYER_NAMES[i]
						: `layer${i}`;
				console.log(
					`  L${i} (${name}): visible=${l.visible}, alpha=${l.alpha}, zIndex=${l.zIndex}, children=${l.children.length}`,
				);
			}
			console.log(
				`  ESC: children=${this.map.entitySpriteContainer.children.length}`,
			);
			console.log(
				`  GodMode: ${this.godMode}, HitLayer: ${this.debugShowHitLayer}`,
			);
			if (this.playerTransform) {
				const px = Math.floor(this.playerTransform.x / WorldScene.TILE_PX);
				const py = Math.floor(this.playerTransform.y / WorldScene.TILE_PX);
				console.log(
					`  Player: (${this.playerTransform.x.toFixed(1)}, ${this.playerTransform.y.toFixed(1)})px = tile(${px}, ${py})`,
				);
				// Log tile IDs under player for all layers
				for (let i = 0; i < MapData.layers; i++) {
					const tid = this.map.data.getTileIndex(i, px, py);
					if (tid !== 0) {
						const name =
							i < WorldScene.DEBUG_LAYER_NAMES.length
								? WorldScene.DEBUG_LAYER_NAMES[i]
								: `L${i}`;
						console.log(`    ${name}: tile=${tid}`);
					}
				}
			}
		}
	}

	/** Update the debug HUD overlay text */
	private updateDebugHud(): void {
		if (
			!this.debugHudVisible ||
			!this.debugHud ||
			!this.playerTransform ||
			!this.map
		)
			return;
		const px = Math.floor(this.playerTransform.x / WorldScene.TILE_PX);
		const py = Math.floor(this.playerTransform.y / WorldScene.TILE_PX);
		const lines: string[] = [];
		lines.push(
			`pos: (${this.playerTransform.x.toFixed(0)}, ${this.playerTransform.y.toFixed(0)})px tile(${px}, ${py})`,
		);
		lines.push(`map: ${this.currentMapName}  god: ${this.godMode}`);
		for (
			let i = 0;
			i < this.map.layers.length && i < WorldScene.DEBUG_LAYER_NAMES.length;
			i++
		) {
			const l = this.map.layers[i];
			const name = WorldScene.DEBUG_LAYER_NAMES[i];
			lines.push(
				`L${i}(${name}): vis=${l.visible} a=${l.alpha} z=${l.zIndex} n=${l.children.length}`,
			);
		}
		this.debugHud.text = lines.join("\n");
	}

	private isHitTile(tx: number, ty: number): boolean {
		if (!this.map) return true;
		if (
			tx < 0 ||
			ty < 0 ||
			tx >= this.map.data.widthTiles1X ||
			ty >= this.map.data.heightTiles1X
		)
			return true;
		if (this.godMode) return false;

		const gndTile = this.map.data.getTileIndex(
			MapData.MAP_GROUND_LAYER,
			tx,
			ty,
		);
		const objTile = this.map.data.getTileIndex(
			MapData.MAP_OBJECT_LAYER,
			tx,
			ty,
		);
		const hitTile = this.map.data.getTileIndex(MapData.MAP_HIT_LAYER, tx, ty);
		const extraTile = this.map.data.getTileIndex(
			MapData.MAP_CAMERA_BOUNDS_LAYER,
			tx,
			ty,
		);

		// 1. Explicit Hit Markers (Highest Priority)
		if (hitTile !== 0) return true;

		// 2. Extra Layer Override (Original game walkable zone)
		// 1 = interior/walkable, 0 = void/blocked
		if (extraTile === 1) return false;

		// 3. Strict Wall ID Blocking (if no extra override)
		if (objTile === 839 || objTile === 8280) return true;
		if (MapData.WALL_IDS.has(objTile)) return true;
		if (MapData.WALL_IDS.has(gndTile)) return true;

		// 4. Floor Exception (Walkable floor IDs)
		if (MapData.FLOOR_IDS.has(gndTile)) {
			if (objTile !== 0 && MapData.WALL_IDS.has(objTile)) return true;
			return false;
		}

		// 5. Void check (if not a floor and no extra marker, empty is blocked)
		if (gndTile === 0 && objTile === 0) return true;
		if (extraTile === 0 && (gndTile === 839 || gndTile === 8280)) return true;

		// 6. Doors (Passage Zone)
		const isDoor = this.map.data.doorDataList.some(
			(d) =>
				tx >= d.x && tx < d.x + d.width && ty >= d.y && ty < d.y + d.height,
		);
		if (isDoor) return false;

		// 7. Entity collision (furniture bounding boxes)
		const px = tx * WorldScene.TILE_PX;
		const py = ty * WorldScene.TILE_PX;
		for (const ec of this.entityColliders) {
			if (
				px + WorldScene.TILE_PX > ec.x &&
				px < ec.x + ec.w &&
				py + WorldScene.TILE_PX > ec.y &&
				py < ec.y + ec.h
			) {
				return true; // inside entity bounding box = blocked
			}
		}
		return false; // walkable
	}

	/**
	 * Try to interact with a nearby NPC. Returns true if an NPC was found.
	 */
	private tryInteractWithNearbyNPC(): boolean {
		if (!this.playerTransform || !this.map) return false;
		const px = this.playerTransform.x / WorldScene.TILE_PX;
		const py = this.playerTransform.y / WorldScene.TILE_PX;
		const INTERACT_RANGE = 3; // tiles
		// [NPC] Interact check
		for (const entity of this.map.entities) {
			const transform = this.world.getComponent(
				(entity as any).id,
				"Transform",
			) as TransformComponent | undefined;
			if (!transform) continue;
			const dx = Math.abs(transform.x / WorldScene.TILE_PX - px);
			const dy = Math.abs(transform.y / WorldScene.TILE_PX - py);
			const npcName = (entity as any).npcSpriteName || "";
			// [NPC] entity check
			if (dx <= INTERACT_RANGE && dy <= INTERACT_RANGE) {
				const behavior = this.world.getComponent(
					(entity as any).id,
					"Behavior",
				);
				if (behavior || npcName) {
					// [NPC] proximity check
					if (npcName && hasDialogue(npcName)) {
						const dialogue = getNPCDialogue(npcName);
						console.log(
							`[NPC] Dialogue for "${npcName}":`,
							dialogue?.lines?.length ?? 0,
							"lines",
						);
						if (dialogue && dialogue.lines && dialogue.lines.length > 0) {
							this.showDialogue(dialogue.lines, true, dialogue.caption);
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	/** Check if player is in a warp area (door transition zone from original game) */
	private checkWarpAreas(): void {
		if (!this.playerTransform || this.isDialogueActive || this.mapTransitioning)
			return;
		if (this._doorCooldown > 0) return;

		const px = this.playerTransform.x;
		const py = this.playerTransform.y;
		const mapName = this.currentMapName || "";

		const warpAreas = getWarpAreasForMap(mapName);
		for (const area of warpAreas) {
			if (
				px >= area.x &&
				px < area.x + area.w &&
				py >= area.y &&
				py < area.y + area.h
			) {
				// Player is in the warp area - find the destination from door_graph
				const graphDoors = getDoorGraphForMap(mapName);
				const areaDest = area.areaName.replace(/^to/, "").toLowerCase();

				// Strategy 1: Match by exact door name (warp_toAreaName)
				let matchingDoor = graphDoors.find(
					(d: any) => d.name === "warp_" + area.areaName,
				);

				// Strategy 2: Match by destination containing area name substring
				if (!matchingDoor) {
					matchingDoor = graphDoors.find((d: any) => {
						const dest = (d.destMap || "").toLowerCase();
						return dest.includes(areaDest);
					});
				}

				// Strategy 3: Match by key words (strip direction suffixes like left/right/path)
				if (!matchingDoor) {
					const keyWords = areaDest.replace(/left|right|path/gi, "").trim();
					if (keyWords.length > 2) {
						matchingDoor = graphDoors.find((d: any) => {
							const dest = (d.destMap || "").toLowerCase();
							return dest.includes(keyWords);
						});
					}
				}

				// Strategy 4: Match by any significant word from areaDest appearing in destMap
				if (!matchingDoor) {
					const words = areaDest
						.split(/(?=[a-z]{3,})/)
						.filter((w) => w.length > 2);
					matchingDoor = graphDoors.find((d: any) => {
						const dest = (d.destMap || "").toLowerCase();
						return words.some((w) => dest.includes(w));
					});
				}

				if (matchingDoor) {
					const destX = (matchingDoor.arrivalX ?? 1) * WorldScene.TILE_PX;
					const destY = (matchingDoor.arrivalY ?? 1) * WorldScene.TILE_PX;
					console.log(
						`[WorldScene] Warp area "${area.areaName}" triggered -> ${matchingDoor.destMap}`,
					);
					this.changeMap(matchingDoor.destMap, destX, destY);
					return;
				} else {
					// Fallback: determine destination from area name pattern
					const prefix = mapName.replace(
						/Downstairs.*|Upstairs.*|Garage.*|Attic.*|Basement.*/i,
						"",
					);
					const suffix = area.areaName.replace(/^to/, "");
					const possibleDest = prefix + suffix;
					console.log(
						`[WorldScene] Warp area "${area.areaName}" - no match, trying ${possibleDest}`,
					);
					this.changeMap(possibleDest, 0, 0);
					return;
				}
			}
		}
	}

	/** Check if player is in an area that triggers dialogue (TV, fridge, etc.) */
	private lastAreaTriggerKey = "";
	private checkAreaTriggers(): void {
		if (!this.playerTransform || this.isDialogueActive) return;
		const px = this.playerTransform.x;
		const py = this.playerTransform.y;
		const mapName = this.currentMapName || "";

		for (const area of AREA_TRIGGERS) {
			// Only check areas for the current map
			if (!area.key.startsWith(mapName + ".")) continue;

			// Check if player overlaps the area
			const NEAR = 24; // proximity range (3 tiles)
			const nearArea =
				px >= area.x - NEAR &&
				px < area.x + area.w + NEAR &&
				py >= area.y - NEAR &&
				py < area.y + area.h + NEAR;
			if (nearArea) {
				// Player is in the area - show hint
				if (this.lastAreaTriggerKey !== area.key) {
					this.lastAreaTriggerKey = area.key;
					// Show "Press E" hint for the area
					const areaName = area.key.split(".")[1] || "";
					if (this.interactionHint) {
						this.interactionHint.text =
							"Press E: " + areaName.replace(/([A-Z])/g, " $1").trim();
					}
				}
				// If E is pressed while in the area, trigger dialogue
				if (this.isActionJustPressed) {
					const dialogue = getAreaDialogue(area.key);
					if (dialogue && dialogue.lines.length > 0) {
						this.showDialogue(dialogue.lines, false, dialogue.caption);
					}
				}
				return;
			}
		}

		// Not in any area - clear the last trigger
		if (this.lastAreaTriggerKey) {
			this.lastAreaTriggerKey = "";
		}
	}

	/** Check if player is near a "door" type area (interactive objects like beds, toilets, TVs) */
	private lastDoorAreaKey = "";
	private static readonly OBJECT_DESCRIPTIONS: Record<string, string[]> = {
		bed: ["A comfortable bed. Too bad you just woke up."],
		inBed: ["You are already in bed... well, virtually."],
		toilet: [
			"Man, toilets are weird. Why cant we come up with something better than this?",
		],
		tv: ["It is playing some show. You have better things to do."],
		fridge: ["The fridge is stuffed to the brim, but there is nothing to eat!"],
		computer: [
			"The cursor was spinning when you got here. It does not look like it is going to stop.",
		],
		bookshelf: ["Books! Remember those?"],
		stove: ["Someone left the burner on. Again."],
		shower: ["Hot water! ...or not."],
		bathtub: ["Rubber ducky, youre the one!"],
		closet: ["Just clothes. Nothing interesting."],
		cabinet: ["Canned food from 2019. Yum."],
		desk: ["Papers, papers, papers."],
		chair: ["A chair. You sit in it."],
		couch: ["The couch is suspiciously warm..."],
		table: ["Nothing on it. Typical."],
		sink: ["Wash your hands!"],
		mirror: ["You look tired."],
		window: ["Nice view."],
		door: ["A door. It leads somewhere."],
		piano: ["*plays a off-key note*"],
		phone: ["*ring ring* Nobody answers."],
		microwave: ["3... 2... 1... BEEP BEEP BEEP!"],
		washingMachine: ["The spin cycle is mesmerizing."],
		dryer: ["Still running. It is been running for hours."],
		plant: ["This plant is somehow still alive."],
		fishTank: ["The fish stare back at you."],
		clock: ["Tick tock. Tick tock."],
		alarmClock: ["It is an alarm clock. Your nemesis."],
		videoGame: ["Just one more level..."],
		arcade: ["INSERT COIN"],
		treadmill: ["You should use this more often."],
		weights: ["50 lbs. Yeah right."],
		pool: ["The water looks refreshing."],
		sauna: ["*sweats profusely*"],
		vendingMachine: ["It ate your quarter."],
		atm: ["Your balance is... better not to look."],
		elevator: ["*ding*"],
		stairs: ["Up or down? That is the question."],
		photoBooth: ["Say cheese!"],
		tanningBed: ["Do not forget your sunscreen."],
	};

	private checkDoorAreas(): void {
		if (!this.playerTransform || this.isDialogueActive) return;
		const px = this.playerTransform.x;
		const py = this.playerTransform.y;
		const mapName = this.currentMapName || "";
		const doorAreas = getDoorAreasForMap(mapName);

		for (const area of doorAreas) {
			const key = mapName + "." + area.areaName;
			// Check if player overlaps the area
			const NEAR = 16; // proximity range
			if (
				px >= area.x - NEAR &&
				px < area.x + area.w + NEAR &&
				py >= area.y - NEAR &&
				py < area.y + area.h + NEAR
			) {
				// Show hint
				if (this.lastDoorAreaKey !== key) {
					this.lastDoorAreaKey = key;
					const friendlyName = area.areaName.replace(/([A-Z])/g, " $1").trim();
					if (this.interactionHint) {
						this.interactionHint.text = "Press E: " + friendlyName;
					}
				}
				// Trigger on E press
				if (this.isActionJustPressed) {
					// Check original dialogue first
					if (area.dialogueIds.length > 0) {
						const dialogue = getOriginalDialogue(area.dialogueIds[0]);
						if (dialogue && dialogue.lines.length > 0) {
							this.showDialogue(dialogue.lines, false, dialogue.caption);
							return;
						}
					}
					// Try object descriptions dictionary
					const objDesc =
						WorldScene.OBJECT_DESCRIPTIONS[area.areaName.toLowerCase()];
					if (objDesc) {
						this.showDialogue(
							objDesc,
							false,
							area.areaName.replace(/([A-Z])/g, " $1").trim(),
						);
					} else {
						const friendlyName = area.areaName
							.replace(/([A-Z])/g, " $1")
							.trim();
						this.showDialogue(["* " + friendlyName + " *"], false, "Interact");
					}
					return;
				}
			}
		}
		// Not in any door area
		if (this.lastDoorAreaKey) {
			this.lastDoorAreaKey = "";
		}
	}

	private saveCharacterToCloud(): void {
		const identity = getPersistenceIdentity();

		// Always save locally (works offline)
		if (this.playerTransform) {
			const saveData = {
				map: this.currentMapName,
				x: this.playerTransform.x,
				y: this.playerTransform.y,
				timestamp: Date.now(),
				flags: FlagManager.serialize(),
				dialogues: DialogueTracker.serialize(),
			};
			try {
				localStorage.setItem("bobsgame_save", JSON.stringify(saveData));
				console.log("[WorldScene] Saved locally:", saveData.map);
			} catch (e) {
				console.warn("[WorldScene] Local save failed:", e);
			}
		}

		// Also save to cloud if connected
		if (this.playerTransform && networkManager.connected) {
			networkManager.emit("saveCharacter", {
				identity,
				charData: { x: this.playerTransform.x, y: this.playerTransform.y },
			});
		}
	}

	private loadLocalSave(): { map: string; x: number; y: number } | null {
		try {
			const saved = localStorage.getItem("bobsgame_save");
			if (saved) {
				const s = JSON.parse(saved);
				if (Date.now() - s.timestamp < 86400000) {
					console.log("[WorldScene] Found local save:", s.map);
					if (s.flags) FlagManager.deserialize(s.flags);
					if (s.dialogues) DialogueTracker.deserialize(s.dialogues);
					return s;
				}
			}
		} catch (e) {
			console.warn("[WorldScene] Local load failed:", e);
		}
		return null;
	}
	public onResize(width: number, height: number): void {
		super.onResize(width, height);
		this.touchControls?.resize(width, height);
		if (this.minimapContainer)
			this.minimapContainer.position.set(width - 160, 20);
		if (this.lightingSystem) this.lightingSystem.resize(width, height);
		if (this.dialogueContainer) {
			// Redraw dialogue bg (PixiJS v8 Graphics.width is read-only)
			const bg = this.dialogueContainer.children[0] as Graphics;
			bg.clear();
			bg.rect(50, height - 150, width - 100, 100);
			bg.fill({ color: 0x000000, alpha: 0.8 });
			bg.stroke({ color: 0xffffff, width: 2 });
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
