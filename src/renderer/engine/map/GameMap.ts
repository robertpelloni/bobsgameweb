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

export class GameMap {
	public data: MapData;
	public container: Container;
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
		this.container.cullable = true; // Enable viewport culling for performance
		this.isLargeMap = data.widthTiles1X * data.heightTiles1X > 50000;

		// Initialize layers with robust z-indices
		// Ground: 0-2
		// Objects: 3-5
		// Above: 100-110 (Well above entities)
		// Utilities: 200+
		const Z_MAP: Record<number, number> = {
			[MapData.MAP_GROUND_LAYER]: 0,
			[MapData.MAP_GROUND_DETAIL_LAYER]: 1,
			[MapData.MAP_GROUND_SHADOW_LAYER]: 2,
			[MapData.MAP_OBJECT_LAYER]: 3,
			[MapData.MAP_OBJECT_DETAIL_LAYER]: 4,
			[MapData.MAP_OBJECT_SHADOW_LAYER]: 5,
			[MapData.MAP_ABOVE_LAYER]: 100,
			[MapData.MAP_ABOVE_DETAIL_LAYER]: 101,
			[MapData.MAP_SPRITE_SHADOW_LAYER]: 7,
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
			layer.sortableChildren = false; // Static tile layers don't need internal sorting
			this.layers.push(layer);
			this.container.addChild(layer);
		}

