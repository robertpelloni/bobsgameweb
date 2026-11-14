import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { AudioManager } from "../audio/AudioManager";
import type { GameMode } from "../data/HighScoreManager";
import { InputManager, Key } from "../input/InputManager";
import type { PuzzleSceneConfig } from "../puzzle";
import { GameType, GameTypes } from "../puzzle";
import { BobNet } from "../puzzle/BobNet";
import { PuzzleScene } from "../puzzle/PuzzleScene";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";
import { Button, type ButtonStyle } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { APP_VERSION } from "../../shared/Config";
import { FFTVisualizer } from "../ui/FFTVisualizer";
import { GenerativeAIManager } from "../editor/GenerativeAIManager";
import { ToastManager } from "../ui/ToastManager";

// ============================================================
// Types & Categories
// ============================================================

export interface MainMenuSceneConfig extends SceneConfig {
	onStartGame?: (gameType: GameType, gameMode: GameMode) => void;
	onOptions?: () => void;
}

export type DashboardCategory = "play" | "editors" | "community" | "system";

interface MenuItem {
	label: string;
	description: string;
	tooltip: string;
	category: DashboardCategory;
	action: () => void | Promise<void>;
	prefetch?: () => void;
}

// ============================================================
// MainMenuScene - Consolidated High-Value Omni-Engine Dashboard
// ============================================================

export class MainMenuScene extends Scene {
	private menuConfig: MainMenuSceneConfig;

	private titleText!: Text;
	private subtitleText!: Text;
	private versionText!: Text;

	// Navigation tabs & category buttons
	private categoryTabs: Button[] = [];
	private activeCategory: DashboardCategory = "play";
	private categoryContainer!: Container;

	// Mode selector buttons (Marathon, Sprint, Ultra)
	private modeButtons: Button[] = [];
	private modeContainer!: Container;
	private selectedCategoryIndex = 0; // GameMode index (marathon, sprint, ultra)

	// Menu items & buttons
	private allMenuItems: MenuItem[] = [];
	private currentMenuItems: MenuItem[] = [];
	private menuButtons: Button[] = [];
	private menuButtonsContainer!: Container;
	private selectedIndex = 0;

	// Visual effects & Tooltip
	private background!: Graphics;
	private particles: Particle[] = [];
	private particleContainer!: Container;
	private visualizer!: FFTVisualizer;
	private tooltip!: Tooltip;

	private titleBounce = 0;

	private readonly gameModes: GameMode[] = ["marathon", "sprint", "ultra"];
	private readonly gameModeLabels: Record<GameMode, string> = {
		marathon: "MARATHON",
		sprint: "SPRINT",
		ultra: "ULTRA",
	};

	private readonly dashboardTabs: { key: DashboardCategory; label: string; tooltip: string }[] = [
		{
			key: "play",
			label: "🎮 PLAY GAMES",
			tooltip: "Play Classic & Modern Puzzle modes, MMO World, or the full Action RPG",
		},
		{
			key: "editors",
			label: "🛠️ CREATION & EDITORS",
			tooltip: "Custom Puzzle Rules, World Editor, Sprite Studio, and Event Scripts",
		},
		{
			key: "community",
			label: "🏆 COMMUNITY & PROGRESS",
			tooltip: "Multiplayer Matchmaking, Tournaments, High Scores, and Quests",
		},
		{
			key: "system",
			label: "⚙️ SYSTEM & ENGINE",
			tooltip: "WebGPU demos, Audio Visualizer, Hardware settings, and Diagnostics",
		},
	];

	constructor(config: MainMenuSceneConfig) {
		super(config);
		this.menuConfig = config;
	}

	// ============================================================
	// Lifecycle
	// ============================================================

	public create(): void {
		this.createBackground();
		this.createParticles();
		this.createVisualizer();
		this.createTitle();

		this.menuButtonsContainer = new Container();
		this.container.addChild(this.menuButtonsContainer);

		this.modeContainer = new Container();
		this.container.addChild(this.modeContainer);

		this.categoryContainer = new Container();
		this.container.addChild(this.categoryContainer);

		this.initMenuItems();
		this.createCategorySelector();
		this.createGameModeSelector();
		this.rebuildCategoryMenu(this.activeCategory);

		this.tooltip = new Tooltip(this.width, this.height);
		this.container.addChild(this.tooltip.getContainer());

		this.playMenuMusic();
		this.scheduleScenePrefetch();
	}

	// ============================================================
	// Category Tabs & Mode Selectors
	// ============================================================

	private createCategorySelector(): void {
		this.categoryContainer.removeChildren();
		this.categoryTabs = [];

		const tabStyle: ButtonStyle = {
			width: 210,
			height: 38,
			backgroundColor: 0x141f36,
			backgroundColorHover: 0x22385c,
			backgroundColorPressed: 0x0c1424,
			borderColor: 0x3d5a80,
			borderWidth: 2,
			textColor: 0xdde6ed,
			fontSize: 13,
			borderRadius: 8,
		};

		const totalWidth = this.dashboardTabs.length * 220 - 10;
		const startX = this.centerX - totalWidth / 2 + 105;
		const y = this.height * 0.32;

		this.dashboardTabs.forEach((tab, i) => {
			const button = new Button(tab.label, tabStyle);
			button.setPosition(startX + i * 220, y);

			button.onClick(() => {
				this.selectDashboardCategory(tab.key);
				this.playMoveSound();
			});

			button.on("hover", () => {
				this.tooltip.show(button.x, button.y - 10, tab.tooltip);
			});
			button.on("hoverEnd", () => {
				this.tooltip.hide();
			});

			this.categoryContainer.addChild(button.container);
			this.categoryTabs.push(button);
		});

		this.updateCategoryTabsVisuals();
	}

