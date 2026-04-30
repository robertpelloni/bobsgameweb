import { EventEmitter } from "eventemitter3";
import { type Application, Container, type Filter, type Ticker } from "pixi.js";
import { GameType } from "../shared/puzzle/GameType";
import { AudioManager } from "./audio/AudioManager";
import { AchievementManager } from "./data/AchievementManager";
import { GameMode } from "./data/HighScoreManager";
import { DebugConsole } from "./engine/debug/DebugConsole";
import { Camera } from "./graphics/Camera";
import { PostProcessing } from "./graphics/Filters";
import { InputManager } from "./input/InputManager";
import { GlobalSettings } from "./engine/shared/GlobalSettings";
import { BobNet } from "./puzzle/BobNet";
import { PuzzleScene, type PuzzleSceneConfig } from "./puzzle/PuzzleScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { StateManager } from "./state/StateManager";
import { ToastManager } from "./ui/ToastManager";

export interface GameConfig {
	skipMenu?: boolean;
}

export interface GameEvents {
	"scene:change": (sceneName: string) => void;
	"game:pause": () => void;
	"game:resume": () => void;
}

export class Game extends EventEmitter<GameEvents> {
	private app: Application;
	private config: GameConfig;
	private isRunning = false;
	private isPaused = false;

	private _camera: Camera;
	private worldContainer: Container;
	private crtFilter: Filter | null = null;
	private mainMenuScene: MainMenuScene | null = null;
	private playTimeAccumulator = 0;
	private debugConsole: DebugConsole;

	constructor(app: Application, config: GameConfig = {}) {
		super();
		this.app = app;
		this.config = config;

		this.worldContainer = new Container();
		this.app.stage.addChild(this.worldContainer);

		// Initialize Post-processing
		this.crtFilter = PostProcessing.createCRTFilter();
		this.worldContainer.filters = [this.crtFilter];

		this._camera = new Camera(this.worldContainer, {
			viewportWidth: app.screen.width,
			viewportHeight: app.screen.height,
			defaultZoom: 1.0,
			minZoom: 0.5,
			maxZoom: 4.0,
		});

		this.debugConsole = new DebugConsole(app.screen.width);
		this.app.stage.addChild(this.debugConsole.getContainer());
	}

	private async loadAudioAssets(): Promise<void> {
		const soundAssets = [
			{ name: "menu_move", src: "/audio/sfx/menu_move.wav" },
			{ name: "menu_select", src: "/audio/sfx/menu_select.wav" },
			{ name: "pause", src: "/audio/sfx/pause.wav" },
			{ name: "piece_move", src: "/audio/sfx/piece_move.wav" },
			{ name: "piece_rotate", src: "/audio/sfx/piece_rotate.wav" },
			{ name: "piece_drop", src: "/audio/sfx/piece_drop.wav" },
			{ name: "piece_lock", src: "/audio/sfx/piece_lock.wav" },
			{ name: "line_clear", src: "/audio/sfx/line_clear.wav" },
			{ name: "tetris", src: "/audio/sfx/tetris.wav" },
			{ name: "level_up", src: "/audio/sfx/level_up.wav" },
			{ name: "game_over", src: "/audio/sfx/game_over.wav" },
		];

		const musicAssets = [
			{ name: "menu_music", src: "/audio/music/menu.wav" },
			{ name: "game_music", src: "/audio/music/game.wav" },
		];

		for (const asset of [...soundAssets, ...musicAssets]) {
			try {
				await AudioManager.load(asset.name, asset.src);
			} catch (e) {
				console.warn(`Audio asset not found: ${asset.src}`);
			}
		}
	}

	async init(): Promise<void> {
		console.log("Game initializing...");
		InputManager.init();
		AchievementManager.init();
		ToastManager.init(this.app);

		this.app.ticker.add(this.update, this);
		this.app.ticker.stop();

		await this.loadAudioAssets();

		if (!this.config.skipMenu) {
			await this.createMainMenuScene();

			const hash = window.location.hash;
			if (hash.startsWith("#play=")) {
				console.log("[Game] Intercepted deep link for custom game.");
				try {
					const b64 = hash.replace("#play=", "");
					const jsonObj = BobNet.fromBase64GZippedGSON(b64);
					if (jsonObj) {
						const gameType = new GameType();
						Object.assign(gameType, jsonObj);

						const puzzleConfig: PuzzleSceneConfig = {
							name: "puzzle",
							app: this.app,
							camera: this._camera,
							gameType,
							gameMode: gameType.gameMode as any,
							startLevel: 1,
						};
						const puzzleScene = new PuzzleScene(puzzleConfig);
						StateManager.pushSync(this.mainMenuScene!); // Put menu in background
						StateManager.pushSync(puzzleScene);
					} else {
						throw new Error("Failed to parse custom game JSON");
					}
				} catch (e) {
					console.error("[Game] Deep link error:", e);
					this.showMainMenu();
				}
			} else if (hash.startsWith("#replay=")) {
				console.log("[Game] Intercepted deep link for replay.");
				try {
					const b64 = hash.replace("#replay=", "");
					const jsonObj = BobNet.fromBase64GZippedGSON(b64);
					if (jsonObj) {
						const puzzleConfig: PuzzleSceneConfig = {
							name: "puzzle-replay",
							app: this.app,
							camera: this._camera,
							replayData: JSON.stringify(jsonObj),
						};
						const puzzleScene = new PuzzleScene(puzzleConfig);
						StateManager.pushSync(this.mainMenuScene!);
						StateManager.pushSync(puzzleScene);
					} else {
						throw new Error("Failed to parse replay JSON");
					}
				} catch (e) {
					console.error("[Game] Deep link error:", e);
					this.showMainMenu();
				}
			} else {
				this.showMainMenu();
			}
		}

		this.isRunning = true;
		console.log("Game initialized");
	}

