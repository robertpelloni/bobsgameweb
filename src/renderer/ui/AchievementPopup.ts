/**
 * AchievementPopup — animated notification when achievements are unlocked.
 *
 * Features:
 * - Slides in from the top-right
 * - Gold border with icon
 * - Auto-dismiss after 3 seconds
 * - Queue system for multiple achievements
 *
 * Usage:
 *   const popup = new AchievementPopup(container, width);
 *   popup.show("First Blood", "Win your first battle", 0xff4444);
 *   popup.update(dt);
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

interface QueuedAchievement {
	title: string;
	description: string;
	color: number;
}

export class AchievementPopup {
	private container: Container;
	private width: number;
	private queue: QueuedAchievement[] = [];
	private currentPopup: Container | null = null;
	private slideY = -80;
	private targetY = 10;
	private state: "hidden" | "sliding_in" | "visible" | "sliding_out" = "hidden";
	private timer = 0;
	private displayDuration = 3;

	constructor(container: Container, width: number) {
		this.container = container;
		this.width = width;
	}

	/** Queue an achievement popup */
	show(title: string, description: string, color = 0xffaa00): void {
		this.queue.push({ title, description, color });

		if (this.state === "hidden") {
			this.showNext();
		}
	}

	/** Update animation */
	update(dt: number): void {
		if (this.state === "hidden") return;

		if (this.state === "sliding_in") {
			this.slideY += (this.targetY - this.slideY) * 0.1;
			if (Math.abs(this.slideY - this.targetY) < 1) {
				this.slideY = this.targetY;
				this.state = "visible";
				this.timer = 0;
			}
			if (this.currentPopup) {
				this.currentPopup.position.y = this.slideY;
			}
		}

		if (this.state === "visible") {
			this.timer += dt;
			if (this.timer >= this.displayDuration) {
				this.state = "sliding_out";
			}
		}

		if (this.state === "sliding_out") {
			this.slideY += (-80 - this.slideY) * 0.1;
			if (this.slideY < -70) {
				this.hide();
				if (this.queue.length > 0) {
					this.showNext();
				}
			}
			if (this.currentPopup) {
				this.currentPopup.position.y = this.slideY;
			}
		}
	}

	private showNext(): void {
		const achievement = this.queue.shift();
		if (!achievement) return;

		this.currentPopup = new Container();
		this.currentPopup.position.set(this.width - 280, -80);

		const popupW = 260;
		const popupH = 60;

		// Shadow
		const shadow = new Graphics();
		shadow.roundRect(3, 3, popupW, popupH, 8);
		shadow.fill({ color: 0x000000, alpha: 0.5 });
		this.currentPopup.addChild(shadow);

		// Background
		const bg = new Graphics();
		bg.roundRect(0, 0, popupW, popupH, 8);
		bg.fill({ color: 0x0a0a1a, alpha: 0.95 });
		bg.stroke({ color: achievement.color, width: 2 });
		this.currentPopup.addChild(bg);

		// Trophy icon
		const icon = new Text({
			text: "🏆",
			style: new TextStyle({ fontSize: 24 },
			),
		});
		icon.position.set(10, 10);
		this.currentPopup.addChild(icon);

		// "Achievement Unlocked!" label
		const label = new Text({
			text: "ACHIEVEMENT UNLOCKED",
			style: new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 8,
				fill: achievement.color,
				fontWeight: "bold",
				letterSpacing: 1,
			}),
		});
		label.position.set(45, 8);
		this.currentPopup.addChild(label);

		// Title
		const title = new Text({
			text: achievement.title,
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 14,
				fill: 0xffffff,
				fontWeight: "bold",
			}),
		});
		title.position.set(45, 22);
		this.currentPopup.addChild(title);

		// Description
		const desc = new Text({
			text: achievement.description,
			style: new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 10,
				fill: 0x88aacc,
			}),
		});
		desc.position.set(45, 40);
		this.currentPopup.addChild(desc);

		this.container.addChild(this.currentPopup);

		this.slideY = -80;
		this.state = "sliding_in";
	}

	private hide(): void {
		if (this.currentPopup) {
			this.currentPopup.destroy({ children: true });
			this.currentPopup = null;
		}
		this.state = "hidden";
		this.slideY = -80;
	}

	/** Destroy all */
	destroy(): void {
		this.hide();
		this.queue = [];
	}
}
