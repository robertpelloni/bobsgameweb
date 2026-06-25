/**
 * HitDetectionSystem — Pixel-level hit detection reimplemented from Java source.
 *
 * This system mirrors the original Java engine's collision model:
 *
 * 1. **Hit Layer** — An independent int[] array (loaded by MD5 hash).
 *    Each index corresponds to a 1X tile (8×8 pixel cell).
 *    0 = walkable, non-zero = blocked.
 *
 * 2. **Camera Bounds Layer** — Also an int[] array for camera-constraint FX data.
 *
 * 3. **Non-Walkable Entities** — Entities flagged with `nonWalkable() == true`
 *    block movement. The Java engine checks against `activeEntityList` and `doorList`.
 *
 * 4. **Hit Box Checks** — For each movement direction, several specific pixel points
 *    are tested against the hit layer AND non-walkable entities.
 *    Only if ALL points pass does the move succeed.
 *
 * 5. **Toggles** — `hitLayerEnabled` global switch (default true).
 *    `ignoreHitLayer()` entity property lets certain entities (ghosts, etc.) pass.
 *    `ignoreHitPlayer()` entity property skips player collision.
 *
 * Usage:
 *   const hit = new HitDetectionSystem(mapData, entityList);
 *   const blocked = hit.checkHitBoxInDirection(x, y, w, h, DIR_DOWN);
 *
 * Reference: bobsgameonlinejava Map.java, Entity.java, Character.java
 */

export enum HitDir {
	UP = 0,
	DOWN = 1,
	LEFT = 2,
	RIGHT = 3,
}

/** Minimal bounding-box interface for any collidable object. */
export interface Collider {
	x: number;
	y: number;
	w: number;
	h: number;
	nonWalkable: boolean;
	ignoreHitLayer?: boolean;
	ignoreHitPlayer?: boolean;
	isOpen?: boolean; // doors only
}

/**
 * Convert pixel coordinates to a 1X tile index.
 * Java formula: tilex = floor(pix / 8) / 2;  (scale 2X subpixel → 1X tile)
 *           → tilex = Math.floor(pix / 16)
 */
function pixToTile1X(pix: number): number {
	return Math.floor(pix / 8);
}

export class HitDetectionSystem {
	/**
	 * The hit layer int array indexed by (tiley * tilesWide + tilex).
	 * 0 = walkable, !0 = blocked.  Loaded from `mapData.hitBoundsMD5` data.
	 */
	public hitLayer: Int32Array | null = null;

	/**
	 * The camera bounds (FX) layer int array.
	 */
	public cameraLayer: Int32Array | null = null;

	/** Global toggle (mirrors Engine().hitLayerEnabled). */
	public hitLayerEnabled = true;

	/** `true` once utility layers (hit, camera, shader) are loaded. */
	public utilityLayersLoaded = false;

	/** Map dimensions in 1X tiles (8px per tile at scale 1X). */
	public tilesWide = 0;
	public tilesHigh = 0;

	/** Reference to the list of collidable entities (sprites, objects, doors). */
	private colliders: Collider[] = [];

	constructor(tilesWide: number, tilesHigh: number) {
		this.tilesWide = tilesWide;
		this.tilesHigh = tilesHigh;
	}

	// ================================================================
	// Layer loading
	// ================================================================

	/**
	 * Load the hit layer from an Int32Array (parsed from the MD5 data file).
	 */
	loadHitLayer(data: Int32Array | null): void {
		this.hitLayer = data;
	}

	/**
	 * Load the camera bounds layer.
	 */
	loadCameraLayer(data: Int32Array | null): void {
		this.cameraLayer = data;
	}

	/** Mark utility layers as fully loaded. */
	markUtilityLayersLoaded(): void {
		this.utilityLayersLoaded = true;
	}

	/**
	 * Set the collidable entity list (mirrors Java's activeEntityList + doorList).
	 */
	setColliders(list: Collider[]): void {
		this.colliders = list;
	}

	// ================================================================
	// Core hit-layer pixel check (Java: Map.getHitLayerValueAtXYPixels)
	// ================================================================

