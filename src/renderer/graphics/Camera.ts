/**
 * Camera — Full port of Java Cameraman + Entity animation system.
 *
 * Camera features from Java:
 * - Camera bounds (camstop tiles) for room-based clamping
 * - Easing-based follow (easeOutQuintic distance → speed)
 * - Auto-zoom by player movement (zoom out when running, zoom in when standing)
 * - Manual zoom in/out with +/= and - keys (0.25 increments)
 * - Quick zoom out (1.0x) and quick zoom in (3.0x for conversations)
 * - Screen shake with easing (easeInOutCircular)
 * - Pixel-rounded positions to prevent sub-pixel grid gaps
 * - Zoom range: MIN 0.25, MAX 3.0, default 2.0
 *
 * Animation features from Java:
 * - 8-direction animation (Up/Down/Left/Right + diagonals)
 * - Ticks-between-frames animation speed
 * - Loop vs once-through animation modes
 * - Random frame animation (idle fidgeting)
 * - Animation sequences with frame ranges
 * - Shadow rendering (flipped, squished, tinted black, translucent)
 */

import { type Container, Point } from "pixi.js";

// ─── Easing functions (from Java Easing.java) ────────────────────
export const Easing = {
	easeOutQuintic(t: number, b: number, c: number, d: number): number {
		return c * ((t /= d) * t * t * t * t) + b;
	},
	easeInSinusoidal(t: number, b: number, c: number, d: number): number {
		return -c * Math.cos((t / d) * (Math.PI / 2)) + c + b;
	},
	easeInOutSinusoidal(t: number, b: number, c: number, d: number): number {
		return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
	},
	easeInOutCircular(t: number, b: number, c: number, d: number): number {
		if ((t /= d / 2) < 1) return (-c / 2) * (Math.sqrt(1 - t * t) - 1) + b;
		return (c / 2) * (Math.sqrt(1 - (t -= 2) * t) - 1) + b;
	},
};

// ─── Direction constants (from Java Entity) ──────────────────────
export const DIR = {
	UP: 0,
	DOWN: 1,
	LEFT: 2,
	RIGHT: 3,
	UPLEFT: 4,
	UPRIGHT: 5,
	DOWNLEFT: 6,
	DOWNRIGHT: 7,
} as const;

export type Direction = (typeof DIR)[keyof typeof DIR];

export const DIR_NAMES: Record<number, string> = {
	[DIR.UP]: "Up",
	[DIR.DOWN]: "Down",
	[DIR.LEFT]: "Left",
	[DIR.RIGHT]: "Right",
	[DIR.UPLEFT]: "UpLeft",
	[DIR.UPRIGHT]: "UpRight",
	[DIR.DOWNLEFT]: "DownLeft",
	[DIR.DOWNRIGHT]: "DownRight",
};

// ─── Camera config ───────────────────────────────────────────────
export interface CameraConfig {
	viewportWidth: number;
	viewportHeight: number;
	minZoom?: number;
	maxZoom?: number;
	defaultZoom?: number;
}

export interface CameraTarget {
	x: number;
	y: number;
	w?: number;
	h?: number;
	isRunning?: boolean;
	noInput?: boolean;
}

// ─── Camera class (port of Java Cameraman) ───────────────────────
export class Camera {
	private container: Container;

	// Camera position
	private _x = 0;
	private _y = 0;

	// Zoom system (from Java Cameraman)
	static ZOOM_INCREMENT = 0.25;
	static MIN_ZOOM = 0.25;
	static MAX_ZOOM = 3.0;

	private _zoomVal = 2.0;
	private ZOOMto = 2.0; // user-set target zoom
	private runZOOMto = 2.0; // movement-adjusted zoom
	private quickZOOMto = 0; // quick zoom target (0 = inactive)
	private popZOOMto = 0; // pop zoom target (0 = inactive)
	private ZOOMlock = 0;

	// Auto-zoom by player movement (from Java)
	private autoZoomEnabled = true;
	private manualZoomEnabled = true;

	// Movement zoom thresholds (ticks = ms at 60fps)
	private runningZoom = 1.0; // zoom level when running outside
	private walkingZoom = 1.5; // zoom level when walking outside
	private ticksToWaitBeforeZoomingOut = 1000;
	private ticksToWaitBeforeZoomingBackIn = 200;
	private ticksToZoomOutWhileRunningOrWalking = 1000;
	private ticksToZoomBackInFromRunningOrWalking = 1000;
	private ticksToWaitBeforeCenteringOnPlayer = 1000;
	private ticksToCenterOnPlayer = 2000;

