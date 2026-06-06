import { MapData } from "../../../shared/MapData";
import type { Entity } from "../../entity/Entity";
import { Container, Sprite, Texture } from "pixi.js";
import { Tileset } from "../../../shared/Tileset";
import type { Palette } from "../../../shared/Palette";
import type { RealTileset } from "./RealTileset";

export interface CameraBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/**
 * Layer rendering rules:
 *
 * SHADOW layers (L2 groundShadow, L5 objectShadow):
 *   Use shadow-black atlas (solid black silhouettes).
 *   Rendered TRANSLUCENT (container alpha 0.5 / 0.75).
 *
 * objects2 (L4):
 *   Rendered in objectDetailContainer ABOVE objects layer.
 *   Uses real atlas. NOT Y-sorted (all objects2 tiles render above all objects).
 *
 * ALL OTHER layers:
 *   Real atlas. Opaque.
 */

export class GameMap {
	public data: MapData;
	public container: Container;
	public objectDetailContainer!: Container;
	public entitySpriteContainer!: Container;
	public layers: Container[] = [];
	public entities: Entity[] = [];
	private tileTextures: globalThis.Map<number, Texture> = new globalThis.Map();
	private realTileset: RealTileset | null = null;

	// Camera
	public camX = 0;
	public camY = 0;
	private lastViewportCX = -999;
	private lastViewportCY = -999;
	private isLargeMap: boolean = false;
	private initialSpawnX: number = -1;
	private initialSpawnY: number = -1;

	constructor(data: MapData, realTileset?: RealTileset) {
		this.data = data;
		this.realTileset = realTileset ?? null;

		this.container = new Container();
		this.container.sortableChildren = true;
		this.container.cullable = true;

		this.isLargeMap = data.widthTiles1X * data.heightTiles1X > 50000;

		// Z-order: ground(0) < groundDetail(1) < spriteShadow(1.5) < groundShadow(2)
		// < objects(3) < objects2(3.5) < objectShadow(4) < entities(50)
		// < above(100) < aboveDetail(101)
		const Z_MAP: Record<number, number> = {
			[MapData.MAP_GROUND_LAYER]: 0,
			[MapData.MAP_GROUND_DETAIL_LAYER]: 1,
			[MapData.MAP_SPRITE_SHADOW_LAYER]: 1.5,
			[MapData.MAP_GROUND_SHADOW_LAYER]: 2,
			[MapData.MAP_OBJECT_LAYER]: 3,
			// objects2 in objectDetailContainer at z=3.5
			[MapData.MAP_OBJECT_SHADOW_LAYER]: 4,
			[MapData.MAP_ABOVE_LAYER]: 100,
			[MapData.MAP_ABOVE_DETAIL_LAYER]: 101,
			[MapData.MAP_HIT_LAYER]: 200,
			[MapData.MAP_LIGHT_MASK_LAYER]: 150,
			[MapData.MAP_CAMERA_BOUNDS_LAYER]: 201,
			[MapData.MAP_ENTITY_LAYER]: 202,
			[MapData.MAP_LIGHT_LAYER]: 160,
		};

		for (let i = 0; i < MapData.layers; i++) {
			const layer = new Container();
			layer.zIndex = Z_MAP[i] ?? i;
			layer.cullable = false;
			layer.sortableChildren = false;
			this.layers.push(layer);
			this.container.addChild(layer);
		}

		// objects2 container: z=3.5, ABOVE objects (z=3) so curtains/overlays
		// always render on top of furniture. No Y-sorting needed - all objects2
		// tiles should be above all objects tiles regardless of Y position.
		this.objectDetailContainer = new Container();
		this.objectDetailContainer.sortableChildren = false;
		this.objectDetailContainer.cullable = false;
		this.objectDetailContainer.zIndex = 3.5;
		this.container.addChild(this.objectDetailContainer);

		// Entity container: Y-sorted sprites
		this.entitySpriteContainer = new Container();
		this.entitySpriteContainer.sortableChildren = true;
		this.entitySpriteContainer.cullable = false;
		this.entitySpriteContainer.zIndex = 50;
		this.container.addChild(this.entitySpriteContainer);
	}

	getCameraOffset(): { x: number; y: number } {
		return { x: this.camX, y: this.camY };
	}

	public update(dt: number) {
		for (const entity of this.entities) {
			entity.update(dt);
		}
	}