	/**
	 * Check whether the hit layer at the given pixel position is blocked.
	 * Returns `true` if blocked (non-walkable).
	 *
	 * Matches Java:
	 *   - If hit layers disabled globally → false (walkable)
	 *   - If utility layers not loaded yet → true (precautionary block)
	 *   - Outside map bounds → true (block)
	 *   - hitLayer[index] == 0 → false (walkable)
	 *   - otherwise → true (blocked)
	 */
	getHitLayerValueAtPixels(mapXPixels: number, mapYPixels: number): boolean {
		if (!this.hitLayerEnabled) return false;
		if (!this.utilityLayersLoaded) return true;

		// Outside bounds = blocked
		const widthPx = this.tilesWide * 8;
		const heightPx = this.tilesHigh * 8;
		if (
			mapXPixels < 0 ||
			mapYPixels < 0 ||
			mapXPixels >= widthPx ||
			mapYPixels >= heightPx
		) {
			return true;
		}

		// Convert pixel to 1X tile index
		const tilex = Math.floor(mapXPixels / 8);
		const tiley = Math.floor(mapYPixels / 8);
		const index = tiley * this.tilesWide + tilex;

		if (!this.hitLayer) return false; // no hit layer = walkable
		return (this.hitLayer[index] as number) !== 0;
	}

	/**
	 * Get the camera bounds (FX) layer value at the given pixel position.
	 * Returns 0 by default (Java: getCameraBoundsFXLayerAtXYPixels).
	 */
	getCameraBoundsValueAtPixels(mapXPixels: number, mapYPixels: number): number {
		if (!this.utilityLayersLoaded || !this.cameraLayer) return 0;

		const tilex = Math.floor(mapXPixels / 8);
		const tiley = Math.floor(mapYPixels / 8);
		const index = tiley * this.tilesWide + tilex;
		return (this.cameraLayer[index] as number) ?? 0;
	}

	// ================================================================
	// Entity non-walkable check (Java: Entity.checkXYAgainstNonWalkableEntities)
	// ================================================================

	/**
	 * Check whether the given pixel point intersects any non-walkable entity.
	 */
	checkAgainstNonWalkableEntities(
		mapXPixels: number,
		mapYPixels: number,
		excludePlayer = false,
		playerCollider?: Collider,
	): boolean {
		if (!this.hitLayerEnabled) return false;

		for (const col of this.colliders) {
			if (!col.nonWalkable) continue;

			// Skip the player entity when checking self
			if (excludePlayer && playerCollider && col === playerCollider) {
				continue;
			}

			// Open/non-walkable doors pass through
			if (col.isOpen) continue;

			const left = col.x;
			const right = col.x + col.w;
			const top = col.y;
			const bottom = col.y + col.h;

			if (
				mapXPixels >= left &&
				mapXPixels <= right &&
				mapYPixels >= top &&
				mapYPixels <= bottom
			) {
				return true;
			}
		}
		return false;
	}

	// ================================================================
	// Combined check (Java: Entity.checkXYAgainstHitLayerAndNonWalkableEntities)
	// ================================================================

	/**
	 * Check whether the given pixel point is blocked by EITHER the hit layer
	 * OR a non-walkable entity.  Returns `true` if blocked.
	 */
	checkXYBlocked(
		mapXPixels: number,
		mapYPixels: number,
		excludePlayer = false,
		playerCollider?: Collider,
	): boolean {
		return (
			this.getHitLayerValueAtPixels(mapXPixels, mapYPixels) ||
			this.checkAgainstNonWalkableEntities(
				mapXPixels,
				mapYPixels,
				excludePlayer,
				playerCollider,
			)
		);
	}

	// ================================================================
	// Direction-specific hit-box check (Java: checkHitBoxAgainstHitLayerAndNonWalkableEntitiesInDirection)
	// ================================================================

