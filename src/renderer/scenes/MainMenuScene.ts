/**
 * MainMenuScene — Consolidated Single-Page High-Value Omni-Engine Dashboard
 *
 * ARCHITECTURAL REDESIGN (v3.0.35):
 * Replaces the previous 4-tab exclusive view (`play` | `editors` | `community` |
 * `system` — which hid 75% of engine capabilities behind tab switches and
 * discarded `MenuItem.description`) with ONE singular, consolidated, smoothly
 * scrollable high-value dashboard page:
 *   1. Pinned Telemetry & Control Header:
 *      - Live health & Electron daemon Start/Stop/Restart pills for BOTH
 *        `Game WS Server (:6065)` and `AI Proxy (:6066)`.
 *      - Inline Puzzle Mode selector (`[MARATHON] [SPRINT] [ULTRA]`).
 *      - Quick-Jump Section Anchor pills (`1–5` / `Q·E`) that smoothly scroll
 *        to each section on the SAME page rather than hiding other sections.
 *   2. Unified Multi-Column Rich Card Canvas:
 *      - Renders all 38 gameplay modes, RPG scenes, creation editors, online
 *        competitive rankings, and engine tech demos in priority order.
 *      - Every card renders both its primary title, a concise inline subtitle,
 *        a section accent bar, and an `ⓘ` tooltip indicator wired to `Tooltip`.
 *      - Supports mouse-wheel scrolling, interactive scrollbar dragging,
 *        `PageUp`/`PageDown`/`Home`/`End`, and full keyboard/gamepad grid
 *        navigation with automatic scroll-into-view.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { APP_VERSION, SERVER_URL } from "../../shared/Config";
import { AudioManager } from "../audio/AudioManager";
import type { GameMode } from "../data/HighScoreManager";
import { GenerativeAIManager } from "../editor/GenerativeAIManager";
import { InputManager, Key } from "../input/InputManager";
import type { PuzzleSceneConfig } from "../puzzle";
import { GameType, GameTypes } from "../puzzle";
import { BobNet } from "../puzzle/BobNet";
import { PuzzleScene } from "../puzzle/PuzzleScene";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";
import { FFTVisualizer } from "../ui/FFTVisualizer";
import { ToastManager } from "../ui/ToastManager";
import { Tooltip } from "../ui/Tooltip";

// ============================================================
// Types & Section Taxonomy
// ============================================================

export interface MainMenuSceneConfig extends SceneConfig {
	onStartGame?: (gameType: GameType, gameMode: GameMode) => void;
	onOptions?: () => void;
}

export type DashboardSectionKey =
	| "core"
	| "combat"
	| "editors"
	| "community"
	| "system";

/** Retained type alias for backwards compatibility with external callers. */
export type DashboardCategory = DashboardSectionKey;

interface SectionMeta {
	key: DashboardSectionKey;
	shortLabel: string;
	headerTitle: string;
	headerSubtitle: string;
	accentColor: number;
	tooltip: string;
}

interface MenuItem {
	label: string;
	description: string;
	tooltip: string;
	section: DashboardSectionKey;
	action: () => void | Promise<void>;
	prefetch?: () => void;
}

interface CardEntry {
	item: MenuItem;
	container: Container;
	bg: Graphics;
	accentColor: number;
	x: number;
	y: number;
	w: number;
	h: number;
	hovered: boolean;
}

interface PillControl {
	container: Container;
	bg: Graphics;
	label: Text;
	redraw: (active: boolean, hovered: boolean, accentOverride?: number) => void;
}

// ============================================================
// MainMenuScene
// ============================================================

export class MainMenuScene extends Scene {
	private menuConfig: MainMenuSceneConfig;

	// Background & ambient layers
	private background!: Graphics;
	private particles: Particle[] = [];
	private particleContainer!: Container;
	private visualizer!: FFTVisualizer;

	// Pinned header & footer layers
	private headerContainer!: Container;
	private titleText!: Text;
	private subtitleText!: Text;
	private wsServerPill!: PillControl;
	private aiServerPill!: PillControl;
	private modePills: PillControl[] = [];
	private anchorPills: PillControl[] = [];
	private footerContainer!: Container;
	private versionText!: Text;

	// Scrollable viewport & scrollbar
	private viewportY = 148;
	private viewportHeight = 540;
	private viewportMask!: Graphics;
	private scrollWrapper!: Container;
	private scrollContent!: Container;
	private scrollTrack!: Graphics;
	private scrollThumb!: Graphics;
	private scrollY = 0;
	private targetScrollY = 0;
	private maxScrollY = 0;
	private draggingScrollbar = false;
	private dragStartPointerY = 0;
	private dragStartScrollY = 0;

	// Cards, section offsets & selection state
	private allMenuItems: MenuItem[] = [];
	private cards: CardEntry[] = [];
	private sectionOffsets: Record<DashboardSectionKey, number> = {
		core: 0,
		combat: 0,
		editors: 0,
		community: 0,
		system: 0,
	};
	private gridCols = 3;
	private selectedIndex = 0;
	private selectedCategoryIndex = 0; // Puzzle GameMode index

	// Live server state
	private wsOnline = false;
	private wsManaged = false;
	private wsDetail = "Unchecked";
	private aiOnline = false;
	private aiManaged = false;
	private aiDetail = "Unchecked";
	private statusPollTimer: number | null = null;
	private wheelHandler: ((e: WheelEvent) => void) | null = null;

	private tooltip!: Tooltip;
	private titleBounce = 0;

	private readonly gameModes: GameMode[] = ["marathon", "sprint", "ultra"];
	private readonly gameModeLabels: Record<GameMode, string> = {
		marathon: "MARATHON",
		sprint: "SPRINT",
		ultra: "ULTRA",
	};
	private readonly gameModeTooltips: Record<GameMode, string> = {
		marathon:
			"Marathon Mode: Progressive 150-line / endless speed curve — classic endurance scoring.",
		sprint:
			"Sprint Mode: Clear 40 lines as fast as possible — pure speedrun time-attack.",
		ultra:
			"Ultra Mode: Score as many points as possible within a strict 3-minute countdown.",
	};

	private readonly sections: SectionMeta[] = [
		{
			key: "core",
			shortLabel: "1. Core & Puzzle",
			headerTitle: "🌟 CORE WORLDS, PUZZLE MODES & REPLAYS",
			headerSubtitle:
				"Flagship MMO RPG world, story engine, Classic/Modern/Custom falling-block puzzle modes, tutorial & instant replays",
			accentColor: 0x3b82f6,
			tooltip:
				"Jump to Section 1 (Shortcut: 1): Flagship MMO World, Story RPG Engine, Classic/Modern/Custom Puzzle modes, Tutorial, and Replays.",
		},
		{
			key: "combat",
			shortLabel: "2. Combat & RPG",
			headerTitle: "⚔️ COMBAT ARENAS, MINI-GAMES & CHARACTER LOADOUT",
			headerSubtitle:
				"Real-time & turn-based combat, Boss Rush gauntlet, Fishing, Inventory, Merchant Shop, Skill Tree, Crafting & Save Slots",
			accentColor: 0xf59e0b,
			tooltip:
				"Jump to Section 2 (Shortcut: 2): Arena & Turn-Based Combat, Boss Rush, Fishing, Inventory, Shop, Skill Tree, Crafting & Saves.",
		},
		{
			key: "editors",
			shortLabel: "3. Creation Studio",
			headerTitle: "🛠️ CREATION, MODDING & GENERATIVE AI STUDIO",
			headerSubtitle:
				"Author custom puzzle physics/pieces, edit RPG maps & warp doors, animate pixel sprites, script events & chain campaigns",
			accentColor: 0x10b981,
			tooltip:
				"Jump to Section 3 (Shortcut: 3): Custom Game Rule Editor, World Database Editor, Sprite Studio, Event Sheets & Sequence Editor.",
		},
		{
			key: "community",
			shortLabel: "4. Online & Lore",
			headerTitle: "🌐 MULTIPLAYER, COMPETITIVE RANKINGS & WORLD COMPENDIUM",
			headerSubtitle:
				"30-player lobbies, tournaments, live global leaderboards, ELO tiers, achievements, quests, world map & creature bestiary",
			accentColor: 0x8b5cf6,
			tooltip:
				"Jump to Section 4 (Shortcut: 4): Multiplayer Lobby, Cloud Login, Tournaments, Leaderboards, ELO Rankings, Quests & Bestiary.",
		},
		{
			key: "system",
			shortLabel: "5. System & Demos",
			headerTitle: "⚙️ UNIFIED SETTINGS, SERVER DAEMONS, MANUAL & ENGINE DEMOS",
			headerSubtitle:
				"Single-page Audio/Graphics/HQ2X/WebGPU settings, in-game manual, local WS & AI server controls, and GPU/Wasm tech demos",
			accentColor: 0x06b6d4,
			tooltip:
				"Jump to Section 5 (Shortcut: 5): Unified Settings & Options, Help Manual, Server Daemon Controls, WebGPU, FFT & nD Demos.",
		},
	];