	private selectDashboardCategory(category: DashboardCategory): void {
		this.activeCategory = category;
		this.updateCategoryTabsVisuals();
		this.rebuildCategoryMenu(category);
	}

	private updateCategoryTabsVisuals(): void {
		this.categoryTabs.forEach((btn, i) => {
			const isActive = this.dashboardTabs[i].key === this.activeCategory;
			btn.selected = isActive;
			btn.container.alpha = isActive ? 1.0 : 0.7;
		});
	}

	private createGameModeSelector(): void {
		this.modeContainer.removeChildren();
		this.modeButtons = [];

		const modeStyle: ButtonStyle = {
			width: 120,
			height: 32,
			backgroundColor: 0x1a2a4a,
			backgroundColorHover: 0x2a4a6a,
			backgroundColorPressed: 0x0a1a3a,
			borderColor: 0x4a6a8a,
			borderWidth: 2,
			textColor: 0xffffff,
			fontSize: 13,
			borderRadius: 16,
		};

		const startX = this.centerX - (this.gameModes.length * 130) / 2 + 65;
		const y = this.height * 0.39;

		for (let i = 0; i < this.gameModes.length; i++) {
			const mode = this.gameModes[i];
			const button = new Button(this.gameModeLabels[mode], modeStyle);
			button.setPosition(startX + i * 130, y);
			button.onClick(() => {
				this.selectedCategoryIndex = i;
				this.updateModeVisuals();
				this.playMoveSound();
			});

			button.on("hover", () => {
				this.tooltip.show(
					button.x,
					button.y - 10,
					"Set Puzzle Mode: " + this.gameModeLabels[mode] + " (Time & Clear rules)",
				);
			});
			button.on("hoverEnd", () => {
				this.tooltip.hide();
			});

			this.modeContainer.addChild(button.container);
			this.modeButtons.push(button);
		}

		this.updateModeVisuals();
	}

	private updateModeVisuals(): void {
		for (let i = 0; i < this.modeButtons.length; i++) {
			const isSelected = i === this.selectedCategoryIndex;
			this.modeButtons[i].selected = isSelected;
			this.modeButtons[i].container.alpha = isSelected ? 1.0 : 0.6;
		}
	}

	// ============================================================
	// Menu Items Initialization
	// ============================================================

