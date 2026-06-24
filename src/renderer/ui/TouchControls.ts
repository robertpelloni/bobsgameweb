// @ts-nocheck
/**
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
 * TouchControls — mobile touch overlay with D-pad and action buttons.
 *
 * Enhanced version with RPG-specific actions (Interact, Menu, Back).
 * Auto-detects touch capability and only shows on touch devices.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class TouchControls extends Container {
	private dpad: Container;
	private buttons: Container;

<<<<<<< HEAD
=======
 * TouchControls — mobile touch overlay with virtual joystick and action buttons.
 */
import { Container, Graphics, Text, TextStyle, FederatedPointerEvent } from "pixi.js";

export class TouchControls extends Container {
	private joystick: Container;
	private joystickBase: Graphics;
	private joystickHandle: Graphics;
	private buttons: Container;

	private isJoystickActive = false;
	private joystickPointerId: number | null = null;
	private currentDir: { x: number; y: number } = { x: 0, y: 0 };
	private activeKeys: Set<string> = new Set();

>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
	constructor(
		private screenWidth: number,
		private screenHeight: number,
	) {
		super();
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
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
<<<<<<< HEAD
=======
		this.joystick = new Container();
		this.buttons = new Container();
		this.addChild(this.joystick);
		this.addChild(this.buttons);

		this.createJoystick();
		this.createActionButtons();

		this.visible = "ontouchstart" in window || navigator.maxTouchPoints > 0;
		this.layout();
	}

	private createJoystick(): void {
		const radius = 60;
		this.joystickBase = new Graphics();
		this.joystickBase.circle(0, 0, radius);
		this.joystickBase.fill({ color: 0xffffff, alpha: 0.1 });
		this.joystickBase.stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
		this.joystick.addChild(this.joystickBase);

		this.joystickHandle = new Graphics();
		this.joystickHandle.circle(0, 0, 25);
		this.joystickHandle.fill({ color: 0xffffff, alpha: 0.25 });
		this.joystickHandle.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
		this.joystick.addChild(this.joystickHandle);

		this.joystickBase.eventMode = "static";
		this.joystickBase.on("pointerdown", this.onJoystickDown, this);
		this._onPointerMove = this.onJoystickMove.bind(this);
		this._onPointerUp = this.onJoystickUp.bind(this);
		window.addEventListener("pointermove", this._onPointerMove);
		window.addEventListener("pointerup", this._onPointerUp);
	}

	public destroy(options?: any): void {
		window.removeEventListener("pointermove", this._onPointerMove);
		window.removeEventListener("pointerup", this._onPointerUp);
		super.destroy(options);
	}

	private onJoystickDown(e: FederatedPointerEvent): void {
		this.isJoystickActive = true;
		this.joystickPointerId = e.pointerId;
		this.updateJoystick(e.global.x, e.global.y);
	}

	private onJoystickMove(e: PointerEvent): void {
		if (!this.isJoystickActive || e.pointerId !== this.joystickPointerId) return;
		this.updateJoystick(e.clientX, e.clientY);
	}

	private onJoystickUp(e: PointerEvent): void {
		if (e.pointerId !== this.joystickPointerId) return;
		this.isJoystickActive = false;
		this.joystickPointerId = null;
		this.joystickHandle.position.set(0, 0);
		this.resetJoystickKeys();
	}

	private updateJoystick(worldX: number, worldY: number): void {
		const localPos = this.joystick.toLocal({ x: worldX, y: worldY });
		const dist = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);
		const maxRadius = 60;

		if (dist > maxRadius) {
			const angle = Math.atan2(localPos.y, localPos.x);
			this.joystickHandle.x = Math.cos(angle) * maxRadius;
			this.joystickHandle.y = Math.sin(angle) * maxRadius;
		} else {
			this.joystickHandle.x = localPos.x;
			this.joystickHandle.y = localPos.y;
		}

		// Convert joystick position to directional keys
		const dx = this.joystickHandle.x / maxRadius;
		const dy = this.joystickHandle.y / maxRadius;