	private async createMainMenuScene(): Promise<void> {
		if (this.mainMenuScene !== null) {
			return;
		}
		this.mainMenuScene = new MainMenuScene({
			name: "main-menu",
			app: this.app,
			camera: this._camera,
		});
		await this.mainMenuScene.create();
	}

	private splashShown = false;

	private showMainMenu(): void {
		if (this.mainMenuScene) {
			StateManager.push(this.mainMenuScene);
			this.isPaused = false;
			this.emit("game:resume");

			// Show splash screen only on first load
			if (!this.splashShown) {
				this.splashShown = true;
				import("./scenes/SplashScene").then(({ SplashScene }) => {
					const splash = new SplashScene({
						name: "splash",
						app: this.app,
						camera: this._camera,
					});
					splash.create().then(() => StateManager.push(splash));
				});

				// Auto-login if enabled
				this.tryAutoLogin();
			}
		}
	}

	private autoLoggedIn = false;

	private tryAutoLogin(): void {
		if (this.autoLoggedIn) return;
		const settings = new GlobalSettings();
		if (!settings.get("autoLogin") || !settings.get("username")) return;

		const username = String(settings.get("username"));
		console.log(`Auto-login as ${username}...`);

		import("./scenes/LoginScene").then(({ LoginScene }) => {
			const login = new LoginScene({
				name: "login-auto",
				app: this.app,
				camera: this._camera,
				onLogin: (name, socket) => {
					console.log(`Auto-logged in as ${name}`);
					this.autoLoggedIn = true;
					// Keep socket alive for online features
					(this as any)._onlineSocket = socket;
				},
			});
			login.create().then(() => {
				// Auto-submit the login form
				setTimeout(() => {
					(login as any).attemptLogin?.();
				}, 2000);
			});
		});
	}

	start(): void {
		// Always start the ticker — init() may have already set isRunning=true
		// but the ticker was stopped during init and needs to be explicitly started.
		console.log("Game starting...");
		this.isRunning = true;
		this.app.ticker.start();
	}

	stop(): void {
		if (!this.isRunning) return;
		console.log("Game stopping...");
		this.isRunning = false;
		this.app.ticker.stop();
	}

	pause(): void {
		if (this.isPaused) return;
		this.isPaused = true;
		this.emit("game:pause");
	}

	resume(): void {
		if (!this.isPaused) return;
		this.isPaused = false;
		this.emit("game:resume");
	}

	private update(ticker: Ticker): void {
		if (this.isPaused) return;
		const dt = ticker.deltaMS / 1000;

		// Track total play time for achievements in whole-second batches
		this.playTimeAccumulator += dt;
		if (this.playTimeAccumulator >= 1) {
			const wholeSeconds = Math.floor(this.playTimeAccumulator);
			this.playTimeAccumulator -= wholeSeconds;
			AchievementManager.incrementStat("totalPlayTimeSeconds", wholeSeconds);
		}

		// Update toast notifications
		ToastManager.update(dt);

		// Update shaders
		if (this.crtFilter) {
			if (this.crtFilter.resources?.uTime)
				(this.crtFilter.resources.uTime as any).value += dt;
		}

		InputManager.update();
		StateManager.update(dt);

		this._camera.update(ticker.deltaMS);

		// Debug console
		this.debugConsole.update(ticker.deltaMS);
		if ((InputManager as any).isKeyPressed("Backquote")) {
			this.debugConsole.toggle();
		}
		if (this.debugConsole.isVisible()) {
			this.debugConsole.updateStats({
				scene: "active",
			});
		}
	}

	resize(width: number, height: number): void {
		this.app.renderer.resize(width, height);
		this._camera.resize(width, height);
		StateManager.resize(width, height);
		this.debugConsole.resize(width);
	}

	get width(): number {
		return this.app.screen.width;
	}

	get height(): number {
		return this.app.screen.height;
	}

	get stage(): Container {
		return this.app.stage;
	}

	get camera(): Camera {
		return this._camera;
	}

	get world(): Container {
		return this.worldContainer;
	}

	get pixi(): Application {
		return this.app;
	}
}
