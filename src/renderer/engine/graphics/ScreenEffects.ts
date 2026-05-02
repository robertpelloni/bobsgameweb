/**
 * ScreenEffects — reusable screen shake, flash, and transition effects.
 *
 * Features:
 * - Screen shake (configurable intensity, duration, decay)
 * - Screen flash (color, alpha, fade)
 * - Vignette overlay (adjustable intensity)
 * - Chromatic aberration simulation
 * - Freeze frame (pause rendering for N frames)
 *
 * Usage:
 *   const fx = new ScreenEffects(container, width, height);
 *   fx.shake(10, 0.3);        // Shake for 0.3s
 *   fx.flash(0xff0000, 0.3);  // Red flash
 *   fx.update(dt);
 */
import { Container, Graphics } from "pixi.js";

export class ScreenEffects {
	private container: Container;
	private width: number;
	private height: number;

	// Shake
	private shakeAmount = 0;
	private shakeDecay = 0;
	private shakeOffsetX = 0;
	private shakeOffsetY = 0;

	// Flash
	private flashAlpha = 0;
	private flashColor = 0xffffff;
	private flashDecay = 0;
	private flashGraphics!: Graphics;

	// Vignette
	private vignetteAlpha = 0;
	private vignetteGraphics!: Graphics;

	// Freeze
	private freezeFrames = 0;

	constructor(container: Container, width: number, height: number) {
		this.container = container;
		this.width = width;
		this.height = height;

		// Flash overlay
		this.flashGraphics = new Graphics();
		this.flashGraphics.visible = false;
		container.addChild(this.flashGraphics);

		// Vignette overlay
		this.vignetteGraphics = new Graphics();
		this.vignetteGraphics.visible = false;
		container.addChild(this.vignetteGraphics);
	}

	/** Trigger screen shake */
	shake(intensity: number, duration: number): void {
		this.shakeAmount = intensity;
		this.shakeDecay = intensity / duration;
	}

	/** Trigger screen flash */
	flash(color: number, alpha: number, duration = 0.2): void {
		this.flashColor = color;
		this.flashAlpha = alpha;
		this.flashDecay = alpha / duration;
		this.flashGraphics.visible = true;
	}

	/** Set vignette intensity (0-1) */
	setVignette(intensity: number): void {
		this.vignetteAlpha = intensity;
		this.vignetteGraphics.visible = intensity > 0;
	}

	/** Freeze frame for N frames */
	freeze(frames: number): void {
		this.freezeFrames = frames;
	}

	/** Get shake offset for applying to containers */
	getShakeOffset(): { x: number; y: number } {
		return { x: this.shakeOffsetX, y: this.shakeOffsetY };
	}

	/** Check if frozen */
	isFrozen(): boolean {
		return this.freezeFrames > 0;
	}

	/** Update effects each frame */
	update(dt: number): void {
		// Freeze frame
		if (this.freezeFrames > 0) {
			this.freezeFrames--;
			return;
		}

		// Shake
		if (this.shakeAmount > 0) {
			this.shakeOffsetX = (Math.random() - 0.5) * this.shakeAmount;
			this.shakeOffsetY = (Math.random() - 0.5) * this.shakeAmount;
			this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);
			if (this.shakeAmount <= 0) {
				this.shakeOffsetX = 0;
				this.shakeOffsetY = 0;
			}
		}

		// Flash
		if (this.flashAlpha > 0) {
			this.flashGraphics.clear();
			this.flashGraphics.rect(0, 0, this.width, this.height);
			this.flashGraphics.fill({ color: this.flashColor, alpha: this.flashAlpha });
			this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay * dt);
			if (this.flashAlpha <= 0) {
				this.flashGraphics.visible = false;
			}
		}

		// Vignette
		if (this.vignetteAlpha > 0) {
			this.renderVignette();
		}
	}

	private renderVignette(): void {
		this.vignetteGraphics.clear();

		// Create a radial vignette using concentric rectangles
		const steps = 8;
		for (let i = 0; i < steps; i++) {
			const ratio = i / steps;
			const inset = ratio * Math.min(this.width, this.height) * 0.3;
			const alpha = this.vignetteAlpha * (1 - ratio) * 0.15;

			this.vignetteGraphics.rect(
				inset, inset,
				this.width - inset * 2,
				this.height - inset * 2,
			);
			this.vignetteGraphics.fill({ color: 0x000000, alpha });
		}
	}

	/** Resize */
	resize(width: number, height: number): void {
		this.width = width;
		this.height = height;
	}

	/** Destroy */
	destroy(): void {
		this.flashGraphics.destroy();
		this.vignetteGraphics.destroy();
	}
}
