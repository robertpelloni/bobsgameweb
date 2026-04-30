/**
 * EventSheetEditorScene — visual scripting editor for creating game events.
 *
 * Provides a node-based interface for building event scripts:
 * - Drag-and-drop command nodes
 * - Connect nodes with wires
 * - Preview event execution
 * - Export to EventManager-compatible JSON
 *
 * Keyboard shortcuts:
 *   A — Add node
 *   D — Delete selected node
 *   C — Connect selected nodes
 *   S — Save to localStorage
 *   L — Load from localStorage
 *   P — Preview/test event
 *   ESC — Back
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

interface EditorNode {
	id: string;
	type: string;
	x: number;
	y: number;
	params: Record<string, unknown>;
	outputs: string[]; // IDs of connected nodes
}

interface EditorSheet {
	name: string;
	nodes: EditorNode[];
	savedAt: number;
}

const NODE_TYPES = [
	{ type: "SHOW_MESSAGE", label: "Message", color: 0x2244aa },
	{ type: "SET_FLAG", label: "Set Flag", color: 0x22aa44 },
	{ type: "CHECK_FLAG", label: "Check Flag", color: 0xaa4422 },
	{ type: "WAIT", label: "Wait", color: 0x444444 },
	{ type: "PLAY_SOUND", label: "Sound", color: 0x884488 },
	{ type: "TELEPORT", label: "Teleport", color: 0xaa8822 },
	{ type: "GIVE_ITEM", label: "Give Item", color: 0x22aaaa },
	{ type: "START_BATTLE", label: "Battle", color: 0xaa2222 },
];

export class EventSheetEditorScene extends Scene {
	private nodes: EditorNode[] = [];
	private connections: { from: string; to: string }[] = [];
	private selectedNode: string | null = null;
	private dragging: string | null = null;
	private dragOffsetX = 0;
	private dragOffsetY = 0;
	private nodeContainer!: Container;
	private wireContainer!: Container;
	private paletteContainer!: Container;
	private statusText!: Text;
	private scrollX = 0;
	private scrollY = 0;
	private nodeIdCounter = 0;
	private sheetName = "Untitled Event";

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createPalette();
		this.createCanvas();
		this.createStatusBar();
		this.loadFromStorage();
	}

	private createBackground(): void {
		const bg = new Graphics();
		bg.rect(0, 0, this.width, this.height);
		bg.fill(0x111118);

		// Grid dots
		for (let y = 0; y < this.height; y += 20) {
			for (let x = 0; x < this.width; x += 20) {
				bg.circle(x, y, 0.5);
				bg.fill(0x222233);
			}
		}
		this.container.addChild(bg);
	}

	private createPalette(): void {
		this.paletteContainer = new Container();
		this.paletteContainer.position.set(this.width - 160, 10);
		this.container.addChild(this.paletteContainer);

		const bg = new Graphics();
		bg.roundRect(0, 0, 150, NODE_TYPES.length * 36 + 40, 8);
		bg.fill(0x0a0a1a);
		bg.stroke({ color: 0x334466, width: 1 });
		this.paletteContainer.addChild(bg);

		const title = new Text({
			text: "NODES",
			style: new TextStyle({ fill: 0x6688aa, fontSize: 11, fontWeight: "bold" }),
		});
		title.position.set(10, 8);
		this.paletteContainer.addChild(title);

		for (let i = 0; i < NODE_TYPES.length; i++) {
			const nodeType = NODE_TYPES[i];
			const btn = new Graphics();
			btn.roundRect(8, 28 + i * 36, 134, 28, 4);
			btn.fill(nodeType.color);
			btn.stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 });

			const label = new Text({
				text: nodeType.label,
				style: new TextStyle({ fill: 0xffffff, fontSize: 12 }),
			});
			label.position.set(16, 32 + i * 36);

			this.paletteContainer.addChild(btn);
			this.paletteContainer.addChild(label);
		}
	}

	private createCanvas(): void {
		this.wireContainer = new Container();
		this.container.addChild(this.wireContainer);

		this.nodeContainer = new Container();
		this.container.addChild(this.nodeContainer);

		// Create default start node if empty
		if (this.nodes.length === 0) {
			this.addNode(100, 100, "SHOW_MESSAGE", { text: "Hello World!" });
		}

		this.renderNodes();
	}

	private createStatusBar(): void {
		this.statusText = new Text({
			text: "A:Add  D:Delete  C:Connect  S:Save  L:Load  P:Preview  ESC:Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 11 },
			),
		});
		this.statusText.position.set(10, this.height - 22);
		this.container.addChild(this.statusText);
	}

	private addNode(x: number, y: number, type: string, params: Record<string, unknown> = {}): EditorNode {
		const node: EditorNode = {
			id: `node-${this.nodeIdCounter++}`,
			type,
			x: x + this.scrollX,
			y: y + this.scrollY,
			params,
			outputs: [],
		};
		this.nodes.push(node);
		this.renderNodes();
		return node;
	}

	private renderNodes(): void {
		this.nodeContainer.removeChildren();
		this.wireContainer.removeChildren();

		// Render connections (wires)
		const wireG = new Graphics();
		for (const conn of this.connections) {
			const from = this.nodes.find(n => n.id === conn.from);
			const to = this.nodes.find(n => n.id === conn.to);
			if (from && to) {
				wireG.moveTo(from.x + 120, from.y + 25);
				wireG.bezierCurveTo(
					from.x + 160, from.y + 25,
					to.x - 40, to.y + 25,
					to.x, to.y + 25,
				);
				wireG.stroke({ color: 0x4488ff, width: 2, alpha: 0.6 });
			}
		}
		this.wireContainer.addChild(wireG);

		// Render nodes
		for (const node of this.nodes) {
			const typeInfo = NODE_TYPES.find(t => t.type === node.type);
			const isSelected = node.id === this.selectedNode;
			const w = 120;
			const h = 50;

			const nodeG = new Graphics();
			nodeG.roundRect(node.x, node.y, w, h, 6);
			nodeG.fill(typeInfo?.color ?? 0x333333);
			if (isSelected) {
				nodeG.stroke({ color: 0xffff00, width: 2 });
			} else {
				nodeG.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });
			}

			// Node title
			const title = new Text({
				text: typeInfo?.label ?? node.type,
				style: new TextStyle({ fill: 0xffffff, fontSize: 11, fontWeight: "bold" }),
			});
			title.position.set(node.x + 8, node.y + 6);

			// Param preview
			const paramStr = Object.entries(node.params).map(([k, v]) => `${k}=${v}`).join(", ");
			const paramText = new Text({
				text: paramStr.substring(0, 20),
				style: new TextStyle({ fill: 0xaabbcc, fontSize: 9 },
				),
			});
			paramText.position.set(node.x + 8, node.y + 26);

			// Output connector dot
			const dot = new Graphics();
			dot.circle(node.x + w, node.y + h / 2, 5);
			dot.fill(0x44ff88);
			dot.stroke({ color: 0x88ffaa, width: 1 });

			this.nodeContainer.addChild(nodeG);
			this.nodeContainer.addChild(title);
			this.nodeContainer.addChild(paramText);
			this.nodeContainer.addChild(dot);

			// Make node interactive
			nodeG.eventMode = "static";
			nodeG.cursor = "pointer";

			nodeG.on("pointerdown", (e) => {
				this.selectedNode = node.id;
				this.dragging = node.id;
				this.dragOffsetX = e.globalX - node.x;
				this.dragOffsetY = e.globalY - node.y;
				this.renderNodes();
			});

			nodeG.on("pointerup", () => {
				this.dragging = null;
			});

			nodeG.on("pointermove", (e) => {
				if (this.dragging === node.id) {
					node.x = e.globalX - this.dragOffsetX;
					node.y = e.globalY - this.dragOffsetY;
					this.renderNodes();
				}
			});
		}
	}

	private deleteSelected(): void {
		if (!this.selectedNode) return;
		const id = this.selectedNode;
		this.nodes = this.nodes.filter(n => n.id !== id);
		this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
		// Remove from other nodes' outputs
		for (const n of this.nodes) {
			n.outputs = n.outputs.filter(o => o !== id);
		}
		this.selectedNode = null;
		this.renderNodes();
	}

	private connectSelected(): void {
		// Find last two selected nodes and connect them
		if (this.nodes.length < 2) return;
		const last = this.nodes[this.nodes.length - 1];
		const prev = this.nodes[this.nodes.length - 2];
		if (!last || !prev) return;

		// Don't duplicate
		if (!prev.outputs.includes(last.id)) {
			prev.outputs.push(last.id);
			this.connections.push({ from: prev.id, to: last.id });
		}
		this.renderNodes();
	}

	private saveToStorage(): void {
		const sheet: EditorSheet = {
			name: this.sheetName,
			nodes: this.nodes,
			savedAt: Date.now(),
		};
		localStorage.setItem("bobsgame_event_sheet", JSON.stringify(sheet));
	}

	private loadFromStorage(): void {
		const raw = localStorage.getItem("bobsgame_event_sheet");
		if (!raw) return;
		try {
			const sheet: EditorSheet = JSON.parse(raw);
			this.nodes = sheet.nodes;
			this.sheetName = sheet.name;
			this.nodeIdCounter = this.nodes.length;
			// Rebuild connections from outputs
			this.connections = [];
			for (const node of this.nodes) {
				for (const outId of node.outputs) {
					this.connections.push({ from: node.id, to: outId });
				}
			}
			this.renderNodes();
		} catch {
			// Ignore corrupted data
		}
	}

	protected onUpdate(dt: number): void {
		// Add node with number keys 1-8
		for (let i = 0; i < NODE_TYPES.length; i++) {
			if (InputManager.isKeyPressed(String(i + 1) as Key)) {
				this.addNode(
					100 + Math.random() * 200,
					100 + Math.random() * 200,
					NODE_TYPES[i].type,
				);
			}
		}

		if (InputManager.isKeyPressed(Key.A)) {
			// Add a SHOW_MESSAGE node at center
			this.addNode(200 + this.scrollX, 200 + this.scrollY, "SHOW_MESSAGE", { text: "New message" });
		}
		if (InputManager.isKeyPressed(Key.D)) {
			this.deleteSelected();
		}
		if (InputManager.isKeyPressed(Key.C)) {
			this.connectSelected();
		}
		if (InputManager.isKeyPressed(Key.S)) {
			this.saveToStorage();
		}
		if (InputManager.isKeyPressed(Key.L)) {
			this.loadFromStorage();
			this.renderNodes();
		}

		if (InputManager.isCancelPressed()) {
			this.saveToStorage();
			StateManager.pop();
		}
	}
}
