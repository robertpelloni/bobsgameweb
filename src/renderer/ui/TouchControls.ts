// @ts-nocheck
/**
 * TouchControls — mobile touch overlay with D-pad and action buttons.
 *
 * Enhanced version with RPG-specific actions (Interact, Menu, Back).
 * Auto-detects touch capability and only shows on touch devices.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class TouchControls extends Container {
	private dpad: Container;
	private buttons: Container;

	constructor(
		private screenWidth: number,
		private screenHeight: number,
	) {
		super();
		this.dpad = new Container();
		this.buttons = new Container();
		this.addChild(this.dpad);
		this.addChild(this.buttons);

		this.createDPad();
		this.createActionButtons();

		// Only show on touch-capable devices
		this.visible = "ontouchstart" in window || navigator.maxTouchPoints > 0;

		this.layout();
	}

	private createDPad(): void {
		const size = 50;
		const dirs = [
			{ key: "ArrowUp", x: 0, y: -size, label: "▲" },
			{ key: "ArrowDown", x: 0, y: size, label: "▼" },
			{ key: "ArrowLeft", x: -size, y: 0, label: "◀" },
			{ key: "ArrowRight", x: size, y: 0, label: "▶" },
		];

		for (const dir of dirs) {
			const btn = new Graphics();
			btn.circle(0, 0, 22);
			btn.fill({ color: 0xffffff, alpha: 0.15 });
			btn.stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
			btn.position.set(dir.x, dir.y);
			btn.eventMode = "static";

			const label = new Text({
				text: dir.label,
				style: new TextStyle({ fill: 0xffffff, fontSize: 14, alpha: 0.6 }),
			});
			label.anchor.set(0.5);
			btn.addChild(label);

			btn.on("pointerdown", () => this.simulateKey(dir.key, true));
			btn.on("pointerup", () => this.simulateKey(dir.key, false));
			btn.on("pointerupoutside", () => this.simulateKey(dir.key, false));
			this.dpad.addChild(btn);
		}
	}

	private createActionButtons(): void {
		const actions = [
			{ key: " ", x: 0, y: -40, color: 0x44ff44, label: "A" }, // Interact/Confirm
			{ key: "Escape", x: -45, y: 0, color: 0xff4444, label: "B" }, // Back/Cancel
			{ key: "e", x: 45, y: 0, color: 0x4488ff, label: "E" }, // Interact alt
		];

		for (const act of actions) {
			const btn = new Graphics();
			btn.circle(0, 0, 26);
			btn.fill({ color: act.color, alpha: 0.2 });
			btn.stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
			btn.position.set(act.x, act.y);
			btn.eventMode = "static";

			const label = new Text({
				text: act.label,
				style: new TextStyle({
					fill: 0xffffff,
					fontSize: 13,
					fontWeight: "bold",
				}),
			});
			label.anchor.set(0.5);
			btn.addChild(label);

			btn.on("pointerdown", () => this.simulateKey(act.key, true));
			btn.on("pointerup", () => this.simulateKey(act.key, false));
			btn.on("pointerupoutside", () => this.simulateKey(act.key, false));
			this.buttons.addChild(btn);
		}
	}

	private simulateKey(key: string, down: boolean): void {
		window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key }));
	}

	public layout(): void {
		this.dpad.position.set(90, this.screenHeight - 90);
		this.buttons.position.set(this.screenWidth - 100, this.screenHeight - 90);
	}

	public resize(width: number, height: number): void {
		this.screenWidth = width;
		this.screenHeight = height;
		this.layout();
	}
}
