/**
 * MapTransition — animated transitions between game maps/areas.
 *
 * Transitions:
 * - Fade (black/white)
 * - Slide (left/right/up/down)
 * - Door (iris wipe)
 * - Warp (dissolve with particles)
 * - Instant (no animation)
 *
 * Usage:
 *   const transition = new MapTransition(container, width, height);
 *   transition.play("fade", 0.5, () => {
 *     // Swap map here
 *     loadNewMap();
 *   });
 *   transition.update(dt);
 */
import { Container, Graphics } from "pixi.js";

export type TransitionType = "fade" | "slide_left" | "slide_right" | "slide_up" | "slide_down" | "door" | "warp" | "instant";

export class MapTransition {
	private container: Container;
	private overlay: Graphics;
	private width: number;
	private height: number;

	private active = false;
	private progress = 0; // 0 to 1
	private duration = 0.5;
	private type: TransitionType = "fade";
	private midpointReached = false;
	private onMidpoint?: () => void;
	private onComplete?: () => void;

	constructor(container: Container, width: number, height: number) {
		this.container = container;
		this.width = width;
		this.height = height;

		this.overlay = new Graphics();
		this.overlay.visible = false;
		container.addChild(this.overlay);
	}

	/** Play a transition */
	play(type: TransitionType, duration: number, onMidpoint?: () => void, onComplete?: () => void): void {
		this.type = type;
		this.duration = duration;
		this.progress = 0;
		this.midpointReached = false;
		this.onMidpoint = onMidpoint;
		this.onComplete = onComplete;
		this.active = true;
		this.overlay.visible = true;
	}

	/** Check if transition is playing */
	isActive(): boolean {
		return this.active;
	}

	/** Update transition animation */
	update(dt: number): void {
		if (!this.active) return;

		this.progress += dt / this.duration;

		// Midpoint callback (progress = 0.5)
		if (!this.midpointReached && this.progress >= 0.5) {
			this.midpointReached = true;
			if (this.onMidpoint) this.onMidpoint();
		}

		// Complete
		if (this.progress >= 1) {
			this.progress = 1;
			this.active = false;
			this.overlay.visible = false;
			this.overlay.clear();
			if (this.onComplete) this.onComplete();
			return;
		}

		this.render();
	}

	private render(): void {
		this.overlay.clear();

		switch (this.type) {
			case "fade":
				this.renderFade();
				break;
			case "slide_left":
			case "slide_right":
			case "slide_up":
			case "slide_down":
				this.renderSlide();
				break;
			case "door":
				this.renderDoor();
				break;
			case "warp":
				this.renderWarp();
				break;
			case "instant":
				// No visual — just triggers midpoint/complete
				break;
		}
	}

	private renderFade(): void {
		// Fade to black in first half, fade from black in second half
		let alpha: number;
		if (this.progress < 0.5) {
			alpha = this.progress * 2; // 0 → 1
		} else {
			alpha = (1 - this.progress) * 2; // 1 → 0
		}

		this.overlay.rect(0, 0, this.width, this.height);
		this.overlay.fill({ color: 0x000000, alpha });
	}

	private renderSlide(): void {
		let alpha: number;
		let offsetX = 0;
		let offsetY = 0;

		if (this.progress < 0.5) {
			alpha = 1;
			const t = this.progress * 2;
			switch (this.type) {
				case "slide_left": offsetX = -this.width * t; break;
				case "slide_right": offsetX = this.width * t; break;
				case "slide_up": offsetY = -this.height * t; break;
				case "slide_down": offsetY = this.height * t; break;
			}
		} else {
			alpha = 1;
			const t = (this.progress - 0.5) * 2;
			switch (this.type) {
				case "slide_left": offsetX = -this.width * (1 - t); break;
				case "slide_right": offsetX = this.width * (1 - t); break;
				case "slide_up": offsetY = -this.height * (1 - t); break;
				case "slide_down": offsetY = this.height * (1 - t); break;
			}
		}

		this.overlay.rect(offsetX, offsetY, this.width, this.height);
		this.overlay.fill({ color: 0x000000, alpha });
	}

	private renderDoor(): void {
		// Iris wipe — horizontal closing/opening
		let widthRatio: number;
		if (this.progress < 0.5) {
			widthRatio = 1 - this.progress * 2; // 1 → 0
		} else {
			widthRatio = (this.progress - 0.5) * 2; // 0 → 1
		}

		const halfW = (this.width / 2) * widthRatio;

		// Left curtain
		this.overlay.rect(0, 0, this.width / 2 - halfW, this.height);
		this.overlay.fill({ color: 0x000000 });

		// Right curtain
		this.overlay.rect(this.width / 2 + halfW, 0, this.width / 2 - halfW, this.height);
		this.overlay.fill({ color: 0x000000 });
	}

	private renderWarp(): void {
		// Dissolve with diagonal lines
		let alpha: number;
		if (this.progress < 0.5) {
			alpha = this.progress * 2;
		} else {
			alpha = (1 - this.progress) * 2;
		}

		// Diagonal stripes
		const stripeWidth = 40;
		const numStripes = Math.ceil(this.width / stripeWidth) + 2;
		const offset = this.progress * stripeWidth * 4;

		for (let i = 0; i < numStripes; i++) {
			const x = i * stripeWidth - offset;
			const stripeAlpha = alpha * (0.5 + 0.5 * Math.sin(i * 0.5));
			this.overlay.rect(x, 0, stripeWidth / 2, this.height);
			this.overlay.fill({ color: 0x2200aa, alpha: stripeAlpha });
		}

		// Overall overlay
		this.overlay.rect(0, 0, this.width, this.height);
		this.overlay.fill({ color: 0x000000, alpha: alpha * 0.7 });
	}

	/** Destroy */
	destroy(): void {
		this.overlay.destroy();
	}
}
