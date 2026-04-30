/**
 * LoginScene — player authentication for online features.
 *
 * Handles:
 * 1. Username entry (no password required for demo)
 * 2. Optional password auth
 * 3. Auto-login on return (stored in GlobalSettings)
 * 4. Connects to Socket.io server and sets player identity
 *
 * After login, the player's name and session are available to all online features:
 * lobby, chat, leaderboard, tournaments, multiplayer.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { io, type Socket } from "socket.io-client";
import { SERVER_URL } from "../../shared/Config";
import {
	getPlayerDisplayName,
	setPlayerDisplayName,
} from "../data/AchievementIdentity";
import { GlobalSettings } from "../engine/shared/GlobalSettings";
import { InputManager } from "../input/InputManager";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";

export interface LoginSceneConfig extends SceneConfig {
	onLogin?: (username: string, socket: Socket) => void;
}

export class LoginScene extends Scene {
	private loginConfig: LoginSceneConfig;
	private settings: GlobalSettings;

	// UI elements
	private background!: Graphics;
	private titleText!: Text;
	private statusText!: Text;
	private usernameInput!: HTMLInputElement;
	private passwordInput!: HTMLInputElement;
	private formContainer!: HTMLDivElement;
	private socket: Socket | null = null;

	constructor(config: LoginSceneConfig) {
		super(config);
		this.loginConfig = config;
		this.settings = new GlobalSettings();
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createForm();
		this.createStatus("Enter your name to go online");

		// Auto-fill from saved settings
		const savedName = getPlayerDisplayName();
		if (savedName && this.usernameInput) {
			this.usernameInput.value = savedName;
		}
	}

	private createBackground(): void {
		this.background = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			const r = Math.floor(5 + ratio * 15);
			const g = Math.floor(5 + ratio * 15);
			const b = Math.floor(15 + ratio * 30);
			this.background.rect(
				0,
				(this.height / 20) * i,
				this.width,
				this.height / 20 + 1,
			);
			this.background.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(this.background);

		// Accent border
		const border = new Graphics();
		border.roundRect(this.width / 2 - 200, 80, 400, 350, 12);
		border.fill({ color: 0x0a0a2a, alpha: 0.9 });
		border.stroke({ color: 0x4488ff, width: 2 });
		this.container.addChild(border);
	}

	private createTitle(): void {
		const titleStyle = new TextStyle({
			fontFamily: "Arial Black, Arial, sans-serif",
			fontSize: 32,
			fill: 0xffffff,
			fontWeight: "bold",
			letterSpacing: 2,
		});
		this.titleText = new Text({ text: "GO ONLINE", style: titleStyle });
		this.titleText.anchor.set(0.5);
		this.titleText.position.set(this.width / 2, 100);
		this.container.addChild(this.titleText);

		const subtitleStyle = new TextStyle({ fill: 0x6688aa, fontSize: 14 });
		const subtitle = new Text({
			text: "Enter your name to access multiplayer, leaderboards, and more",
			style: subtitleStyle,
		});
		subtitle.anchor.set(0.5);
		subtitle.position.set(this.width / 2, 135);
		this.container.addChild(subtitle);
	}

	private createForm(): void {
		this.formContainer = document.createElement("div");
		this.formContainer.style.cssText = `
			position: absolute;
			left: 50%;
			top: 170px;
			transform: translateX(-50%);
			display: flex;
			flex-direction: column;
			gap: 12px;
			width: 300px;
		`;

		// Username label
		const nameLabel = document.createElement("label");
		nameLabel.textContent = "Display Name";
		nameLabel.style.cssText =
			"color: #88aacc; font-size: 12px; font-family: Arial, sans-serif;";
		this.formContainer.appendChild(nameLabel);

		// Username input
		this.usernameInput = document.createElement("input");
		this.usernameInput.type = "text";
		this.usernameInput.placeholder = "Your name...";
		this.usernameInput.maxLength = 32;
		this.usernameInput.style.cssText = `
			padding: 10px 14px;
			font-size: 18px;
			border: 2px solid #334466;
			border-radius: 8px;
			background: #0a0a2a;
			color: #ffffff;
			outline: none;
			font-family: Arial, sans-serif;
		`;
		this.usernameInput.addEventListener("focus", () => {
			this.usernameInput.style.borderColor = "#4488ff";
		});
		this.usernameInput.addEventListener("blur", () => {
			this.usernameInput.style.borderColor = "#334466";
		});
		this.formContainer.appendChild(this.usernameInput);

		// Password label (optional)
		const passLabel = document.createElement("label");
		passLabel.textContent = "Password (optional)";
		passLabel.style.cssText =
			"color: #556677; font-size: 11px; font-family: Arial, sans-serif; margin-top: 4px;";
		this.formContainer.appendChild(passLabel);

		// Password input
		this.passwordInput = document.createElement("input");
		this.passwordInput.type = "password";
		this.passwordInput.placeholder = "Leave blank for guest";
		this.passwordInput.style.cssText = `
			padding: 8px 14px;
			font-size: 14px;
			border: 2px solid #223344;
			border-radius: 8px;
			background: #0a0a1a;
			color: #aaaacc;
			outline: none;
			font-family: Arial, sans-serif;
		`;
		this.formContainer.appendChild(this.passwordInput);

		// Connect button
		const connectBtn = document.createElement("button");
		connectBtn.textContent = "⚡ Connect";
		connectBtn.style.cssText = `
			padding: 12px;
			font-size: 18px;
			font-weight: bold;
			background: linear-gradient(135deg, #1a3a6a, #2a5a9a);
			color: white;
			border: 2px solid #4488ff;
			border-radius: 8px;
			cursor: pointer;
			margin-top: 8px;
			font-family: Arial, sans-serif;
		`;
		connectBtn.addEventListener("mouseenter", () => {
			connectBtn.style.background = "linear-gradient(135deg, #2a4a7a, #3a6aaa)";
		});
		connectBtn.addEventListener("mouseleave", () => {
			connectBtn.style.background = "linear-gradient(135deg, #1a3a6a, #2a5a9a)";
		});
		connectBtn.addEventListener("click", () => this.attemptLogin());
		this.formContainer.appendChild(connectBtn);

		// Back button
		const backBtn = document.createElement("button");
		backBtn.textContent = "← Back to Menu";
		backBtn.style.cssText = `
			padding: 8px;
			font-size: 14px;
			background: transparent;
			color: #556677;
			border: 1px solid #334455;
			border-radius: 6px;
			cursor: pointer;
			font-family: Arial, sans-serif;
		`;
		backBtn.addEventListener("click", () => this.goBack());
		this.formContainer.appendChild(backBtn);

		// Auto-login checkbox
		const autoRow = document.createElement("div");
		autoRow.style.cssText =
			"display: flex; align-items: center; gap: 8px; margin-top: 4px;";
		const autoCheck = document.createElement("input");
		autoCheck.type = "checkbox";
		autoCheck.id = "autoLogin";
		autoCheck.checked = this.settings.get("autoLogin");
		autoCheck.style.cursor = "pointer";
		const autoLabel = document.createElement("label");
		autoLabel.htmlFor = "autoLogin";
		autoLabel.textContent = "Auto-login on return";
		autoLabel.style.cssText =
			"color: #445566; font-size: 12px; cursor: pointer;";
		autoRow.appendChild(autoCheck);
		autoRow.appendChild(autoLabel);
		this.formContainer.appendChild(autoRow);

		document.body.appendChild(this.formContainer);

		// Enter key to login
		this.usernameInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this.attemptLogin();
		});
		this.passwordInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this.attemptLogin();
		});
	}

	private createStatus(message: string, color = "#88aacc"): void {
		if (this.statusText) {
			this.statusText.destroy();
		}
		this.statusText = new Text({
			text: message,
			style: new TextStyle({ fill: color, fontSize: 14 }),
		});
		this.statusText.anchor.set(0.5);
		this.statusText.position.set(this.width / 2, 420);
		this.container.addChild(this.statusText);
	}

	private async attemptLogin(): Promise<void> {
		const name = this.usernameInput.value.trim();
		if (!name) {
			this.createStatus("Please enter a name", "#ff6644");
			return;
		}

		this.createStatus("Connecting to server...", "#ffaa44");

		try {
			// Connect to the Socket.io server
			this.socket = io(SERVER_URL, {
				transports: ["websocket", "polling"],
				timeout: 10000,
			});

			this.socket.on("connect", () => {
				// Set player name on server
				this.socket!.emit("setName", name);

				// Save to local identity
				setPlayerDisplayName(name);

				// Save auto-login preference
				const autoCheck = document.getElementById(
					"autoLogin",
				) as HTMLInputElement;
				this.settings.set("autoLogin", autoCheck?.checked ?? false);
				this.settings.set("username", name);

				this.createStatus(`✓ Connected as ${name}`, "#44ff88");

				// Notify parent scene
				if (this.loginConfig.onLogin) {
					this.loginConfig.onLogin(name, this.socket!);
				}

				// Navigate to lobby after brief delay
				setTimeout(() => {
					this.cleanup();
					if (this.loginConfig.onLogin) {
						// Parent handles navigation
					} else {
						// Default: open lobby
						import("./LobbyScene").then(({ LobbyScene }) => {
							const lobby = new LobbyScene({
								name: "lobby",
								app: this.app,
								camera: this.camera ?? undefined,
							});
							SceneTransition.pushWithFade(this.app, lobby);
						});
					}
				}, 1000);
			});

			this.socket.on("connect_error", (err) => {
				this.createStatus(`Connection failed: ${err.message}`, "#ff4444");
			});

			this.socket.on("disconnect", () => {
				this.createStatus("Disconnected from server", "#ff8844");
			});
		} catch (e: any) {
			this.createStatus(`Error: ${e.message}`, "#ff4444");
		}
	}

	private goBack(): void {
		this.cleanup();
		SceneTransition.popWithFade(this.app);
	}

	private cleanup(): void {
		if (this.formContainer && this.formContainer.parentElement) {
			this.formContainer.remove();
		}
	}

	protected onUpdate(_dt: number): void {
		if (InputManager.isCancelPressed()) {
			this.goBack();
		}
	}

	protected async destroy(): Promise<void> {
		this.cleanup();
		// Don't disconnect socket on scene exit — it persists for online features
	}
}