		// Entity sprite container: Between objects (5) and above-layers (100)
		this.entitySpriteContainer = new Container();
		this.entitySpriteContainer.sortableChildren = true; // Crucial for Y-sorting
		this.entitySpriteContainer.cullable = false; // Don't cull ESC - tiles extend beyond bounds
		this.entitySpriteContainer.zIndex = 50;
		this.container.addChild(this.entitySpriteContainer);
	}

	/** Get current camera offset for entity positioning */
	getCameraOffset(): { x: number; y: number } {
		return { x: this.camX, y: this.camY };
	}

	public update(dt: number) {
		// Camera handled by Cameraman via worldContainer position
		// Internal camera follow disabled to avoid double-movement
		for (const entity of this.entities) {
			entity.update(dt);
		}
	}

	/** Render using the real tileset atlas (preferred) or fallback to synthetic */
	public render(tileset: Tileset, palette: Palette) {
		if (this.realTileset && this.realTileset.loaded) {
			this.renderWithRealTileset();
		} else {
			// Fallback: synthetic tileset
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

	/** Render all tile layers using the real binary-extracted tileset atlas */
	private renderWithRealTileset() {
		for (let l = 0; l < MapData.layers; l++) {
			if (!MapData.isTileLayer(l)) continue;
			// Skip non-visual utility layers
			if (
				l === MapData.MAP_HIT_LAYER ||
				l === MapData.MAP_CAMERA_BOUNDS_LAYER ||
				l === MapData.MAP_ENTITY_LAYER
			)
				continue;

			this.renderLayerReal(l);
		}
		// Set layer-specific alpha for visual quality
		this.layers[MapData.MAP_GROUND_DETAIL_LAYER].alpha = 1.0; // Floor overlays should be fully visible
		this.layers[MapData.MAP_OBJECT_SHADOW_LAYER].alpha = 0.02;
		this.layers[MapData.MAP_ABOVE_LAYER].alpha = 1.0;
		this.layers[MapData.MAP_ABOVE_DETAIL_LAYER].alpha = 1.0; // Keep rooftops/curtains opaque
		this.layers[MapData.MAP_GROUND_SHADOW_LAYER].alpha = 0.02;
		this.layers[MapData.MAP_SPRITE_SHADOW_LAYER].alpha = 0.02;
		// Light mask tiles are orange markers → tint to black for AO overlay
		this.layers[MapData.MAP_LIGHT_MASK_LAYER].alpha = 0.35;
		// Map lights (tiles) alpha
		this.layers[MapData.MAP_LIGHT_LAYER].alpha = 1.0;

		const totalSprites = this.layers.reduce(
			(sum, l) => sum + l.children.length,
			0,
		);
		console.log(
			`[GameMap] Total sprites rendered: ${totalSprites} for ${this.data.name}`,
		);
		// Log entitySpriteContainer summary
		const escTiles = this.entitySpriteContainer.children.filter(
			(c: any) => c._isTileSprite,
		).length;
		const escEntities = this.entitySpriteContainer.children.length - escTiles;
		console.log(
			`[GameMap] entitySpriteContainer: ${this.entitySpriteContainer.children.length} children (${escTiles} tiles, ${escEntities} entities), zIndex=${this.entitySpriteContainer.zIndex}`,
		);
	}
	/** Render a single layer using real tileset atlas textures */
	private renderLayerReal(l: number) {
		const layer = this.layers[l];
		layer.removeChildren();

		// For huge maps, only render a centered viewport to prevent browser crash
		const totalTiles = this.data.widthTiles1X * this.data.heightTiles1X;
		let startX = 0,
			startY = 0,
			endX = this.data.widthTiles1X,
			endY = this.data.heightTiles1X;
		if (totalTiles > 10000) {
			// Use spawn position if available, otherwise center
			const cx =
				this.initialSpawnX > 0
					? Math.floor(this.initialSpawnX / 8)
					: Math.floor(this.data.widthTiles1X / 2);
			const cy =
				this.initialSpawnY > 0
					? Math.floor(this.initialSpawnY / 8)
					: Math.floor(this.data.heightTiles1X / 2);
			const radius = totalTiles > 100000 ? 40 : 60; // 40 for huge, 60 for large maps
			startX = Math.max(0, cx - radius);
			startY = Math.max(0, cy - radius);
			endX = Math.min(this.data.widthTiles1X, cx + radius);
			endY = Math.min(this.data.heightTiles1X, cy + radius);
		}

		for (let y = startY; y < endY; y++) {
			for (let x = startX; x < endX; x++) {
				const tileId = this.data.getTileIndex(l, x, y);
				if (tileId === 0) continue;

				// On ground layer, skip tile ID 1 (solid black background in Java)
				if (l === MapData.MAP_GROUND_LAYER && tileId === 1) continue;

				// Skip factor for very large maps to reduce sprite count
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
				const texture = this.realTileset!.getTileTexture(tileId);
				if (!texture) continue;

				const sprite = new Sprite(texture);
				sprite.x = x * 8;
				sprite.y = y * 8;

				// Light mask tiles (orange markers) → tint black for ambient occlusion
				if (l === MapData.MAP_LIGHT_MASK_LAYER) {
					sprite.tint = 0x000000;
				}

				// Additive blending for light tiles
				if (l === MapData.MAP_LIGHT_LAYER) {
					sprite.blendMode = "add";
				}

				// Multiply blending for shadows
				if (
					l === MapData.MAP_OBJECT_SHADOW_LAYER ||
					l === MapData.MAP_GROUND_SHADOW_LAYER ||
					l === MapData.MAP_SPRITE_SHADOW_LAYER
				) {
					sprite.blendMode = "multiply";
				}

				// objects2 needs Y-sorting with entities (furniture, tables)
				// above/above2 are ALWAYS above entities (rooftops, wall tops, curtains)
				// The Java game renders: objects2 -> entities -> above -> above2
				// The underRoof fade in WorldScene handles visibility when player is under a rooftop
				if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
					sprite.zIndex = sprite.y;
					(sprite as any)._isTileSprite = true;
					this.entitySpriteContainer.addChild(sprite);
				} else {
					layer.addChild(sprite);
				}
			}
		}

		const layerNames = [
			"ground",
			"groundDetail",
			"groundShadow",
			"objects",
			"objects2",
			"objectShadow",
			"above",
			"above2",
			"spriteShadow",
			"hitBounds",
			"lightMask",
			"cameraBounds",
			"entity",
			"light",
			"area",
			"door",
			"shader",
		];
		const lname = layerNames[l] || `layer${l}`;
		console.log(
			`[GameMap] Layer ${l} (${lname}): ${layer.children.length} sprites, zIndex=${layer.zIndex}, alpha=${layer.alpha}`,
		);
	}

	/** Fallback: render a single layer using the synthetic tileset */
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

	/**
	 * Re-render tiles around a viewport center for large maps.
	 * Called from WorldScene.update() when the player moves.
	 * Only re-renders when the player has moved more than a few tiles.
	 */
	/** Set spawn position for initial viewport */
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

		// Convert center to tile coords
		const tileCX = Math.floor(centerX / 8);
		const tileCY = Math.floor(centerY / 8);

		// Only re-render if moved more than 3 tiles
		if (
			Math.abs(tileCX - this.lastViewportCX) < 3 &&
			Math.abs(tileCY - this.lastViewportCY) < 3
		)
			return;
		this.lastViewportCX = tileCX;
		this.lastViewportCY = tileCY;

		// Calculate visible area
		const extraMargin = 16;
		const halfW = Math.ceil(screenW / (8 * zoom * 2)) + 8 + extraMargin;
		const halfH = Math.ceil(screenH / (8 * zoom * 2)) + 8 + extraMargin;
		const startX = Math.max(0, tileCX - halfW);
		const startY = Math.max(0, tileCY - halfH);
		const endX = Math.min(this.data.widthTiles1X, tileCX + halfW);
		const endY = Math.min(this.data.heightTiles1X, tileCY + halfH);

		// Re-render each renderable layer
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

		// Remove stale tile sprites from entitySpriteContainer before re-rendering
		const tileSpritesToRemove: any[] = [];
		for (const child of this.entitySpriteContainer.children) {
			if ((child as any)._isTileSprite) tileSpritesToRemove.push(child);
		}
		for (const s of tileSpritesToRemove)
			this.entitySpriteContainer.removeChild(s);

		for (const l of renderableLayers) {
			const layer = this.layers[l];
			if (!layer) continue;
			layer.removeChildren();

			for (let y = startY; y < endY; y++) {
				for (let x = startX; x < endX; x++) {
					const tileId = this.data.getTileIndex(l, x, y);
					if (tileId === 0) continue;
					if (l === MapData.MAP_GROUND_LAYER && tileId === 1) continue;

					const texture = this.realTileset!.getTileTexture(tileId);
					if (!texture) continue;

					const sprite = new Sprite(texture);
					sprite.x = x * 8;
					sprite.y = y * 8;

					// Light mask tiles → tint black for AO
					if (l === MapData.MAP_LIGHT_MASK_LAYER) {
						sprite.tint = 0x000000;
					}

					// Additive blending for light tiles
					if (l === MapData.MAP_LIGHT_LAYER) {
						sprite.blendMode = "add";
					}

					// Multiply blending for shadows
					if (
						l === MapData.MAP_OBJECT_SHADOW_LAYER ||
						l === MapData.MAP_GROUND_SHADOW_LAYER ||
						l === MapData.MAP_SPRITE_SHADOW_LAYER
					) {
						sprite.blendMode = "multiply";
					}

					// objects2 needs Y-sorting with entities (furniture, tables)
					// above/above2 are ALWAYS above entities (rooftops, wall tops, curtains)
					if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
						sprite.zIndex = sprite.y;
						(sprite as any)._isTileSprite = true;
						this.entitySpriteContainer.addChild(sprite);
					} else {
						layer.addChild(sprite);
					}
				}
			}
		}

		// Viewport re-rendered (throttled log)
	}
}
