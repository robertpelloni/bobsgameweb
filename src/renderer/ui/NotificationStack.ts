/**
 * NotificationStack — manages stacked notifications with priorities and categories.
 *
 * Features:
 * - Priority levels (low, normal, high, critical)
 * - Categories (system, combat, quest, social, achievement)
 * - Stacking with max visible count
 * - Auto-dismiss with configurable duration
 * - Color-coded by priority
 * - Smooth slide-in/out animations
 *
 * Usage:
 *   const stack = new NotificationStack(container, width, height);
 *   stack.push("Level Up!", "You reached level 5!", "achievement", "high");
 *   stack.update(dt);
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationCategory = "system" | "combat" | "quest" | "social" | "achievement" | "weather" | "craft";

interface Notification {
	title: string;
	description: string;
	category: NotificationCategory;
	priority: NotificationPriority;
	timer: number;
	duration: number;
	container: Container;
	state: "in" | "visible" | "out";
	slideX: number;
}

const PRIORITY_COLORS: Record<NotificationPriority, number> = {
	low: 0x445566,
	normal: 0x4488aa,
	high: 0xffaa44,
	critical: 0xff4444,
};

const CATEGORY_ICONS: Record<NotificationCategory, string> = {
	system: "⚙",
	combat: "⚔",
	quest: "📋",
	social: "💬",
	achievement: "🏆",
	weather: "🌤",
	craft: "⚒",
};

export class NotificationStack {
	private parentContainer: Container;
	private container: Container;
	private notifications: Notification[] = [];
	private maxVisible = 5;
	private width: number;
	private height: number;
	private defaultDuration = 4;

	constructor(container: Container, width: number, height: number) {
		this.parentContainer = container;
		this.container = new Container();
		this.width = width;
		this.height = height;
		container.addChild(this.container);
	}

	/** Push a new notification */
	push(
		title: string,
		description: string,
		category: NotificationCategory = "system",
		priority: NotificationPriority = "normal",
		duration?: number,
	): void {
		const notifWidth = 240;
		const notifHeight = 50;
		const startX = this.width + 10;
		const color = PRIORITY_COLORS[priority];
		const icon = CATEGORY_ICONS[category];

		// Create notification container
		const notifContainer = new Container();
		notifContainer.position.set(startX, 0);

		// Shadow
		const shadow = new Graphics();
		shadow.roundRect(3, 3, notifWidth, notifHeight, 6);
		shadow.fill({ color: 0x000000, alpha: 0.4 });
		notifContainer.addChild(shadow);

		// Background
		const bg = new Graphics();
		bg.roundRect(0, 0, notifWidth, notifHeight, 6);
		bg.fill({ color: 0x0a0a1a, alpha: 0.92 });
		bg.stroke({ color, width: priority === "critical" ? 2 : 1 });
		notifContainer.addChild(bg);

		// Left accent bar
		const accent = new Graphics();
		accent.roundRect(0, 0, 4, notifHeight, 2);
		accent.fill(color);
		notifContainer.addChild(accent);

		// Icon
		const iconText = new Text({
			text: icon,
			style: new TextStyle({ fontSize: 16 },
			),
		});
		iconText.position.set(10, 8);
		notifContainer.addChild(iconText);

		// Title
		const titleText = new Text({
			text: title,
			style: new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 12,
				fill: 0xffffff,
				fontWeight: "bold",
			}),
		});
		titleText.position.set(34, 6);
		notifContainer.addChild(titleText);

		// Description
		const descText = new Text({
			text: description.substring(0, 40),
			style: new TextStyle({
				fontFamily: "Arial, sans-serif",
				fontSize: 10,
				fill: 0x8899aa,
			}),
		});
		descText.position.set(34, 24);
		notifContainer.addChild(descText);

		this.container.addChild(notifContainer);

		const notif: Notification = {
			title,
			description,
			category,
			priority,
			timer: 0,
			duration: duration ?? this.defaultDuration,
			container: notifContainer,
			state: "in",
			slideX: startX,
		};

		this.notifications.push(notif);

		// Remove oldest if over max
		while (this.notifications.length > this.maxVisible) {
			this.removeNotification(0);
		}
	}

	/** Update all notifications */
	update(dt: number): void {
		const targetX = this.width - 255;

		for (let i = this.notifications.length - 1; i >= 0; i--) {
			const notif = this.notifications[i];

			// Calculate target Y based on stack position
			const targetY = 40 + i * 56;

			if (notif.state === "in") {
				notif.slideX += (targetX - notif.slideX) * 0.12;
				if (Math.abs(notif.slideX - targetX) < 2) {
					notif.slideX = targetX;
					notif.state = "visible";
					notif.timer = 0;
				}
			}

			if (notif.state === "visible") {
				notif.timer += dt;
				if (notif.timer >= notif.duration) {
					notif.state = "out";
				}
			}

			if (notif.state === "out") {
				notif.slideX += (this.width + 20 - notif.slideX) * 0.1;
				if (notif.slideX > this.width + 10) {
					this.removeNotification(i);
					continue;
				}
			}

			// Smooth Y positioning
			const currentY = notif.container.position.y;
			notif.container.position.set(
				notif.slideX,
				currentY + (targetY - currentY) * 0.15,
			);

			// Fade out near end
			if (notif.state === "out") {
				notif.container.alpha = Math.max(0, (this.width + 10 - notif.slideX) / 50);
			}
		}
	}

	/** Remove a notification by index */
	private removeNotification(index: number): void {
		if (index < 0 || index >= this.notifications.length) return;
		const notif = this.notifications[index]!;
		this.container.removeChild(notif.container);
		notif.container.destroy({ children: true });
		this.notifications.splice(index, 1);
	}

	/** Clear all notifications */
	clear(): void {
		for (const notif of this.notifications) {
			this.container.removeChild(notif.container);
			notif.container.destroy({ children: true });
		}
		this.notifications = [];
	}

	/** Get active notification count */
	getCount(): number {
		return this.notifications.length;
	}

	/** Destroy */
	destroy(): void {
		this.clear();
		this.container.destroy();
	}
}