	// Movement tick counters
	private runningZoomTicks = 0;
	private walkingZoomTicks = 0;
	private standingTicks = 0;
	private zoomBackInTicks = 0;
	private walkingTempZoom = 2.0;
	private runningTempZoom = 2.0;
	private standingTempZoom = 2.0;

	// Camera follow easing (from Java)
	private snapSpeedX = 0;
	private snapSpeedY = 0;
	private ticksSinceSnapToPlayer = 0;
	private ticksSinceZoomOut = 0;

	// Camera bounds (from Java: camstop tiles)
	private _bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null = null;
	ignoreCameraFXBoundaries = false;

	// Target tracking
	private _target: CameraTarget | null = null;
	private _viewportWidth: number;
	private _viewportHeight: number;

	// Screen shake (from Java)
	private screenShakeX = 0;
	private screenShakeY = 0;
	private shakeScreenTicksDuration = 0;
	private shakeScreenTicksCounter = 0;
	private screenShakeMaxX = 0;
	private screenShakeMaxY = 0;
	private screenShakeTicksPerShake = 0;
	private screenShakeTicksPerShakeXCounter = 0;
	private screenShakeTicksPerShakeYCounter = 0;
	private shakeScreenLeftRightToggle = false;
	private shakeScreenUpDownToggle = false;
	private shakeScreenStartTime = 0;

	// Tile size for camera bounds calculations

	constructor(container: Container, config: CameraConfig) {
		this.container = container;
		this._viewportWidth = config.viewportWidth;
		this._viewportHeight = config.viewportHeight;
		if (config.defaultZoom) {
			this._zoomVal = config.defaultZoom;
			this.ZOOMto = config.defaultZoom;
			this.runZOOMto = config.defaultZoom;
		}
	}

	// ─── Public API ──────────────────────────────────────────────

	get x(): number {
		return this._x + this.screenShakeX / this.zoom;
	}
	get y(): number {
		return this._y + this.screenShakeY / this.zoom;
	}
	get rawX(): number {
		return this._x;
	}
	get rawY(): number {
		return this._y;
	}
	get zoomLevel(): number {
		return this._zoomVal;
	}
	get targetZoom(): number {
		return this.ZOOMto;
	}
	get viewportWidth(): number {
		return this._viewportWidth;
	}
	get viewportHeight(): number {
		return this._viewportHeight;
	}

	get visibleBounds(): {
		x: number;
		y: number;
		width: number;
		height: number;
	} {
		return {
			x: this._x,
			y: this._y,
			width: this._viewportWidth / this._zoomVal,
			height: this._viewportHeight / this._zoomVal,
		};
	}

	setContainer(container: Container): void {
		this.container = container;
	}

	// ─── Backward-compatible API ───────────────────────────────────

	/** Backward compat: zoom getter/setter */
	get zoom(): number {
		return this.zoomLevel;
	}
	set zoom(value: number) {
		this.ZOOMto = Math.max(Camera.MIN_ZOOM, Math.min(Camera.MAX_ZOOM, value));
		this._zoomVal = this.ZOOMto;
		this.runZOOMto = this.ZOOMto;
	}

	/** Backward compat: add a follow target */
	addTarget(target: CameraTarget): void {
		this.setTarget(target);
	}

	/** Backward compat: remove follow targets */
	clearTargets(): void {
		this._target = null;
	}

	/** Backward compat: set interpolation factor (maps to snap speed) */
	setLerp(value: number): void {
		// In the Java version, camera speed is based on distance easing.
		// A higher lerp = faster snap. We map it to initial snap speed.
		this.snapSpeedX = value * 10;
		this.snapSpeedY = value * 10;
	}

	/** Backward compat: simple screen shake */
	setShake(durationMs: number, intensityX: number, intensityY: number): void {
		this.setShakeScreen(durationMs, intensityX, intensityY, 50);
	}