	constructor(config: MainMenuSceneConfig) {
		super(config);
		this.menuConfig = config;
	}

	// ============================================================
	// Lifecycle (Idempotent Build + Clean Listener Management)
	// ============================================================

	public create(): void {
		this.detachNativeListeners();
		this.container.removeChildren();
		this.particles = [];
		this.cards = [];

		this.createBackground();
		this.createParticles();
		this.createVisualizer();

		this.initMenuItems();

		// Scrollable masked card canvas (positioned beneath pinned header)
		this.scrollWrapper = new Container();
		this.container.addChild(this.scrollWrapper);

		this.scrollContent = new Container();
		this.scrollWrapper.addChild(this.scrollContent);

		this.viewportMask = new Graphics();
		this.container.addChild(this.viewportMask);
		this.scrollWrapper.mask = this.viewportMask;

		this.scrollTrack = new Graphics();
		this.scrollThumb = new Graphics();
		this.container.addChild(this.scrollTrack);
		this.container.addChild(this.scrollThumb);

		// Pinned top header & bottom footer
		this.headerContainer = new Container();
		this.container.addChild(this.headerContainer);

		this.footerContainer = new Container();
		this.container.addChild(this.footerContainer);

		// Top-most floating tooltip layer
		this.tooltip = new Tooltip(this.width, this.height);
		this.container.addChild(this.tooltip.getContainer());

		this.buildLayout();
		this.attachNativeListeners();
		void this.refreshServerStatuses();

		this.playMenuMusic();
		this.scheduleScenePrefetch();
	}

	public onPause(): void {
		super.onPause();
		this.detachNativeListeners();
		this.tooltip?.hide();
	}

	public onResume(): void {
		super.onResume();
		this.attachNativeListeners();
		void this.refreshServerStatuses();
	}

	public async onExit(): Promise<void> {
		this.detachNativeListeners();
		this.particles = [];
		this.cards = [];
		this.tooltip?.destroy();
		await super.onExit();
	}

	private attachNativeListeners(): void {
		this.detachNativeListeners();
		this.wheelHandler = (e: WheelEvent) => {
			if (this._paused) return;
			e.preventDefault();
			const step = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY * 0.85;
			this.setTargetScroll(this.targetScrollY + step);
		};
		this.app.canvas.addEventListener("wheel", this.wheelHandler, {
			passive: false,
		});

		this.statusPollTimer = window.setInterval(() => {
			if (!this._paused) {
				void this.refreshServerStatuses();
			}
		}, 8000);
	}

	private detachNativeListeners(): void {
		if (this.wheelHandler) {
			this.app.canvas.removeEventListener("wheel", this.wheelHandler);
			this.wheelHandler = null;
		}
		if (this.statusPollTimer !== null) {
			window.clearInterval(this.statusPollTimer);
			this.statusPollTimer = null;
		}
	}

	// ============================================================
	// Consolidated Menu Catalog (All 38 Capabilities on One Page)
	// ============================================================