	public render(tileset: Tileset, palette: Palette) {
		if (this.realTileset && this.realTileset.loaded) {
			this.renderWithRealTileset();
		} else {
			for (let l = 0; l < MapData.layers; l++) {
				if (!MapData.isTileLayer(l)) continue;
				if (
					l === MapData.MAP_HIT_LAYER ||
					l === MapData.MAP_CAMERA_BOUNDS_LAYER
				)
					continue;
				this.renderLayer(l, tileset, palette);
			}
		}
	}

	private renderWithRealTileset() {
		this.objectDetailContainer.removeChildren();

		for (let l = 0; l < MapData.layers; l++) {
			if (!MapData.isTileLayer(l)) continue;
			if (
				l === MapData.MAP_HIT_LAYER ||
				l === MapData.MAP_CAMERA_BOUNDS_LAYER ||
				l === MapData.MAP_ENTITY_LAYER
			)
				continue;
			this.renderLayerReal(l);
		}

// Shadow layers: alpha is baked into each sprite's texture pixels (A=150/255)
// Container alpha stays at default 1.0 so per-pixel alpha is preserved exactly

		const layerCounts: string[] = [];
		for (let i = 0; i < MapData.layers; i++) {
			if (this.layers[i] && this.layers[i].children.length > 0) {
				layerCounts.push(`L${i}=${this.layers[i].children.length}`);
			}
		}
		console.log(
			`[GameMap] Rendered ${this.data.name}: BUILD=${(this.realTileset as any)?.constructor?.BUILD_VER} layers=[${layerCounts.join(", ")}] objDetail=${this.objectDetailContainer.children.length}`,
		);
		this.container.sortChildren();
	}

	/** Shadow layers → shadow-black atlas; all others → real atlas */
	private isShadowLayer(l: number): boolean {
		return (
			l === MapData.MAP_GROUND_SHADOW_LAYER ||
			l === MapData.MAP_OBJECT_SHADOW_LAYER ||
			l === MapData.MAP_SPRITE_SHADOW_LAYER
		);
	}

	private shadowTextureCache: Map<number, Texture> = new Map();

	private getTextureForLayer(l: number, tileId: number): Texture | null {
		if (this.isShadowLayer(l)) {
			// Generate a black translucent shadow texture from the real atlas tile.
			// We render the tile shape onto a canvas as solid black at ~59% alpha,
			// then create a Texture from that canvas. This avoids any PixiJS v8
			// tint/source-sharing issues.
			if (this.shadowTextureCache.has(tileId)) {
				return this.shadowTextureCache.get(tileId)!;
			}
			const srcTex = this.realTileset!.getTileTexture(tileId);
			if (!srcTex) {
				console.warn(
					`[GameMap] Shadow L${l} tileId=${tileId}: NULL texture from real atlas!`,
				);
				return null;
			}
			// Extract the pixel data from the source texture
			const canvas = document.createElement("canvas");
			canvas.width = 8;
			canvas.height = 8;
			const ctx = canvas.getContext("2d")!;
      
			// Draw the tile from the atlas source image
			const srcImg = (srcTex.source as any).resource || (srcTex.source as any).image;
			if (!srcImg) {
				console.warn(`[GameMap] Shadow tileId=${tileId}: no source resource, using raw atlas texture`);
				// Fallback: just use the atlas texture with tint
				this.shadowTextureCache.set(tileId, srcTex);
				return srcTex;
			}
			ctx.drawImage(srcImg as any, 
				srcTex.frame.x, srcTex.frame.y, 8, 8,
				0, 0, 8, 8);
			// Read the pixels, convert to black with shadow alpha
			const imgData = ctx.getImageData(0, 0, 8, 8);
			const d = imgData.data;
			const shadowAlpha = 150; // 150/255 ≈ 0.59, matches Java
			for (let i = 0; i < d.length; i += 4) {
				if (d[i + 3] > 0) { // any non-transparent pixel → black shadow
					d[i] = 0;     // R
					d[i + 1] = 0; // G  
					d[i + 2] = 0; // B
					d[i + 3] = shadowAlpha; // A
				}
			}
			ctx.putImageData(imgData, 0, 0);
			const shadowTex = Texture.from(canvas);
			this.shadowTextureCache.set(tileId, shadowTex);
			return shadowTex;
		}
		return this.realTileset!.getTileTexture(tileId);
	}

