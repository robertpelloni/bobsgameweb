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
 * Shadow rendering — Java engine composite model.
 *
 * L3 (objects) and L6 (above) contain shadow composites in the Java
 * engine — black tiles (walls, door frames, overhead structures) that
 * composite translucently over the layers below them. The Java engine
 * draws these with shadowAlpha (=150/255 ≈ 0.59), making the black
 * fills appear as dark translucent shadows.
 *
 * Non-black content on L3/L6 (furniture, stair rails, etc.) renders
 * at full opacity. The RealTileset.isBlackTile() method checks the
 * pre-computed black tile ID list (tileset_atlas_black_ids.json).
 *
 * Rendering approach:
 * - L3 (objects): black tiles → alpha=0.59, color tiles → opaque
 * - L6 (above): black tiles → alpha=0.59, color tiles → opaque
 * - All other layers: render normally (opaque)
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
		this.container.cullable = false;
		this.isLargeMap = data.widthTiles1X * data.heightTiles1X > 50000;

		const Z_MAP: Record<number, number> = {
			[MapData.MAP_GROUND_LAYER]: 0,
			[MapData.MAP_GROUND_DETAIL_LAYER]: 1,
			[MapData.MAP_GROUND_SHADOW_LAYER]: 2,
			[MapData.MAP_OBJECT_LAYER]: 3,
			[MapData.MAP_OBJECT_DETAIL_LAYER]: 4,
			[MapData.MAP_OBJECT_SHADOW_LAYER]: 5,
			[MapData.MAP_ABOVE_LAYER]: 100,
			[MapData.MAP_ABOVE_DETAIL_LAYER]: 101,
			[MapData.MAP_SPRITE_SHADOW_LAYER]: 102,
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

		// objects2 container at z=3.5
		this.objectDetailContainer = new Container();
		this.objectDetailContainer.sortableChildren = false;
		this.objectDetailContainer.cullable = false;
		this.objectDetailContainer.zIndex = 3.5;
		this.container.addChild(this.objectDetailContainer);

		// Entity container at z=50
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

	/** No-op — kept for backward compatibility with WorldScene calls. */
	async loadAtlasPixels(): Promise<boolean> {
		return true;
	}

	private renderWithRealTileset() {
		this.objectDetailContainer.removeChildren();

		for (let l = 0; l < MapData.layers; l++) {
			this.layers[l].removeChildren();
		}

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

		this.container.sortChildren();
	}

	private renderLayerReal(l: number) {
		const layer = this.layers[l];
		let spriteCount = 0;
		let nullTextureCount = 0;
		const totalTiles = this.data.widthTiles1X * this.data.heightTiles1X;

		// L3 (objects) and L6 (above) are the shadow composite layers —
		// they contain solid-black tile 839 (walls, overhead)
		// that the Java engine renders translucently with shadowAlpha ≈ 0.59
		const isShadowCompositeLayer =
			l === MapData.MAP_OBJECT_LAYER || l === MapData.MAP_ABOVE_LAYER;

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

				// Skip tile 839 on non-object/above layers (structural, not shadow)
				if (
					tileId === 839 &&
					l !== MapData.MAP_OBJECT_LAYER &&
					l !== MapData.MAP_ABOVE_LAYER
				)
					continue;

				// On L6 (above): skip 839 if L3 (objects) already has 839 at
				// the same position. These are wall columns already rendered
				// translucently on L3; duplicating them on L6 creates a
				// double-alpha dark square (the "black squares" bug).
				if (
					l === MapData.MAP_ABOVE_LAYER &&
					tileId === 839 &&
					this.data.getTileIndex(MapData.MAP_OBJECT_LAYER, x, y) === 839
				)
					continue;

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

				const px = Math.round(x * 8);
				const py = Math.round(y * 8);

				const texture = this.realTileset!.getTileTexture(tileId);
				if (!texture) {
					nullTextureCount++;
					continue;
				}

				const sprite = new Sprite(texture);
				sprite.x = px;
				sprite.y = py;

				// On L3/L6: all tiles render translucent at shadowAlpha=0.59.
				// The Java engine applies shadowAlpha to the entire layer, not just
				// black tiles. This makes walls, door frames, and furniture details
				// appear as translucent shadows.
				if (isShadowCompositeLayer) {
					sprite.alpha = 0.59;
				}

				if (l === MapData.MAP_LIGHT_MASK_LAYER) {
					sprite.tint = 0x000000;
				}
				if (l === MapData.MAP_LIGHT_LAYER) {
					sprite.blendMode = "add";
				}
				if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
					(sprite as any)._isTileSprite = true;
					this.objectDetailContainer.addChild(sprite);
				} else {
					layer.addChild(sprite);
				}
				spriteCount++;
			}
		}

		if (spriteCount > 0 || nullTextureCount > 0) {
			console.log(
				`[GameMap] Layer ${l} (${MapData.LAYER_NAMES[l] || "?"}): ${spriteCount} sprites, ${nullTextureCount} null`,
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

			// L3 (objects) and L6 (above) are the shadow composite layers
			const isShadowCompositeLayer =
				l === MapData.MAP_OBJECT_LAYER || l === MapData.MAP_ABOVE_LAYER;

			for (let y = startY; y < endY; y++) {
				for (let x = startX; x < endX; x++) {
					const tileId = this.data.getTileIndex(l, x, y);
					if (tileId === 0) continue;

					if (
						tileId === 839 &&
						l !== MapData.MAP_OBJECT_LAYER &&
						l !== MapData.MAP_ABOVE_LAYER
					)
						continue;

					// On L6 (above): skip 839 if L3 already has 839 at same position
					if (
						l === MapData.MAP_ABOVE_LAYER &&
						tileId === 839 &&
						this.data.getTileIndex(MapData.MAP_OBJECT_LAYER, x, y) === 839
					)
						continue;

					const px = Math.round(x * 8);
					const py = Math.round(y * 8);

					const texture = this.realTileset!.getTileTexture(tileId);
					if (!texture) continue;

					const sprite = new Sprite(texture);
					sprite.x = px;
					sprite.y = py;

					// L3/L6: all tiles render translucent at shadowAlpha
					if (isShadowCompositeLayer) sprite.alpha = 0.59;

					if (l === MapData.MAP_LIGHT_MASK_LAYER) sprite.tint = 0x000000;
					if (l === MapData.MAP_LIGHT_LAYER) sprite.blendMode = "add";

					if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
						(sprite as any)._isTileSprite = true;
						this.objectDetailContainer.addChild(sprite);
					} else {
						layer.addChild(sprite);
					}
				}
			}
		}
	}
}
