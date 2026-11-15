/**
 * SettingsScene — Unified Single-Page Settings & Options Control Center.
 *
 * CONSOLIDATION RATIONALE (v3.0.35):
 * Previously, settings were split across `SettingsScene` (Audio + Profile) and
 * a separate `OptionsScene` subpage (duplicating all 3 Audio sliders alongside
 * WebGPU, HQ2X HD Sprites, Mobile HUD, and Haptics). All Audio, Graphics,
 * Puzzle Gameplay, Haptics, and Cloud Identity controls now live on ONE
 * consolidated, responsive two-column page with hover tooltips on every control.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { APP_VERSION } from "../../shared/Config";
import { AudioManager } from "../audio/AudioManager";
import {
	getOrCreateAchievementProfileId,
	getPlayerDisplayName,
	setPlayerDisplayName,
} from "../data/AchievementIdentity";
import { GlobalSettings } from "../engine/shared/GlobalSettings";
import { InputManager, Key } from "../input/InputManager";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { SceneTransition } from "../state/SceneTransition";
import { ToastManager } from "../ui/ToastManager";
import { Tooltip } from "../ui/Tooltip";

export interface SettingsSceneConfig extends SceneConfig {
	onBack?: () => void;
}

// ============================================================
// Reusable Interactive Slider Widget with Tooltip Hook
// ============================================================

class SettingSlider {
	readonly container: Container;
	private track: Graphics;
	private fill: Graphics;
	private handle: Graphics;
	private valueText: Text;
	private _value: number;
	private _min: number;
	private _max: number;
	private dragging = false;
	private readonly trackX = 148;
	private readonly trackWidth = 175;
	private onChange: (value: number) => void;

	constructor(
		labelText: string,
		tooltipText: string,
		tooltip: Tooltip,
		value: number,
		min = 0,
		max = 1,
		onChange: (value: number) => void,
	) {
		this.container = new Container();
		this._value = Math.max(min, Math.min(max, value));
		this._min = min;
		this._max = max;
		this.onChange = onChange;

		const label = new Text({
			text: `${labelText}  ⓘ`,
			style: new TextStyle({
				fill: "#d4e2f4",
				fontSize: 14,
				fontFamily: "Arial, sans-serif",
				fontWeight: "bold",
			}),
		});
		label.position.set(0, 0);
		label.eventMode = "static";
		label.cursor = "help";
		label.on("pointerover", (e) => {
			tooltip.show(e.global.x, e.global.y, tooltipText);
		});
		label.on("pointerout", () => tooltip.hide());
		this.container.addChild(label);

		this.track = new Graphics();
		this.track.roundRect(this.trackX, 4, this.trackWidth, 10, 5);
		this.track.fill({ color: 0x1b2842 });
		this.track.stroke({ color: 0x3d5a80, width: 1.5 });
		this.container.addChild(this.track);

		this.fill = new Graphics();
		this.container.addChild(this.fill);

		this.handle = new Graphics();
		this.container.addChild(this.handle);

		this.valueText = new Text({
			text: `${Math.round(this._value * 100)}%`,
			style: new TextStyle({
				fill: "#88ccff",
				fontSize: 12,
				fontFamily: "monospace",
				fontWeight: "bold",
			}),
		});
		this.valueText.position.set(this.trackX + this.trackWidth + 12, 2);
		this.container.addChild(this.valueText);

		this.updateVisuals();

		this.track.eventMode = "static";
		this.track.cursor = "pointer";
		this.track.on("pointerover", (e) => tooltip.show(e.global.x, e.global.y, tooltipText));
		this.track.on("pointerout", () => tooltip.hide());
		this.track.on("pointerdown", (e) => {
			const local = this.track.toLocal(e.global);
			this.setValueFromX(local.x - this.trackX);
			this.dragging = true;
		});

		this.handle.eventMode = "static";
		this.handle.cursor = "grab";
		this.handle.on("pointerdown", () => {
			this.dragging = true;
		});

		this.container.eventMode = "static";
		this.container.on("globalpointermove", (e) => {
			if (!this.dragging) return;
			const local = this.track.toLocal(e.global);
			this.setValueFromX(local.x - this.trackX);
		});
		const stopDrag = () => {
			this.dragging = false;
		};
		this.container.on("pointerup", stopDrag);
		this.container.on("pointerupoutside", stopDrag);
	}

	private setValueFromX(relX: number): void {
		const pct = Math.max(0, Math.min(1, relX / this.trackWidth));
		this._value = this._min + pct * (this._max - this._min);
		this.updateVisuals();
		this.onChange(this._value);
	}

	private updateVisuals(): void {
		const pct = (this._value - this._min) / (this._max - this._min);
		const fillW = Math.max(0, pct * this.trackWidth);

		this.fill.clear();
		if (fillW > 0) {
			this.fill.roundRect(this.trackX, 4, fillW, 10, 5);
			this.fill.fill({ color: 0x4499ff });
		}

		this.handle.clear();
		this.handle.circle(this.trackX + fillW, 9, 7);
		this.handle.fill({ color: 0xffffff });
		this.handle.stroke({ color: 0x4499ff, width: 2 });

		this.valueText.text = `${Math.round(pct * 100)}%`;
	}

	setValue(v: number): void {
		this._value = Math.max(this._min, Math.min(this._max, v));
		this.updateVisuals();
	}
}

// ============================================================
// SettingsScene (Unified Audio + Graphics + Gameplay + Profile)
// ============================================================

export class SettingsScene extends Scene<SettingsSceneConfig> {
	private settingsConfig: SettingsSceneConfig;
	private globalSettings = new GlobalSettings();
	private tooltip!: Tooltip;
	private inputElement: HTMLInputElement | null = null;

	private masterSlider!: SettingSlider;
	private musicSlider!: SettingSlider;
	private sfxSlider!: SettingSlider;
	private hapticSlider!: SettingSlider;

	private muteBtnLabel!: Text;
	private nameText!: Text;

	constructor(config: SettingsSceneConfig) {
		super(config);
		this.settingsConfig = config;
	}

	public async create(): Promise<void> {
		this.cleanupDomInput();
		this.container.removeChildren();
		this.globalSettings.load();

		this.drawBackdrop();
		this.tooltip = new Tooltip(this.width, this.height);

		const cx = this.width / 2;
		const twoCol = this.width >= 860;
		const leftX = twoCol ? cx - 400 : Math.max(24, cx - 190);
		const rightX = twoCol ? cx + 30 : leftX;

		// ---- HEADER ----
		const title = new Text({
			text: "⚙️ UNIFIED SETTINGS & OPTIONS",
			style: new TextStyle({
				fill: "#ffffff",
				fontSize: 28,
				fontFamily: "Arial Black, Arial, sans-serif",
				fontWeight: "bold",
				letterSpacing: 1.5,
			}),
		});
		title.anchor.set(0.5, 0);
		title.position.set(cx, 18);
		this.container.addChild(title);

		const sub = new Text({
			text: "Audio Mixer • WebGPU & HQ2X Graphics • Puzzle & Touch Controls • Cloud Identity",
			style: new TextStyle({ fill: "#88aacc", fontSize: 13 }),
		});
		sub.anchor.set(0.5, 0);
		sub.position.set(cx, 54);
		this.container.addChild(sub);

		// ============================================================
		// LEFT COLUMN: AUDIO MIXER, HAPTICS & PROFILE IDENTITY
		// ============================================================
		let ly = 92;
		this.addSectionHeader("🔊 AUDIO MIXER & HAPTICS", leftX, ly, 370);
		ly += 34;

		this.masterSlider = new SettingSlider(
			"Master Volume",
			"Global output gain applied across all music, chiptune sequences, and sound effects.",
			this.tooltip,
			AudioManager.masterVolume,
			0,
			1,
			(v) => {
				AudioManager.masterVolume = v;
				this.globalSettings.setMasterVolume(v);
			},
		);
		this.masterSlider.container.position.set(leftX, ly);
		this.container.addChild(this.masterSlider.container);
		ly += 34;

		this.musicSlider = new SettingSlider(
			"Music Volume",
			"Controls background soundtrack and dynamic map/menu music tracks.",
			this.tooltip,
			AudioManager.musicVolume,
			0,
			1,
			(v) => {
				AudioManager.musicVolume = v;
				this.globalSettings.setMusicVolume(v);
			},
		);
		this.musicSlider.container.position.set(leftX, ly);
		this.container.addChild(this.musicSlider.container);
		ly += 34;

		this.sfxSlider = new SettingSlider(
			"SFX Volume",
			"Controls piece rotation/drop clicks, RPG combat hits, door transitions, and UI feedback.",
			this.tooltip,
			AudioManager.sfxVolume,
			0,
			1,
			(v) => {
				AudioManager.sfxVolume = v;
				this.globalSettings.setSFXVolume(v);
			},
		);
		this.sfxSlider.container.position.set(leftX, ly);
		this.container.addChild(this.sfxSlider.container);
		ly += 34;

		const initialHaptic =
			parseInt(localStorage.getItem("haptic-intensity") || "10", 10) / 50;
		this.hapticSlider = new SettingSlider(
			"Haptic Pulse",
			"Vibration feedback strength (0–50ms) for mobile browsers and compatible gamepads.",
			this.tooltip,
			initialHaptic,
			0,
			1,
			(v) => {
				const intensity = Math.round(v * 50);
				localStorage.setItem("haptic-intensity", intensity.toString());
				if (intensity > 0 && "vibrate" in navigator) {
					navigator.vibrate(intensity);
				}
			},
		);
		this.hapticSlider.container.position.set(leftX, ly);
		this.container.addChild(this.hapticSlider.container);
		ly += 38;

		const muteBtn = this.createActionPill(
			AudioManager.muted ? "🔇 Audio: MUTED" : "🔊 Audio: ACTIVE",
			178,
			34,
			"Immediately mute or unmute all Howler & WebAudio channels without losing slider levels.",
			() => {
				AudioManager.toggleMute();
				this.muteBtnLabel.text = AudioManager.muted
					? "🔇 Audio: MUTED"
					: "🔊 Audio: ACTIVE";
			},
		);
		muteBtn.container.position.set(leftX, ly);
		this.muteBtnLabel = muteBtn.label;
		this.container.addChild(muteBtn.container);

		const testBtn = this.createActionPill(
			"🎵 Test SFX",
			178,
			34,
			"Play a sample menu sound effect at your current Master × SFX volume.",
			() => {
				if (AudioManager.isLoaded("menu_select")) {
					AudioManager.playSound("menu_select", { volume: 0.8 });
				}
				ToastManager.showInfo("Played test sound effect.");
			},
		);
		testBtn.container.position.set(leftX + 192, ly);
		this.container.addChild(testBtn.container);
		ly += 52;

		// ---- PROFILE IDENTITY ----
		this.addSectionHeader("👤 PLAYER IDENTITY & CLOUD PROFILE", leftX, ly, 370);
		ly += 32;

		const currentName = getPlayerDisplayName();
		const profileId = getOrCreateAchievementProfileId();

		this.nameText = new Text({
			text: `Display Name: ${currentName}`,
			style: new TextStyle({
				fill: "#ffd966",
				fontSize: 15,
				fontWeight: "bold",
			}),
		});
		this.nameText.position.set(leftX, ly);
		this.container.addChild(this.nameText);
		ly += 22;

		const profileText = new Text({
			text: `Profile UUID: ${profileId}`,
			style: new TextStyle({
				fill: "#7fa6cc",
				fontSize: 11,
				fontFamily: "monospace",
			}),
		});
		profileText.position.set(leftX, ly);
		this.container.addChild(profileText);
		ly += 26;

		this.mountNameInput(leftX, ly, currentName);

		const saveNameBtn = this.createActionPill(
			"💾 Save Name",
			140,
			32,
			"Persist your display name locally and use it in Multiplayer Lobbies, Leaderboards, and MMO chat.",
			() => this.saveName(),
		);
		saveNameBtn.container.position.set(leftX + 230, ly);
		this.container.addChild(saveNameBtn.container);
		ly += 48;

		// ============================================================
		// RIGHT COLUMN: GRAPHICS, GAMEPLAY & NETWORK OPTIONS
		// ============================================================
		let ry = twoCol ? 92 : ly + 8;
		this.addSectionHeader("🖥️ GRAPHICS, GAMEPLAY & CONTROLS", rightX, ry, 370);
		ry += 34;

		const isWebGPUSupported = typeof navigator !== "undefined" && "gpu" in navigator;
		const preferWebGpuInit =
			localStorage.getItem("prefer-webgpu") !== "false" && isWebGPUSupported;
		const gpuToggle = this.createToggleRow(
			"Hardware Renderer",
			() =>
				!isWebGPUSupported
					? "WebGL2 (WebGPU Unavailable)"
					: localStorage.getItem("prefer-webgpu") !== "false"
						? "Prefer WebGPU + WGSL"
						: "Force WebGL2 Fallback",
			"Selects whether PixiJS v8 and Weather/Particle systems prioritize WebGPU compute shaders or WebGL2.",
			preferWebGpuInit,
			() => {
				if (!isWebGPUSupported) {
					ToastManager.showInfo("WebGPU is not exposed by this browser/GPU driver; using WebGL2.");
					return false;
				}
				const next = localStorage.getItem("prefer-webgpu") === "false";
				localStorage.setItem("prefer-webgpu", String(next));
				ToastManager.showInfo(
					next
						? "WebGPU prioritized (applies fully on next boot)."
						: "WebGL2 fallback selected for next boot.",
				);
				return next;
			},
		);
		gpuToggle.position.set(rightX, ry);
		this.container.addChild(gpuToggle);
		ry += 44;

		const worldScene = StateManager.getByName("world") as
			| { spriteAtlas?: { useHQ2X?: boolean } }
			| undefined;
		const hq2xStored =
			worldScene?.spriteAtlas?.useHQ2X ??
			localStorage.getItem("hd-sprites-hq2x") === "true";
		const hdToggle = this.createToggleRow(
			"HD Sprites (HQ2X Filter)",
			() =>
				(worldScene?.spriteAtlas?.useHQ2X ??
				localStorage.getItem("hd-sprites-hq2x") === "true")
					? "ON (2x Upscaled)"
					: "OFF (Crisp 1x Pixel)",
			"Applies real-time HQ2X pixel-art smoothing to RPG character and NPC sprites.",
			hq2xStored,
			() => {
				const current =
					worldScene?.spriteAtlas?.useHQ2X ??
					localStorage.getItem("hd-sprites-hq2x") === "true";
				const next = !current;
				localStorage.setItem("hd-sprites-hq2x", String(next));
				if (worldScene?.spriteAtlas) {
					worldScene.spriteAtlas.useHQ2X = next;
				}
				return next;
			},
		);
		hdToggle.position.set(rightX, ry);
		this.container.addChild(hdToggle);
		ry += 44;

		const ghostToggle = this.createToggleRow(
			"Puzzle Ghost Piece",
			() => (this.globalSettings.isShowGhost() ? "ON" : "OFF"),
			"Displays a translucent landing preview underneath the active falling block piece in Puzzle modes.",
			this.globalSettings.isShowGhost(),
			() => {
				const next = !this.globalSettings.isShowGhost();
				this.globalSettings.setShowGhost(next);
				return next;
			},
		);
		ghostToggle.position.set(rightX, ry);
		this.container.addChild(ghostToggle);
		ry += 44;

		const pixelToggle = this.createToggleRow(
			"Pixel-Perfect Tile Scaling",
			() => (this.globalSettings.isPixelPerfect() ? "ON (Nearest)" : "OFF (Linear)"),
			"Preserves razor-sharp 8×8 retro tile edges across 2× exterior and 3× interior camera zoom levels.",
			this.globalSettings.isPixelPerfect(),
			() => {
				const next = !this.globalSettings.isPixelPerfect();
				this.globalSettings.setPixelPerfect(next);
				return next;
			},
		);
		pixelToggle.position.set(rightX, ry);
		this.container.addChild(pixelToggle);
		ry += 44;

		const mobileToggle = this.createToggleRow(
			"Mobile Touch HUD Override",
			() =>
				localStorage.getItem("mobile-mode-override") === "true"
					? "ON (Show Virtual Pad)"
					: "OFF (Auto-Detect)",
			"Forces the on-screen virtual D-Pad and action buttons on desktop screens for touch/tablet testing.",
			localStorage.getItem("mobile-mode-override") === "true",
			() => {
				const next = localStorage.getItem("mobile-mode-override") !== "true";
				localStorage.setItem("mobile-mode-override", String(next));
				return next;
			},
		);
		mobileToggle.position.set(rightX, ry);
		this.container.addChild(mobileToggle);
		ry += 44;

		const autoLoginToggle = this.createToggleRow(
			"Auto-Connect Cloud Profile",
			() => (this.globalSettings.get("autoLogin") ? "ON" : "OFF"),
			"Automatically signs in to the Multiplayer & Cloud Save server on startup when a username is saved.",
			this.globalSettings.get("autoLogin"),
			() => {
				const next = !this.globalSettings.get("autoLogin");
				this.globalSettings.set("autoLogin", next);
				return next;
			},
		);
		autoLoginToggle.position.set(rightX, ry);
		this.container.addChild(autoLoginToggle);
		ry += 50;

		const resetBtn = this.createActionPill(
			"↺ Reset Defaults",
			178,
			34,
			"Restore default volume, ghost piece, pixel-perfect, and control settings.",
			() => {
				this.globalSettings.reset();
				AudioManager.masterVolume = this.globalSettings.getMasterVolume();
				AudioManager.musicVolume = this.globalSettings.getMusicVolume();
				AudioManager.sfxVolume = this.globalSettings.getSFXVolume();
				localStorage.removeItem("mobile-mode-override");
				localStorage.removeItem("hd-sprites-hq2x");
				ToastManager.showInfo("Restored default settings.");
				void this.create();
			},
		);
		resetBtn.container.position.set(rightX, ry);
		this.container.addChild(resetBtn.container);

		// ---- FOOTER / BACK ----
		const footerY = Math.max(ly + 16, ry + 54, this.height - 68);
		const backBtn = this.createActionPill(
			"← Back to Dashboard  (ESC)",
			260,
			40,
			"Save changes and return to the previous scene or Consolidated Omni-Engine Dashboard.",
			() => this.goBack(),
		);
		backBtn.container.position.set(cx - 130, Math.min(footerY, this.height - 56));
		this.container.addChild(backBtn.container);

		const verText = new Text({
			text: `v${APP_VERSION}`,
			style: new TextStyle({ fill: "#4a607a", fontSize: 12 }),
		});
		verText.anchor.set(1, 1);
		verText.position.set(this.width - 14, this.height - 10);
		this.container.addChild(verText);

		// Keep tooltip above all controls
		this.container.addChild(this.tooltip.getContainer());
	}

	private drawBackdrop(): void {
		const bg = new Graphics();
		const steps = 20;
		for (let i = 0; i < steps; i++) {
			const t = i / steps;
			const r = Math.round(10 + 12 * t);
			const g = Math.round(12 + 18 * t);
			const b = Math.round(26 + 30 * t);
			bg.rect(0, (this.height / steps) * i, this.width, this.height / steps + 1);
			bg.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(bg);
	}

	private addSectionHeader(title: string, x: number, y: number, width: number): void {
		const text = new Text({
			text: title,
			style: new TextStyle({
				fill: "#66b2ff",
				fontSize: 14,
				fontWeight: "bold",
				letterSpacing: 1,
			}),
		});
		text.position.set(x, y);
		this.container.addChild(text);

		const line = new Graphics();
		line.moveTo(x, y + 22);
		line.lineTo(x + width, y + 22);
		line.stroke({ color: 0x2a4365, width: 1.5 });
		this.container.addChild(line);
	}

	private createToggleRow(
		title: string,
		getStateLabel: () => string,
		tooltipText: string,
		initialActive: boolean,
		onToggle: () => boolean,
	): Container {
		const row = new Container();
		let active = initialActive;

		const bg = new Graphics();
		const drawRow = (hovered: boolean) => {
			bg.clear();
			bg.roundRect(0, 0, 370, 36, 7);
			bg.fill({ color: hovered ? 0x1e3354 : 0x142238, alpha: 0.92 });
			bg.stroke({
				color: active ? 0x4da6ff : hovered ? 0x5c7fa3 : 0x2c4668,
				width: 1.5,
			});
		};
		drawRow(false);
		row.addChild(bg);

		const label = new Text({
			text: `${title}  ⓘ`,
			style: new TextStyle({
				fill: "#dce8f5",
				fontSize: 13,
				fontWeight: "bold",
			}),
		});
		label.position.set(12, 9);
		row.addChild(label);

		const valueLabel = new Text({
			text: getStateLabel(),
			style: new TextStyle({
				fill: active ? "#66ffcc" : "#99aabb",
				fontSize: 12,
				fontWeight: "bold",
			}),
		});
		valueLabel.anchor.set(1, 0.5);
		valueLabel.position.set(358, 18);
		row.addChild(valueLabel);

		row.eventMode = "static";
		row.cursor = "pointer";
		row.on("pointerover", (e) => {
			drawRow(true);
			this.tooltip.show(e.global.x, e.global.y, tooltipText);
		});
		row.on("pointerout", () => {
			drawRow(false);
			this.tooltip.hide();
		});
		row.on("pointerdown", () => {
			active = onToggle();
			valueLabel.text = getStateLabel();
			valueLabel.style.fill = active ? "#66ffcc" : "#99aabb";
			drawRow(true);
			if (AudioManager.isLoaded("menu_select")) {
				AudioManager.playSound("menu_select", { volume: 0.5 });
			}
		});

		return row;
	}

	private createActionPill(
		text: string,
		w: number,
		h: number,
		tooltipText: string,
		onClick: () => void,
	): { container: Container; label: Text } {
		const btn = new Container();
		const g = new Graphics();
		const draw = (hovered: boolean) => {
			g.clear();
			g.roundRect(0, 0, w, h, 8);
			g.fill({ color: hovered ? 0x284b7a : 0x193050 });
			g.stroke({ color: hovered ? 0x77bbff : 0x456d9c, width: 1.8 });
		};
		draw(false);
		btn.addChild(g);

		const label = new Text({
			text,
			style: new TextStyle({
				fill: "#ffffff",
				fontSize: 14,
				fontWeight: "bold",
			}),
		});
		label.anchor.set(0.5);
		label.position.set(w / 2, h / 2);
		btn.addChild(label);

		btn.eventMode = "static";
		btn.cursor = "pointer";
		btn.on("pointerover", (e) => {
			draw(true);
			this.tooltip.show(e.global.x, e.global.y, tooltipText);
		});
		btn.on("pointerout", () => {
			draw(false);
			this.tooltip.hide();
		});
		btn.on("pointerdown", () => {
			this.tooltip.hide();
			onClick();
		});

		return { container: btn, label };
	}

	private mountNameInput(x: number, y: number, currentName: string): void {
		const input = document.createElement("input");
		input.type = "text";
		input.value = currentName;
		input.maxLength = 32;
		input.placeholder = "Enter player name...";
		input.title = "Enter your public display name (press Enter or click Save Name)";
		input.style.position = "fixed";
		const canvasRect = this.app.canvas.getBoundingClientRect();
		input.style.left = `${Math.round(canvasRect.left + x)}px`;
		input.style.top = `${Math.round(canvasRect.top + y)}px`;
		input.style.width = "214px";
		input.style.height = "30px";
		input.style.padding = "4px 8px";
		input.style.fontSize = "14px";
		input.style.borderRadius = "6px";
		input.style.border = "1px solid #4a6a8a";
		input.style.background = "#0f1a2c";
		input.style.color = "#ffffff";
		input.style.zIndex = "1000";
		input.addEventListener("keydown", (ev) => {
			if (ev.key === "Enter") {
				this.saveName();
			}
		});
		document.body.appendChild(input);
		this.inputElement = input;
	}

	private saveName(): void {
		if (!this.inputElement) return;
		const newName = setPlayerDisplayName(this.inputElement.value);
		this.globalSettings.set("username", newName);
		this.nameText.text = `Display Name: ${newName}`;
		ToastManager.showInfo(`Saved player name: ${newName}`);
	}

	private goBack(): void {
		this.cleanupDomInput();
		this.tooltip?.hide();
		if (this.settingsConfig.onBack) {
			this.settingsConfig.onBack();
		} else {
			SceneTransition.popWithFade(this.app);
		}
	}

	public onResize(width: number, height: number): void {
		super.onResize(width, height);
		void this.create();
	}

	public onPause(): void {
		super.onPause();
		this.cleanupDomInput();
	}

	public onUpdate(_delta: number): void {
		if (
			InputManager.isCancelPressed() ||
			InputManager.isKeyPressed(Key.Escape)
		) {
			this.goBack();
		}
	}

	private cleanupDomInput(): void {
		if (this.inputElement) {
			this.inputElement.remove();
			this.inputElement = null;
		}
	}

	protected async destroy(): Promise<void> {
		this.cleanupDomInput();
		this.tooltip?.destroy();
	}
}