	private initMenuItems(): void {
		this.allMenuItems = [
			// --- SECTION 1: CORE WORLDS, PUZZLE & REPLAYS ---
			{
				label: "MMO World (TOWNYUU)",
				description: "Persistent multiplayer RPG world & towns",
				tooltip:
					"Explore Yuu's hometown and 240+ interconnected legacy maps with NPC dialogue, dynamic lighting, weather, and live Socket.io players.",
				section: "core",
				action: () => this.openWorld(),
				prefetch: () => void import("./WorldScene"),
			},
			{
				label: "Play RPG Story Engine",
				description: "Standalone 2D action-RPG campaign loop",
				tooltip:
					"Step into Yuu's single-player quest inside the core 2D RPG engine with scripted events, collisions, and cutscenes.",
				section: "core",
				action: () => this.openEngineGame(),
				prefetch: () => void import("./EngineScene"),
			},
			{
				label: "Classic Puzzle",
				description: "Authentic retro falling-block physics",
				tooltip:
					"Play pure classic falling-block rules using the currently selected Puzzle Mode (Marathon / Sprint / Ultra) in the top bar.",
				section: "core",
				action: () => this.startGame(GameTypes.CLASSIC),
			},
			{
				label: "Modern SRS Puzzle",
				description: "Hard drop, hold piece, ghost & wall kicks",
				tooltip:
					"Fast-paced competitive puzzle mechanics with Super Rotation System (SRS) kicks, lock delay, and ghost preview.",
				section: "core",
				action: () => this.startGame(GameTypes.MODERN),
			},
			{
				label: "Play Custom Rule Puzzle",
				description: "Run your saved Custom Game Editor preset",
				tooltip:
					"Launch a puzzle session powered by your custom block catalog, gravity curve, and rotation rules saved in the Custom Game Editor.",
				section: "core",
				action: () => this.startCustomGame(),
			},
			{
				label: "Interactive Tutorial",
				description: "Step-by-step controls & mechanics guide",
				tooltip:
					"Guided hands-on lessons covering movement, rotation kicks, line clears, and RPG interaction fundamentals.",
				section: "core",
				action: () => this.openTutorial(),
				prefetch: () => void import("./TutorialScene"),
			},
			{
				label: "Watch Last Replay",
				description: "Deterministic frame playback of last match",
				tooltip:
					"Re-watch your most recent recorded puzzle run frame-by-frame directly inside the puzzle engine.",
				section: "core",
				action: () => this.playLastReplay(),
			},
			{
				label: "Share Replay Link",
				description: "Copy GZip+Base64 `#replay=` URL to clipboard",
				tooltip:
					"Compresses your latest puzzle replay via BobNet GZip+Base64 encoding into a self-contained shareable browser URL.",
				section: "core",
				action: () => this.shareLastReplay(),
			},

			// --- SECTION 2: COMBAT, MINI-GAMES & CHARACTER LOADOUT ---
			{
				label: "Arena Battle",
				description: "Real-time action combat & wave survival",
				tooltip:
					"Fight waves of monsters and challengers in the real-time ECS combat arena.",
				section: "combat",
				action: () => this.openArena(),
				prefetch: () => void import("./ArenaScene"),
			},
			{
				label: "Demo Turn-Based Battle",
				description: "Tactical turn-based duel against Lv.5 foe",
				tooltip:
					"Test Attack, Magic, Defend, and Item tactics against a tuned training adversary (full encounters also trigger in MMO World).",
				section: "combat",
				action: () => this.openDemoBattle(),
				prefetch: () => void import("./BattleScene"),
			},
			{
				label: "Boss Rush Gauntlet",
				description: "Back-to-back timed boss encounters",
				tooltip:
					"Challenge sequential high-difficulty engine bosses under strict survival and timer pressure.",
				section: "combat",
				action: () => this.openBossRush(),
				prefetch: () => void import("./BossRushScene"),
			},
			{
				label: "Fishing Mini-Game",
				description: "Cast lines, time bites & reel rare catches",
				tooltip:
					"Relaxing waterfront fishing mini-game with tension timing, rarity tiers, and gold/item rewards.",
				section: "combat",
				action: () => this.openFishing(),
				prefetch: () => void import("./FishingScene"),
			},
			{
				label: "Inventory & Equipment",
				description: "Manage bag items, weapons, armor & potions",
				tooltip:
					"Inspect your backpack, equip stat-boosting gear, and use consumables (also accessible inside MMO World).",
				section: "combat",
				action: () => this.openInventory(),
				prefetch: () => void import("./InventoryScene"),
			},
			{
				label: "Merchant Shop & Trading",
				description: "Buy & sell weapons, armor and supplies",
				tooltip:
					"Browse merchant stock, compare gear stats, spend gold, or sell surplus loot.",
				section: "combat",
				action: () => this.openShop(),
				prefetch: () => void import("./ShopScene"),
			},
			{
				label: "Skill Tree",
				description: "Unlock Combat, Magic & Utility abilities",
				tooltip:
					"Invest skill points across three branching progression paths with prerequisite links.",
				section: "combat",
				action: () => this.openSkillTree(),
				prefetch: () => void import("./SkillTreeScene"),
			},
			{
				label: "Crafting & Synthesis",
				description: "Combine materials into upgraded gear",
				tooltip:
					"Synthesize potions, weapons, and rare equipment from gathered world ingredients and blueprints.",
				section: "combat",
				action: () => this.openCrafting(),
				prefetch: () => void import("./CraftingScene"),
			},
			{
				label: "Save / Load Slots",
				description: "Multi-slot local & cloud state manager",
				tooltip:
					"Create backups, inspect timestamps, and load saved RPG progression slots.",
				section: "combat",
				action: () => this.openSaveSlots(),
				prefetch: () => void import("./SaveSlotScene"),
			},

			// --- SECTION 3: CREATION, MODDING & AI STUDIO ---
			{
				label: "Custom Game Rule Editor",
				description: "Design custom puzzle pieces, gravity & kicks",
				tooltip:
					"Full parameter studio for authoring falling-block rulesets, piece matrices, garbage formulas, and color palettes.",
				section: "editors",
				action: () => this.openCustomEditor(),
				prefetch: () => void import("./CustomGameEditorScene"),
			},
			{
				label: "World Database Editor",
				description: "Edit RPG maps, layers, NPCs & warp doors",
				tooltip:
					"Inspect and edit tilemap layers, collision bounds, door graphs, NPC placements, and AI-assisted tilesets.",
				section: "editors",
				action: () => this.openWorldEditor(),
				prefetch: () => void import("./WorldEditorScene"),
			},
			{
				label: "Pixel Sprite Editor",
				description: "Draw frames, slice sheets & preview walk cycles",
				tooltip:
					"Create character and prop pixel art, test 8-directional animation loops, and generate sprites via the AI Proxy.",
				section: "editors",
				action: () => this.openSpriteEditor(),
				prefetch: () => void import("./SpriteEditorScene"),
			},
			{
				label: "Event Sheet Editor",
				description: "Visual trigger-condition-action scripting",
				tooltip:
					"Build branching dialogue, cutscene camera pans, quest flags, and warp triggers without writing raw code.",
				section: "editors",
				action: () => this.openEventEditor(),
				prefetch: () => void import("./EventSheetEditorScene"),
			},
			{
				label: "Game Sequence Editor",
				description: "Chain custom puzzle stages into gauntlets",
				tooltip:
					"Curate ordered playlists of puzzle variants with custom transition timers and win conditions.",
				section: "editors",
				action: () => this.openGameSequenceEditor(),
				prefetch: () => void import("./GameSequenceEditorScene"),
			},

			// --- SECTION 4: MULTIPLAYER, RANKINGS & COMPENDIUM ---
			{
				label: "Multiplayer Lobby",
				description: "Real-time rooms, chat & 30-player sync",
				tooltip:
					"Host or join live multiplayer puzzle rooms, spectate active matches, and chat via the Socket.io WS server.",
				section: "community",
				action: () => this.openLobby(),
				prefetch: () => void import("./LobbyScene"),
			},
			{
				label: "Online Account & Sync",
				description: "Authenticate & sync cloud profile/ELO",
				tooltip:
					"Sign in to synchronize your display name, ELO rating, achievements, and cloud character data.",
				section: "community",
				action: () => this.openLogin(),
				prefetch: () => void import("./LoginScene"),
			},
			{
				label: "Co-op Party Manager",
				description: "Assemble party roster & team roles",
				tooltip:
					"Organize multiplayer party members, inspect readiness, and coordinate shared world sessions.",
				section: "community",
				action: () => this.openParty(),
				prefetch: () => void import("./PartyScene"),
			},
			{
				label: "Tournament Brackets",
				description: "Single-elimination ELO bracket competition",
				tooltip:
					"Compete in seeded elimination brackets with automated round progression and ELO rating updates.",
				section: "community",
				action: () => this.openTournament(),
				prefetch: () => void import("./TournamentScene"),
			},
			{
				label: "Global Leaderboard",
				description: "Server-wide Marathon, Sprint & Ultra top 50",
				tooltip:
					"Query live competitive scoreboards hosted on the WebSocket backend across all three puzzle modes.",
				section: "community",
				action: () => this.openLeaderboard(),
				prefetch: () => void import("./LeaderboardScene"),
			},
			{
				label: "Local High Scores",
				description: "Personal best scores & times on this device",
				tooltip:
					"Inspect your offline personal records and completion times filtered by Marathon, Sprint, and Ultra.",
				section: "community",
				action: () => this.openHighScores(),
				prefetch: () => void import("./HighScoresScene"),
			},
			{
				label: "ELO Rankings & Tiers",
				description: "Competitive league divisions & win rates",
				tooltip:
					"Track ELO rating curves, seasonal skill tiers, and win/loss statistics.",
				section: "community",
				action: () => this.openRankings(),
				prefetch: () => void import("./RankingsScene"),
			},
			{
				label: "Achievements & Badges",
				description: "43 unlockable milestones & stat trackers",
				tooltip:
					"Browse unlocked badges, secret objectives, and cumulative gameplay counters.",
				section: "community",
				action: () => this.openAchievements(),
				prefetch: () => void import("./AchievementsScene"),
			},
			{
				label: "Active Quest Log",
				description: "Main, side, daily & challenge objectives",
				tooltip:
					"Track active quest steps, completion percentages, and claimable XP/gold rewards.",
				section: "community",
				action: () => this.openQuestLog(),
				prefetch: () => void import("./QuestLogScene"),
			},
			{
				label: "Story & Lore Journal",
				description: "Narrative diary, characters & chapter notes",
				tooltip:
					"Read storyline entries, NPC background lore, and discovered world history.",
				section: "community",
				action: () => this.openJournal(),
				prefetch: () => void import("./JournalScene"),
			},
			{
				label: "World Map Overview",
				description: "Regional geography & discovered warp nodes",
				tooltip:
					"Inspect interconnected town districts, interior landmarks, and fast-travel waypoints.",
				section: "community",
				action: () => this.openWorldMap(),
				prefetch: () => void import("./WorldMapScene"),
			},
			{
				label: "Creature Bestiary",
				description: "Monster stats, elemental weaknesses & drops",
				tooltip:
					"Catalog of encountered enemies and bosses with HP/ATK/DEF stats and loot drop tables.",
				section: "community",
				action: () => this.openBestiary(),
				prefetch: () => void import("./BestiaryScene"),
			},

			// --- SECTION 5: SYSTEM, UNIFIED SETTINGS, DAEMONS & TECH DEMOS ---
			{
				label: "Settings & Options",
				description: "Unified Audio, WebGPU, HQ2X, Haptics & Profile",
				tooltip:
					"Single-page control center combining Audio Mixer, WebGPU/WebGL2 selection, HQ2X HD Sprites, Ghost Piece, Touch HUD, Haptics, and Player Name.",
				section: "system",
				action: () => this.openSettings(),
				prefetch: () => void import("./SettingsScene"),
			},
			{
				label: "Help & Controls Manual",
				description: "Full keyboard, gamepad, tray & editor guide",
				tooltip:
					"Comprehensive scrollable reference manual covering shortcuts, world mechanics, server daemons, and editors.",
				section: "system",
				action: () => this.openHelp(),
				prefetch: () => void import("./HelpScene"),
			},
			{
				label: "Game WS Server (:6065)",
				description: "Check health or Start/Stop multiplayer daemon",
				tooltip:
					"Probes port 6065 (`/healthz`) and lets you start, stop, or restart the local Socket.io game server via Electron IPC.",
				section: "system",
				action: () => this.toggleOrCheckWsServer(),
			},
			{
				label: "AI Proxy Server (:6066)",
				description: "Check health or Start/Stop Generative AI daemon",
				tooltip:
					"Probes port 6066 (`/healthz`) for OpenAI / Mock mode status and toggles the local Express AI proxy via Electron IPC.",
				section: "system",
				action: () => this.toggleOrCheckAiServer(),
			},
			{
				label: "WebGPU Compute Demo",
				description: "WGSL GPU compute-shader particle simulation",
				tooltip:
					"Runs thousands of hardware-accelerated particles directly inside WebGPU WGSL compute shaders.",
				section: "system",
				action: () => this.openWebGPUDemo(),
				prefetch: () => void import("./WebGPUDemoScene"),
			},
			{
				label: "Audio FFT Visualizer",
				description: "Full-screen Butterchurn & spectrum canvas",
				tooltip:
					"Interactive real-time audio frequency analyzer and MilkDrop/Butterchurn preset showcase (press V on dashboard to cycle mini-bar).",
				section: "system",
				action: () => this.openVisualizer(),
				prefetch: () => void import("./VisualizerScene"),
			},
			{
				label: "Engine Stress Benchmark",
				description: "ECS, Wasm physics & dynamic lighting testbed",
				tooltip:
					"Benchmarks large entity counts, tilemap batching, Wasm collision checks, and point-light shadows.",
				section: "system",
				action: () => this.openEngineDemo(),
				prefetch: () => void import("./EngineDemoScene"),
			},
			{
				label: "nD Handheld & Spatial Demo",
				description: "Virtual nD console & higher-dimensional projection",
				tooltip:
					"Preview the embedded nD handheld console shell and experimental multi-dimensional projection shaders.",
				section: "system",
				action: () => this.openNDDemo(),
				prefetch: () => void import("./NDDemoScene"),
			},
		];
	}

