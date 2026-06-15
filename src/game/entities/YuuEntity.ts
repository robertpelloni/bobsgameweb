/**
 * YuuEntity – Player character entity with 8‑directional sprite animation,
 * movement, and footstep sound effects.
 *
 * This class extends the generic Entity base (src/renderer/entity/Entity.ts).
 * It uses the SpriteAtlas system to pull frames for the "yuu" sprite and
 * animates based on the Direction enum. Footstep SFX are played via the global
 * AudioManager (which registers multiple footstep variations).
 */

import { AnimatedSprite, Graphics, type Texture } from "pixi.js";
import {
	Entity,
	Direction,
	type EntityConfig,
} from "../../renderer/entity/Entity";
import { AudioManager } from "../../renderer/audio/AudioManager";
import type { SpriteAtlas } from "../../renderer/engine/map/SpriteAtlas";

// Mapping from the Direction enum (8 values) to the animation names used in the
// SpriteAtlas data. The SpriteAtlas expects names like "Down", "DownLeft",
// "Left", "UpLeft", "Up", "UpRight", "Right", "DownRight".
const DIR_TO_ANIM: Record<Direction, string> = {
	[Direction.DOWN]: "Down",
	[Direction.UP]: "Up",
	[Direction.LEFT]: "Left",
	[Direction.RIGHT]: "Right",
	[Direction.DOWN_LEFT]: "DownLeft",
	[Direction.DOWN_RIGHT]: "DownRight",
	[Direction.UP_LEFT]: "UpLeft",
	[Direction.UP_RIGHT]: "UpRight",
};

// Footstep SFX identifiers – we pre‑load four variations in WorldScene, but
// the AudioManager also supports the generic "footstep" id.
const FOOTSTEP_VARIANTS = [
	"footstep_0",
	"footstep_1",
	"footstep_2",
	"footstep_3",
];
const FOOTSTEP_INTERVAL_MS = 250; // time between footstep sounds while walking

export interface YuuEntityConfig extends EntityConfig {
	/** Optional SpriteAtlas instance – used to fetch animation frames. */
	spriteAtlas?: SpriteAtlas;
	/** Optional AudioManager – if omitted the global AudioManager is used. */
	audioManager?: typeof AudioManager;
	/** Player speed in pixels per second (default matches DemoWorld). */
	speed?: number;
	/** Collision checker – returns true if the candidate position is walkable. */
	collisionCheck?: (x: number, y: number) => boolean;
}

export class YuuEntity extends Entity {
	private animSprite: AnimatedSprite | null = null;
	private framesCache: Map<string, Texture[]> = new Map();
	private audioMgr: typeof AudioManager;
	private atlas?: SpriteAtlas;
	private isMoving = false;
	private footstepTimer = 0;
	private footstepIdx = 0;
	private speed: number;
	private collisionCheck?: (x: number, y: number) => boolean;

	constructor(config: YuuEntityConfig) {
		super(config);
		this.audioMgr = config.audioManager ?? AudioManager;
		this.atlas = config.spriteAtlas;
		this.speed = config.speed ?? 120; // default matches DemoWorld
		this.collisionCheck = config.collisionCheck;
		this.initSprite();
	}

	/** Load animation frames for each direction from the SpriteAtlas. */
	private initSprite(): void {
		if (!this.atlas) {
			// No SpriteAtlas – draw a simple placeholder (same style as DemoWorld's renderCharacter)
			const gfx = new Graphics();
			gfx.beginFill(0x3366ff);
			gfx.drawRect(-8, -20, 16, 18);
			gfx.endFill();
			this.container.addChild(gfx);
			return;
		}
		// Pre‑load frames for every direction.
		for (const dir in DIR_TO_ANIM) {
			const animName = DIR_TO_ANIM[dir as unknown as Direction];
			const frames = this.atlas.getAnimationFrames("yuu", animName);
			if (frames.length) this.framesCache.set(animName, frames);
		}
		// Create the initial sprite (default facing down).
		const defaultFrames = this.framesCache.get("Down") ?? [];
		if (defaultFrames.length) {
			this.animSprite = new AnimatedSprite(defaultFrames);
			this.animSprite.anchor.set(0.5, 1.0);
			this.animSprite.animationSpeed = 0.15; // match original demo speed
			this.container.addChild(this.animSprite);
		}
	}

	/** Move the entity in a given Direction. */
	public move(direction: Direction): void {
		this.direction = direction;
		this.isMoving = true;
		const animName = DIR_TO_ANIM[direction];
		if (this.animSprite && this.framesCache.has(animName)) {
			const frames = this.framesCache.get(animName)!;
			if (this.animSprite.textures !== frames) {
				this.animSprite.textures = frames;
				this.animSprite.currentFrame = 0;
			}
			this.animSprite.play();
		}
	}

	/** Stop movement and set the sprite to the first frame of the current
	 * direction.
	 */
	public stop(): void {
		this.isMoving = false;
		this.footstepTimer = 0;
		if (this.animSprite) {
			this.animSprite.gotoAndStop(0);
		}
	}

	/** Directly set a specific animation frame (useful for testing).
	 * Frame index is relative to the current direction's animation.
	 */
	public setFrame(frameIndex: number): void {
		const animName = DIR_TO_ANIM[this.direction];
		const frames = this.framesCache.get(animName);
		if (
			frames &&
			frameIndex >= 0 &&
			frameIndex < frames.length &&
			this.animSprite
		) {
			this.animSprite.textures = frames;
			this.animSprite.gotoAndStop(frameIndex);
		}
	}

	/** Internal step – called each frame from the owning scene. */
	public update(dt: number): void {
		if (!this.isMoving) return;

		// Apply movement based on direction and speed.
		const dist = this.speed * dt;
		let nx = this._x;
		let ny = this._y;
		switch (this.direction) {
			case Direction.DOWN:
				ny += dist;
				break;
			case Direction.UP:
				ny -= dist;
				break;
			case Direction.LEFT:
				nx -= dist;
				break;
			case Direction.RIGHT:
				nx += dist;
				break;
			case Direction.DOWN_LEFT:
				nx -= dist;
				ny += dist;
				break;
			case Direction.DOWN_RIGHT:
				nx += dist;
				ny += dist;
				break;
			case Direction.UP_LEFT:
				nx -= dist;
				ny -= dist;
				break;
			case Direction.UP_RIGHT:
				nx += dist;
				ny -= dist;
				break;
		}

		// Collision – if a checker was supplied, verify the new position.
		if (this.collisionCheck) {
			// Apply the same hit‑box offset used in DemoWorld (30px from top).
			const HITBOX_FROM_TOP = 30;
			const canMove = this.collisionCheck(nx, ny + HITBOX_FROM_TOP);
			if (!canMove) {
				// Abort movement but keep facing direction.
				this.stop();
				return;
			}
		}

		// Commit new position.
		this.setPosition(nx, ny);

		// Footstep audio – play every FOOTSTEP_INTERVAL_MS while walking.
		this.footstepTimer += dt * 1000; // dt is in seconds.
		if (this.footstepTimer >= FOOTSTEP_INTERVAL_MS) {
			this.footstepTimer = 0;
			const variant =
				FOOTSTEP_VARIANTS[this.footstepIdx % FOOTSTEP_VARIANTS.length];
			if (this.audioMgr.isLoaded(variant)) {
				this.audioMgr.playSound(variant, { volume: 0.1 });
			} else if (this.audioMgr.isLoaded("footstep")) {
				// Fallback to generic footstep id.
				this.audioMgr.playSound("footstep", { volume: 0.1 });
			}
			this.footstepIdx++;
		}
	}
}