		this.processJoystickInput(dx, dy);
	}

	private processJoystickInput(dx: number, dy: number): void {
		const threshold = 0.3;
		const newKeys = new Set<string>();

		if (dy < -threshold) newKeys.add("ArrowUp");
		if (dy > threshold) newKeys.add("ArrowDown");
		if (dx < -threshold) newKeys.add("ArrowLeft");
		if (dx > threshold) newKeys.add("ArrowRight");

		// Release keys no longer active
		for (const key of this.activeKeys) {
			if (!newKeys.has(key)) {
				this.simulateKey(key, false);
			}
		}

		// Press new keys
		for (const key of newKeys) {
			if (!this.activeKeys.has(key)) {
				this.simulateKey(key, true);
			}
		}

		this.activeKeys = newKeys;
	}

	private resetJoystickKeys(): void {
		for (const key of this.activeKeys) {
			this.simulateKey(key, false);
		}
		this.activeKeys.clear();
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
	}

	private createActionButtons(): void {
		const actions = [
<<<<<<< HEAD
<<<<<<< HEAD
			{ key: " ", x: 0, y: -40, color: 0x44ff44, label: "A" }, // Interact/Confirm
			{ key: "Escape", x: -45, y: 0, color: 0xff4444, label: "B" }, // Back/Cancel
			{ key: "e", x: 45, y: 0, color: 0x4488ff, label: "E" }, // Interact alt
=======
			{ key: " ", x: 0, y: -45, color: 0x44ff44, label: "A" },
			{ key: "Escape", x: -50, y: 0, color: 0xff4444, label: "B" },
			{ key: "e", x: 50, y: 0, color: 0x4488ff, label: "E" },
			{ key: "i", x: -40, y: -65, color: 0xffff44, label: "INV", small: true },
			{ key: "q", x: 40, y: -65, color: 0xff88ff, label: "QST", small: true },
			{ key: "Shift", x: 0, y: 45, color: 0x888888, label: "RUN", small: true },
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
			{ key: " ", x: 0, y: -40, color: 0x44ff44, label: "A" }, // Interact/Confirm
			{ key: "Escape", x: -45, y: 0, color: 0xff4444, label: "B" }, // Back/Cancel
			{ key: "e", x: 45, y: 0, color: 0x4488ff, label: "E" }, // Interact alt
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
		];

		for (const act of actions) {
			const btn = new Graphics();
<<<<<<< HEAD
<<<<<<< HEAD
			btn.circle(0, 0, 26);
			btn.fill({ color: act.color, alpha: 0.2 });
			btn.stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
=======
			const radius = act.small ? 20 : 26;
			btn.circle(0, 0, radius);
			btn.fill({ color: act.color, alpha: 0.25 });
			btn.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
			btn.circle(0, 0, 26);
			btn.fill({ color: act.color, alpha: 0.2 });
			btn.stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
			btn.position.set(act.x, act.y);
			btn.eventMode = "static";

			const label = new Text({
				text: act.label,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
				style: new TextStyle({
					fill: 0xffffff,
					fontSize: 13,
					fontWeight: "bold",
				}),
<<<<<<< HEAD
=======
				style: new TextStyle({ fill: 0xffffff, fontSize: act.small ? 9 : 13, fontWeight: "bold" }),
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
		if (down && "vibrate" in navigator) {
			const intensity = parseInt(localStorage.getItem("haptic-intensity") || "10");
			if (intensity > 0) navigator.vibrate(intensity);
		}
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
		window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key }));
	}

	public layout(): void {
<<<<<<< HEAD
<<<<<<< HEAD
		this.dpad.position.set(90, this.screenHeight - 90);
=======
		this.joystick.position.set(100, this.screenHeight - 100);
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
		this.dpad.position.set(90, this.screenHeight - 90);
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
		this.buttons.position.set(this.screenWidth - 100, this.screenHeight - 90);
	}

	public resize(width: number, height: number): void {
		this.screenWidth = width;
		this.screenHeight = height;
		this.layout();
	}
}
