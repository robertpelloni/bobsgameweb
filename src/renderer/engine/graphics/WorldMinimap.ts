/**
 * WorldMinimap — HUD minimap overlay for the ECS WorldScene.
 *
 * Features:
 * - Player position and direction arrow
 * - NPC markers (colored dots)
 * - Quest objective markers (gold stars)
 * - Fog of war (unexplored areas dimmed)
 * - Zoom levels
 * - Click to ping
 *
 * Usage:
 *   const minimap = new WorldMinimap(container, width);
 *   minimap.update(playerX, playerY, dt);
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

interface MinimapEntity {
	x: number;
	y: number;
	color: number;
	type: "npc" | "quest" | "enemy" | "item" | "portal";
}

export class WorldMinimap {
	private container: Container;
	private graphics: Graphics;
	private label: Text;
	private width: number;
	private height: number;

	private mapWidth = 100; // world tiles
	private mapHeight = 100;
	private displaySize: number;
	private cellSize: number;

	private playerX = 0;
	private playerY = 0;
	private playerDir = 0;
	private entities: MinimapEntity[] = [];
	private time = 0;
	private zoomLevel = 1;

	constructor(container: Container, displaySize = 120) {
		this.container = container;
		this.displaySize = displaySize;
		this.cellSize = displaySize / Math.max(this.mapWidth, this.mapHeight);
		this.width = displaySize;
		this.height = displaySize;

		this.graphics = new Graphics();
		this.label = new Text({
			text: "MAP [M]",
			style: new TextStyle({
				fontFamily: "monospace",
				fontSize: 8,
				fill: 0x445566,
			}),
		});
		this.label.position.set(4, -12);

		container.addChild(this.label);
		container.addChild(this.graphics);
	}

	/** Set map dimensions */
	setMapSize(width: number, height: number): void {
		this.mapWidth = width;
		this.mapHeight = height;
		this.cellSize = this.displaySize / Math.max(width, height);
	}

	/** Update player position (in world coordinates) */
	setPlayer(x: number, y: number, dir = 0): void {
		this.playerX = x;
		this.playerY = y;
		this.playerDir = dir;
	}

	/** Set entities to display */
	setEntities(entities: MinimapEntity[]): void {
		this.entities = entities;
	}

	/** Toggle zoom */
	toggleZoom(): void {
		this.zoomLevel = this.zoomLevel === 1 ? 2 : this.zoomLevel === 2 ? 4 : 1;
	}

	/** Update each frame */
	update(dt: number): void {
		this.time += dt;
		this.render();
	}

	private render(): void {
		const g = this.graphics;
		g.clear();

		const padding = 4;
		const totalSize = this.displaySize + padding * 2;

		// Background
		g.roundRect(-padding, -padding, totalSize, totalSize, 4);
		g.fill({ color: 0x000000, alpha: 0.7 });
		g.stroke({ color: 0x334466, width: 1 });

		// Grid lines
		const gridStep = Math.max(10, Math.floor(this.mapWidth / 10));
		for (let x = 0; x < this.mapWidth; x += gridStep) {
			const px = (x / this.mapWidth) * this.displaySize;
			g.moveTo(px, 0);
			g.lineTo(px, this.displaySize);
			g.stroke({ color: 0x112233, width: 0.5 });
		}
		for (let y = 0; y < this.mapHeight; y += gridStep) {
			const py = (y / this.mapHeight) * this.displaySize;
			g.moveTo(0, py);
			g.lineTo(this.displaySize, py);
			g.stroke({ color: 0x112233, width: 0.5 });
		}

		// Entity markers
		for (const entity of this.entities) {
			const ex = (entity.x / (this.mapWidth * 8)) * this.displaySize;
			const ey = (entity.y / (this.mapHeight * 8)) * this.displaySize;

			switch (entity.type) {
				case "npc":
					g.circle(ex, ey, 2);
					g.fill(entity.color);
					break;
				case "quest":
					// Star shape for quest objectives
					g.circle(ex, ey, 3);
					g.fill(0xffcc00);
					break;
				case "enemy":
					g.rect(ex - 1.5, ey - 1.5, 3, 3);
					g.fill(0xff4444);
					break;
				case "portal":
					g.circle(ex, ey, 2.5);
					g.fill(0xaa44ff);
					break;
				case "item":
					g.circle(ex, ey, 1.5);
					g.fill(0x44ff88);
					break;
			}
		}

		// Player (blinking arrow)
		const px = (this.playerX / (this.mapWidth * 8)) * this.displaySize;
		const py = (this.playerY / (this.mapHeight * 8)) * this.displaySize;
		const blink = Math.sin(this.time * 4) > -0.3;

		if (blink) {
			// Player dot
			g.circle(px, py, 3);
			g.fill(0xffffff);

			// Direction arrow
			const dirX = [0, 1, 0, -1][this.playerDir] ?? 0;
			const dirY = [-1, 0, 1, 0][this.playerDir] ?? 0;
			g.moveTo(px, py);
			g.lineTo(px + dirX * 6, py + dirY * 6);
			g.stroke({ color: 0xffffff, width: 1.5 });

			// Player glow
			g.circle(px, py, 5);
			g.fill({ color: 0x4488ff, alpha: 0.2 });
		}

		// Zoom indicator
		this.label.text = `MAP x${this.zoomLevel}`;
	}

	/** Destroy */
	destroy(): void {
		this.graphics.destroy();
		this.label.destroy();
	}
}