	setTarget(target: CameraTarget): void {
		this._target = target;
		// Snap immediately on first set
		if (this._target) {
			const tx = target.x + (target.w ?? 0) / 2;
			const ty = target.y + (target.h ?? 0) / 2;
			this._x = tx - this._viewportWidth / (2 * this.zoom);
			this._y = ty - this._viewportHeight / (2 * this.zoom);
		}
	}

	setPosition(x: number, y: number): void {
		this._x = x;
		this._y = y;
	}

	centerOn(worldX: number, worldY: number): void {
		this._x = worldX - this._viewportWidth / (2 * this.zoom);
		this._y = worldY - this._viewportHeight / (2 * this.zoom);
	}

	setBounds(x: number, y: number, width: number, height: number): void {
		this._bounds = { x, y, width, height };
	}

	clearBounds(): void {
		this._bounds = null;
	}

	resize(width: number, height: number): void {
		this._viewportWidth = width;
		this._viewportHeight = height;
	}

	// ─── Zoom controls (from Java) ──────────────────────────────

	zoomIn(): void {
		if (this.ZOOMlock === 0) {
			this.ZOOMto = Math.min(
				this.ZOOMto + Camera.ZOOM_INCREMENT,
				Camera.MAX_ZOOM,
			);
			this.runZOOMto = this.ZOOMto;
		}
	}

	zoomOut(): void {
		if (this.ZOOMlock === 0) {
			this.ZOOMto = Math.max(
				this.ZOOMto - Camera.ZOOM_INCREMENT,
				Camera.MIN_ZOOM,
			);
			this.runZOOMto = this.ZOOMto;
		}
	}

	resetZoom(): void {
		this.ZOOMto = 2.0;
		this.runZOOMto = this.ZOOMto;
	}

	quickZoomOut(): void {
		this.quickZOOMto = 1.0;
	}

	quickZoomIn(): void {
		this.quickZOOMto = 3.0;
	}

	resetQuickZoom(): void {
		if (this.quickZOOMto !== 0) {
			if (this.quickZOOMto > this.ZOOMto) {
				this.quickZOOMto -= 0.01 * 16; // ~16ms tick
				if (this.quickZOOMto < this.ZOOMto) this.quickZOOMto = 0;
			}
			if (this._zoomVal < this.ZOOMto) {
				this.quickZOOMto += 0.01 * 16;
				if (this.quickZOOMto > this.ZOOMto) this.quickZOOMto = 0;
			}
		}
	}

	setAutoZoom(enabled: boolean): void {
		this.autoZoomEnabled = enabled;
	}

	setManualZoom(enabled: boolean): void {
		this.manualZoomEnabled = enabled;
	}

	// ─── Screen shake (from Java) ────────────────────────────────

	setShakeScreen(
		ticksDuration: number,
		maxX: number,
		maxY: number,
		ticksPerShake: number,
	): void {
		if (this.shakeScreenTicksCounter === 0) {
			this.shakeScreenStartTime = performance.now();
		}
		this.shakeScreenTicksCounter += ticksDuration;
		this.shakeScreenTicksDuration = this.shakeScreenTicksCounter;
		this.screenShakeMaxX = maxX;
		this.screenShakeMaxY = maxY;
		this.screenShakeTicksPerShake = ticksPerShake;
	}

	private updateScreenShake(ticksPassed: number): void {
		if (this.shakeScreenTicksCounter > 0) {
			this.shakeScreenTicksCounter -= ticksPassed;
			if (this.shakeScreenTicksCounter < 0) this.shakeScreenTicksCounter = 0;

			const ticksPassedMs = performance.now() - this.shakeScreenStartTime;
			const xOverShakeTime = Easing.easeInOutCircular(
				ticksPassedMs,
				0,
				this.screenShakeMaxX,
				this.shakeScreenTicksDuration,
			);
			const yOverShakeTime = Easing.easeInOutCircular(
				ticksPassedMs,
				0,
				this.screenShakeMaxY,
				this.shakeScreenTicksDuration,
			);

			this.screenShakeTicksPerShakeXCounter += ticksPassed;
			if (
				this.screenShakeTicksPerShakeXCounter > this.screenShakeTicksPerShake
			) {
				this.screenShakeTicksPerShakeXCounter = 0;
				this.shakeScreenLeftRightToggle = !this.shakeScreenLeftRightToggle;
			}

			this.screenShakeTicksPerShakeYCounter += ticksPassed;
			if (
				this.screenShakeTicksPerShakeYCounter >
				this.screenShakeTicksPerShake * 2
			) {
				this.screenShakeTicksPerShakeYCounter = 0;
				this.shakeScreenUpDownToggle = !this.shakeScreenUpDownToggle;
			}

			const xThisTime = Easing.easeInOutCircular(
				this.screenShakeTicksPerShakeXCounter,
				0,
				xOverShakeTime,
				this.screenShakeTicksPerShake,
			);
			const yThisTime = Easing.easeInOutCircular(
				this.screenShakeTicksPerShakeYCounter,
				0,
				yOverShakeTime,
				this.screenShakeTicksPerShake * 2,
			);

			this.screenShakeX = this.shakeScreenLeftRightToggle
				? xThisTime
				: -xThisTime;
			this.screenShakeY = this.shakeScreenUpDownToggle ? yThisTime : -yThisTime;
		} else {
			this.screenShakeX = 0;
			this.screenShakeY = 0;
		}
	}

