/**
 * SplashScene — animated boot/splash screen shown before the main menu.
 *
 * Features:
 * - Animated logo with fade-in and scale effect
 * - Progress bar for asset loading
 * - "Press any key to start" prompt
 * - Version display
 * - Auto-transitions to MainMenuScene
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

import { APP_VERSION } from "../../shared/Config";

export class SplashScene extends Scene {
	private elapsed = 0;
	private ready = false;
	private fadeAlpha = 0;
	private logoScale = 0;
	private progressBar!: Graphics;
	private progressBg!: Graphics;
	private progressFill!: Graphics;
	private promptText!: Text;
	private versionText!: Text;
	private anyKeyPressed = false;

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createLogo();
		this.createProgressBar();
		this.createPrompt();
		this.createVersion();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 40; i++) {
			const ratio = i / 40;
			const r = Math.floor(2 + ratio * 6);
			const g = Math.floor(2 + ratio * 4);
			const b = Math.floor(8 + ratio * 16);
			bg.rect(0, (this.height / 40) * i, this.width, this.height / 40 + 1);
			bg.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(bg);
	}

	private createLogo(): void {
		const titleStyle = new TextStyle({
			fontFamily: "Arial Black, Arial, sans-serif",
			fontSize: 48,
			fill: 0xffcc00,
			fontWeight: "bold",
			letterSpacing: 3,
			dropShadow: {
				color: 0x000000,
				blur: 8,
				distance: 4,
				alpha: 0.5,
			},
		});
		const title = new Text({ text: "bob's game", style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(this.width / 2, this.height / 2 - 60);
		title.alpha = 0;
		title.label = "splash-logo";
		this.container.addChild(title);

		const subtitleStyle = new TextStyle({
			fontFamily: "Arial, sans-serif",
			fontSize: 14,
			fill: 0x6688aa,
			letterSpacing: 4,
		});
		const subtitle = new Text({
			text: "ULTIMATE OMNI-ENGINE",
			style: subtitleStyle,
		});
		subtitle.anchor.set(0.5);
		subtitle.position.set(this.width / 2, this.height / 2 - 10);
		subtitle.alpha = 0;
		subtitle.label = "splash-subtitle";
		this.container.addChild(subtitle);
	}

	private createProgressBar(): void {
		const barW = 300;
		const barH = 8;
		const barX = this.width / 2 - barW / 2;
		const barY = this.height / 2 + 40;

		this.progressBg = new Graphics();
		this.progressBg.roundRect(barX, barY, barW, barH, 4);
		this.progressBg.fill(0x112233);
		this.progressBg.stroke({ color: 0x223344, width: 1 });
		this.container.addChild(this.progressBg);

		this.progressFill = new Graphics();
		this.progressFill.rect(barX + 1, barY + 1, 0, barH - 2);
		this.progressFill.fill(0x4488ff);
		this.container.addChild(this.progressFill);
	}

	private createPrompt(): void {
		this.promptText = new Text({
			text: "Press any key to start",
			style: new TextStyle({
				fill: 0x4466aa,
				fontSize: 14,
			}),
		});
		this.promptText.anchor.set(0.5);
		this.promptText.position.set(this.width / 2, this.height / 2 + 80);
		this.promptText.alpha = 0;
		this.container.addChild(this.promptText);
	}

	private createVersion(): void {
		this.versionText = new Text({
			text: `v${APP_VERSION}`,
			style: new TextStyle({
				fill: 0x334455,
				fontSize: 11,
			}),
		});
		this.versionText.anchor.set(1, 1);
		this.versionText.position.set(this.width - 8, this.height - 8);
		this.container.addChild(this.versionText);
	}

	protected onUpdate(dt: number): void {
		this.elapsed += dt;

		// Phase 1: Fade in logo (0-1s)
		const logo = this.container.getChildByLabel("splash-logo");
		const subtitle = this.container.getChildByLabel("splash-subtitle");

		if (this.elapsed < 1.0) {
			this.fadeAlpha = Math.min(1, this.elapsed);
			if (logo) logo.alpha = this.fadeAlpha;
		} else if (logo) {
			logo.alpha = 1;
		}

		// Scale effect on logo
		if (this.elapsed < 0.5) {
			this.logoScale = 1.2 - 0.2 * (this.elapsed / 0.5);
		} else {
			this.logoScale = 1.0;
		}
		if (logo) {
			logo.scale.set(this.logoScale);
		}

		// Phase 2: Subtitle fade (0.5-1.5s)
		if (this.elapsed > 0.5 && this.elapsed < 1.5) {
			if (subtitle) subtitle.alpha = Math.min(1, (this.elapsed - 0.5));
		} else if (this.elapsed >= 1.5 && subtitle) {
			subtitle.alpha = 1;
		}

		// Phase 3: Progress bar (0.3-2s) — simulates loading
		const loadProgress = Math.min(1, Math.max(0, (this.elapsed - 0.3) / 1.7));
		const barW = 298;
		this.progressFill.clear();
		this.progressFill.rect(
			this.width / 2 - 150 + 1,
			this.height / 2 + 41,
			barW * loadProgress,
			6,
		);
		this.progressFill.fill(0x4488ff);

		if (loadProgress >= 1) {
			this.ready = true;
		}

		// Phase 4: Prompt blink
		if (this.ready) {
			const blink = Math.sin(this.elapsed * 3) * 0.5 + 0.5;
			this.promptText.alpha = blink;
		}

		// Any key → transition to main menu
		if (this.ready && !this.anyKeyPressed) {
			if (
				InputManager.isActionPressed() ||
				InputManager.isCancelPressed() ||
				InputManager.isKeyHeld(" ") ||
				InputManager.isKeyHeld("Enter")
			) {
				this.anyKeyPressed = true;
				StateManager.pop();
			}
		}
	}
}
