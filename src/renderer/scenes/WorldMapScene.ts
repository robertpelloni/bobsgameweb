/**
 * WorldMapScene — overworld navigation map showing all game locations.
 *
 * Features:
 * - Node-based map with location icons
 * - Animated connection paths between locations
 * - Current location highlight with pulse
 * - Danger level indicators
 * - Location info panel
 * - Travel confirmation
 * - Fog of war (undiscovered areas hidden)
 *
 * Usage:
 *   const scene = new WorldMapScene({ name: "world-map", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

interface MapNode {
	id: string;
	name: string;
	x: number; // 0-1 ratio
	y: number; // 0-1 ratio
	type: "town" | "dungeon" | "wild" | "beach" | "secret";
	dangerLevel: number; // 0-5
	enemies: number;
	discovered: boolean;
	description: string;
}

interface MapEdge {
	from: string;
	to: string;
	bidirectional: boolean;
}

const NODE_ICONS: Record<string, string> = {
	town: "🏘",
	dungeon: "⚔",
	wild: "🌲",
	beach: "🏖",
	secret: "❓",
};

const DANGER_COLORS: Record<number, number> = {
	0: 0x44ff88,
	1: 0x88ff44,
	2: 0xffcc44,
	3: 0xff8844,
	4: 0xff4444,
	5: 0xff2222,
};

const NODES: MapNode[] = [
	{ id: "townyuu", name: "TOWNYUU", x: 0.3, y: 0.35, type: "town", dangerLevel: 0, enemies: 0, discovered: true, description: "A peaceful starter town. Safe haven with shops and NPCs." },
	{ id: "dark_forest", name: "Dark Forest", x: 0.55, y: 0.25, type: "wild", dangerLevel: 3, enemies: 5, discovered: true, description: "A dense, dangerous forest filled with goblins, wolves, and darker things." },
	{ id: "beach", name: "Sunset Beach", x: 0.3, y: 0.7, type: "beach", dangerLevel: 1, enemies: 2, discovered: true, description: "Golden sands and gentle waves. Crabs and jellyfish roam the shore." },
	{ id: "dragon_lair", name: "Dragon's Lair", x: 0.8, y: 0.2, type: "dungeon", dangerLevel: 5, enemies: 4, discovered: true, description: "A volcanic cavern. The Ancient Dragon awaits in its deepest chamber." },
	{ id: "mystic_cave", name: "Mystic Cave", x: 0.6, y: 0.55, type: "secret", dangerLevel: 4, enemies: 3, discovered: false, description: "???" },
	{ id: "ancient_ruins", name: "Ancient Ruins", x: 0.2, y: 0.5, type: "dungeon", dangerLevel: 3, enemies: 4, discovered: false, description: "???" },
];

const EDGES: MapEdge[] = [
	{ from: "townyuu", to: "dark_forest", bidirectional: true },
	{ from: "townyuu", to: "beach", bidirectional: true },
	{ from: "dark_forest", to: "dragon_lair", bidirectional: true },
	{ from: "dark_forest", to: "mystic_cave", bidirectional: true },
	{ from: "beach", to: "ancient_ruins", bidirectional: true },
	{ from: "mystic_cave", to: "dragon_lair", bidirectional: true },
];

export class WorldMapScene extends Scene {
	private nodes: MapNode[];
	private edges: MapEdge[];
	private selectedNodeId = "townyuu";
	private currentNodeId = "townyuu";
	private mapContainer!: Container;
	private infoPanel!: Container;
	private headerText!: Text;
	private time = 0;

	constructor(config: SceneConfig) {
		super(config);
		this.nodes = NODES.map(n => ({ ...n }));
		this.edges = [...EDGES];
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createMapArea();
		this.createInfoPanel();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: (Math.floor(0x06 + ratio * 0x04) << 16) |
					(Math.floor(0x08 + ratio * 0x06) << 8) |
					Math.floor(0x10 + ratio * 0x0c),
			});
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		this.headerText = new Text({
			text: "🗺 WORLD MAP",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 20,
				fill: 0xffcc44,
				fontWeight: "bold",
				dropShadow: { alpha: 0.3, blur: 4, distance: 2, color: 0x000000 },
			}),
		});
		this.headerText.anchor.set(0.5, 0);
		this.headerText.position.set(this.width / 2, 4);
		this.container.addChild(this.headerText);
	}

	private createMapArea(): void {
		this.mapContainer = new Container();
		this.mapContainer.position.set(10, 28);
		this.container.addChild(this.mapContainer);
	}

	private createInfoPanel(): void {
		this.infoPanel = new Container();
		this.infoPanel.position.set(10, this.height - 80);
		this.container.addChild(this.infoPanel);
	}

	private createFooter(): void {
		const controls = new Text({
			text: "WASD/Arrows: Move  |  Enter: Travel  |  TAB: Cycle  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 5);
		this.container.addChild(controls);
	}

	private getAdjacentNodeIds(nodeId: string): string[] {
		const ids: string[] = [];
		for (const edge of this.edges) {
			if (edge.from === nodeId && this.nodes.find(n => n.id === edge.to)?.discovered) {
				ids.push(edge.to);
			}
			if (edge.to === nodeId && edge.bidirectional && this.nodes.find(n => n.id === edge.from)?.discovered) {
				ids.push(edge.from);
			}
		}
		return ids;
	}

	private refreshUI(): void {
		this.renderMap();
		this.renderInfoPanel();
	}

	private renderMap(): void {
		this.mapContainer.removeChildren();
		const mapW = this.width - 20;
		const mapH = this.height - 120;

		// Map border
		const border = new Graphics();
		border.roundRect(0, 0, mapW, mapH, 6);
		border.fill({ color: 0x080c14, alpha: 0.6 });
		border.stroke({ color: 0x223344, width: 1 });
		this.mapContainer.addChild(border);

		// Draw edges first (connections)
		const edgeGraphics = new Graphics();
		for (const edge of this.edges) {
			const fromNode = this.nodes.find(n => n.id === edge.from);
			const toNode = this.nodes.find(n => n.id === edge.to);
			if (!fromNode?.discovered || !toNode?.discovered) continue;

			const fx = fromNode.x * mapW;
			const fy = fromNode.y * mapH;
			const tx = toNode.x * mapW;
			const ty = toNode.y * mapH;

			const isHighlighted = edge.from === this.selectedNodeId || edge.to === this.selectedNodeId;
			edgeGraphics.moveTo(fx, fy);
			edgeGraphics.lineTo(tx, ty);
			edgeGraphics.stroke({
				color: isHighlighted ? 0x446688 : 0x1a2838,
				width: isHighlighted ? 2 : 1,
			});

			// Animated dots along path
			if (isHighlighted) {
				const dotCount = 3;
				for (let d = 0; d < dotCount; d++) {
					const t = ((this.time * 0.5 + d / dotCount) % 1);
					const dx = fx + (tx - fx) * t;
					const dy = fy + (ty - fy) * t;
					edgeGraphics.circle(dx, dy, 2);
					edgeGraphics.fill({ color: 0x4488aa, alpha: 0.6 });
				}
			}
		}
		this.mapContainer.addChild(edgeGraphics);

		// Draw nodes
		for (const node of this.nodes) {
			if (!node.discovered) continue;

			const nx = node.x * mapW;
			const ny = node.y * mapH;
			const isSelected = node.id === this.selectedNodeId;
			const isCurrent = node.id === this.currentNodeId;
			const dangerColor = DANGER_COLORS[node.dangerLevel] ?? 0x888888;

			// Node glow for current location
			if (isCurrent) {
				const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
				const glow = new Graphics();
				glow.circle(nx, ny, 18);
				glow.fill({ color: 0x44ff88, alpha: pulse * 0.15 });
				this.mapContainer.addChild(glow);
			}

			// Node circle
			const circle = new Graphics();
			circle.circle(nx, ny, isSelected ? 14 : 10);
			circle.fill({ color: 0x0c1018, alpha: 0.9 });
			circle.stroke({ color: isSelected ? dangerColor : 0x334455, width: isSelected ? 3 : 1.5 });
			this.mapContainer.addChild(circle);

			// Inner icon circle
			const inner = new Graphics();
			inner.circle(nx, ny, 6);
			inner.fill(dangerColor);
			this.mapContainer.addChild(inner);

			// Type icon
			const icon = new Text({
				text: NODE_ICONS[node.type] ?? "?",
				style: new TextStyle({ fontSize: 10 },
				),
			});
			icon.anchor.set(0.5);
			icon.position.set(nx, ny - 0.5);
			this.mapContainer.addChild(icon);

			// Name label
			const nameText = new Text({
				text: node.name,
				style: new TextStyle({
					fill: isSelected ? 0xffffff : 0x88aacc,
					fontSize: isSelected ? 10 : 8,
					fontWeight: isSelected ? "bold" : "normal",
				}),
			});
			nameText.anchor.set(0.5);
			nameText.position.set(nx, ny + (isSelected ? 20 : 16));
			this.mapContainer.addChild(nameText);

			// Danger stars
			if (node.dangerLevel > 0) {
				const stars = "★".repeat(node.dangerLevel);
				const starText = new Text({
					text: stars,
					style: new TextStyle({ fill: dangerColor, fontSize: 7 },
					),
				});
				starText.anchor.set(0.5);
				starText.position.set(nx, ny + (isSelected ? 30 : 24));
				this.mapContainer.addChild(starText);
			}

			// Selection arrow
			if (isSelected) {
				const arrow = new Text({
					text: "▼",
					style: new TextStyle({ fill: 0xffcc44, fontSize: 10 },
					),
				});
				arrow.anchor.set(0.5);
				arrow.position.set(nx, ny - 22);
				this.mapContainer.addChild(arrow);
			}
		}
	}

	private renderInfoPanel(): void {
		this.infoPanel.removeChildren();
		const node = this.nodes.find(n => n.id === this.selectedNodeId);
		if (!node) return;

		const panelW = this.width - 20;
		const panelH = 65;
		const dangerColor = DANGER_COLORS[node.dangerLevel] ?? 0x888888;

		const bg = new Graphics();
		bg.roundRect(0, 0, panelW, panelH, 6);
		bg.fill({ color: 0x0c1018, alpha: 0.95 });
		bg.stroke({ color: node.discovered ? dangerColor : 0x334455, width: 1 });
		this.infoPanel.addChild(bg);

		// Name + type
		const nameText = new Text({
			text: `${NODE_ICONS[node.type] ?? "?"} ${node.name}`,
			style: new TextStyle({
				fill: 0xffffff,
				fontSize: 14,
				fontWeight: "bold",
			}),
		});
		nameText.position.set(10, 4);
		this.infoPanel.addChild(nameText);

		// Danger + enemies
		const statsText = new Text({
			text: `Danger: ${"★".repeat(node.dangerLevel)}${"☆".repeat(5 - node.dangerLevel)}  |  Enemies: ${node.enemies}`,
			style: new TextStyle({ fill: dangerColor, fontSize: 10 },
			),
		});
		statsText.position.set(10, 22);
		this.infoPanel.addChild(statsText);

		// Description
		const descText = new Text({
			text: node.description,
			style: new TextStyle({
				fill: 0x88aacc,
				fontSize: 10,
				wordWrap: true,
				wordWrapWidth: panelW - 20,
			}),
		});
		descText.position.set(10, 38);
		this.infoPanel.addChild(descText);

		// Connected locations
		const adjacent = this.getAdjacentNodeIds(node.id);
		if (adjacent.length > 0) {
			const adjNames = adjacent.map(id => this.nodes.find(n => n.id === id)?.name).filter(Boolean);
			const adjText = new Text({
				text: `Connected: ${adjNames.join(", ")}`,
				style: new TextStyle({ fill: 0x445566, fontSize: 9 },
				),
			});
			adjText.position.set(10, panelH - 12);
			this.infoPanel.addChild(adjText);
		}
	}

	protected onUpdate(dt: number): void {
		this.time += dt;

		const prevSelected = this.selectedNodeId;

		// Navigate between adjacent nodes
		const adjacent = this.getAdjacentNodeIds(this.selectedNodeId);
		if (InputManager.isRightPressed() || InputManager.isDownPressed()) {
			const idx = adjacent.indexOf(this.selectedNodeId);
			const nextIdx = (idx + 1) % adjacent.length;
			if (adjacent[nextIdx]) this.selectedNodeId = adjacent[nextIdx]!;
		}
		if (InputManager.isLeftPressed() || InputManager.isUpPressed()) {
			const idx = adjacent.indexOf(this.selectedNodeId);
			const prevIdx = (idx - 1 + adjacent.length) % adjacent.length;
			if (adjacent[prevIdx]) this.selectedNodeId = adjacent[prevIdx]!;
		}

		// TAB cycles through all discovered nodes
		if (InputManager.isKeyPressed("Tab")) {
			const discovered = this.nodes.filter(n => n.discovered);
			const idx = discovered.findIndex(n => n.id === this.selectedNodeId);
			const nextIdx = (idx + 1) % discovered.length;
			this.selectedNodeId = discovered[nextIdx]!.id;
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		// Refresh on change or for animation
		this.refreshUI();
	}
}