	/**
	 * Check whether the entity's hit box at the given position would collide
	 * when moving in the specified direction.  Uses the exact same probe points
	 * as the Java engine.
	 *
	 * @param x      Entity left pixel position (world coordinates).
	 * @param y      Entity top pixel position (world coordinates).
	 * @param w      Entity width in pixels.
	 * @param h      Entity height in pixels.
	 * @param dir    Movement direction (UP, DOWN, LEFT, RIGHT).
	 * @param excludePlayer  Whether to skip the player entity.
	 * @param playerCollider The player's collider (to exclude from self-check).
	 * @returns `true` if movement is blocked.
	 */
	checkHitBoxInDirection(
		x: number,
		y: number,
		w: number,
		h: number,
		dir: HitDir,
		excludePlayer = false,
		playerCollider?: Collider,
	): boolean {
		// If entity ignores hit layer entirely, movement is always allowed
		const col = this.colliders.find(
			(c) => c.x === x && c.y === y && c.w === w && c.h === h,
		);
		if (col?.ignoreHitLayer) return false;

		const left = x;
		const right = x + w;
		const top = y;
		const bottom = y + h;
		const midX = Math.floor((left + right) / 2);
		const midY = Math.floor((top + bottom) / 2);

		// Java probe points per direction
		switch (dir) {
			case HitDir.UP:
				return this.checkXYBlocked(
					left + 1,
					top,
					excludePlayer,
					playerCollider,
				) ||
					this.checkXYBlocked(midX - 1, top, excludePlayer, playerCollider) ||
					this.checkXYBlocked(midX, top, excludePlayer, playerCollider) ||
					this.checkXYBlocked(right - 1, top, excludePlayer, playerCollider)
					? true
					: false;

			case HitDir.DOWN:
				return this.checkXYBlocked(
					left + 1,
					bottom,
					excludePlayer,
					playerCollider,
				) ||
					this.checkXYBlocked(
						midX - 1,
						bottom,
						excludePlayer,
						playerCollider,
					) ||
					this.checkXYBlocked(midX, bottom, excludePlayer, playerCollider) ||
					this.checkXYBlocked(right - 1, bottom, excludePlayer, playerCollider)
					? true
					: false;

			case HitDir.LEFT:
				// Java checks (left, bottom-1) and (left, bottom-4) for LEFT
				return this.checkXYBlocked(
					left,
					bottom - 1,
					excludePlayer,
					playerCollider,
				) ||
					this.checkXYBlocked(left, bottom - 4, excludePlayer, playerCollider)
					? true
					: false;

			case HitDir.RIGHT:
				// Java checks (right-1, bottom-1) and (right-1, bottom-4) for RIGHT
				return this.checkXYBlocked(
					right - 1,
					bottom - 1,
					excludePlayer,
					playerCollider,
				) ||
					this.checkXYBlocked(
						right - 1,
						bottom - 4,
						excludePlayer,
						playerCollider,
					)
					? true
					: false;

			default:
				return false;
		}
	}

	/**
	 * Simplified probe for 8×8 player hit-box using the Java corner-probe pattern.
	 * This checks the full bounding box against the hit layer, not just the
	 * directional probe points.
	 */
	checkPlayerAABB(
		playerLeft: number,
		playerTop: number,
		playerWidth: number,
		playerHeight: number,
		excludePlayer = false,
		playerCollider?: Collider,
	): boolean {
		// Check each corner of the hit box against hit layer + non-walkables
		const corners = [
			[playerLeft, playerTop], // top-left
			[playerLeft + playerWidth - 1, playerTop], // top-right
			[playerLeft, playerTop + playerHeight - 1], // bottom-left
			[playerLeft + playerWidth - 1, playerTop + playerHeight - 1], // bottom-right
		];

		for (const [cx, cy] of corners) {
			if (this.checkXYBlocked(cx, cy, excludePlayer, playerCollider)) {
				return true; // blocked
			}
		}
		return false; // walkable
	}

	/**
	 * Set global hit layer toggle.
	 */
	setHitLayerEnabled(enabled: boolean): void {
		this.hitLayerEnabled = enabled;
	}

	/**
	 * Clean up resources.
	 */
	destroy(): void {
		this.hitLayer = null;
		this.cameraLayer = null;
		this.colliders = [];
	}
}