	// ─── Main update (from Java Cameraman.update) ───────────────

	update(deltaMs: number): void {
		const ticksPassed = Math.round(deltaMs);

		if (!this._target) {
			this.updateZoom(ticksPassed);
			this.updateScreenShake(ticksPassed);
			this.updateContainer();
			return;
		}

		const playerX = this._target.x + (this._target.w ?? 0) / 2;
		const playerY = this._target.y + (this._target.h ?? 0) / 2;

		// Get camera target position (with bounds clamping)
		const xtarget = this.getXTarget(playerX, playerY);
		const ytarget = this.getYTarget(playerX, playerY);

		// Calculate distance and speed (from Java)
		const distX = Math.abs(this._x - xtarget);
		const distY = Math.abs(this._y - ytarget);
		const maxDistX = this._viewportWidth;
		const maxDistY = this._viewportHeight;

		// Auto-zoom by player movement
		if (this.autoZoomEnabled) {
			this.updateAutoZoom(ticksPassed);
		}

		// Snap speed: ease in when player has been moving for a while
		if (this._target.noInput) {
			this.snapSpeedX = 0;
			this.snapSpeedY = 0;
			this.ticksSinceSnapToPlayer = 0;
			this.ticksSinceZoomOut = 0;
			this.standingTicks += ticksPassed;

			if (this.standingTicks > this.ticksToWaitBeforeZoomingBackIn) {
				this.zoomBackInTicks += ticksPassed;
				if (this.zoomBackInTicks < this.ticksToZoomBackInFromRunningOrWalking) {
					this.runZOOMto =
						Math.ceil(
							(this.standingTempZoom -
								Easing.easeInOutSinusoidal(
									this.zoomBackInTicks,
									0,
									this.standingTempZoom - this.ZOOMto,
									this.ticksToZoomBackInFromRunningOrWalking,
								)) *
								1000,
						) / 1000;
				} else {
					this.runZOOMto = this.ZOOMto;
				}
			}
			this.runningZoomTicks = 0;
			this.walkingZoomTicks = 0;
		} else {
			this.ticksSinceSnapToPlayer += ticksPassed;
			this.ticksSinceZoomOut += ticksPassed;
			this.standingTicks = 0;
			this.zoomBackInTicks = 0;
			this.standingTempZoom = this.runZOOMto;

			// Snap camera to player speed after waiting
			if (
				this.ticksSinceSnapToPlayer > this.ticksToWaitBeforeCenteringOnPlayer
			) {
				const playerSpeed = 5.0; // approximate
				if (this.snapSpeedX < playerSpeed) {
					this.snapSpeedX = Easing.easeInSinusoidal(
						this.ticksSinceSnapToPlayer -
							this.ticksToWaitBeforeCenteringOnPlayer,
						0,
						playerSpeed,
						this.ticksToWaitBeforeCenteringOnPlayer +
							this.ticksToCenterOnPlayer,
					);
				}
				if (this.snapSpeedY < playerSpeed) {
					this.snapSpeedY = Easing.easeInSinusoidal(
						this.ticksSinceSnapToPlayer -
							this.ticksToWaitBeforeCenteringOnPlayer,
						0,
						playerSpeed,
						this.ticksToWaitBeforeCenteringOnPlayer +
							this.ticksToCenterOnPlayer,
					);
				}
			}
		}

		// Calculate current speed using easeOutQuintic (from Java)
		const maxSpeed = 100.0;
		const currentSpeedX = Easing.easeOutQuintic(
			distX,
			this.snapSpeedX,
			maxSpeed,
			maxDistX,
		);
		const currentSpeedY = Easing.easeOutQuintic(
			distY,
			this.snapSpeedY,
			maxSpeed,
			maxDistY,
		);

		const pixelsToMoveX = currentSpeedX * ticksPassed * 0.01;
		const pixelsToMoveY = currentSpeedY * ticksPassed * 0.01;

		// Move camera toward target (from Java)
		if (this._x > xtarget) {
			this._x -= pixelsToMoveX;
			if (this._x < xtarget) this._x = xtarget;
		}
		if (this._x < xtarget) {
			this._x += pixelsToMoveX;
			if (this._x > xtarget) this._x = xtarget;
		}
		if (this._y > ytarget) {
			this._y -= pixelsToMoveY;
			if (this._y < ytarget) this._y = ytarget;
		}
		if (this._y < ytarget) {
			this._y += pixelsToMoveY;
			if (this._y > ytarget) this._y = ytarget;
		}

		this.updateZoom(ticksPassed);
		this.updateScreenShake(ticksPassed);
		this.updateContainer();
	}