	// ============================================================
	// Consolidated Responsive Layout Builder
	// ============================================================

	private buildLayout(): void {
		this.headerContainer.removeChildren();
		this.footerContainer.removeChildren();
		this.scrollContent.removeChildren();
		this.cards = [];
		this.modePills = [];
		this.anchorPills = [];

		const w = this.width;
		const h = this.height;
		const compactHeader = w < 960;

		this.viewportY = compactHeader ? 168 : 138;
		const footerH = 28;
		this.viewportHeight = Math.max(200, h - this.viewportY - footerH);

		// ---- 1. PINNED HEADER BACKDROP ----
		const headerBg = new Graphics();
		headerBg.rect(0, 0, w, this.viewportY - 2);
		headerBg.fill({ color: 0x090f1d, alpha: 0.94 });
		headerBg.moveTo(0, this.viewportY - 2);
		headerBg.lineTo(w, this.viewportY - 2);
		headerBg.stroke({ color: 0x264066, width: 1.5 });
		this.headerContainer.addChild(headerBg);

		// Brand Title (Top-Left)
		this.titleText = new Text({
			text: "bob's game",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: compactHeader ? 28 : 34,
				fontWeight: "bold",
				fill: 0xffffff,
				stroke: { color: 0x003366, width: 4 },
				letterSpacing: 2,
			}),
		});
		this.titleText.position.set(20, 10);
		this.headerContainer.addChild(this.titleText);

		this.subtitleText = new Text({
			text: "CONSOLIDATED OMNI-ENGINE DASHBOARD",
			style: new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 11,
				fontWeight: "bold",
				fill: 0x7aa6d8,
				letterSpacing: 2.5,
			}),
		});
		this.subtitleText.position.set(22, compactHeader ? 44 : 50);
		this.headerContainer.addChild(this.subtitleText);

		// Live Server Control & Telemetry Strip (Top-Right)
		const serverRowY = 14;
		const refreshPill = this.createPill(
			"↻ Probe",
			68,
			26,
			0x3b82f6,
			"Re-check live HTTP health of Game WS Server (:6065) and AI Proxy (:6066).",
			() => {
				this.playMoveSound();
				ToastManager.showInfo("Refreshing server health telemetry...");
				void this.refreshServerStatuses();
			},
		);
		refreshPill.container.position.set(w - 86, serverRowY);
		this.headerContainer.addChild(refreshPill.container);

		this.aiServerPill = this.createPill(
			"○ AI Proxy :6066",
			168,
			26,
			0x10b981,
			() =>
				`Local AI Proxy (:6066) — ${this.aiDetail}\nClick to inspect or Start/Stop daemon via Electron IPC (or 'start.bat --ai-proxy').`,
			() => void this.toggleOrCheckAiServer(),
		);
		this.aiServerPill.container.position.set(w - 262, serverRowY);
		this.headerContainer.addChild(this.aiServerPill.container);

		this.wsServerPill = this.createPill(
			"○ WS Server :6065",
			174,
			26,
			0x3b82f6,
			() =>
				`Multiplayer Game WS Server (:6065) — ${this.wsDetail}\nClick to inspect or Start/Stop daemon via Electron IPC (or 'start.bat --server').`,
			() => void this.toggleOrCheckWsServer(),
		);
		this.wsServerPill.container.position.set(w - 444, serverRowY);
		this.headerContainer.addChild(this.wsServerPill.container);

		// Inline Puzzle Mode Selector (`[MARATHON] [SPRINT] [ULTRA]`)
		const modeRowY = compactHeader ? 66 : 48;
		const modeBaseX = w - 334;
		const modeTag = new Text({
			text: "PUZZLE MODE:",
			style: new TextStyle({
				fill: "#7e9ec2",
				fontSize: 10,
				fontWeight: "bold",
				letterSpacing: 1,
			}),
		});
		modeTag.anchor.set(1, 0.5);
		modeTag.position.set(modeBaseX - 8, modeRowY + 12);
		this.headerContainer.addChild(modeTag);

		this.gameModes.forEach((mode, idx) => {
			const pill = this.createPill(
				this.gameModeLabels[mode],
				102,
				24,
				0xf59e0b,
				this.gameModeTooltips[mode],
				() => {
					this.selectedCategoryIndex = idx;
					this.updateModePillsVisuals();
					this.playMoveSound();
				},
			);
			pill.container.position.set(modeBaseX + idx * 108, modeRowY);
			this.headerContainer.addChild(pill.container);
			this.modePills.push(pill);
		});
		this.updateModePillsVisuals();

		// Quick-Jump Section Anchor Strip (Smoothly scrolls same page!)
		const anchorRowY = compactHeader ? 100 : 84;
		let ax = 20;
		let ay = anchorRowY;
		const jumpLabel = new Text({
			text: "JUMP TO:",
			style: new TextStyle({
				fill: "#6e8cb0",
				fontSize: 10,
				fontWeight: "bold",
				letterSpacing: 1,
			}),
		});
		jumpLabel.position.set(ax, ay + 7);
		this.headerContainer.addChild(jumpLabel);
		ax += 64;

		this.sections.forEach((sec) => {
			const pw = Math.max(128, sec.shortLabel.length * 7.6 + 22);
			if (ax + pw > w - 20) {
				ax = 20;
				ay += 30;
			}
			const pill = this.createPill(
				sec.shortLabel,
				pw,
				25,
				sec.accentColor,
				sec.tooltip,
				() => {
					this.scrollToSection(sec.key);
					this.playMoveSound();
				},
			);
			pill.container.position.set(ax, ay);
			this.headerContainer.addChild(pill.container);
			this.anchorPills.push(pill);
			ax += pw + 8;
		});

		// ---- 2. VIEWPORT MASK ----
		this.viewportMask.clear();
		this.viewportMask.rect(0, this.viewportY, w, this.viewportHeight);
		this.viewportMask.fill(0xffffff);
		this.scrollWrapper.position.set(0, this.viewportY);

		// ---- 3. CONSOLIDATED MULTI-COLUMN RICH CARDS ----
		const padX = 22;
		const scrollbarGutter = 18;
		const usableW = w - padX * 2 - scrollbarGutter;
		this.gridCols = w >= 980 ? 3 : w >= 620 ? 2 : 1;
		const gapX = 12;
		const gapY = 10;
		const cardW = Math.floor(
			(usableW - gapX * (this.gridCols - 1)) / this.gridCols,
		);
		const cardH = 54;

		let cursorY = 14;

		for (const sec of this.sections) {
			this.sectionOffsets[sec.key] = Math.max(0, cursorY - 10);

			// Section Banner
			const secBanner = new Container();
			secBanner.position.set(padX, cursorY);

			const secBar = new Graphics();
			secBar.roundRect(0, 0, usableW, 38, 6);
			secBar.fill({ color: 0x101b30, alpha: 0.9 });
			secBar.rect(0, 0, 5, 38);
			secBar.fill({ color: sec.accentColor });
			secBanner.addChild(secBar);

			const secTitle = new Text({
				text: sec.headerTitle,
				style: new TextStyle({
					fill: "#eaf2ff",
					fontSize: 13,
					fontWeight: "bold",
					letterSpacing: 0.8,
				}),
			});
			secTitle.position.set(14, 5);
			secBanner.addChild(secTitle);

			const secSub = new Text({
				text: sec.headerSubtitle,
				style: new TextStyle({
					fill: "#85a3c4",
					fontSize: 11,
				}),
			});
			secSub.position.set(14, 22);
			secBanner.addChild(secSub);

			this.scrollContent.addChild(secBanner);
			cursorY += 46;

			const secItems = this.allMenuItems.filter(
				(item) => item.section === sec.key,
			);
			secItems.forEach((item, idx) => {
				const col = idx % this.gridCols;
				const row = Math.floor(idx / this.gridCols);
				const cx = padX + col * (cardW + gapX);
				const cy = cursorY + row * (cardH + gapY);

				const card = this.createDashboardCard(
					item,
					cx,
					cy,
					cardW,
					cardH,
					sec.accentColor,
					this.cards.length,
				);
				this.scrollContent.addChild(card.container);
				this.cards.push(card);
			});

			const rows = Math.ceil(secItems.length / this.gridCols);
			cursorY += rows * (cardH + gapY) + 14;
		}

		const totalContentH = cursorY + 12;
		this.maxScrollY = Math.max(0, totalContentH - this.viewportHeight);
		this.scrollY = Math.min(this.scrollY, this.maxScrollY);
		this.targetScrollY = Math.min(this.targetScrollY, this.maxScrollY);
		this.scrollContent.y = -this.scrollY;

		this.buildScrollbar();

		// ---- 4. PINNED FOOTER ----
		const footerBg = new Graphics();
		footerBg.rect(0, h - footerH, w, footerH);
		footerBg.fill({ color: 0x080d1a, alpha: 0.95 });
		footerBg.moveTo(0, h - footerH);
		footerBg.lineTo(w, h - footerH);
		footerBg.stroke({ color: 0x1f3556, width: 1 });
		this.footerContainer.addChild(footerBg);

		const controlsHint = new Text({
			text: "🖱️ Wheel / Drag Bar: Scroll   |   ↑↓←→: Select Card   |   Enter: Launch   |   1–5 / Q·E: Jump Section   |   V: FFT Mode",
			style: new TextStyle({
				fill: "#7c97b8",
				fontSize: 11,
			}),
		});
		controlsHint.position.set(16, h - footerH + 7);
		this.footerContainer.addChild(controlsHint);

		this.versionText = new Text({
			text: `v${APP_VERSION}`,
			style: new TextStyle({
				fontFamily: "monospace",
				fontSize: 12,
				fontWeight: "bold",
				fill: 0x66aaff,
			}),
		});
		this.versionText.anchor.set(1, 0.5);
		this.versionText.position.set(w - 14, h - footerH / 2);
		this.footerContainer.addChild(this.versionText);

		this.selectedIndex = Math.min(
			this.selectedIndex,
			Math.max(0, this.cards.length - 1),
		);
		this.updateSelectionVisuals();
		this.updateServerPillsVisuals();
		this.updateActiveAnchorVisuals();
	}

	private createDashboardCard(
		item: MenuItem,
		x: number,
		y: number,
		w: number,
		h: number,
		accentColor: number,
		cardIndex: number,
	): CardEntry {
		const container = new Container();
		container.position.set(x, y);
		container.eventMode = "static";
		container.cursor = "pointer";

		const bg = new Graphics();
		container.addChild(bg);

		const title = new Text({
			text: item.label,
			style: new TextStyle({
				fill: "#f2f7ff",
				fontSize: 14,
				fontWeight: "bold",
				fontFamily: "Arial, sans-serif",
			}),
		});
		title.position.set(13, 8);
		container.addChild(title);

		// Truncate inline subtitle gracefully on narrower viewports
		const maxChars = Math.max(24, Math.floor((w - 36) / 6.1));
		const descStr =
			item.description.length > maxChars
				? `${item.description.slice(0, maxChars - 1)}…`
				: item.description;
		const desc = new Text({
			text: descStr,
			style: new TextStyle({
				fill: "#8fb0d4",
				fontSize: 11,
				fontFamily: "Arial, sans-serif",
			}),
		});
		desc.position.set(13, 30);
		container.addChild(desc);

		const infoBadge = new Text({
			text: "ⓘ",
			style: new TextStyle({
				fill: "#6ea8fe",
				fontSize: 13,
				fontWeight: "bold",
			}),
		});
		infoBadge.anchor.set(1, 0);
		infoBadge.position.set(w - 10, 8);
		container.addChild(infoBadge);

		const entry: CardEntry = {
			item,
			container,
			bg,
			accentColor,
			x,
			y,
			w,
			h,
			hovered: false,
		};
		this.drawCardEntry(entry, cardIndex === this.selectedIndex);

		container.on("pointerover", (e) => {
			entry.hovered = true;
			this.selectedIndex = cardIndex;
			this.updateSelectionVisuals();
			this.tooltip.show(e.global.x, e.global.y, `${item.label}\n${item.tooltip}`);
		});
		container.on("pointermove", (e) => {
			if (entry.hovered) {
				this.tooltip.updatePosition(e.global.x, e.global.y);
			}
		});
		container.on("pointerout", () => {
			entry.hovered = false;
			this.drawCardEntry(entry, cardIndex === this.selectedIndex);
			this.tooltip.hide();
		});
		container.on("pointertap", () => {
			this.tooltip.hide();
			this.playSelectSound();
			void item.action();
		});

		return entry;
	}

	private drawCardEntry(entry: CardEntry, selected: boolean): void {
		const { bg, w, h, accentColor, hovered } = entry;
		bg.clear();
		bg.roundRect(0, 0, w, h, 8);
		bg.fill({
			color: hovered ? 0x203658 : selected ? 0x1a2d4c : 0x132036,
			alpha: 0.94,
		});
		bg.stroke({
			color: selected ? 0x7cc4ff : hovered ? accentColor : 0x2a4368,
			width: selected ? 2.2 : 1.4,
		});
		// Left category accent stripe
		bg.roundRect(1, 5, 4, h - 10, 2);
		bg.fill({ color: accentColor });
	}

	private createPill(
		initialText: string,
		w: number,
		h: number,
		accentColor: number,
		tooltipSource: string | (() => string),
		onClick: () => void,
	): PillControl {
		const container = new Container();
		container.eventMode = "static";
		container.cursor = "pointer";

		const bg = new Graphics();
		container.addChild(bg);

		const label = new Text({
			text: initialText,
			style: new TextStyle({
				fill: "#e6f0ff",
				fontSize: 11,
				fontWeight: "bold",
				fontFamily: "Arial, sans-serif",
			}),
		});
		label.anchor.set(0.5);
		label.position.set(w / 2, h / 2);
		container.addChild(label);

		let isActive = false;
		let isHovered = false;
		let currentAccent = accentColor;

		const redraw = (active: boolean, hovered: boolean, accentOverride?: number) => {
			isActive = active;
			isHovered = hovered;
			if (accentOverride !== undefined) currentAccent = accentOverride;
			bg.clear();
			bg.roundRect(0, 0, w, h, h / 2);
			bg.fill({
				color: hovered ? 0x243e66 : active ? 0x1d3557 : 0x111d33,
				alpha: 0.95,
			});
			bg.stroke({
				color: active || hovered ? currentAccent : 0x2e4a70,
				width: active ? 2 : 1.3,
			});
		};
		redraw(false, false);

		container.on("pointerover", (e) => {
			redraw(isActive, true);
			const text =
				typeof tooltipSource === "function" ? tooltipSource() : tooltipSource;
			this.tooltip.show(e.global.x, e.global.y, text);
		});
		container.on("pointerout", () => {
			redraw(isActive, false);
			this.tooltip.hide();
		});
		container.on("pointertap", () => {
			this.tooltip.hide();
			onClick();
		});

		return { container, bg, label, redraw };
	}

	// ============================================================
	// Interactive Scrollbar & Smooth Scrolling
	// ============================================================

	private buildScrollbar(): void {
		const barX = this.width - 12;
		const barW = 7;

		this.scrollTrack.clear();
		this.scrollTrack.roundRect(barX, this.viewportY + 4, barW, this.viewportHeight - 8, 3.5);
		this.scrollTrack.fill({ color: 0x0f1a2e, alpha: 0.9 });
		this.scrollTrack.eventMode = "static";
		this.scrollTrack.cursor = "pointer";
		this.scrollTrack.removeAllListeners();
		this.scrollTrack.on("pointerdown", (e) => {
			if (this.maxScrollY <= 0) return;
			const relY = e.global.y - this.viewportY;
			const ratio = Math.max(0, Math.min(1, relY / this.viewportHeight));
			this.setTargetScroll(ratio * this.maxScrollY);
		});

		this.scrollThumb.eventMode = "static";
		this.scrollThumb.cursor = "grab";
		this.scrollThumb.removeAllListeners();
		this.scrollThumb.on("pointerdown", (e) => {
			e.stopPropagation();
			this.draggingScrollbar = true;
			this.dragStartPointerY = e.global.y;
			this.dragStartScrollY = this.targetScrollY;
		});
		this.scrollThumb.on("globalpointermove", (e) => {
			if (!this.draggingScrollbar || this.maxScrollY <= 0) return;
			const trackH = this.viewportHeight - 8;
			const thumbH = this.computeThumbHeight(trackH);
			const scrollableTrack = Math.max(1, trackH - thumbH);
			const dy = e.global.y - this.dragStartPointerY;
			this.setTargetScroll(
				this.dragStartScrollY + (dy / scrollableTrack) * this.maxScrollY,
			);
		});
		const endDrag = () => {
			this.draggingScrollbar = false;
		};
		this.scrollThumb.on("pointerup", endDrag);
		this.scrollThumb.on("pointerupoutside", endDrag);

		this.redrawScrollThumb();
	}

	private computeThumbHeight(trackH: number): number {
		if (this.maxScrollY <= 0) return trackH;
		const visibleRatio =
			this.viewportHeight / (this.viewportHeight + this.maxScrollY);
		return Math.max(36, Math.floor(trackH * visibleRatio));
	}

	private redrawScrollThumb(): void {
		const barX = this.width - 12;
		const barW = 7;
		const trackH = this.viewportHeight - 8;
		const thumbH = this.computeThumbHeight(trackH);
		const pct = this.maxScrollY > 0 ? this.scrollY / this.maxScrollY : 0;
		const thumbY = this.viewportY + 4 + pct * (trackH - thumbH);

		this.scrollThumb.clear();
		this.scrollThumb.roundRect(barX, thumbY, barW, thumbH, 3.5);
		this.scrollThumb.fill({
			color: this.maxScrollY > 0 ? 0x3b82f6 : 0x1e3352,
			alpha: 0.9,
		});
	}

	private setTargetScroll(nextY: number): void {
		this.targetScrollY = Math.max(0, Math.min(this.maxScrollY, nextY));
	}

	private scrollToSection(sectionKey: DashboardSectionKey): void {
		this.setTargetScroll(this.sectionOffsets[sectionKey] ?? 0);
	}

	private ensureSelectedCardVisible(): void {
		const card = this.cards[this.selectedIndex];
		if (!card) return;
		const top = card.y - 44;
		const bottom = card.y + card.h + 16;
		if (top < this.targetScrollY) {
			this.setTargetScroll(top);
		} else if (bottom > this.targetScrollY + this.viewportHeight) {
			this.setTargetScroll(bottom - this.viewportHeight);
		}
	}

	private updateActiveAnchorVisuals(): void {
		let activeIdx = 0;
		for (let i = 0; i < this.sections.length; i++) {
			const offset = this.sectionOffsets[this.sections[i].key];
			if (this.scrollY + 60 >= offset) {
				activeIdx = i;
			}
		}
		this.anchorPills.forEach((pill, idx) => {
			pill.redraw(idx === activeIdx, false);
		});
	}

	private updateModePillsVisuals(): void {
		this.modePills.forEach((pill, idx) => {
			pill.redraw(idx === this.selectedCategoryIndex, false);
		});
	}

	private updateSelectionVisuals(): void {
		this.cards.forEach((card, idx) => {
			this.drawCardEntry(card, idx === this.selectedIndex);
		});
		this.prefetchSelectionNeighborhood();
	}

	// ============================================================
	// Dual-Server Health Telemetry & Daemon Controls (:6065 & :6066)
	// ============================================================

	private getLocalOrConfiguredWsHttpBase(): string {
		return SERVER_URL.replace(/^ws(s?):\/\//i, "http$1://").replace(/\/+$/, "");
	}

	private async probeWsServerHealth(): Promise<{
		online: boolean;
		version?: string;
		connections?: number;
		rooms?: number;
		error?: string;
	}> {
		const base = this.getLocalOrConfiguredWsHttpBase();
		const controller = new AbortController();
		const timer = window.setTimeout(() => controller.abort(), 1800);
		try {
			const res = await fetch(`${base}/healthz`, {
				signal: controller.signal,
			});
			if (!res.ok) {
				return { online: false, error: `HTTP ${res.status}` };
			}
			const json = (await res.json()) as {
				ok?: boolean;
				version?: string;
				connections?: number;
				rooms?: number;
			};
			return {
				online: Boolean(json.ok),
				version: json.version,
				connections: json.connections,
				rooms: json.rooms,
			};
		} catch (e) {
			return {
				online: false,
				error: e instanceof Error ? e.message : "Unreachable",
			};
		} finally {
			window.clearTimeout(timer);
		}
	}

	private async refreshServerStatuses(): Promise<void> {
		const electronAPI = window.electronAPI;
		const [wsHealth, aiHealth, ipcStatus] = await Promise.all([
			this.probeWsServerHealth(),
			GenerativeAIManager.checkServerStatus(),
			electronAPI?.getServerStatus
				? electronAPI.getServerStatus().catch(() => null)
				: Promise.resolve(null),
		]);

		this.wsOnline = wsHealth.online || Boolean(ipcStatus?.wsServer);
		this.wsManaged = Boolean(ipcStatus?.wsManaged);
		this.wsDetail = this.wsOnline
			? `ONLINE (v${wsHealth.version ?? APP_VERSION}${typeof wsHealth.connections === "number" ? `, ${wsHealth.connections} clients` : ""}${this.wsManaged ? ", Tray-Managed" : ""})`
			: `OFFLINE (${wsHealth.error || "Port 6065 closed"})`;

		this.aiOnline = aiHealth.online || Boolean(ipcStatus?.aiProxy);
		this.aiManaged = Boolean(ipcStatus?.aiManaged);
		const aiMode = aiHealth.openaiConfigured ? "OpenAI Live" : "Mock Fallback";
		this.aiDetail = this.aiOnline
			? `ONLINE (${aiMode}${this.aiManaged ? ", Tray-Managed" : ""})`
			: `OFFLINE (${aiHealth.error || "Port 6066 closed"})`;

		this.updateServerPillsVisuals();
	}

	private updateServerPillsVisuals(): void {
		if (this.wsServerPill) {
			this.wsServerPill.label.text = this.wsOnline
				? "● WS :6065 ONLINE"
				: "○ WS :6065 OFFLINE";
			this.wsServerPill.label.style.fill = this.wsOnline
				? "#66ffcc"
				: "#ffcc66";
			this.wsServerPill.redraw(
				this.wsOnline,
				false,
				this.wsOnline ? 0x10b981 : 0xd97706,
			);
		}
		if (this.aiServerPill) {
			this.aiServerPill.label.text = this.aiOnline
				? "● AI :6066 ONLINE"
				: "○ AI :6066 OFFLINE";
			this.aiServerPill.label.style.fill = this.aiOnline
				? "#66ffcc"
				: "#ffcc66";
			this.aiServerPill.redraw(
				this.aiOnline,
				false,
				this.aiOnline ? 0x10b981 : 0xd97706,
			);
		}
	}

	private async toggleOrCheckWsServer(): Promise<void> {
		this.playSelectSound();
		await this.refreshServerStatuses();
		const electronAPI = window.electronAPI;

		if (this.wsOnline) {
			ToastManager.showInfo(`Game WS Server (:6065) — ${this.wsDetail}`);
			if (electronAPI?.stopWsServer && this.wsManaged) {
				if (confirm(`Game WS Server is running (${this.wsDetail}). Stop Electron-managed daemon?`)) {
					await electronAPI.stopWsServer();
					ToastManager.showInfo("Stopped Game WS Server (:6065).");
					await this.refreshServerStatuses();
				}
			}
		} else {
			ToastManager.showInfo(`Game WS Server Offline (${this.wsDetail})`);
			if (electronAPI?.startWsServer) {
				if (confirm("Game WS Server (:6065) is offline. Start it now via Electron System Tray daemon?")) {
					const ok = await electronAPI.startWsServer();
					ToastManager.showInfo(
						ok
							? "Game WS Server (:6065) starting at BelowNormal priority..."
							: "Failed to start Game WS Server.",
					);
					window.setTimeout(() => void this.refreshServerStatuses(), 800);
				}
			} else {
				alert(
					"Game WS Server (:6065) is offline.\n\nStart locally via:\n  start.bat --server\nor:\n  .\\scripts\\local-ops.ps1 -Action start -Target ws\nor launch the Electron desktop shell for System Tray controls.",
				);
			}
		}
	}

	private async toggleOrCheckAiServer(): Promise<void> {
		this.playSelectSound();
		await this.refreshServerStatuses();
		const electronAPI = window.electronAPI;

		if (this.aiOnline) {
			ToastManager.showInfo(`AI Proxy (:6066) — ${this.aiDetail}`);
			if (electronAPI?.stopAiServer && this.aiManaged) {
				if (confirm(`AI Proxy is running (${this.aiDetail}). Stop Electron-managed daemon?`)) {
					await electronAPI.stopAiServer();
					ToastManager.showInfo("Stopped AI Proxy (:6066).");
					await this.refreshServerStatuses();
				}
			}
		} else {
			ToastManager.showInfo(`AI Proxy Offline (${this.aiDetail})`);
			if (electronAPI?.startAiServer) {
				if (confirm("AI Proxy (:6066) is offline. Start it now via Electron System Tray daemon?")) {
					const ok = await electronAPI.startAiServer();
					ToastManager.showInfo(
						ok
							? "AI Proxy (:6066) starting at BelowNormal priority..."
							: "Failed to start AI Proxy.",
					);
					window.setTimeout(() => void this.refreshServerStatuses(), 800);
				}
			} else {
				alert(
					"AI Proxy (:6066) is offline.\n\nStart locally via:\n  start.bat --ai-proxy\nor:\n  .\\scripts\\local-ops.ps1 -Action start -Target ai\nor launch the Electron desktop shell for System Tray controls.",
				);
			}
		}
	}

	// ============================================================
	// Input Handling (Grid Nav + Smooth Scroll + Section Shortcuts)
	// ============================================================

	private handleInput(dt: number): void {
		if (InputManager.isKeyPressed(Key.V)) {
			this.visualizer?.toggleMode();
			this.playMoveSound();
		}

		// Direct section quick-jump keys (1–5) & Q/E section stepping
		if (InputManager.isKeyPressed(Key.Num1)) this.scrollToSection("core");
		if (InputManager.isKeyPressed(Key.Num2)) this.scrollToSection("combat");
		if (InputManager.isKeyPressed(Key.Num3)) this.scrollToSection("editors");
		if (InputManager.isKeyPressed(Key.Num4)) this.scrollToSection("community");
		if (InputManager.isKeyPressed(Key.Num5)) this.scrollToSection("system");

		if (InputManager.isKeyPressed(Key.Q)) {
			this.stepSectionScroll(-1);
		} else if (InputManager.isKeyPressed(Key.E)) {
			this.stepSectionScroll(1);
		}

		if (InputManager.isKeyPressed(Key.PageDown)) {
			this.setTargetScroll(this.targetScrollY + this.viewportHeight * 0.8);
		} else if (InputManager.isKeyPressed(Key.PageUp)) {
			this.setTargetScroll(this.targetScrollY - this.viewportHeight * 0.8);
		} else if (InputManager.isKeyPressed(Key.Home)) {
			this.setTargetScroll(0);
		} else if (InputManager.isKeyPressed(Key.End)) {
			this.setTargetScroll(this.maxScrollY);
		}

		if (InputManager.isUpPressed()) {
			this.moveSelection(-this.gridCols);
		} else if (InputManager.isDownPressed()) {
			this.moveSelection(this.gridCols);
		} else if (InputManager.isLeftPressed()) {
			this.moveSelection(-1);
		} else if (InputManager.isRightPressed()) {
			this.moveSelection(1);
		}

		if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
			this.selectCurrentItem();
		}

		// Smooth exponential scroll interpolation
		if (Math.abs(this.targetScrollY - this.scrollY) > 0.4) {
			const alpha = Math.min(1, dt * 14);
			this.scrollY += (this.targetScrollY - this.scrollY) * alpha;
			this.scrollContent.y = -this.scrollY;
			this.redrawScrollThumb();
			this.updateActiveAnchorVisuals();
		} else if (this.scrollY !== this.targetScrollY) {
			this.scrollY = this.targetScrollY;
			this.scrollContent.y = -this.scrollY;
			this.redrawScrollThumb();
			this.updateActiveAnchorVisuals();
		}
	}

	private stepSectionScroll(delta: number): void {
		let currentIdx = 0;
		for (let i = 0; i < this.sections.length; i++) {
			if (this.targetScrollY + 40 >= this.sectionOffsets[this.sections[i].key]) {
				currentIdx = i;
			}
		}
		const nextIdx =
			(currentIdx + delta + this.sections.length) % this.sections.length;
		this.scrollToSection(this.sections[nextIdx].key);
		this.playMoveSound();
	}

	private moveSelection(delta: number): void {
		if (this.cards.length === 0) return;
		const next = Math.max(
			0,
			Math.min(this.cards.length - 1, this.selectedIndex + delta),
		);
		if (next !== this.selectedIndex) {
			this.selectedIndex = next;
			this.playMoveSound();
			this.updateSelectionVisuals();
			this.ensureSelectedCardVisible();
		}
	}

	private selectCurrentItem(): void {
		const card = this.cards[this.selectedIndex];
		if (!card) return;
		this.tooltip.hide();
		this.playSelectSound();
		void card.item.action();
	}

	private scheduleScenePrefetch(): void {
		const prefetch = () => {
			void import("./CustomGameEditorScene");
			void import("./WorldScene");
			void import("./LobbyScene");
			void import("./EngineScene");
			void import("./SettingsScene");
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
		if (this.cards.length === 0) return;
		const indices = [
			this.selectedIndex,
			Math.min(this.cards.length - 1, this.selectedIndex + 1),
			Math.max(0, this.selectedIndex - 1),
		];
		for (const idx of indices) {
			this.cards[idx]?.item.prefetch?.();
		}
	}

	// ============================================================
	// Scene Launchers
	// ============================================================

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
		SceneTransition.pushWithFade(this.app, new PuzzleScene(puzzleConfig));
	}

	private startCustomGame(): void {
		const data = localStorage.getItem("custom-game-type");
		let gameType = GameTypes.CLASSIC;
		if (data) {
			try {
				gameType = GameType.fromJSON(data);
			} catch (e) {
				console.error("Failed to load custom game type", e);
			}
		}
		const puzzleConfig: PuzzleSceneConfig = {
			name: "puzzle",
			app: this.app,
			camera: this.camera ?? undefined,
			gameType,
			gameMode: this.gameModes[this.selectedCategoryIndex],
			startLevel: 1,
		};
		SceneTransition.pushWithFade(this.app, new PuzzleScene(puzzleConfig));
	}

	private findLatestReplayKey(): string | null {
		let lastKey: string | null = null;
		let lastTime = 0;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith("replay_")) {
				const time = parseInt(key.split("_")[1] || "0", 10);
				if (time > lastTime) {
					lastTime = time;
					lastKey = key;
				}
			}
		}
		return lastKey;
	}

	private playLastReplay(): void {
		const lastKey = this.findLatestReplayKey();
		if (!lastKey) {
			ToastManager.showInfo("No recorded puzzle replays found yet — play a Puzzle match first!");
			return;
		}
		const data = localStorage.getItem(lastKey)!;
		SceneTransition.pushWithFade(
			this.app,
			new PuzzleScene({
				name: "puzzle-replay",
				app: this.app,
				camera: this.camera ?? undefined,
				replayData: data,
			}),
		);
	}

	private shareLastReplay(): void {
		const lastKey = this.findLatestReplayKey();
		if (!lastKey) {
			ToastManager.showInfo("No recorded puzzle replays found to share yet!");
			return;
		}
		const data = localStorage.getItem(lastKey)!;
		const b64 = BobNet.toBase64GZippedGSON(JSON.parse(data));
		const url = `${window.location.origin}${window.location.pathname}#replay=${b64}`;
		navigator.clipboard
			.writeText(url)
			.then(() => ToastManager.showInfo("Compressed replay URL copied to clipboard!"))
			.catch(() => {
				prompt("Copy shareable replay URL:", url);
			});
	}

	private async openWebGPUDemo(): Promise<void> {
		const { WebGPUDemoScene } = await import("./WebGPUDemoScene");
		SceneTransition.pushWithFade(
			this.app,
			new WebGPUDemoScene({
				name: "webgpu-demo",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openLobby(): Promise<void> {
		const { LobbyScene } = await import("./LobbyScene");
		SceneTransition.pushWithFade(
			this.app,
			new LobbyScene({
				name: "lobby",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openLogin(): Promise<void> {
		const { LoginScene } = await import("./LoginScene");
		SceneTransition.pushWithFade(
			this.app,
			new LoginScene({
				name: "login",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openEngineDemo(): Promise<void> {
		const { EngineDemoScene } = await import("./EngineDemoScene");
		SceneTransition.pushWithFade(
			this.app,
			new EngineDemoScene({
				name: "engine-demo",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openTournament(): Promise<void> {
		const { TournamentScene } = await import("./TournamentScene");
		SceneTransition.pushWithFade(
			this.app,
			new TournamentScene({
				name: "tournament",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openHelp(): Promise<void> {
		const { HelpScene } = await import("./HelpScene");
		SceneTransition.pushWithFade(
			this.app,
			new HelpScene({
				name: "help",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openSpriteEditor(): Promise<void> {
		const { SpriteEditorScene } = await import("./SpriteEditorScene");
		SceneTransition.pushWithFade(
			this.app,
			new SpriteEditorScene({
				name: "sprite-editor",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openParty(): Promise<void> {
		const { PartyScene } = await import("./PartyScene");
		SceneTransition.pushWithFade(
			this.app,
			new PartyScene({
				name: "party",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openEventEditor(): Promise<void> {
		const { EventSheetEditorScene } = await import("./EventSheetEditorScene");
		SceneTransition.pushWithFade(
			this.app,
			new EventSheetEditorScene({
				name: "event-editor",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openCrafting(): Promise<void> {
		const { CraftingScene } = await import("./CraftingScene");
		SceneTransition.pushWithFade(
			this.app,
			new CraftingScene({
				name: "crafting",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openSaveSlots(): Promise<void> {
		const { SaveSlotScene } = await import("./SaveSlotScene");
		SceneTransition.pushWithFade(
			this.app,
			new SaveSlotScene({
				name: "save-slots",
				app: this.app,
				camera: this.camera ?? undefined,
				mode: "save",
			}),
		);
	}

	private async openBestiary(): Promise<void> {
		const { BestiaryScene } = await import("./BestiaryScene");
		SceneTransition.pushWithFade(
			this.app,
			new BestiaryScene({
				name: "bestiary",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openJournal(): Promise<void> {
		const { JournalScene } = await import("./JournalScene");
		SceneTransition.pushWithFade(
			this.app,
			new JournalScene({
				name: "journal",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openWorldMap(): Promise<void> {
		const { WorldMapScene } = await import("./WorldMapScene");
		SceneTransition.pushWithFade(
			this.app,
			new WorldMapScene({
				name: "world-map",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openFishing(): Promise<void> {
		const { FishingScene } = await import("./FishingScene");
		SceneTransition.pushWithFade(
			this.app,
			new FishingScene({
				name: "fishing",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openArena(): Promise<void> {
		const { ArenaScene } = await import("./ArenaScene");
		SceneTransition.pushWithFade(
			this.app,
			new ArenaScene({
				name: "arena",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openLeaderboard(): Promise<void> {
		const { LeaderboardScene } = await import("./LeaderboardScene");
		SceneTransition.pushWithFade(
			this.app,
			new LeaderboardScene({
				name: "leaderboard",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openTutorial(): Promise<void> {
		const { TutorialScene } = await import("./TutorialScene");
		SceneTransition.pushWithFade(
			this.app,
			new TutorialScene({
				name: "tutorial",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openBossRush(): Promise<void> {
		const { BossRushScene } = await import("./BossRushScene");
		SceneTransition.pushWithFade(
			this.app,
			new BossRushScene({
				name: "boss-rush",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
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
		SceneTransition.pushWithFade(
			this.app,
			new NDDemoScene({
				name: "nd-demo",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openWorld(): Promise<void> {
		const { WorldScene } = await import("./WorldScene");
		SceneTransition.pushWithFade(
			this.app,
			new WorldScene({
				name: "world",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openCustomEditor(): Promise<void> {
		const { CustomGameEditorScene } = await import("./CustomGameEditorScene");
		SceneTransition.pushWithFade(
			this.app,
			new CustomGameEditorScene({
				name: "custom-editor",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openWorldEditor(): Promise<void> {
		const { WorldEditorScene } = await import("./WorldEditorScene");
		SceneTransition.pushWithFade(
			this.app,
			new WorldEditorScene({
				name: "world-editor",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openRankings(): Promise<void> {
		const { RankingsScene } = await import("./RankingsScene");
		SceneTransition.pushWithFade(
			this.app,
			new RankingsScene({
				name: "rankings",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openSettings(): Promise<void> {
		if (this.menuConfig.onOptions) {
			this.menuConfig.onOptions();
			return;
		}
		const { SettingsScene } = await import("./SettingsScene");
		SceneTransition.pushWithFade(
			this.app,
			new SettingsScene({
				name: "settings",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openHighScores(): Promise<void> {
		const { HighScoresScene } = await import("./HighScoresScene");
		SceneTransition.pushWithFade(
			this.app,
			new HighScoresScene({
				name: "high-scores",
				app: this.app,
				camera: this.camera ?? undefined,
				initialMode: this.gameModes[this.selectedCategoryIndex],
			}),
		);
	}

	private async openAchievements(): Promise<void> {
		const { AchievementsScene } = await import("./AchievementsScene");
		SceneTransition.pushWithFade(
			this.app,
			new AchievementsScene({
				name: "achievements",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openGameSequenceEditor(): Promise<void> {
		const { GameSequenceEditorScene } = await import(
			"./GameSequenceEditorScene"
		);
		SceneTransition.pushWithFade(
			this.app,
			new GameSequenceEditorScene({
				name: "game-sequence-editor",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openDemoBattle(): Promise<void> {
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
		enemy.level = 5;
		enemy.hp = 90;
		enemy.maxHp = 90;
		enemy.atk = 17;
		enemy.def = 4;

		SceneTransition.pushWithFade(
			this.app,
			new BattleScene({
				name: "battle",
				app: this.app,
				camera: this.camera ?? undefined,
				player,
				enemy,
			}),
		);
	}

	private async openInventory(): Promise<void> {
		const { InventoryScene } = await import("./InventoryScene");
		SceneTransition.pushWithFade(
			this.app,
			new InventoryScene({
				name: "inventory",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openShop(): Promise<void> {
		const { ShopScene } = await import("./ShopScene");
		SceneTransition.pushWithFade(
			this.app,
			new ShopScene({
				name: "shop",
				app: this.app,
				camera: this.camera ?? undefined,
				gold: 250,
				inventory: [],
			}),
		);
	}

	private async openSkillTree(): Promise<void> {
		const { SkillTreeScene } = await import("./SkillTreeScene");
		SceneTransition.pushWithFade(
			this.app,
			new SkillTreeScene({
				name: "skill-tree",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openQuestLog(): Promise<void> {
		const { QuestLogScene } = await import("./QuestLogScene");
		SceneTransition.pushWithFade(
			this.app,
			new QuestLogScene({
				name: "quest-log",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	private async openVisualizer(): Promise<void> {
		const { VisualizerScene } = await import("./VisualizerScene");
		SceneTransition.pushWithFade(
			this.app,
			new VisualizerScene({
				name: "visualizer",
				app: this.app,
				camera: this.camera ?? undefined,
			}),
		);
	}

	// ============================================================
	// Audio, Background, Visualizer & Particles
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

	private lerpColor(color1: number, color2: number, t: number): number {
		const r1 = (color1 >> 16) & 0xff;
		const g1 = (color1 >> 8) & 0xff;
		const b1 = color1 & 0xff;
		const r2 = (color2 >> 16) & 0xff;
		const g2 = (color2 >> 8) & 0xff;
		const b2 = color2 & 0xff;
		return (
			(Math.round(r1 + (r2 - r1) * t) << 16) |
			(Math.round(g1 + (g2 - g1) * t) << 8) |
			Math.round(b1 + (b2 - b1) * t)
		);
	}

	private createBackground(): void {
		this.background = new Graphics();
		this.drawBackground();
		this.container.addChild(this.background);
	}

	private drawBackground(): void {
		this.background.clear();
		const steps = 20;
		for (let i = 0; i < steps; i++) {
			const color = this.lerpColor(0x070b16, 0x15223d, i / steps);
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
		for (let i = 0; i < 45; i++) {
			const p = new Particle(this.width, this.height);
			this.particleContainer.addChild(p.graphics);
			this.particles.push(p);
		}
	}

	private createVisualizer(): void {
		this.visualizer = new FFTVisualizer(this.width, 90);
		this.visualizer.container.position.set(0, this.height - 118);
		this.visualizer.container.alpha = 0.35;
		this.container.addChild(this.visualizer.container);
	}

	public onUpdate(dt: number): void {
		for (const p of this.particles) {
			p.update(dt, this.height);
		}
		this.visualizer?.update();
		this.titleBounce += dt * 2;
		if (this.titleText) {
			this.titleText.scale.set(1 + Math.sin(this.titleBounce * 0.6) * 0.012);
		}
		this.handleInput(dt);
	}

	public onResize(width: number, height: number): void {
		super.onResize(width, height);
		this.drawBackground();
		this.visualizer?.resize(width, 90);
		if (this.visualizer) {
			this.visualizer.container.y = height - 118;
		}
		this.tooltip?.resize(width, height);
		this.buildLayout();
	}
}

// ============================================================
// Ambient Background Particle
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
		this.speed = 18 + Math.random() * 36;
		this.size = 1.8 + Math.random() * 3.5;
		this.alpha = 0.15 + Math.random() * 0.32;
		this.graphics = new Graphics();
		this.graphics.circle(0, 0, this.size);
		this.graphics.fill({ color: 0x4a8aff, alpha: this.alpha });
		this.graphics.position.set(this.x, this.y);
	}

	public update(dt: number, screenHeight: number): void {
		this.y -= this.speed * dt;
		if (this.y < -this.size) {
			this.y = screenHeight + this.size;
			this.x = Math.random() * this.screenWidth;
		}
		this.x += Math.sin(this.y * 0.01) * 0.4;
		this.graphics.position.set(this.x, this.y);
	}
}
