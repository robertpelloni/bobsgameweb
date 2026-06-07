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
 * Shadow rendering — dedicated shadow layers + object shadow shapes.
 *
 * The original Java engine renders shadows in two ways:
 *
 * 1. Dedicated shadow layers (L2 groundShadow, L5 objectShadow):
 *    These contain shadow silhouette tiles. L2 is empty in all 257 maps
 *    in the saved binary data. L5 has mixed content: shaped black tiles
 *    that are shadows, plus colored furniture/decoration tiles.
 *
 * 2. Shadow shapes on the objects (L3) and above (L6) layers:
 *    These layers contain opaque structural tiles (tile 839 = solid wall)
 *    AND shadow silhouette tiles (tiles 700, 706, 733, 795, etc.).
 *    The non-839 black tiles are shadow shapes that should render
 *    translucently, while tile 839 is structural and renders opaque.
 *    In the Java engine, the chunk-group composite applies shadowAlpha
 *    to all black pixels, making these shapes translucent.
 *
 * Rendering approach:
 * - L2 (groundShadow): ALL tiles → groundShadowOverlay (alpha 0.59)
 * - L3 (objects): non-839 black tiles → objectShadowOverlay (alpha 0.59),
 *   all other tiles (including 839) → normal layer container (opaque)
 * - L5 (objectShadow): black tiles → objectShadowOverlay (alpha 0.59),
 *   colored tiles → normal layer container (opaque)
 * - L6 (above): non-839 black tiles → aboveShadowOverlay (alpha 0.59),
 *   all other tiles (including 839) → normal layer container (opaque)
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

	/**
	 * Three shadow overlay containers matching Java shadow positions:
	 * groundShadowOverlay (z=2.5): shadows from L2, between ground and objects
	 * objectShadowOverlay (z=5.5): shadows from L3+L5, between objects and above
	 * aboveShadowOverlay (z=102.5): shadows from L6, after above layers
	 */
	private groundShadowOverlay!: Container;
	private objectShadowOverlay!: Container;
	private aboveShadowOverlay!: Container;
	private shadowTextureCache: Map<number, Texture> = new Map();

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

		// Ground shadow overlay (z=2.5): renders between L2 and L3
		// Contains shadows from L2 (groundShadow)
		this.groundShadowOverlay = new Container();
		this.groundShadowOverlay.zIndex = 2.5;
		this.groundShadowOverlay.cullable = false;
		this.groundShadowOverlay.sortableChildren = false;
		this.groundShadowOverlay.alpha = 1.0; // per-sprite alpha handles translucency
		this.container.addChild(this.groundShadowOverlay);

		// Object shadow overlay (z=5.5): renders between L5 and L6
		// Contains shadows from L3 (objects) and L5 (objectShadow)
		this.objectShadowOverlay = new Container();
		this.objectShadowOverlay.zIndex = 5.5;
		this.objectShadowOverlay.cullable = false;
		this.objectShadowOverlay.sortableChildren = false;
		this.objectShadowOverlay.alpha = 1.0; // per-sprite alpha handles translucency
		this.container.addChild(this.objectShadowOverlay);

		// Above shadow overlay (z=102.5): renders after L8
		// Contains shadows from L6 (above)
		this.aboveShadowOverlay = new Container();
		this.aboveShadowOverlay.zIndex = 102.5;
		this.aboveShadowOverlay.cullable = false;
		this.aboveShadowOverlay.sortableChildren = false;
		this.aboveShadowOverlay.alpha = 1.0; // per-sprite alpha handles translucency
		this.container.addChild(this.aboveShadowOverlay);

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

	/**
	 * Determine which shadow overlay a tile should go to.
	 * Returns null if the tile should render normally (opaque).
	 *
	 * Rules:
	 * - L2 (groundShadow): ALL non-zero tiles → groundShadowOverlay
	 * - L3 (objects): non-839 black tiles → objectShadowOverlay
	 * - L5 (objectShadow): black tiles → objectShadowOverlay
	 * - L6 (above): non-839 black tiles → aboveShadowOverlay
	 * - All other layers/tiles: → null (render normally)
	 */
	private getShadowTarget(
		l: number,
		tileId: number,
		isBlack: boolean,
	): Container | null {
		// L2 (groundShadow): all tiles are shadow
		if (l === MapData.MAP_GROUND_SHADOW_LAYER) {
			return tileId !== 0 ? this.groundShadowOverlay : null;
		}

		// L3 (objects): non-839 black tiles are shadows
		if (l === MapData.MAP_OBJECT_LAYER) {
			if (isBlack && tileId !== 839) return this.objectShadowOverlay;
			return null;
		}

		// L5 (objectShadow): black tiles are shadows
		if (l === MapData.MAP_OBJECT_SHADOW_LAYER) {
			if (isBlack) return this.objectShadowOverlay;
			return null;
		}

		// L6 (above): non-839 black tiles are shadows
		if (l === MapData.MAP_ABOVE_LAYER) {
			if (isBlack && tileId !== 839) return this.aboveShadowOverlay;
			return null;
		}

		// All other layers: no shadow treatment
		return null;
	}

	private renderWithRealTileset() {
		this.objectDetailContainer.removeChildren();
		this.shadowTextureCache.clear();
		this.groundShadowOverlay.removeChildren();
		this.objectShadowOverlay.removeChildren();
		this.aboveShadowOverlay.removeChildren();

		// Reset all layer containers
		for (let l = 0; l < MapData.layers; l++) {
			this.layers[l].removeChildren();
		}

		// Render each layer
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

		// Log shadow container sizes
		const gsCount = this.groundShadowOverlay.children.length;
		const osCount = this.objectShadowOverlay.children.length;
		const asCount = this.aboveShadowOverlay.children.length;
		if (gsCount > 0 || osCount > 0 || asCount > 0) {
			console.log(
				`[GameMap] Shadow layers for ${this.data.name}: ground=${gsCount}, object=${osCount}, above=${asCount}`,
			);
		}
		this.container.sortChildren();
	}

	/** Get regular atlas texture for a shadow tile (cached).
	 * We use the REAL atlas, NOT the shadow-black atlas, because the
	 * shadow-black atlas has fully transparent pixels (0,0,0,0) which
	 * makes shadow sprites invisible. The real atlas has the actual
	 * black silhouette pixels with alpha=255, which become translucent
	 * when rendered inside a container with alpha=0.59.
	 */
	private getShadowTexture(tileId: number): Texture | null {
		if (this.shadowTextureCache.has(tileId)) {
			return this.shadowTextureCache.get(tileId)!;
		}
		const tex = this.realTileset!.getTileTexture(tileId);
		if (tex) {
			this.shadowTextureCache.set(tileId, tex);
		}
		return tex;
	}

	private renderLayerReal(l: number) {
		const layer = this.layers[l];
		let spriteCount = 0;
		let shadowCount = 0;
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
				// Skip tile 839 everywhere — it's rendered as opaque wall on L3/L6
				// and skipped entirely on shadow layers (it's structural, not shadow)
				if (
					tileId === 839 &&
					l !== MapData.MAP_OBJECT_LAYER &&
					l !== MapData.MAP_ABOVE_LAYER
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

				const isBlack = this.realTileset!.isBlackTile(tileId);
				const shadowTarget = this.getShadowTarget(l, tileId, isBlack);

				if (shadowTarget) {
					// This tile is a shadow silhouette → render translucently
					const shadowTex = this.getShadowTexture(tileId);
					if (!shadowTex) {
						nullTextureCount++;
						continue;
					}
					const shadowSprite = new Sprite(shadowTex);
					shadowSprite.x = px;
					shadowSprite.y = py;
					shadowSprite.alpha = 0.59; // Java shadowAlpha = 150/255
					shadowTarget.addChild(shadowSprite);
					shadowCount++;
				} else {
					// Normal opaque render
					const texture = this.realTileset!.getTileTexture(tileId);
					if (!texture) {
						nullTextureCount++;
						continue;
					}
					const sprite = new Sprite(texture);
					sprite.x = px;
					sprite.y = py;

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
		}

		if (spriteCount > 0 || shadowCount > 0 || nullTextureCount > 0) {
			console.log(
				`[GameMap] Layer ${l} (${MapData.LAYER_NAMES[l] || "?"}): ${spriteCount} colored, ${shadowCount} shadow, ${nullTextureCount} null`,
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

		// Reset shadow overlay containers for viewport re-render
		this.groundShadowOverlay.removeChildren();
		this.objectShadowOverlay.removeChildren();
		this.aboveShadowOverlay.removeChildren();

		for (const l of renderableLayers) {
			const layer = this.layers[l];
			if (!layer) continue;
			layer.removeChildren();

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

					const px = Math.round(x * 8);
					const py = Math.round(y * 8);

					const isBlack = this.realTileset!.isBlackTile(tileId);
					const shadowTarget = this.getShadowTarget(l, tileId, isBlack);

					if (shadowTarget) {
						const shadowTex = this.getShadowTexture(tileId);
						if (!shadowTex) continue;
						const shadowSprite = new Sprite(shadowTex);
						shadowSprite.x = px;
						shadowSprite.y = py;
						shadowSprite.alpha = 0.59; // Java shadowAlpha = 150/255
						shadowTarget.addChild(shadowSprite);
					} else {
						const texture = this.realTileset!.getTileTexture(tileId);
						if (!texture) continue;
						const sprite = new Sprite(texture);
						sprite.x = px;
						sprite.y = py;

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
}
