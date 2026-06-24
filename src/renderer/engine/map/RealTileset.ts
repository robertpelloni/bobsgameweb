/**
 * RealTileset — Loads the actual binary-extracted tileset atlas.
 *
 * Three atlases:
 * - REAL atlas: full color, RGB(1,1,1) = opaque near-black outlines.
 *   Used for ALL non-shadow layers.
 * - SHADOW-BLACK atlas: same tile shapes but ALL non-transparent pixels
 *   are solid black (0,0,0,255). Used for groundShadow (L2) and
 *   objectShadow (L5) — rendered translucent for shadow effect.
 * - SHADOW atlas (legacy): RGB(1,1,1) replaced with transparency.
 *   Kept for compatibility but not currently used by GameMap.
 */

import { Texture, Assets, Rectangle } from "pixi.js";
<<<<<<< HEAD

export class RealTileset {
	static BUILD_VER = "3.6.2";
	private atlasTexture: Texture | null = null;
	private shadowBlackAtlasTexture: Texture | null = null;
	private shadowAtlasTexture: Texture | null = null;
	/** Set of tile IDs whose pixels are ALL near-black (RGB ≤ 5). */
	private blackTileIds: Set<number> = new Set();
=======
import { APP_VERSION } from "../../../shared/Config";

export class RealTileset {
	static BUILD_VER = APP_VERSION;
	private atlasTexture: Texture | null = null;
	private shadowBlackAtlasTexture: Texture | null = null;
	private shadowAtlasTexture: Texture | null = null;
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
	private tileTextureCache: Map<number, Texture> = new Map();
	private shadowBlackTileTextureCache: Map<number, Texture> = new Map();
	private shadowTileTextureCache: Map<number, Texture> = new Map();
	private validTileIds: Set<number> = new Set();
	private readonly COLS = 256;
	private readonly TILE_SIZE = 8;
	private _loaded: boolean = false;

	get loaded(): boolean {
		return this._loaded;
	}

	/** Cache-busting query param to avoid stale browser cache */
	private get cacheBust(): string {
		return `?v=${RealTileset.BUILD_VER}`;
	}