	private initMenuItems(): void {
		this.allMenuItems = [
			// --- PLAY GAMES ---
			{
				label: "Classic Puzzle",
				description: "Traditional puzzle falling block mode",
				tooltip: "Experience authentic retro falling block gameplay with pure classic physics",
				category: "play",
				action: () => this.startGame(GameTypes.CLASSIC),
			},
			{
				label: "Modern Puzzle",
				description: "Enhanced mechanics with hard drop and SRS kicks",
				tooltip: "Play fast-paced puzzle action featuring SRS rotation, ghost blocks, and lock delays",
				category: "play",
				action: () => this.startGame(GameTypes.MODERN),
			},
			{
				label: "Play Custom Game",
				description: "Play with customized parameters and rulesets",
				tooltip: "Launch your custom-configured puzzle game rules, pieces, and timing preset",
				category: "play",
				action: () => this.startCustomGame(),
			},
			{
				label: "Play RPG Engine",
				description: "Step into Yuu's quest in the full retro RPG",
				tooltip: "Explore the 2D action RPG world engine with dialogue, NPCs, and dynamic collisions",
				category: "play",
				action: () => this.openEngineGame(),
				prefetch: () => {
					void import("./EngineScene");
				},
			},
			{
				label: "MMO World",
				description: "Seamless multi-player persistent world",
				tooltip: "Connect to the shared Hetzner MMO cluster to explore maps with other players in real time",
				category: "play",
				action: () => this.openWorld(),
				prefetch: () => {
					void import("./WorldScene");
				},
			},
			{
				label: "Arena Battle",
				description: "Engage in real-time combat battles",
				tooltip: "Battle opponents, monsters, and challengers in the combat arena test scene",
				category: "play",
				action: () => this.openArena(),
				prefetch: () => {
					void import("./ArenaScene");
				},
			},
			{
				label: "Demo Battle",
				description: "Turn-based battle against a hard-hitting training opponent",
				tooltip: "Try the turn-based battle system with demo combatants — it hits hard, so passive play loses (real battles start from NPCs in MMO World)",
				category: "play",
				action: () => this.openDemoBattle(),
				prefetch: () => {
					void import("./BattleScene");
				},
			},
			{
				label: "Fishing Mini-Game",
				description: "Relaxing waterfront fishing experience",
				tooltip: "Cast lines, hook catches, and earn rewards across local waters in the fishing mini-game",
				category: "play",
				action: () => this.openFishing(),
				prefetch: () => {
					void import("./FishingScene");
				},
			},
			{
				label: "Boss Rush",
				description: "Sequential high-difficulty combat challenges",
				tooltip: "Take on back-to-back engine bosses under timer constraints to test your combat skill",
				category: "play",
				action: () => this.openBossRush(),
				prefetch: () => {
					void import("./BossRushScene");
				},
			},
			{
				label: "Inventory & Equipment",
				description: "Items, equipment slots, and consumables",
				tooltip: "Browse your bag, equip weapons and armor, and use potions (also opens in-world)",
				category: "play",
				action: () => this.openInventory(),
				prefetch: () => {
					void import("./InventoryScene");
				},
			},
			{
				label: "Shop & Trading",
				description: "Buy and sell weapons, armor, and supplies",
				tooltip: "Spend gold on gear and consumables, or sell loot back (also opens at in-world merchants)",
				category: "play",
				action: () => this.openShop(),
				prefetch: () => {
					void import("./ShopScene");
				},
			},
			{
				label: "Skill Tree",
				description: "Unlock combat, magic, and utility skills",
				tooltip: "Spend skill points across three branching paths with prerequisites (also opens in-world)",
				category: "play",
				action: () => this.openSkillTree(),
				prefetch: () => {
					void import("./SkillTreeScene");
				},
			},
			{
				label: "Watch Last Replay",
				description: "Playback your recorded puzzle match",
				tooltip: "Watch a step-by-step frame recreation of your most recent puzzle game",
				category: "play",
				action: () => this.playLastReplay(),
			},
			{
				label: "Share Last Replay",
				description: "Copy shareable URL to clipboard",
				tooltip: "Encode your last replay run into a compressed base64 link to share with others",
				category: "play",
				action: () => this.shareLastReplay(),
			},

			// --- CREATION & EDITORS ---
			{
				label: "Custom Game Editor",
				description: "Comprehensive puzzle engine rule editor",
				tooltip: "Configure gravity, lock delay, kick tables, piece shapes, and block catalogs in one place",
				category: "editors",
				action: () => this.openCustomEditor(),
				prefetch: () => {
					void import("./CustomGameEditorScene");
				},
			},
			{
				label: "World Database Editor",
				description: "Full RPG world, maps, and entity database",
				tooltip: "Inspect maps, entity spawns, warp doors, and auto-tiler metadata across the world graph",
				category: "editors",
				action: () => this.openWorldEditor(),
				prefetch: () => {
					void import("./WorldEditorScene");
				},
			},
			{
				label: "Sprite Editor",
				description: "Character & object sprite animator",
				tooltip: "Edit pixel art frames, slice sprite sheets, and test directional animation sequences",
				category: "editors",
				action: () => this.openSpriteEditor(),
				prefetch: () => {
					void import("./SpriteEditorScene");
				},
			},
			{
				label: "Event Sheet Editor",
				description: "Visual cinematic & gameplay scripting",
				tooltip: "Create trigger-condition-action event trees for cutscenes, doors, quests, and triggers",
				category: "editors",
				action: () => this.openEventEditor(),
				prefetch: () => {
					void import("./EventSheetEditorScene");
				},
			},
			{
				label: "Game Sequence Editor",
				description: "Curate multi-game puzzle stages",
				tooltip: "Sequence levels, difficulty curves, and custom game stages into complete campaigns",
				category: "editors",
				action: () => this.openGameSequenceEditor(),
				prefetch: () => {
					void import("./GameSequenceEditorScene");
				},
			},
			{
				label: "Crafting Recipes",
				description: "Item synthesis and blueprint workshop",
				tooltip: "Combine materials, forge equipment, and configure recipe unlock requirements",
				category: "editors",
				action: () => this.openCrafting(),
				prefetch: () => {
					void import("./CraftingScene");
				},
			},

			// --- COMMUNITY & PROGRESS ---
			{
				label: "Multiplayer Lobby",
				description: "Matchmaking & 30-player rooms",
				tooltip: "Join or host multiplayer puzzle and MMO rooms with live network synchronization",
				category: "community",
				action: () => this.openLobby(),
				prefetch: () => {
					void import("./LobbyScene");
				},
			},
			{
				label: "Go Online / Account",
				description: "Log in and sync cloud profile",
				tooltip: "Authenticate with the central server to sync save profiles, stats, and achievements",
				category: "community",
				action: () => this.openLogin(),
				prefetch: () => {
					void import("./LoginScene");
				},
			},
			{
				label: "Party Manager",
				description: "Manage multiplayer party & team roster",
				tooltip: "Invite friends, configure team roles, and coordinate co-op instances",
				category: "community",
				action: () => this.openParty(),
				prefetch: () => {
					void import("./PartyScene");
				},
			},
			{
				label: "Tournament Mode",
				description: "Competitive bracket matchmaking",
				tooltip: "Enter single-elimination tournament brackets with live leaderboard seeds",
				category: "community",
				action: () => this.openTournament(),
				prefetch: () => {
					void import("./TournamentScene");
				},
			},
			{
				label: "High Scores",
				description: "Local and global high score records",
				tooltip: "View top rankings and best completion times sorted across all puzzle modes",
				category: "community",
				action: () => this.openHighScores(),
				prefetch: () => {
					void import("./HighScoresScene");
				},
			},
			{
				label: "Global Leaderboard",
				description: "Hetzner server-wide competitive stats",
				tooltip: "Inspect worldwide ELO ratings and marathon rankings on ws.bobsgame.com",
				category: "community",
				action: () => this.openLeaderboard(),
				prefetch: () => {
					void import("./LeaderboardScene");
				},
			},
			{
				label: "Rankings & ELO",
				description: "Skill tiers and competitive tiers",
				tooltip: "Track competitive rating curves, tournament wins, and seasonal league standings",
				category: "community",
				action: () => this.openRankings(),
				prefetch: () => {
					void import("./RankingsScene");
				},
			},
			{
				label: "Achievements",
				description: "Milestones & unlocked badges",
				tooltip: "View your unlocked engine milestones, hidden badges, and mastery progress",
				category: "community",
				action: () => this.openAchievements(),
				prefetch: () => {
					void import("./AchievementsScene");
				},
			},
			{
				label: "Bestiary Log",
				description: "Catalog of creatures & bosses",
				tooltip: "Browse detailed encounter stats, monster lore, weakness tables, and drop rates",
				category: "community",
				action: () => this.openBestiary(),
				prefetch: () => {
					void import("./BestiaryScene");
				},
			},
			{
				label: "Quest Journal",
				description: "Active and completed storyline quests",
				tooltip: "Review campaign objectives, dialogue summaries, and NPC quest chains",
				category: "community",
				action: () => this.openJournal(),
				prefetch: () => {
					void import("./JournalScene");
				},
			},
			{
				label: "World Map Overview",
				description: "Global geography and warp waypoints",
				tooltip: "View regional map connections, town locations, and fast-travel coordinates",
				category: "community",
				action: () => this.openWorldMap(),
				prefetch: () => {
					void import("./WorldMapScene");
				},
			},
			{
				label: "Quest Log",
				description: "Active objectives, rewards, and quest chains",
				tooltip: "Track main, side, daily, and challenge quests with objective progress (story diary stays under Quest Journal)",
				category: "community",
				action: () => this.openQuestLog(),
				prefetch: () => {
					void import("./QuestLogScene");
				},
			},
			{
				label: "Save / Load Slots",
				description: "Multi-slot game state manager",
				tooltip: "Manage, backup, and restore game progression across local and cloud slots",
				category: "community",
				action: () => this.openSaveSlots(),
				prefetch: () => {
					void import("./SaveSlotScene");
				},
			},

			// --- SYSTEM & ENGINE ---
			{
				label: "Engine Tech Demo",
				description: "Stress-test physics, ECS, and tilemaps",
				tooltip: "Run benchmarking passes on ECS systems, Wasm pathfinding, and dynamic lighting",
				category: "system",
				action: () => this.openEngineDemo(),
				prefetch: () => {
					void import("./EngineDemoScene");
				},
			},
			{
				label: "WebGPU Compute Demo",
				description: "GPU compute shader particle demo",
				tooltip: "Demonstrates thousands of particles simulated directly in WebGPU WGSL compute shaders",
				category: "system",
				action: () => this.openWebGPUDemo(),
				prefetch: () => {
					void import("./WebGPUDemoScene");
				},
			},
			{
				label: "Audio FFT Visualizer",
				description: "Real-time frequency & spectrum canvas",
				tooltip: "Full-screen frequency analyzer powered by ProjectM/Butterchurn and native FFT hooks",
				category: "system",
				action: () => this.openVisualizer(),
				prefetch: () => {
					void import("./VisualizerScene");
				},
			},
			{
				label: "nD Spatial Demo",
				description: "Experimental multi-dimensional space",
				tooltip: "Preview experimental higher-dimensional projection algorithms and shaders",
				category: "system",
				action: () => this.openNDDemo(),
				prefetch: () => {
					void import("./NDDemoScene");
				},
			},
			{
				label: "Interactive Tutorial",
				description: "Beginner guide & controls manual",
				tooltip: "Learn puzzle mechanics, movement tricks, and battle basics with interactive steps",
				category: "system",
				action: () => this.openTutorial(),
				prefetch: () => {
					void import("./TutorialScene");
				},
			},
			{
				label: "Settings & Options",
				description: "Audio, profile, graphics, and haptics in one place",
				tooltip: "Volume, mute, and profile name; the Graphics & Haptics button inside opens renderer, HD sprite, and vibration options (one consolidated settings surface)",
				category: "system",
				action: () => this.openSettings(),
				prefetch: () => {
					void import("./SettingsScene");
				},
			},
			{
				label: "AI Proxy Server",
				description: "Inspect & toggle local Generative AI proxy",
				tooltip: "Check connectivity to port 8080 AI proxy (OpenAI / mock fallback) and manage Electron daemon",
				category: "system",
				action: () => this.toggleOrCheckAiServer(),
			},
			{
				label: "Help & Manual",
				description: "Comprehensive manual and documentation",
				tooltip: "Browse reference guides for editor tooling, shortcut keys, and engine architecture",
				category: "system",
				action: () => this.openHelp(),
				prefetch: () => {
					void import("./HelpScene");
				},
			},
		];
	}

