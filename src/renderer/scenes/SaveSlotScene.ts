/**
 * SaveSlotScene — save/load slot selection UI.
 *
 * Features:
 * - 3 save slots with preview data
 * - Save/Load/Delete modes
 * - Play time, map name, level display
 * - Timestamp with relative time ("2 hours ago")
 * - Auto-save slot
 *
 * Usage:
 *   const scene = new SaveSlotScene({ name: "save", app, mode: "save" });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

export interface SaveSlotData {
	index: number;
	playerName: string;
	mapName: string;
	level: number;
	playTime: number; // seconds
	timestamp: number;
	isEmpty: boolean;
}

export interface SaveSlotConfig extends SceneConfig {
	mode: "save" | "load";
	slots?: SaveSlotData[];
	onSave?: (slotIndex: number) => void;
	onLoad?: (slotIndex: number) => void;
	onDelete?: (slotIndex: number) => void;
}

function formatTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

function formatTimestamp(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(ts).toLocaleDateString();
}

const DEFAULT_SLOTS: SaveSlotData[] = [
	{ index: 0, playerName: "Hero", mapName: "TOWNYUU", level: 5, playTime: 3600, timestamp: Date.now() - 1800000, isEmpty: false },
	{ index: 1, playerName: "Bob", mapName: "Dark Forest", level: 12, playTime: 7200, timestamp: Date.now() - 86400000, isEmpty: false },
	{ index: 2, playerName: "", mapName: "", level: 0, playTime: 0, timestamp: 0, isEmpty: true },
];

export class SaveSlotScene extends Scene {
	private mode: "save" | "load";
	private slots: SaveSlotData[];
	private selectedSlot = 0;
	private slotContainers: Container[] = [];
	private headerText!: Text;
	private actionText!: Text;

	private onSave?: (slotIndex: number) => void;
	private onLoad?: (slotIndex: number) => void;
	private onDelete?: (slotIndex: number) => void;

	constructor(config: SaveSlotConfig) {
		super(config);
		this.mode = config.mode;
		this.slots = config.slots ?? DEFAULT_SLOTS;
		this.onSave = config.onSave;
		this.onLoad = config.onLoad;
		this.onDelete = config.onDelete;
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createSlots();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: Math.floor(0x08 + ratio * 0x0a) << 16 |
					Math.floor(0x0a + ratio * 0x0c) << 8 |
					Math.floor(0x16 + ratio * 0x14),
			});
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		this.headerText = new Text({
			text: this.mode === "save" ? "💾 SAVE GAME" : "📂 LOAD GAME",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 24,
				fill: this.mode === "save" ? 0x44ff88 : 0x4488ff,
				fontWeight: "bold",
			}),
		});
		this.headerText.anchor.set(0.5);
		this.headerText.position.set(this.width / 2, 25);
		this.container.addChild(this.headerText);
	}

	private createSlots(): void {
		const slotW = this.width - 60;
		const slotH = 90;
		const startY = 65;

		for (let i = 0; i < 3; i++) {
			const slot = this.slots[i] ?? { index: i, playerName: "", mapName: "", level: 0, playTime: 0, timestamp: 0, isEmpty: true };
			const container = new Container();
			container.position.set(30, startY + i * (slotH + 12));
			this.slotContainers.push(container);
			this.container.addChild(container);
		}
	}

	private createFooter(): void {
		this.actionText = new Text({
			text: "",
			style: new TextStyle({ fill: 0x44ff88, fontSize: 13 },
			),
		});
		this.actionText.anchor.set(0.5);
		this.actionText.position.set(this.width / 2, this.height - 42);
		this.container.addChild(this.actionText);

		const controls = new Text({
			text: "↑↓ Select  |  Enter: Confirm  |  DEL: Delete  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 11 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 18);
		this.container.addChild(controls);
	}

	private refreshUI(): void {
		const slotW = this.width - 60;
		const slotH = 90;

		for (let i = 0; i < 3; i++) {
			const container = this.slotContainers[i]!;
			container.removeChildren();

			const slot = this.slots[i]!;
			const isSelected = i === this.selectedSlot;

			// Slot background
			const bg = new Graphics();
			bg.roundRect(0, 0, slotW, slotH, 8);

			if (slot.isEmpty) {
				bg.fill({ color: 0x0a0a14, alpha: 0.7 });
				bg.stroke({ color: isSelected ? 0xffcc44 : 0x222233, width: isSelected ? 2 : 1 });
			} else {
				bg.fill({ color: isSelected ? 0x0f1420 : 0x0a0e18, alpha: 0.9 });
				bg.stroke({ color: isSelected ? 0xffcc44 : 0x334455, width: isSelected ? 2 : 1 });
			}
			container.addChild(bg);

			if (slot.isEmpty) {
				// Empty slot
				const emptyText = new Text({
					text: `SLOT ${i + 1} — EMPTY`,
					style: new TextStyle({
						fill: isSelected ? 0x556677 : 0x334455,
						fontSize: 16,
						fontWeight: "bold",
					}),
				});
				emptyText.anchor.set(0.5);
				emptyText.position.set(slotW / 2, slotH / 2);
				container.addChild(emptyText);
			} else {
				// Filled slot — show details
				const x = 16;

				// Slot number badge
				const badge = new Graphics();
				badge.roundRect(x, 10, 36, 28, 4);
				badge.fill(isSelected ? 0xffcc44 : 0x334455);
				container.addChild(badge);

				const num = new Text({
					text: String(i + 1),
					style: new TextStyle({
						fill: isSelected ? 0x000000 : 0xaabbcc,
						fontSize: 16,
						fontWeight: "bold",
					}),
				});
				num.anchor.set(0.5);
				num.position.set(x + 18, 24);
				container.addChild(num);

				// Player name
				const nameText = new Text({
					text: slot.playerName || "Unknown",
					style: new TextStyle({
						fill: 0xffffff,
						fontSize: 16,
						fontWeight: "bold",
					}),
				});
				nameText.position.set(x + 46, 10);
				container.addChild(nameText);

				// Map + Level
				const detailText = new Text({
					text: `📍 ${slot.mapName}  |  ⭐ Lv${slot.level}`,
					style: new TextStyle({ fill: 0x88aacc, fontSize: 12 },
					),
				});
				detailText.position.set(x + 46, 32);
				container.addChild(detailText);

				// Play time
				const timeText = new Text({
					text: `🕐 ${formatTime(slot.playTime)}`,
					style: new TextStyle({ fill: 0x667788, fontSize: 11 },
					),
				});
				timeText.position.set(x + 46, 52);
				container.addChild(timeText);

				// Timestamp
				const tsText = new Text({
					text: slot.timestamp > 0 ? `📅 ${formatTimestamp(slot.timestamp)}` : "",
					style: new TextStyle({ fill: 0x445566, fontSize: 10 },
					),
				});
				tsText.position.set(x + 46, 68);
				container.addChild(tsText);
			}

			// Selection indicator
			if (isSelected) {
				const arrow = new Text({
					text: "▸",
					style: new TextStyle({ fill: 0xffcc44, fontSize: 18, fontWeight: "bold" },
					),
				});
				arrow.position.set(-16, slotH / 2 - 10);
				container.addChild(arrow);
			}
		}
	}

	protected onUpdate(dt: number): void {
		// Navigation
		if (InputManager.isUpPressed()) {
			this.selectedSlot = Math.max(0, this.selectedSlot - 1);
			this.refreshUI();
		}
		if (InputManager.isDownPressed()) {
			this.selectedSlot = Math.min(2, this.selectedSlot + 1);
			this.refreshUI();
		}

		// Confirm
		if (InputManager.isActionPressed() || InputManager.isKeyPressed(Key.Enter)) {
			const slot = this.slots[this.selectedSlot]!;

			if (this.mode === "save") {
				this.actionText.text = `Saved to Slot ${this.selectedSlot + 1}!`;
				this.actionText.style.fill = 0x44ff88;
				if (this.onSave) this.onSave(this.selectedSlot);
			} else if (!slot.isEmpty) {
				this.actionText.text = `Loading Slot ${this.selectedSlot + 1}...`;
				this.actionText.style.fill = 0x4488ff;
				if (this.onLoad) this.onLoad(this.selectedSlot);
			} else {
				this.actionText.text = "Empty slot!";
				this.actionText.style.fill = 0xff4444;
			}
		}

		// Delete
		if ((InputManager as any).isKeyPressed("Delete") && this.mode === "load") {
			const slot = this.slots[this.selectedSlot]!;
			if (!slot.isEmpty) {
				this.actionText.text = `Deleted Slot ${this.selectedSlot + 1}`;
				this.actionText.style.fill = 0xff4444;
				if (this.onDelete) this.onDelete(this.selectedSlot);
			}
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
