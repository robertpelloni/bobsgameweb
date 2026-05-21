// @ts-nocheck
/**
 * TileRenderer — generates PixiJS textures from Tileset + Palette data.
 *
 * Converts 8×8 pixel tile patterns into scaled-up PixiJS textures
 * suitable for rendering in the RPG world. Supports caching for
 * efficient reuse across frames.
 */
import { Texture, Graphics, RenderTexture, Container, Sprite } from "pixi.js";
import { Tileset } from "../../../shared/Tileset";
import { Palette } from "../../../shared/Palette";
import { Application } from "pixi.js";

export class TileRenderer {
	private textureCache: Map<number, Texture> = new Map();
	private tileset: Tileset;
	private palette: Palette;
	private app: Application | null = null;
	private scale: number;

	/**
	 * @param tileset The tileset to render from
	 * @param palette The color palette
	 * @param scale Scale factor (e.g., 2 means each 8×8 tile becomes 16×16 on screen)
	 */
	constructor(tileset: Tileset, palette: Palette, scale = 2) {
		this.tileset = tileset;
		this.palette = palette;
		this.scale = scale;
	}

	/** Set the PixiJS app for GPU-accelerated texture generation */
	setApp(app: Application): void {
		this.app = app;
	}

	/**
	 * Get or create a texture for the given tile index.
	 * Textures are cached for reuse.
	 */
	getTileTexture(tileIndex: number): Texture | null {
		if (this.tileset.isTileBlank(tileIndex)) return null;

		const cached = this.textureCache.get(tileIndex);
		if (cached) return cached;

		// Generate RGBA data
		const rgba = this.tileset.getTileRGBA(tileIndex, this.palette);
		const tileW = Tileset.TILE_SIZE; // 8
		const tileH = Tileset.TILE_SIZE; // 8

		// Use GPU render texture if app is available, else use CPU
		if (this.app) {
			const texture = this.createTextureGPU(tileIndex, rgba, tileW, tileH);
			this.textureCache.set(tileIndex, texture);
			return texture;
		}

		// CPU fallback: create a canvas-based texture
		const canvas = document.createElement("canvas");
		canvas.width = tileW * this.scale;
		canvas.height = tileH * this.scale;
		const ctx = canvas.getContext("2d")!;
		const imageData = ctx.createImageData(tileW * this.scale, tileH * this.scale);

		// Scale up the pixel data
		for (let y = 0; y < tileH; y++) {
			for (let x = 0; x < tileW; x++) {
				const srcIdx = (y * tileW + x) * 4;
				const r = rgba[srcIdx]!;
				const g = rgba[srcIdx + 1]!;
				const b = rgba[srcIdx + 2]!;
				const a = rgba[srcIdx + 3]!;

				for (let sy = 0; sy < this.scale; sy++) {
					for (let sx = 0; sx < this.scale; sx++) {
						const dx = x * this.scale + sx;
						const dy = y * this.scale + sy;
						const dstIdx = (dy * tileW * this.scale + dx) * 4;
						imageData.data[dstIdx] = r;
						imageData.data[dstIdx + 1] = g;
						imageData.data[dstIdx + 2] = b;
						imageData.data[dstIdx + 3] = a;
					}
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);
		const texture = Texture.from(canvas);
		this.textureCache.set(tileIndex, texture);
		return texture;
	}

	/**
	 * Create a texture using GPU rendering (higher quality).
	 */
	private createTextureGPU(tileIndex: number, rgba: Uint8ClampedArray, w: number, h: number): Texture {
		// Draw pixels as 1px rects on a container, then render to texture
		const g = new Graphics();
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = (y * w + x) * 4;
				const r = rgba[idx]!;
				const gVal = rgba[idx + 1]!;
				const b = rgba[idx + 2]!;
				const a = rgba[idx + 3]!;

				if (a === 0) continue; // Skip transparent

				const color = (r << 16) | (gVal << 8) | b;
				g.rect(x * this.scale, y * this.scale, this.scale, this.scale);
				g.fill({ color, alpha: a / 255 });
			}
		}

		const renderTexture = RenderTexture.create({
			width: w * this.scale,
			height: h * this.scale,
		});
		this.app!.renderer.render({ container: g, target: renderTexture });
		g.destroy();
		return renderTexture;
	}

	/**
	 * Create a sprite for the given tile index.
	 */
	createTileSprite(tileIndex: number): Sprite | null {
		const texture = this.getTileTexture(tileIndex);
		if (!texture) return null;
		return new Sprite(texture);
	}

	/**
	 * Dispose all cached textures.
	 */
	destroy(): void {
		for (const texture of this.textureCache.values()) {
			texture.destroy(true);
		}
		this.textureCache.clear();
	}

	/**
	 * Get the number of cached textures.
	 */
	get cacheSize(): number {
		return this.textureCache.size;
	}
}