	private async toggleOrCheckAiServer(): Promise<void> {
		this.playSelectSound();
		ToastManager.showInfo("Checking AI Proxy Server status...");
		const status = await GenerativeAIManager.checkServerStatus();

		const electronAPI = (window as unknown as { electronAPI?: { startAiServer?: () => Promise<boolean>; stopAiServer?: () => Promise<boolean> } }).electronAPI;

		if (status.online) {
			const mode = status.openaiConfigured ? "OpenAI Live Mode" : "Local Mock Mode";
			ToastManager.showInfo(`AI Server Online: Port 8080 (${mode})`);
			if (electronAPI && electronAPI.stopAiServer) {
				const stop = confirm(`AI Proxy is running (${mode}). Stop server process?`);
				if (stop) {
					await electronAPI.stopAiServer();
					ToastManager.showInfo("Sent stop request to AI Proxy server.");
				}
			}
		} else {
			ToastManager.showInfo(`AI Server Offline (${status.error || "Connection Refused"})`);
			if (electronAPI && electronAPI.startAiServer) {
				const start = confirm("AI Proxy server is offline. Start it now via Electron daemon?");
				if (start) {
					const ok = await electronAPI.startAiServer();
					ToastManager.showInfo(ok ? "AI Proxy daemon starting..." : "Failed to start AI Proxy daemon.");
				}
			} else {
				alert("AI Proxy is offline. Start it via 'npm run server' or run the Electron client with system tray controls.");
			}
		}
	}

	// ============================================================
	// Menu Grid Reconstruction
	// ============================================================

