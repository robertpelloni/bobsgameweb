/**
 * TileBatcher — efficient batched tile rendering using PixiJS Graphics.
 *
 * Instead of creating individual sprites/rects per tile, batches all tiles
 * into a single draw call grouped by color. Dramatically reduces draw calls
 * from (width × height) to (number of unique colors).
 *
 * Usage:
 *   const batcher = new TileBatcher(tileWidth, tileHeight);
 *   batcher.begin();
 *   batcher.addTile(x, y, color);
 *   batcher.end();
 *   container.addChild(batcher.graphics);
 */
import { Graphics } from "pixi.js";

export class TileBatcher {
	private graphics: Graphics = new Graphics();
	private tileSize: number;
	private batches: Map<number, { x: number[]; y: number[] }> = new Map();
	private dirty = false;

	constructor(tileSize: number) {
		this.tileSize = tileSize;
	}

	/**
	 * Begin a new batch frame. Clears previous batches.
	 */
	begin(): void {
		this.batches.clear();
		this.dirty = false;
	}

	/**
	 * Add a tile at grid position with the given color.
	 */
	addTile(gridX: number, gridY: number, color: number): void {
		let batch = this.batches.get(color);
		if (!batch) {
			batch = { x: [], y: [] };
			this.batches.set(color, batch);
		}
		batch.x.push(gridX * this.tileSize);
		batch.y.push(gridY * this.tileSize);
		this.dirty = true;
	}

	/**
	 * Finalize the batch and render to the Graphics object.
	 * Groups all tiles by color into a single fill() call per color.
	 */
	end(): void {
		if (!this.dirty) return;

		this.graphics.clear();

		for (const [color, batch] of this.batches) {
			this.graphics.setFillStyle({ color });
			for (let i = 0; i < batch.x.length; i++) {
				this.graphics.rect(
					batch.x[i]!,
					batch.y[i]!,
					this.tileSize,
					this.tileSize,
				);
			}
			this.graphics.fill();
		}

		this.dirty = false;
	}

	/**
	 * Get the Graphics object to add to a PixiJS container.
	 */
	getGraphics(): Graphics {
		return this.graphics;
	}

	/**
	 * Get the number of unique colors (draw calls) in the current batch.
	 */
	get drawCalls(): number {
		return this.batches.size;
	}

	/**
	 * Get the total number of tiles in the batch.
	 */
	get tileCount(): number {
		let count = 0;
		for (const batch of this.batches.values()) {
			count += batch.x.length;
		}
		return count;
	}

	/**
	 * Destroy the Graphics object and free resources.
	 */
	destroy(): void {
		this.graphics.destroy();
		this.batches.clear();
	}
}
