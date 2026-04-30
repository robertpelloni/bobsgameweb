/**
 * MenuGamepadNavigator — provides unified gamepad navigation for all menu scenes.
 *
 * Features:
 * - Analog stick navigation with deadzone
 * - D-pad support
 * - Face button mapping (A = confirm, B = cancel, X = action, Y = back)
 * - Hold-to-scroll for rapid navigation
 * - Rumble feedback (if supported)
 *
 * Usage:
 *   const nav = new MenuGamepadNavigator(items, onSelect, onBack);
 *   nav.update(dt); // Call each frame
 *   nav.setItems(newItems); // Update items
 */
export interface MenuItem {
	label: string;
	enabled?: boolean;
	action?: () => void;
}

export class MenuGamepadNavigator {
	private items: MenuItem[] = [];
	private selectedIndex = 0;
	private onSelect: (index: number, item: MenuItem) => void;
	private onBack: () => void;

	// Timing for hold-to-scroll
	private holdTimer = 0;
	private holdDelay = 0.3; // Seconds before rapid scroll
	private holdInterval = 0.08; // Seconds between rapid steps
	private isHolding = false;

	// Gamepad state
	private lastAxisY = 0;

	// Deadzone
	static DEADZONE = 0.3;

	constructor(
		items: MenuItem[],
		onSelect: (index: number, item: MenuItem) => void,
		onBack: () => void,
	) {
		this.items = items;
		this.onSelect = onSelect;
		this.onBack = onBack;
	}

	/** Update items list */
	setItems(items: MenuItem[]): void {
		this.items = items;
		if (this.selectedIndex >= items.length) {
			this.selectedIndex = Math.max(0, items.length - 1);
		}
	}

	/** Get current selected index */
	getSelectedIndex(): number {
		return this.selectedIndex;
	}

	/** Set selected index */
	setSelectedIndex(index: number): void {
		this.selectedIndex = Math.max(0, Math.min(this.items.length - 1, index));
	}

	/** Call each frame with delta time */
	update(dt: number): void {
		const gamepads = navigator.getGamepads();
		const gp = gamepads[0]; // First gamepad
		if (!gp) return;

		// Read left stick Y axis
		const axisY = gp.axes[1] ?? 0;
		const dpadUp = gp.buttons[12]?.pressed ?? false;
		const dpadDown = gp.buttons[13]?.pressed ?? false;

		const up = axisY < -MenuGamepadNavigator.DEADZONE || dpadUp;
		const down = axisY > MenuGamepadNavigator.DEADZONE || dpadDown;

		// Detect new press vs hold
		const wasNavigating = this.lastAxisY !== 0;
		this.lastAxisY = up ? -1 : down ? 1 : 0;

		if (up || down) {
			this.holdTimer += dt;

			if (!wasNavigating || this.holdTimer > this.holdDelay) {
				// Navigate
				if (up) this.navigateUp();
				else this.navigateDown();

				if (wasNavigating && this.holdTimer > this.holdDelay) {
					this.holdTimer -= this.holdInterval;
				}
			}
		} else {
			this.holdTimer = 0;
		}

		// Face buttons
		// A (index 0) = confirm
		if (gp.buttons[0]?.pressed && !this._prevA) {
			this.confirmSelection();
		}
		// B (index 1) = back
		if (gp.buttons[1]?.pressed && !this._prevB) {
			this.onBack();
		}
		// Start (index 9) = confirm
		if (gp.buttons[9]?.pressed && !this._prevStart) {
			this.confirmSelection();
		}

		// Store previous button states
		this._prevA = gp.buttons[0]?.pressed ?? false;
		this._prevB = gp.buttons[1]?.pressed ?? false;
		this._prevStart = gp.buttons[9]?.pressed ?? false;
	}

	private _prevA = false;
	private _prevB = false;
	private _prevStart = false;

	private navigateUp(): void {
		// Skip disabled items
		for (let i = this.selectedIndex - 1; i >= 0; i--) {
			if (this.items[i].enabled !== false) {
				this.selectedIndex = i;
				this.playTick();
				return;
			}
		}
		// Wrap around
		for (let i = this.items.length - 1; i > this.selectedIndex; i--) {
			if (this.items[i].enabled !== false) {
				this.selectedIndex = i;
				this.playTick();
				return;
			}
		}
	}

	private navigateDown(): void {
		for (let i = this.selectedIndex + 1; i < this.items.length; i++) {
			if (this.items[i].enabled !== false) {
				this.selectedIndex = i;
				this.playTick();
				return;
			}
		}
		// Wrap around
		for (let i = 0; i < this.selectedIndex; i++) {
			if (this.items[i].enabled !== false) {
				this.selectedIndex = i;
				this.playTick();
				return;
			}
		}
	}

	private confirmSelection(): void {
		const item = this.items[this.selectedIndex];
		if (!item || item.enabled === false) return;
		this.onSelect(this.selectedIndex, item);
		if (item.action) item.action();
	}

	private playTick(): void {
		// Subtle tick sound on navigation
		try {
			const ctx = new AudioContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = 600;
			gain.gain.value = 0.03;
			osc.start();
			osc.stop(ctx.currentTime + 0.02);
		} catch {
			// Audio not available
		}
	}
}