	private rebuildCategoryMenu(category: DashboardCategory): void {
		this.menuButtonsContainer.removeChildren();
		this.menuButtons = [];

		this.currentMenuItems = this.allMenuItems.filter(
			(item) => item.category === category,
		);

		// Mode buttons are relevant for puzzle modes in 'play' category
		this.modeContainer.visible = category === "play";

		// Compact rows when a category overflows 720p (Play has 14 items = 7
		// rows; at 52px spacing the last row was clipped behind the page
		// footer in the live 1280x720 verification screenshots).
		const cols = 2;
		const rows = Math.ceil(this.currentMenuItems.length / cols);
		const compact = rows > 6;

		const buttonStyle: ButtonStyle = {
			width: 280,
			height: compact ? 38 : 44,
			backgroundColor: 0x16243b,
			backgroundColorHover: 0x274066,
			backgroundColorPressed: 0x0e1726,
			borderColor: 0x3d5a80,
			borderWidth: 2,
			textColor: 0xffffff,
			fontSize: compact ? 14 : 15,
			borderRadius: 8,
		};

		const startY = category === "play" ? this.height * 0.46 : this.height * 0.40;
		const spacingX = 300;
		const spacingY = compact ? 46 : 52;

		this.currentMenuItems.forEach((item, index) => {
			const col = index % cols;
			const row = Math.floor(index / cols);

			const x = this.centerX + (col === 0 ? -spacingX / 2 : spacingX / 2);
			const y = startY + row * spacingY;

			const button = new Button(item.label, buttonStyle);
			button.setPosition(x, y);

			button.onClick(() => {
				this.playSelectSound();
				item.action();
			});

			button.on("hover", () => {
				this.tooltip.show(button.x, button.y - 12, item.tooltip);
			});

			button.on("hoverEnd", () => {
				this.tooltip.hide();
			});

			this.menuButtonsContainer.addChild(button.container);
			this.menuButtons.push(button);
		});

		this.selectedIndex = 0;
		this.updateSelection();
	}

	private updateSelection(): void {
		for (let i = 0; i < this.menuButtons.length; i++) {
			this.menuButtons[i].selected = i === this.selectedIndex;
		}
		this.prefetchSelectionNeighborhood();
	}

	// ============================================================
	// Input Handling
	// ============================================================