	private renderLayerReal(l: number) {
		const layer = this.layers[l];
		layer.removeChildren();
		let spriteCount = 0;
		let nullTextureCount = 0;
		const totalTiles = this.data.widthTiles1X * this.data.heightTiles1X;

		let startX = 0,
			startY = 0,
			endX = this.data.widthTiles1X,
			endY = this.data.heightTiles1X;

		if (totalTiles > 10000) {
			const cx =
				this.initialSpawnX > 0
					? Math.floor(this.initialSpawnX / 8)
					: Math.floor(this.data.widthTiles1X / 2);
			const cy =
				this.initialSpawnY > 0
					? Math.floor(this.initialSpawnY / 8)
					: Math.floor(this.data.heightTiles1X / 2);
			const radius = totalTiles > 100000 ? 40 : 60;
			startX = Math.max(0, cx - radius);
			startY = Math.max(0, cy - radius);
			endX = Math.min(this.data.widthTiles1X, cx + radius);
			endY = Math.min(this.data.heightTiles1X, cy + radius);
		}

		for (let y = startY; y < endY; y++) {
			for (let x = startX; x < endX; x++) {
				const tileId = this.data.getTileIndex(l, x, y);
				if (tileId === 0) continue;
				if (tileId === 839) continue;

				const skipFactor = totalTiles > 50000 ? 2 : 1;
				if (
					skipFactor > 1 &&
					l === MapData.MAP_GROUND_DETAIL_LAYER &&
					(x + y) % skipFactor !== 0
				)
					continue;
				if (
					skipFactor > 1 &&
					l === MapData.MAP_OBJECT_DETAIL_LAYER &&
					(x + y) % skipFactor !== 0
				)
					continue;

				const texture = this.getTextureForLayer(l, tileId);

				if (!texture) {
					nullTextureCount++;
					continue;
				}

				const sprite = new Sprite(texture);
				// Round to integer pixel positions to prevent sub-pixel grid gaps
				sprite.x = x * 8;
				sprite.y = y * 8;
				// Ensure no fractional positioning from rounding errors
				sprite.x = Math.round(sprite.x);
				sprite.y = Math.round(sprite.y);

				if (l === MapData.MAP_LIGHT_MASK_LAYER) {
					sprite.tint = 0x000000;
				}
				if (l === MapData.MAP_LIGHT_LAYER) {
					sprite.blendMode = "add";
				}
				// Shadow layers: texture already has black+alpha baked in,
				// no tinting needed. Container alpha stays at 1.0 (default).

				// objects2 → objectDetailContainer (z=3.5, above ALL objects)
				if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
					(sprite as any)._isTileSprite = true;
					this.objectDetailContainer.addChild(sprite);
					spriteCount++;
				} else {
					layer.addChild(sprite);
					spriteCount++;
				}
			}
		}