	// ─── Auto-zoom by player movement (from Java) ────────────────

	private updateAutoZoom(ticksPassed: number): void {
		if (!this._target) return;

		if (this._target.noInput) return;

		this.ticksSinceZoomOut += ticksPassed;

		if (this.ticksSinceZoomOut > this.ticksToWaitBeforeZoomingOut) {
			if (this._target.isRunning) {
				this.runningZoomTicks += ticksPassed;
				this.walkingZoomTicks = 0;

				if (this.ZOOMto > this.runningZoom) {
					if (
						this.runningZoomTicks <= this.ticksToZoomOutWhileRunningOrWalking
					) {
						this.runZOOMto =
							Math.floor(
								(this.runningTempZoom -
									Easing.easeInOutSinusoidal(
										this.runningZoomTicks,
										0,
										this.runningTempZoom - this.runningZoom,
										this.ticksToZoomOutWhileRunningOrWalking,
									)) *
									1000,
							) / 1000;
					} else {
						this.runZOOMto = this.runningZoom;
					}
					this.walkingTempZoom = this.runZOOMto;
				}
			} else {
				this.walkingZoomTicks += ticksPassed;
				this.runningZoomTicks = 0;

				if (this.ZOOMto > this.walkingZoom) {
					if (
						this.walkingZoomTicks <= this.ticksToZoomOutWhileRunningOrWalking
					) {
						this.runZOOMto =
							Math.floor(
								(this.walkingTempZoom -
									Easing.easeInOutSinusoidal(
										this.walkingZoomTicks,
										0,
										this.walkingTempZoom - this.walkingZoom,
										this.ticksToZoomOutWhileRunningOrWalking,
									)) *
									1000,
							) / 1000;
					} else {
						this.runZOOMto = this.walkingZoom;
					}
					this.runningTempZoom = this.runZOOMto;
				}
			}
		} else {
			this.walkingTempZoom = this.runZOOMto;
			this.runningTempZoom = this.runZOOMto;
		}
	}

	// ─── Zoom update (from Java updateZoom) ──────────────────────