	private handleInput(): void {
		if (InputManager.isKeyPressed(Key.V)) {
			this.visualizer?.toggleMode();
			this.playMoveSound();
		}

		// Tab switching via Q / E keys
		if (InputManager.isKeyPressed(Key.Q)) {
			this.cycleCategory(-1);
		} else if (InputManager.isKeyPressed(Key.E)) {
			this.cycleCategory(1);
		}

		if (InputManager.isUpPressed()) {
			this.moveSelection(-2);
		} else if (InputManager.isDownPressed()) {
			this.moveSelection(2);
		}

		if (InputManager.isLeftPressed()) {
			this.moveSelection(-1);
		} else if (InputManager.isRightPressed()) {
			this.moveSelection(1);
		}

		if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
			this.selectCurrentItem();
		}
	}

	private cycleCategory(delta: number): void {
		const order: DashboardCategory[] = ["play", "editors", "community", "system"];
		const currentIndex = order.indexOf(this.activeCategory);
		const newIndex = (currentIndex + delta + order.length) % order.length;
		this.selectDashboardCategory(order[newIndex]);
		this.playMoveSound();
	}

	private moveSelection(delta: number): void {
		if (this.currentMenuItems.length === 0) return;
		const prevIndex = this.selectedIndex;
		this.selectedIndex =
			(this.selectedIndex + delta + this.currentMenuItems.length) %
			this.currentMenuItems.length;

		if (prevIndex !== this.selectedIndex) {
			this.playMoveSound();
			this.updateSelection();
		}
	}

	private selectCurrentItem(): void {
		if (this.currentMenuItems.length === 0) return;
		this.playSelectSound();
		this.currentMenuItems[this.selectedIndex].action();
	}

	private scheduleScenePrefetch(): void {
		const prefetch = () => {
			void import("./CustomGameEditorScene");
			void import("./WorldScene");
			void import("./LobbyScene");
			void import("./EngineScene");
		};

		const idleCallback =
			(
				window as Window & {
					requestIdleCallback?: (cb: () => void) => number;
				}
			).requestIdleCallback ?? null;

		if (idleCallback) {
			idleCallback(() => prefetch());
		} else {
			window.setTimeout(prefetch, 1200);
		}
	}

	private prefetchSelectionNeighborhood(): void {
		if (this.currentMenuItems.length === 0) return;
		const targets = [
			this.selectedIndex,
			(this.selectedIndex + 1) % this.currentMenuItems.length,
			(this.selectedIndex - 1 + this.currentMenuItems.length) %
				this.currentMenuItems.length,
		];

		for (const index of targets) {
			this.currentMenuItems[index].prefetch?.();
		}
	}

	// ============================================================
	// Actions
	// ============================================================

	private startCustomGame(): void {
		const data = localStorage.getItem("custom-game-type");
		let gameType = GameTypes.CLASSIC; // Fallback
		if (data) {
			try {
				gameType = GameType.fromJSON(data);
			} catch (e) {
				console.error("Failed to load custom game type", e);
			}
		} else {
			console.warn("No custom game saved, falling back to Classic.");
		}

		const gameMode = this.gameModes[this.selectedCategoryIndex];
		const puzzleConfig: PuzzleSceneConfig = {
			name: "puzzle",
			app: this.app,
			camera: this.camera ?? undefined,
			gameType,
			gameMode,
			startLevel: 1,
		};

		const puzzleScene = new PuzzleScene(puzzleConfig);
		SceneTransition.pushWithFade(this.app, puzzleScene);
	}

	private playLastReplay(): void {
		let lastKey = null;
		let lastTime = 0;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith("replay_")) {
				const time = parseInt(key.split("_")[1]);
				if (time > lastTime) {
					lastTime = time;
					lastKey = key;
				}
			}
		}

		if (!lastKey) {
			alert("No replays found!");
			return;
		}

		const data = localStorage.getItem(lastKey)!;
		const puzzleConfig: PuzzleSceneConfig = {
			name: "puzzle-replay",
			app: this.app,
			camera: this.camera ?? undefined,
			replayData: data,
		};
		const puzzleScene = new PuzzleScene(puzzleConfig);
		SceneTransition.pushWithFade(this.app, puzzleScene);
	}

	private shareLastReplay(): void {
		let lastKey = null;
		let lastTime = 0;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith("replay_")) {
				const time = parseInt(key.split("_")[1]);
				if (time > lastTime) {
					lastTime = time;
					lastKey = key;
				}
			}
		}

		if (!lastKey) {
			alert("No replays found to share!");
			return;
		}

		const data = localStorage.getItem(lastKey)!;
		const jsonObj = JSON.parse(data);
		const b64 = BobNet.toBase64GZippedGSON(jsonObj);
		const url = window.location.origin + window.location.pathname + "#replay=" + b64;
		navigator.clipboard
			.writeText(url)
			.then(() => {
				alert("Replay link copied to clipboard!");
			})
			.catch((err) => {
				console.error("Failed to copy: ", err);
				prompt("Copy this link manually:", url);
			});
	}

	private startGame(gameType: GameType): void {
		const gameMode = this.gameModes[this.selectedCategoryIndex];

		if (this.menuConfig.onStartGame) {
			this.menuConfig.onStartGame(gameType, gameMode);
			return;
		}

		const puzzleConfig: PuzzleSceneConfig = {
			name: "puzzle",
			app: this.app,
			camera: this.camera ?? undefined,
			gameType,
			gameMode,
			startLevel: 1,
		};

		const puzzleScene = new PuzzleScene(puzzleConfig);
		SceneTransition.pushWithFade(this.app, puzzleScene);
	}

	private async openOptions(): Promise<void> {
		if (this.menuConfig.onOptions) {
			this.menuConfig.onOptions();
			return;
		}
		const { OptionsScene } = await import("./OptionsScene");
		const optionsScene = new OptionsScene({
			name: "options",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, optionsScene);
	}

	private async openWebGPUDemo(): Promise<void> {
		const { WebGPUDemoScene } = await import("./WebGPUDemoScene");
		const demoScene = new WebGPUDemoScene({
			name: "webgpu-demo",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, demoScene);
	}

	private async openLobby(): Promise<void> {
		const { LobbyScene } = await import("./LobbyScene");
		const lobbyScene = new LobbyScene({
			name: "lobby",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, lobbyScene);
	}

	private async openLogin(): Promise<void> {
		const { LoginScene } = await import("./LoginScene");
		const loginScene = new LoginScene({
			name: "login",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, loginScene);
	}

	private async openEngineDemo(): Promise<void> {
		const { EngineDemoScene } = await import("./EngineDemoScene");
		const demoScene = new EngineDemoScene({
			name: "engine-demo",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, demoScene);
	}

	private async openTournament(): Promise<void> {
		const { TournamentScene } = await import("./TournamentScene");
		const tournamentScene = new TournamentScene({
			name: "tournament",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, tournamentScene);
	}

	private async openHelp(): Promise<void> {
		const { HelpScene } = await import("./HelpScene");
		const helpScene = new HelpScene({
			name: "help",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, helpScene);
	}

	private async openSpriteEditor(): Promise<void> {
		const { SpriteEditorScene } = await import("./SpriteEditorScene");
		const editorScene = new SpriteEditorScene({
			name: "sprite-editor",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, editorScene);
	}

	private async openParty(): Promise<void> {
		const { PartyScene } = await import("./PartyScene");
		const partyScene = new PartyScene({
			name: "party",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, partyScene);
	}

	private async openEventEditor(): Promise<void> {
		const { EventSheetEditorScene } = await import("./EventSheetEditorScene");
		const editorScene = new EventSheetEditorScene({
			name: "event-editor",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, editorScene);
	}

	private async openCrafting(): Promise<void> {
		const { CraftingScene } = await import("./CraftingScene");
		const craftingScene = new CraftingScene({
			name: "crafting",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, craftingScene);
	}

	private async openSaveSlots(): Promise<void> {
		const { SaveSlotScene } = await import("./SaveSlotScene");
		const saveScene = new SaveSlotScene({
			name: "save-slots",
			app: this.app,
			camera: this.camera ?? undefined,
			mode: "save",
		});
		SceneTransition.pushWithFade(this.app, saveScene);
	}

	private async openBestiary(): Promise<void> {
		const { BestiaryScene } = await import("./BestiaryScene");
		const scene = new BestiaryScene({
			name: "bestiary",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openJournal(): Promise<void> {
		const { JournalScene } = await import("./JournalScene");
		const scene = new JournalScene({
			name: "journal",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openWorldMap(): Promise<void> {
		const { WorldMapScene } = await import("./WorldMapScene");
		const scene = new WorldMapScene({
			name: "world-map",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openFishing(): Promise<void> {
		const { FishingScene } = await import("./FishingScene");
		const scene = new FishingScene({
			name: "fishing",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openArena(): Promise<void> {
		const { ArenaScene } = await import("./ArenaScene");
		const scene = new ArenaScene({
			name: "arena",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openLeaderboard(): Promise<void> {
		const { LeaderboardScene } = await import("./LeaderboardScene");
		const scene = new LeaderboardScene({
			name: "leaderboard",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openTutorial(): Promise<void> {
		const { TutorialScene } = await import("./TutorialScene");
		const scene = new TutorialScene({
			name: "tutorial",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openBossRush(): Promise<void> {
		const { BossRushScene } = await import("./BossRushScene");
		const scene = new BossRushScene({
			name: "boss-rush",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openEngineGame(): Promise<void> {
		const { EngineScene } = await import("./EngineScene");
		const scene = new EngineScene({
			width: this.app.screen.width,
			height: this.app.screen.height,
		});
		await scene.create();
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openNDDemo(): Promise<void> {
		const { NDDemoScene } = await import("./NDDemoScene");
		const demoScene = new NDDemoScene({
			name: "nd-demo",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, demoScene);
	}

	private async openWorld(): Promise<void> {
		const { WorldScene } = await import("./WorldScene");
		const worldScene = new WorldScene({
			name: "world",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, worldScene);
	}

	private async openCustomEditor(): Promise<void> {
		const { CustomGameEditorScene } = await import("./CustomGameEditorScene");
		const editorScene = new CustomGameEditorScene({
			name: "custom-editor",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, editorScene);
	}

	private async openWorldEditor(): Promise<void> {
		const { WorldEditorScene } = await import("./WorldEditorScene");
		const editorScene = new WorldEditorScene({
			name: "world-editor",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, editorScene);
	}

	private async openRankings(): Promise<void> {
		const { RankingsScene } = await import("./RankingsScene");
		const rankingsScene = new RankingsScene({
			name: "rankings",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, rankingsScene);
	}

	private async openSettings(): Promise<void> {
		const { SettingsScene } = await import("./SettingsScene");
		const settingsScene = new SettingsScene({
			name: "settings",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, settingsScene);
	}

	private async openHighScores(): Promise<void> {
		const { HighScoresScene } = await import("./HighScoresScene");
		const highScoresScene = new HighScoresScene({
			name: "high-scores",
			app: this.app,
			camera: this.camera ?? undefined,
			initialMode: this.gameModes[this.selectedCategoryIndex],
		});
		SceneTransition.pushWithFade(this.app, highScoresScene);
	}

	private async openAchievements(): Promise<void> {
		const { AchievementsScene } = await import("./AchievementsScene");
		const achievementsScene = new AchievementsScene({
			name: "achievements",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, achievementsScene);
	}

	private async openGameSequenceEditor(): Promise<void> {
		const { GameSequenceEditorScene } = await import(
			"./GameSequenceEditorScene"
		);
		const seqEditorScene = new GameSequenceEditorScene({
			name: "game-sequence-editor",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, seqEditorScene);
	}

	private async openDemoBattle(): Promise<void> {
		// BattleScene normally receives live ECS combatants from WorldScene NPC
		// encounters. For dashboard access we fabricate equivalent components
		// with the same field shape, so the battle system runs unchanged.
		const [{ BattleScene }, { CombatComponent }] = await Promise.all([
			import("./BattleScene"),
			import("../engine/ecs/components/CombatComponent"),
		]);
		const player = new CombatComponent();
		player.isPlayer = true;
		player.level = 3;
		player.hp = 100;
		player.maxHp = 100;
		player.atk = 14;
		player.def = 6;
		const enemy = new CombatComponent();
		// Retuned 2026-11-14 so DEFEAT is reachable: at atk 9 the demo enemy
		// dealt ~3/hit and died in ~6 hits, so the player could never lose.
		// Now it deals ~13/hit (player attack deals 10/hit vs 90 HP): winning
		// needs magic, heals, or crits; defending or idling loses in ~8-17 hits.
		enemy.level = 5;
		enemy.hp = 90;
		enemy.maxHp = 90;
		enemy.atk = 17;
		enemy.def = 4;
		const scene = new BattleScene({
			name: "battle",
			app: this.app,
			camera: this.camera ?? undefined,
			player,
			enemy,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openInventory(): Promise<void> {
		const { InventoryScene } = await import("./InventoryScene");
		const scene = new InventoryScene({
			name: "inventory",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openShop(): Promise<void> {
		const { ShopScene } = await import("./ShopScene");
		const scene = new ShopScene({
			name: "shop",
			app: this.app,
			camera: this.camera ?? undefined,
			gold: 250,
			inventory: [],
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openSkillTree(): Promise<void> {
		const { SkillTreeScene } = await import("./SkillTreeScene");
		const scene = new SkillTreeScene({
			name: "skill-tree",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openQuestLog(): Promise<void> {
		const { QuestLogScene } = await import("./QuestLogScene");
		const scene = new QuestLogScene({
			name: "quest-log",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, scene);
	}

	private async openVisualizer(): Promise<void> {
		const { VisualizerScene } = await import("./VisualizerScene");
		const visualizerScene = new VisualizerScene({
			name: "visualizer",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, visualizerScene);
	}

	// ============================================================
	// Audio
	// ============================================================

	private playMenuMusic(): void {
		if (AudioManager.isLoaded("menu_music")) {
			AudioManager.playMusic("menu_music", { volume: 0.5, fadeIn: 1000 });
		}
	}

	private playMoveSound(): void {
		if (AudioManager.isLoaded("menu_move")) {
			AudioManager.playSound("menu_move", { volume: 0.5 });
		}
	}

	private playSelectSound(): void {
		if (AudioManager.isLoaded("menu_select")) {
			AudioManager.playSound("menu_select", { volume: 0.7 });
		}
	}

	// ============================================================
	// Utilities
	// ============================================================

	private lerpColor(color1: number, color2: number, t: number): number {
		const r1 = (color1 >> 16) & 0xff;
		const g1 = (color1 >> 8) & 0xff;
		const b1 = color1 & 0xff;

		const r2 = (color2 >> 16) & 0xff;
		const g2 = (color2 >> 8) & 0xff;
		const b2 = color2 & 0xff;

		const r = Math.round(r1 + (r2 - r1) * t);
		const g = Math.round(g1 + (g2 - g1) * t);
		const b = Math.round(b1 + (b2 - b1) * t);

		return (r << 16) | (g << 8) | b;
	}

	// ============================================================
	// Background, Visualizer & Particle Rendering
	// ============================================================

	private createBackground(): void {
		this.background = new Graphics();
		this.drawBackground();
		this.container.addChild(this.background);
	}

	private drawBackground(): void {
		this.background.clear();

		const steps = 20;
		for (let i = 0; i < steps; i++) {
			const ratio = i / steps;
			const color = this.lerpColor(0x0a0a1a, 0x1a1a3a, ratio);
			this.background.rect(
				0,
				(this.height / steps) * i,
				this.width,
				this.height / steps + 1,
			);
			this.background.fill(color);
		}
	}

	private createParticles(): void {
		this.particleContainer = new Container();
		this.container.addChild(this.particleContainer);

		for (let i = 0; i < 50; i++) {
			const particle = new Particle(this.width, this.height);
			this.particleContainer.addChild(particle.graphics);
			this.particles.push(particle);
		}
	}

	private updateParticles(dt: number): void {
		for (const particle of this.particles) {
			particle.update(dt, this.height);
		}
	}

	private createVisualizer(): void {
		this.visualizer = new FFTVisualizer(this.width, 100);
		this.visualizer.container.position.set(0, this.height - 100);
		this.visualizer.container.alpha = 0.5;
		this.container.addChild(this.visualizer.container);
	}

	private createTitle(): void {
		const titleStyle = new TextStyle({
			fontFamily: "Arial Black, Arial, sans-serif",
			fontSize: 60,
			fontWeight: "bold",
			fill: 0xffffff,
			stroke: { color: 0x003366, width: 6 },
			dropShadow: {
				color: 0x000000,
				blur: 8,
				angle: Math.PI / 4,
				distance: 6,
			},
			letterSpacing: 4,
		});

		this.titleText = new Text({ text: "bob's game", style: titleStyle });
		this.titleText.anchor.set(0.5);
		this.titleText.x = this.centerX;
		this.titleText.y = this.height * 0.14;
		this.container.addChild(this.titleText);

		const subtitleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 18,
			fill: 0x88aacc,
			letterSpacing: 6,
		});

		this.subtitleText = new Text({ text: "OMNI-ENGINE DASHBOARD", style: subtitleStyle });
		this.subtitleText.anchor.set(0.5);
		this.subtitleText.x = this.centerX;
		this.subtitleText.y = this.titleText.y + 48;
		this.container.addChild(this.subtitleText);

		const versionStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 14,
			fill: 0x445566,
			letterSpacing: 1,
		});
		this.versionText = new Text({ text: "v" + APP_VERSION, style: versionStyle });
		this.versionText.anchor.set(1, 1);
		this.versionText.x = this.width - 10;
		this.versionText.y = this.height - 10;
		this.container.addChild(this.versionText);
	}

	private updateTitleAnimation(dt: number): void {
		this.titleBounce += dt * 2;
		this.titleText.y = this.height * 0.14 + Math.sin(this.titleBounce) * 4;
		this.titleText.scale.set(1 + Math.sin(this.titleBounce * 0.5) * 0.015);
	}

	public onUpdate(dt: number): void {
		this.updateParticles(dt);
		this.visualizer?.update();
		this.updateTitleAnimation(dt);
		this.handleInput();
	}

	public onResize(width: number, height: number): void {
		this.drawBackground();
		this.visualizer?.resize(width, 100);
		this.visualizer.container.y = height - 100;
		this.tooltip?.resize(width, height);

		this.titleText.x = this.centerX;
		this.titleText.y = height * 0.14;
		this.subtitleText.x = this.centerX;
		this.subtitleText.y = this.titleText.y + 48;
		this.versionText.x = width - 10;
		this.versionText.y = height - 10;

		this.createCategorySelector();
		this.createGameModeSelector();
		this.rebuildCategoryMenu(this.activeCategory);
	}

	public async onExit(): Promise<void> {
		this.particles = [];
		this.tooltip?.destroy();
		await super.onExit();
	}
}

// ============================================================
// Particle Effect
// ============================================================

class Particle {
	public graphics: Graphics;
	private x: number;
	private y: number;
	private speed: number;
	private size: number;
	private alpha: number;
	private screenWidth: number;

	constructor(screenWidth: number, screenHeight: number) {
		this.screenWidth = screenWidth;
		this.x = Math.random() * screenWidth;
		this.y = Math.random() * screenHeight;
		this.speed = 20 + Math.random() * 40;
		this.size = 2 + Math.random() * 4;
		this.alpha = 0.2 + Math.random() * 0.4;

		this.graphics = new Graphics();
		this.draw();
	}

	private draw(): void {
		this.graphics.clear();
		this.graphics.circle(0, 0, this.size);
		this.graphics.fill({ color: 0x4a8aff, alpha: this.alpha });
		this.graphics.x = this.x;
		this.graphics.y = this.y;
	}

	public update(dt: number, screenHeight: number): void {
		this.y -= this.speed * dt;

		if (this.y < -this.size) {
			this.y = screenHeight + this.size;
			this.x = Math.random() * this.screenWidth;
		}

		this.graphics.y = this.y;
		this.graphics.x = this.x;
		this.x += Math.sin(this.y * 0.01) * 0.5;
	}
}