    if (spriteCount > 0 || nullTextureCount > 0 || this.isShadowLayer(l)) {
      const tag = this.isShadowLayer(l) ? " [SHADOW]" : "";
      // For shadow layers, also count how many non-zero tiles exist in the data
      let dataNonZero = 0;
      if (this.isShadowLayer(l)) {
        for (let cy = 0; cy < this.data.heightTiles1X; cy++)
          for (let cx = 0; cx < this.data.widthTiles1X; cx++)
            if (this.data.getTileIndex(l, cx, cy) !== 0) dataNonZero++;
      }
      const dataTag = dataNonZero > 0 ? ` dataNonZero=${dataNonZero}` : " dataEmpty";
      console.log(
        `[GameMap] Layer ${l} (${MapData.LAYER_NAMES[l] || "?"}): ${spriteCount} sprites, ${nullTextureCount} null textures${tag}${this.isShadowLayer(l) ? dataTag : ""}`,
      );
    }
	}

	public renderLayer(l: number, tileset: Tileset, palette: Palette) {
		const layer = this.layers[l];
		layer.removeChildren();

		for (let y = 0; y < this.data.heightTiles1X; y++) {
			for (let x = 0; x < this.data.widthTiles1X; x++) {
				const tileIndex = this.data.getTileIndex(l, x, y);
				if (tileIndex === 0) continue;
				const texture = this.getTileTexture(tileIndex, tileset, palette, l);
				const sprite = new Sprite(texture);
				sprite.x = x * Tileset.TILE_SIZE;
				sprite.y = y * Tileset.TILE_SIZE;
				layer.addChild(sprite);
			}
		}
	}

	private getTileTexture(
		tileIndex: number,
		tileset: Tileset,
		palette: Palette,
		layer: number,
	): Texture {
		const cacheKey =
			tileIndex + (MapData.isTransparentLayer(layer) ? 1000000 : 0);
		if (this.tileTextures.has(cacheKey))
			return this.tileTextures.get(cacheKey)!;

		const alpha = MapData.isTransparentLayer(layer) ? 150 : 255;
		const rgba = tileset.getTileRGBA(tileIndex, palette, alpha);
		const canvas = document.createElement("canvas");
		canvas.width = 8;
		canvas.height = 8;
		const ctx = canvas.getContext("2d")!;
		const imgData = new ImageData(new Uint8ClampedArray(rgba), 8, 8);
		ctx.putImageData(imgData, 0, 0);
		const texture = Texture.from(canvas);
		this.tileTextures.set(cacheKey, texture);
		return texture;
	}

	public addEntity(entity: Entity) {
		this.entities.push(entity);
		if (entity.sprite) {
			this.entitySpriteContainer.addChild(entity.sprite);
		}
	}

	public removeEntity(entity: Entity) {
		const index = this.entities.indexOf(entity);
		if (index !== -1) {
			this.entities.splice(index, 1);
			if (entity.sprite) {
				this.entitySpriteContainer.removeChild(entity.sprite);
			}
		}
	}

	public setSpawnPosition(px: number, py: number): void {
		this.initialSpawnX = px;
		this.initialSpawnY = py;
	}

	public renderViewportAround(
		centerX: number,
		centerY: number,
		screenW: number,
		screenH: number,
		zoom: number,
	): void {
		if (!this.isLargeMap || !this.realTileset?.loaded) return;

		const tileCX = Math.floor(centerX / 8);
		const tileCY = Math.floor(centerY / 8);

		if (
			Math.abs(tileCX - this.lastViewportCX) < 3 &&
			Math.abs(tileCY - this.lastViewportCY) < 3
		)
			return;

		this.lastViewportCX = tileCX;
		this.lastViewportCY = tileCY;

		const extraMargin = 16;
		const halfW = Math.ceil(screenW / (8 * zoom * 2)) + 8 + extraMargin;
		const halfH = Math.ceil(screenH / (8 * zoom * 2)) + 8 + extraMargin;

		const startX = Math.max(0, tileCX - halfW);
		const startY = Math.max(0, tileCY - halfH);
		const endX = Math.min(this.data.widthTiles1X, tileCX + halfW);
		const endY = Math.min(this.data.heightTiles1X, tileCY + halfH);

		const renderableLayers = [
			MapData.MAP_GROUND_LAYER,
			MapData.MAP_GROUND_DETAIL_LAYER,
			MapData.MAP_GROUND_SHADOW_LAYER,
			MapData.MAP_OBJECT_LAYER,
			MapData.MAP_OBJECT_DETAIL_LAYER,
			MapData.MAP_OBJECT_SHADOW_LAYER,
			MapData.MAP_ABOVE_LAYER,
			MapData.MAP_ABOVE_DETAIL_LAYER,
			MapData.MAP_SPRITE_SHADOW_LAYER,
			MapData.MAP_LIGHT_MASK_LAYER,
			MapData.MAP_LIGHT_LAYER,
			MapData.MAP_DOOR_LAYER,
		];

		// Clean up tile sprites from detail and entity containers
		const detailTiles: any[] = [];
		for (const child of this.objectDetailContainer.children) {
			if ((child as any)._isTileSprite) detailTiles.push(child);
		}
		for (const s of detailTiles) this.objectDetailContainer.removeChild(s);

		const entityTiles: any[] = [];
		for (const child of this.entitySpriteContainer.children) {
			if ((child as any)._isTileSprite) entityTiles.push(child);
		}
		for (const s of entityTiles) this.entitySpriteContainer.removeChild(s);

		for (const l of renderableLayers) {
			const layer = this.layers[l];
			if (!layer) continue;
			layer.removeChildren();

			for (let y = startY; y < endY; y++) {
				for (let x = startX; x < endX; x++) {
					const tileId = this.data.getTileIndex(l, x, y);
					if (tileId === 0) continue;
					if (tileId === 839) continue;

					const texture = this.getTextureForLayer(l, tileId);
					if (!texture) continue;

					const sprite = new Sprite(texture);
					sprite.x = Math.round(x * 8);
					sprite.y = Math.round(y * 8);

					if (l === MapData.MAP_LIGHT_MASK_LAYER) sprite.tint = 0x000000;
					if (l === MapData.MAP_LIGHT_LAYER) sprite.blendMode = "add";
					if (this.isShadowLayer(l)) { /* shadow alpha baked into texture */ }

					if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
						(sprite as any)._isTileSprite = true;
						this.objectDetailContainer.addChild(sprite);
					} else {
						layer.addChild(sprite);
					}
				}
			}
		}

		// Shadow layers: alpha baked into texture pixels
		// Container alpha stays at default 1.0
	}
}
