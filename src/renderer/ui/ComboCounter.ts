/**
 * ComboCounter — animated HUD element displaying combo chain count.
 *
 * Features:
 * - Scale-up animation on combo increment
 * - Color gradient from green → yellow → red based on combo level
 * - Shake effect for high combos
 * - Auto-fade when combo drops
 *
 * Usage:
 *   const counter = new ComboCounter(400, 100);
 *   container.addChild(counter.container);
 *   counter.increment(); // combo++
 *   counter.reset();     // combo = 0
 *   counter.update(dt);  // animate
 */
import { Container, Graphics, Text, TextStyle, BlurFilter } from "pixi.js";

export class ComboCounter {
	public container: Container;
	private bgGfx: Graphics;
	private comboText: Text;
	private label: Text;
	private combo = 0;
	private scaleTarget = 1;
	private currentScale = 1;
	private opacity = 0;
	private shakeX = 0;
	private shakeY = 0;
	private time = 0;

	/** X, Y position of the combo counter center */
	private x: number;
	private y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;

		this.container = new Container();
		this.container.position.set(x, y);

		// Glow background
		this.bgGfx = new Graphics();
		this.container.addChild(this.bgGfx);

		// Combo number
		this.comboText = new Text({
			text: "0",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 36,
				fill: 0x44ff88,
				fontWeight: "bold",
				dropShadow: {
					alpha: 0.5,
					blur: 4,
					color: 0x000000,
					distance: 2,
				},
			}),
		});
		this.comboText.anchor.set(0.5);
		this.container.addChild(this.comboText);

		// Label
		this.label = new Text({
			text: "COMBO",
			style: new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 11,
				fill: 0x88aacc,
				fontWeight: "bold",
				letterSpacing: 3,
			}),
		});
		this.label.anchor.set(0.5);
		this.label.position.set(0, 28);
		this.container.addChild(this.label);
	}

	/** Increment combo and trigger animation */
	increment(): number {
		this.combo++;
		this.scaleTarget = 1.4; // Scale up on hit
		this.opacity = 1;

		this.comboText.text = String(this.combo);

		// Color based on combo level
		if (this.combo >= 10) {
			this.comboText.style.fill = 0xff2244; // Red for insane combos
			this.shakeX = 3;
		} else if (this.combo >= 5) {
			this.comboText.style.fill = 0xffaa22; // Orange for high combos
			this.shakeX = 2;
		} else if (this.combo >= 3) {
			this.comboText.style.fill = 0xffdd44; // Yellow for medium
			this.shakeX = 1;
		} else {
			this.comboText.style.fill = 0x44ff88; // Green for low
			this.shakeX = 0;
		}

		return this.combo;
	}

	/** Reset combo to zero */
	reset(): void {
		this.combo = 0;
		this.comboText.text = "0";
		this.opacity = 0;
		this.scaleTarget = 1;
		this.currentScale = 1;
		this.shakeX = 0;
		this.shakeY = 0;
	}

	/** Get current combo value */
	getCombo(): number {
		return this.combo;
	}

	/** Update animations each frame */
	update(dt: number): void {
		this.time += dt;

		// Smooth scale lerp
		this.currentScale += (this.scaleTarget - this.currentScale) * 0.12;
		this.container.scale.set(this.currentScale);

		// Scale settles back to 1
		if (this.scaleTarget > 1) {
			this.scaleTarget -= dt * 0.02;
			if (this.scaleTarget < 1) this.scaleTarget = 1;
		}

		// Opacity fade when combo is 0
		if (this.combo === 0) {
			this.opacity = Math.max(0, this.opacity - dt * 0.03);
		}

		this.container.alpha = this.combo > 0 ? 1 : this.opacity;

		// Shake decay
		if (this.shakeX > 0) {
			this.shakeX *= 0.9;
			this.shakeY = Math.sin(this.time * 0.5) * this.shakeX;
			this.container.position.set(
				this.x + (Math.random() - 0.5) * this.shakeX * 2,
				this.y + this.shakeY,
			);
		} else {
			this.container.position.set(this.x, this.y);
		}

		// Redraw background glow
		this.bgGfx.clear();
		if (this.combo > 0) {
			const glowSize = 30 + this.currentScale * 10;
			this.bgGfx.circle(0, 5, glowSize);
			this.bgGfx.fill({
				color: this.combo >= 10 ? 0xff2244 :
					this.combo >= 5 ? 0xffaa22 :
					this.combo >= 3 ? 0xffdd44 : 0x44ff88,
				alpha: 0.1 + Math.sin(this.time * 0.3) * 0.05,
			});
		}
	}

	/** Destroy all graphics resources */
	destroy(): void {
		this.container.destroy({ children: true });
	}
}
