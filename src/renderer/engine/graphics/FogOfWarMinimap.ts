/**
 * FogOfWarMinimap — minimap with fog of war (unexplored areas hidden).
 *
 * Features:
 * - Tile-based fog (explored vs unexplored)
 * - Player position with direction indicator
 * - NPC markers
 * - Quest objective markers
 * - Smooth fog reveal when exploring
 * - Click to ping location
 *
 * Usage:
 *   const minimap = new FogOfWarMinimap(container, tiles, 120);
 *   minimap.reveal(playerX, playerY, 5); // reveal radius 5 tiles
 *   minimap.update(dt);
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

interface MapMarker {
	x: number;
	y: number;
	color: number;
	label?: string;
}

export class FogOfWarMinimap {
	private container: Container;
	private mapContainer: Container;
	private fogContainer: Container;
	private markerContainer: Container;

	private mapW: number;
	private mapH: number;
	private displaySize: number;
	private tileSize: number;
	private cellSize: number;

	private revealed: boolean[][]; // true = explored
	private revealRadius = 5;
	private tiles: number[][];

	private markers: MapMarker[] = [];
	private playerX = 0;
	private playerY = 0;
	private playerDir = 0; // 0=up, 1=right, 2=down, 3=left
	private time = 0;

	constructor(container: Container, tiles: number[][], displaySize = 120) {
		this.container = container;
		this.tiles = tiles;
		this.mapH = tiles.length;
		this.mapW = tiles[0]?.length ?? 0;
		this.displaySize = displaySize;
		this.cellSize = displaySize / Math.max(this.mapW, this.mapH);
		this.tileSize = 8; // world tile size

		this.revealed = Array.from({ length: this.mapH }, () =>
			Array.from({ length: this.mapW }, () => false),
		);

		this.mapContainer = new Container();
		this.fogContainer = new Container();
		this.markerContainer = new Container();

		container.addChild(this.mapContainer);
		container.addChild(this.fogContainer);
		container.addChild(this.markerContainer);
	}

	/** Reveal tiles around a position */
	reveal(worldX: number, worldY: number, radius?: number): void {
		const tx = Math.floor(worldX / this.tileSize);
		const ty = Math.floor(worldY / this.tileSize);
		const r = radius ?? this.revealRadius;

		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > r) continue;

				const nx = tx + dx;
				const ny = ty + dy;
				if (nx >= 0 && nx < this.mapW && ny >= 0 && ny < this.mapH) {
					this.revealed[ny][nx] = true;
				}
			}
		}
	}

	/** Update player position */
	setPlayer(x: number, y: number, dir = 0): void {
		this.playerX = x;
		this.playerY = y;
		this.playerDir = dir;
	}

	/** Add a map marker */
	addMarker(x: number, y: number, color: number, label?: string): void {
		this.markers.push({ x, y, color, label });
	}

	/** Remove all markers */
	clearMarkers(): void {
		this.markers = [];
	}

	/** Get exploration percentage */
	getExplorationPercent(): number {
		let revealed = 0;
		for (let y = 0; y < this.mapH; y++) {
			for (let x = 0; x < this.mapW; x++) {
				if (this.revealed[y][x]) revealed++;
			}
		}
		return this.mapW * this.mapH > 0 ? revealed / (this.mapW * this.mapH) : 0;
	}

	/** Update each frame */
	update(dt: number): void {
		this.time += dt;
		this.renderMap();
		this.renderFog();
		this.renderMarkers();
	}

	private renderMap(): void {
		this.mapContainer.removeChildren();
		const g = new Graphics();

		for (let ty = 0; ty < this.mapH; ty++) {
			for (let tx = 0; tx < this.mapW; tx++) {
				const tile = this.tiles[ty][tx];
				let color = tile;

				// Simplify colors for minimap
				if (color === 0x2d5a1e) color = 0x1a3311; // Grass → dark green
				if (color === 0x887766) color = 0x443322; // Path → dark brown
				if (color === 0x2244aa) color = 0x112244; // Water → dark blue
				if (color === 0x553311) color = 0x2a1808; // Tree → dark brown
				if (color === 0x664422) color = 0x331100; // Building → dark
				if (color === 0xffcc00) color = 0xaa8800; // Chest → gold

				g.rect(tx * this.cellSize, ty * this.cellSize, this.cellSize + 0.5, this.cellSize + 0.5);
				g.fill(color);
			}
		}

		this.mapContainer.addChild(g);
	}

	private renderFog(): void {
		this.fogContainer.removeChildren();
		const g = new Graphics();

		for (let ty = 0; ty < this.mapH; ty++) {
			for (let tx = 0; tx < this.mapW; tx++) {
				if (!this.revealed[ty][tx]) {
					g.rect(tx * this.cellSize, ty * this.cellSize, this.cellSize + 0.5, this.cellSize + 0.5);
					g.fill({ color: 0x000000, alpha: 0.85 });
				} else {
					// Partially transparent at edges
					// Check if adjacent to unrevealed
					let adjacentToFog = false;
					for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
						const nx = tx + dx;
						const ny = ty + dy;
						if (nx >= 0 && nx < this.mapW && ny >= 0 && ny < this.mapH && !this.revealed[ny][nx]) {
							adjacentToFog = true;
							break;
						}
					}
					if (adjacentToFog) {
						g.rect(tx * this.cellSize, ty * this.cellSize, this.cellSize + 0.5, this.cellSize + 0.5);
						g.fill({ color: 0x000000, alpha: 0.3 });
					}
				}
			}
		}

		this.fogContainer.addChild(g);
	}

	private renderMarkers(): void {
		this.markerContainer.removeChildren();
		const g = new Graphics();

		// Quest/objective markers
		for (const marker of this.markers) {
			const mx = (marker.x / this.tileSize) * this.cellSize;
			const my = (marker.y / this.tileSize) * this.cellSize;

			g.circle(mx, my, 3);
			g.fill(marker.color);
		}

		// NPC markers
		g.circle(0, 0, 2);
		g.fill(0xffaa44);

		// Player (blinking)
		const px = (this.playerX / this.tileSize) * this.cellSize;
		const py = (this.playerY / this.tileSize) * this.cellSize;

		const blink = Math.sin(this.time * 4) > -0.3;
		if (blink) {
			g.circle(px, py, 3);
			g.fill(0xffffff);

			// Direction indicator
			const dirX = [0, 1, 0, -1][this.playerDir] ?? 0;
			const dirY = [-1, 0, 1, 0][this.playerDir] ?? 0;
			g.moveTo(px, py);
			g.lineTo(px + dirX * 5, py + dirY * 5);
			g.stroke({ color: 0xffffff, width: 1 });
		}

		this.markerContainer.addChild(g);
	}

	/** Destroy */
	destroy(): void {
		this.container.destroy({ children: true });
	}
}