	/** Fetch with retry to handle transient cache errors */
	private async fetchWithRetry(url: string, retries = 2): Promise<Response> {
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const resp = await fetch(url);
				if (resp.ok) return resp;
				if (attempt < retries) {
					console.warn(
						`[RealTileset] Fetch ${url} returned ${resp.status}, retrying...`,
					);
					await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
					continue;
				}
				return resp;
			} catch (e) {
				if (attempt < retries) {
					console.warn(
						`[RealTileset] Fetch ${url} failed (attempt ${attempt + 1}):`,
						e,
					);
					await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
					continue;
				}
				throw e;
			}
		}
		throw new Error(`Fetch failed after ${retries + 1} attempts: ${url}`);
	}

	async load(): Promise<void> {
		try {
			// Load atlas map (tile ID validation) with cache-bust
			const mapResp = await this.fetchWithRetry(
				`/tileset_atlas_map.json${this.cacheBust}`,
			);
			if (mapResp.ok) {
				const atlasMap = await mapResp.json();
				for (const tid of atlasMap.tileIds) {
					this.validTileIds.add(tid);
				}
				console.log(
					`[RealTileset] Atlas map: ${this.validTileIds.size} valid tile IDs`,
				);
			} else {
				console.warn(
					"[RealTileset] Could not load atlas map — all tileIds assumed valid",
				);
			}

<<<<<<< HEAD
			// Load black tile ID list (tiles whose pixels are ALL near-black)
			try {
				const blackResp = await this.fetchWithRetry(
					`/tileset_atlas_black_ids.json${this.cacheBust}`,
				);
				if (blackResp.ok) {
					const blackData = await blackResp.json();
					for (const tid of blackData.blackTileIds) {
						this.blackTileIds.add(tid);
					}
					console.log(
						`[RealTileset] Black tile IDs: ${this.blackTileIds.size}`,
					);
				}
			} catch (e) {
				console.warn("[RealTileset] Could not load black tile IDs:", e);
			}

=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
			// Load real atlas with cache-bust
			this.atlasTexture = await Assets.load(
				`/tileset_atlas_real.png${this.cacheBust}`,
			);
			this.atlasTexture!.source.scaleMode = "nearest";
			if (this.atlasTexture!.source.style) {
				this.atlasTexture!.source.style.addressMode = "clamp-to-edge";
			}

			// Load shadow-black atlas (solid black silhouettes for shadow layers)
			try {
				this.shadowBlackAtlasTexture = await Assets.load(
					`/tileset_atlas_shadow_black.png${this.cacheBust}`,
				);
				this.shadowBlackAtlasTexture!.source.scaleMode = "nearest";
				if (this.shadowBlackAtlasTexture!.source.style) {
					this.shadowBlackAtlasTexture!.source.style.addressMode =
						"clamp-to-edge";
				}
				console.log(
					`[RealTileset] Shadow-black atlas loaded: ${this.shadowBlackAtlasTexture!.width}x${this.shadowBlackAtlasTexture!.height}`,
				);
			} catch (e) {
				console.warn("[RealTileset] Shadow-black atlas failed to load:", e);
			}

			// Load shadow atlas (RGB 1,1,1 = transparent, for overlay layers)
			try {
				this.shadowAtlasTexture = await Assets.load(
					`/tileset_atlas_shadow.png${this.cacheBust}`,
				);
				this.shadowAtlasTexture!.source.scaleMode = "nearest";
				if (this.shadowAtlasTexture!.source.style) {
					this.shadowAtlasTexture!.source.style.addressMode = "clamp-to-edge";
				}
				console.log(
					`[RealTileset] Shadow atlas loaded: ${this.shadowAtlasTexture!.width}x${this.shadowAtlasTexture!.height}`,
				);
			} catch (e) {
				console.warn("[RealTileset] Shadow atlas failed to load:", e);
			}

			this._loaded = true;
			console.log(
				`[RealTileset] Loaded atlas: ${this.atlasTexture!.width}x${this.atlasTexture!.height}, shadowBlack=${this.shadowBlackAtlasTexture ? "yes" : "no"}, shadow=${this.shadowAtlasTexture ? "yes" : "no"}, BUILD ${RealTileset.BUILD_VER}`,
			);
		} catch (e) {
			console.warn("[RealTileset] Failed to load atlas:", e);
		}
	}

	/**
	 * Get a tile texture from the REAL atlas (full color).
	 * Used for ground, objects, objects2, above, spriteShadow, etc.
	 */
	getTileTexture(tileId: number): Texture | null {
		if (tileId === 0 || !this.atlasTexture) return null;
		if (this.validTileIds.size > 0 && !this.validTileIds.has(tileId))
			return null;

		if (this.tileTextureCache.has(tileId))
			return this.tileTextureCache.get(tileId)!;

		const col = tileId % this.COLS;
		const row = Math.floor(tileId / this.COLS);
		const x = col * this.TILE_SIZE;
		const y = row * this.TILE_SIZE;

		if (
			x + this.TILE_SIZE > this.atlasTexture!.width ||
			y + this.TILE_SIZE > this.atlasTexture!.height
		) {
			return null;
		}

		const tex = new Texture({
			source: this.atlasTexture!.source,
			frame: new Rectangle(x, y, this.TILE_SIZE, this.TILE_SIZE),
		});
		this.tileTextureCache.set(tileId, tex);
		return tex;
	}

	/**
	 * Get a tile texture from the SHADOW-BLACK atlas.
	 * All non-transparent pixels are solid black (0,0,0,255).
	 * Used for groundShadow (L2) and objectShadow (L5).
	 * Falls back to getTileTexture if atlas unavailable.
	 */
	getShadowBlackTileTexture(tileId: number): Texture | null {
		if (tileId === 0) return null;
		if (this.validTileIds.size > 0 && !this.validTileIds.has(tileId))
			return null;
		if (!this.shadowBlackAtlasTexture) return this.getTileTexture(tileId);

		if (this.shadowBlackTileTextureCache.has(tileId))
			return this.shadowBlackTileTextureCache.get(tileId)!;

		const col = tileId % this.COLS;
		const row = Math.floor(tileId / this.COLS);
		const x = col * this.TILE_SIZE;
		const y = row * this.TILE_SIZE;

		if (
			x + this.TILE_SIZE > this.shadowBlackAtlasTexture!.width ||
			y + this.TILE_SIZE > this.shadowBlackAtlasTexture!.height
		) {
			return this.getTileTexture(tileId);
		}

		const tex = new Texture({
			source: this.shadowBlackAtlasTexture!.source,
			frame: new Rectangle(x, y, this.TILE_SIZE, this.TILE_SIZE),
		});
		this.shadowBlackTileTextureCache.set(tileId, tex);
		return tex;
	}

	/**
	 * Get a tile texture from the SHADOW atlas where RGB(1,1,1) = transparent.
	 * Used for overlay layers (spriteShadow L8, objects2 L4).
	 * Falls back to getTileTexture if atlas unavailable.
	 */
	getShadowTileTexture(tileId: number): Texture | null {
		if (tileId === 0) return null;
		if (this.validTileIds.size > 0 && !this.validTileIds.has(tileId))
			return null;
		if (!this.shadowAtlasTexture) return this.getTileTexture(tileId);

		if (this.shadowTileTextureCache.has(tileId))
			return this.shadowTileTextureCache.get(tileId)!;

		const col = tileId % this.COLS;
		const row = Math.floor(tileId / this.COLS);
		const x = col * this.TILE_SIZE;
		const y = row * this.TILE_SIZE;

		if (
			x + this.TILE_SIZE > this.shadowAtlasTexture!.width ||
			y + this.TILE_SIZE > this.shadowAtlasTexture!.height
		) {
			return this.getTileTexture(tileId);
		}

		const tex = new Texture({
			source: this.shadowAtlasTexture!.source,
			frame: new Rectangle(x, y, this.TILE_SIZE, this.TILE_SIZE),
		});
		this.shadowTileTextureCache.set(tileId, tex);
		return tex;
	}

	hasTile(tileId: number): boolean {
		return tileId > 0 && this.validTileIds.has(tileId) && !!this.atlasTexture;
	}

<<<<<<< HEAD
	/**
	 * Returns true if this tile's pixels are ALL near-black (max RGB ≤ 5).
	 * These are shadow tiles that should be rendered translucently
	 * with the shadow-black atlas, regardless of which layer they're on.
	 */
	isBlackTile(tileId: number): boolean {
		return this.blackTileIds.has(tileId);
	}

=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
	destroy(): void {
		for (const t of this.tileTextureCache.values()) t.destroy(true);
		this.tileTextureCache.clear();
		for (const t of this.shadowBlackTileTextureCache.values()) t.destroy(true);
		this.shadowBlackTileTextureCache.clear();
		for (const t of this.shadowTileTextureCache.values()) t.destroy(true);
		this.shadowTileTextureCache.clear();
		this.atlasTexture = null;
		this.shadowBlackAtlasTexture = null;
		this.shadowAtlasTexture = null;
		this._loaded = false;
	}
}
