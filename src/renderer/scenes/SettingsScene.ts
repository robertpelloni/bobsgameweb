/**
 * SettingsScene — full game settings with audio, video, controls, and network options.
 *
 * Audio settings (master, music, SFX volume + mute toggle) are immediately applied
 * to the global Howler-based AudioManager singleton on every slider change.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { AudioManager } from "../audio/AudioManager";
import {
	getOrCreateAchievementProfileId,
	getPlayerDisplayName,
	setPlayerDisplayName,
} from "../data/AchievementIdentity";
import { InputManager } from "../input/InputManager";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";

// ============================================================
// Slider widget for volume controls
// ============================================================

class VolumeSlider {
	container: Container;
	private track: Graphics;
	private fill: Graphics;
	private handle: Graphics;
	private label: Text;
	private valueText: Text;
	private _value: number;
	private _min: number;
	private _max: number;
	private dragging = false;
	private trackWidth = 200;
	private onChange: (value: number) => void;

	constructor(
		labelText: string,
		value: number,
		min = 0,
		max = 1,
		onChange: (value: number) => void,
	) {
		this.container = new Container();
		this._value = value;
		this._min = min;
		this._max = max;
		this.onChange = onChange;

		// Label text
		this.label = new Text({
			text: labelText,
			style: new TextStyle({
				fill: "#ccccdd",
				fontSize: 14,
				fontFamily: "Arial, sans-serif",
			}),
		});
		this.label.position.set(0, 0);
		this.container.addChild(this.label);

		// Track
		this.track = new Graphics();
		this.track.roundRect(120, 2, this.trackWidth, 12, 6);
		this.track.fill({ color: 0x222244 });
		this.track.stroke({ color: 0x444466, width: 1 });
		this.container.addChild(this.track);

		// Fill
		this.fill = new Graphics();
		this.container.addChild(this.fill);

		// Handle
		this.handle = new Graphics();
		this.container.addChild(this.handle);

		// Value text
		this.valueText = new Text({
			text: `${Math.round(value * 100)}%`,
			style: new TextStyle({
				fill: "#88aacc",
				fontSize: 12,
				fontFamily: "monospace",
			}),
		});
		this.valueText.position.set(330, 1);
		this.container.addChild(this.valueText);

		this.updateVisuals();

		// Interaction
		this.track.eventMode = "static";
		this.track.cursor = "pointer";
		this.track.on("pointerdown", (e) => this.onTrackClick(e));
		this.handle.eventMode = "static";
		this.handle.cursor = "grab";
		this.handle.on("pointerdown", () => {
			this.dragging = true;
		});
		this.handle.on("pointerup", () => {
			this.dragging = false;
		});
		this.handle.on("pointerupoutside", () => {
			this.dragging = false;
		});

		// Global move/up for dragging
		const onMove = (e: any) => {
			if (!this.dragging) return;
			const local = this.track.toLocal(e.global);
			this.setValueFromX(local.x);
		};
		const onUp = () => {
			this.dragging = false;
		};

		this.container.on("pointermove", onMove);
		this.container.on("pointerup", onUp);
		this.container.on("pointerupoutside", onUp);
	}

	private onTrackClick(e: any): void {
		const local = this.track.toLocal(e.global);
		this.setValueFromX(local.x);
		this.dragging = true;
	}

	private setValueFromX(x: number): void {
		const pct = Math.max(0, Math.min(1, x / this.trackWidth));
		this._value = this._min + pct * (this._max - this._min);
		this.updateVisuals();
		this.onChange(this._value);
	}

	private updateVisuals(): void {
		const pct = (this._value - this._min) / (this._max - this._min);
		const fillW = pct * this.trackWidth;

		this.fill.clear();
		this.fill.roundRect(120, 2, fillW, 12, 6);
		this.fill.fill({ color: 0x4488ff });

		this.handle.clear();
		this.handle.circle(120 + fillW, 8, 8);
		this.handle.fill({ color: 0xffffff });
		this.handle.stroke({ color: 0x4488ff, width: 2 });

		this.valueText.text = `${Math.round(this._value * 100)}%`;
	}

	get value(): number {
		return this._value;
	}

	setValue(v: number): void {
		this._value = Math.max(this._min, Math.min(this._max, v));
		this.updateVisuals();
	}
}

// ============================================================
// SettingsScene
// ============================================================

export class SettingsScene extends Scene {
	private titleText!: Text;
	private nameInputContainer!: Container;
	private nameText!: Text;
	private backButton!: Container;
	private inputElement!: HTMLInputElement;

	// Audio sliders
	private masterSlider!: VolumeSlider;
	private musicSlider!: VolumeSlider;
	private sfxSlider!: VolumeSlider;
	private muteButton!: Container;
	private muteLabel!: Text;

	// Section labels
	private audioSectionLabel!: Text;
	private profileSectionLabel!: Text;

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		const cx = this.app.screen.width / 2;

		// Title
		this.titleText = new Text({
			text: "SETTINGS",
			style: new TextStyle({
				fill: "#ffffff",
				fontSize: 36,
				fontWeight: "bold",
			}),
		});
		this.titleText.anchor.set(0.5, 0);
		this.titleText.position.set(cx, 30);
		this.container.addChild(this.titleText);

		// ---- AUDIO SECTION ----
		this.audioSectionLabel = new Text({
			text: "── AUDIO ──",
			style: new TextStyle({
				fill: "#4466aa",
				fontSize: 16,
				fontWeight: "bold",
			}),
		});
		this.audioSectionLabel.anchor.set(0.5);
		this.audioSectionLabel.position.set(cx, 80);
		this.container.addChild(this.audioSectionLabel);

		// Master volume slider
		this.masterSlider = new VolumeSlider(
			"Master",
			AudioManager.masterVolume,
			0,
			1,
			(v) => {
				AudioManager.masterVolume = v;
			},
		);
		this.masterSlider.container.position.set(cx - 180, 110);
		this.container.addChild(this.masterSlider.container);

		// Music volume slider
		this.musicSlider = new VolumeSlider(
			"Music",
			AudioManager.musicVolume,
			0,
			1,
			(v) => {
				AudioManager.musicVolume = v;
			},
		);
		this.musicSlider.container.position.set(cx - 180, 145);
		this.container.addChild(this.musicSlider.container);

		// SFX volume slider
		this.sfxSlider = new VolumeSlider(
			"SFX",
			AudioManager.sfxVolume,
			0,
			1,
			(v) => {
				AudioManager.sfxVolume = v;
			},
		);
		this.sfxSlider.container.position.set(cx - 180, 180);
		this.container.addChild(this.sfxSlider.container);

		// Mute toggle button
		this.muteButton = this.createStyledButton(
			AudioManager.muted ? "UNMUTE" : "MUTE",
			120,
			32,
		);
		this.muteButton.position.set(cx - 180, 215);
		this.muteButton.on("pointerdown", () => {
			AudioManager.toggleMute();
			this.updateMuteButton();
		});
		this.container.addChild(this.muteButton);

		// Test sound button
		const testBtn = this.createStyledButton("Test Sound", 120, 32);
		testBtn.position.set(cx - 40, 215);
		testBtn.on("pointerdown", () => {
			AudioManager.playSound("menu_select", { volume: 0.7 });
		});
		this.container.addChild(testBtn);

		// ---- PROFILE SECTION ----
		this.profileSectionLabel = new Text({
			text: "── PROFILE ──",
			style: new TextStyle({
				fill: "#4466aa",
				fontSize: 16,
				fontWeight: "bold",
			}),
		});
		this.profileSectionLabel.anchor.set(0.5);
		this.profileSectionLabel.position.set(cx, 270);
		this.container.addChild(this.profileSectionLabel);

		const currentName = getPlayerDisplayName();
		const profileId = getOrCreateAchievementProfileId();

		this.nameText = new Text({
			text: `Name: ${currentName}`,
			style: { fill: "#ffff00", fontSize: 18 },
		});
		this.nameText.position.set(cx - 180, 300);
		this.container.addChild(this.nameText);

		const profileText = new Text({
			text: `Profile ID: ${profileId}`,
			style: { fill: "#88ccff", fontSize: 12 },
		});
		profileText.position.set(cx - 180, 325);
		this.container.addChild(profileText);

		this.inputElement = document.createElement("input");
		this.inputElement.type = "text";
		this.inputElement.value = currentName;
		this.inputElement.style.position = "absolute";
		this.inputElement.style.left = "50%";
		this.inputElement.style.top = "360px";
		this.inputElement.style.transform = "translateX(-50%)";
		this.inputElement.style.fontSize = "18px";
		this.inputElement.style.padding = "5px";
		this.inputElement.style.width = "200px";
		document.body.appendChild(this.inputElement);

		const saveButton = this.createStyledButton("Save Name", 140, 36);
		saveButton.position.set(cx - 70, 400);
		saveButton.on("pointerdown", () => this.saveName());
		this.container.addChild(saveButton);

		// ---- BACK BUTTON ----
		this.backButton = this.createStyledButton("Back", 200, 44);
		this.backButton.position.set(cx - 100, 460);
		this.backButton.on("pointerdown", () => {
			this.cleanup();
			SceneTransition.popWithFade(this.app);
		});
		this.container.addChild(this.backButton);

		// Keyboard hint
		const hintStyle = new TextStyle({ fill: "#555566", fontSize: 12 });
		const hint = new Text({ text: "Press ESC to go back", style: hintStyle });
		hint.anchor.set(0.5);
		hint.position.set(cx, 520);
		this.container.addChild(hint);
	}

	private updateMuteButton(): void {
		// Rebuild the button text
		const label = this.muteButton.getChildAt(1) as Text;
		label.text = AudioManager.muted ? "UNMUTE" : "MUTE";
	}

	private saveName(): void {
		const newName = setPlayerDisplayName(this.inputElement.value);
		this.nameText.text = `Name: ${newName}`;
	}

	private createStyledButton(label: string, w: number, h: number): Container {
		const btn = new Container();
		const g = new Graphics();
		g.roundRect(0, 0, w, h, 8);
		g.fill(0x1a2a4a);
		g.stroke({ color: 0x4a6a8a, width: 2 });
		btn.addChild(g);

		const t = new Text({
			text: label,
			style: { fill: "#ffffff", fontSize: 16 },
		});
		t.anchor.set(0.5);
		t.position.set(w / 2, h / 2);
		btn.addChild(t);

		btn.eventMode = "static";
		btn.cursor = "pointer";

		// Hover effect
		btn.on("pointerover", () => {
			(btn.getChildAt(0) as Graphics).clear();
			(btn.getChildAt(0) as Graphics)
				.roundRect(0, 0, w, h, 8)
				.fill(0x2a4a6a)
				.stroke({ color: 0x6a8aaa, width: 2 });
		});
		btn.on("pointerout", () => {
			(btn.getChildAt(0) as Graphics).clear();
			(btn.getChildAt(0) as Graphics)
				.roundRect(0, 0, w, h, 8)
				.fill(0x1a2a4a)
				.stroke({ color: 0x4a6a8a, width: 2 });
		});

		return btn;
	}

	public onUpdate(_delta: number): void {
		// ESC to go back
		if (InputManager.isCancelPressed()) {
			this.cleanup();
			SceneTransition.popWithFade(this.app);
		}
	}

	private cleanup(): void {
		if (this.inputElement && this.inputElement.parentElement) {
			this.inputElement.remove();
		}
	}

	protected async destroy(): Promise<void> {
		this.cleanup();
	}
}