	private updateZoom(ticksPassed: number): void {
		// Quick zoom (manual override)
		if (this.quickZOOMto !== 0 && this.manualZoomEnabled) {
			if (this._zoomVal !== this.quickZOOMto) {
				if (this._zoomVal > this.quickZOOMto) {
					this._zoomVal -= 0.01 * ticksPassed;
					if (this._zoomVal < this.quickZOOMto) this.zoom = this.quickZOOMto;
				}
				if (this._zoomVal < this.quickZOOMto) {
					this._zoomVal += 0.01 * ticksPassed;
					if (this._zoomVal > this.quickZOOMto) this.zoom = this.quickZOOMto;
				}
			}
		}
		// Auto-zoom from player movement
		else if (this.runZOOMto !== this.ZOOMto && this.autoZoomEnabled) {
			if (this._zoomVal !== this.runZOOMto) {
				if (this._zoomVal > this.runZOOMto) {
					this._zoomVal -= 0.01 * ticksPassed;
					if (this._zoomVal < this.runZOOMto) this.zoom = this.runZOOMto;
				}
				if (this._zoomVal < this.runZOOMto) {
					this._zoomVal += 0.01 * ticksPassed;
					if (this._zoomVal > this.runZOOMto) this.zoom = this.runZOOMto;
				}
			}
		}
		// Pop zoom
		else if (this.popZOOMto !== 0) {
			if (this._zoomVal !== this.popZOOMto) {
				if (this._zoomVal > this.popZOOMto) {
					this._zoomVal -= 0.00005 * ticksPassed;
					if (this._zoomVal < this.popZOOMto) this._zoomVal = this.popZOOMto;
				}
				if (this._zoomVal < this.ZOOMto) {
					this._zoomVal += 0.00005 * ticksPassed;
					if (this._zoomVal > this.popZOOMto) this.zoom = this.popZOOMto;
				}
			}
			if (this._zoomVal === this.popZOOMto) this.popZOOMto = 0;
		}
		// Default: ease toward user zoom
		else {
			if (this._zoomVal !== this.ZOOMto) {
				if (this._zoomVal > this.ZOOMto) {
					this._zoomVal -= 0.002 * ticksPassed;
					if (this._zoomVal < this.ZOOMto) this._zoomVal = this.ZOOMto;
				}
				if (this._zoomVal < this.ZOOMto) {
					this._zoomVal += 0.002 * ticksPassed;
					if (this._zoomVal > this.ZOOMto) this._zoomVal = this.ZOOMto;
				}
			}
		}
	}

	// ─── Camera target with bounds (from Java getXTarget/getYTarget)

	private getXTarget(playerX: number, _playerY: number): number {
		const gameViewportWidth = this._viewportWidth / this._zoomVal;

		if (this._bounds) {
			const bw = this._bounds.width;
			if (bw <= gameViewportWidth) {
				// Room fits on screen → center it
				return this._bounds.x + bw / 2 - gameViewportWidth / 2;
			}
			// Room bigger than viewport → clamp to stay inside
			const left = this._bounds.x + gameViewportWidth / 2;
			const right = this._bounds.x + bw - gameViewportWidth / 2;
			return Math.max(left, Math.min(playerX, right));
		}

		if (this.ignoreCameraFXBoundaries) return playerX;
		return playerX;
	}

	private getYTarget(_playerX: number, playerY: number): number {
		const gameViewportHeight = this._viewportHeight / this._zoomVal;

		if (this._bounds) {
			const bh = this._bounds.height;
			if (bh <= gameViewportHeight) {
				return this._bounds.y + bh / 2 - gameViewportHeight / 2;
			}
			const top = this._bounds.y + gameViewportHeight / 2;
			const bottom = this._bounds.y + bh - gameViewportHeight / 2;
			return Math.max(top, Math.min(playerY, bottom));
		}

		if (this.ignoreCameraFXBoundaries) return playerY;
		return playerY;
	}

	// ─── Container update (pixel-rounded to prevent grid gaps) ───

	private updateContainer(): void {
		if (!this.container) return;
		this.container.scale.set(this._zoomVal);
		// Round position to nearest pixel to prevent sub-pixel grid gaps
		this.container.position.set(
			Math.round(-this._x * this.zoom + this.screenShakeX),
			Math.round(-this._y * this.zoom + this.screenShakeY),
		);
	}

	// ─── Coordinate transforms ──────────────────────────────────

	screenToWorld(screenX: number, screenY: number): Point {
		return new Point(
			this._x + screenX / this.zoom,
			this._y + screenY / this.zoom,
		);
	}

	worldToScreen(worldX: number, worldY: number): Point {
		return new Point(
			(worldX - this._x) * this.zoom,
			(worldY - this._y) * this.zoom,
		);
	}

	isInView(worldX: number, worldY: number, width = 0, height = 0): boolean {
		const viewWidth = this._viewportWidth / this._zoomVal;
		const viewHeight = this._viewportHeight / this._zoomVal;
		return (
			worldX + width >= this._x &&
			worldX <= this._x + viewWidth &&
			worldY + height >= this._y &&
			worldY <= this._y + viewHeight
		);
	}
}
