/**
 * Cameraman — advanced camera system with auto-zoom, smooth follow, 
 * screen shake, boundary detection, and auto-zoom based on player movement.
 *
 * Ported from okgame C++ Engine/entity/Cameraman.
 */
import { Easing } from '../rpg/Easing';

export interface CameramanTarget {
    x: number;
    y: number;
    width: number;
    height: number;
    isMoving?: boolean;
    isRunning?: boolean;
}

export interface CameraBoundsProvider {
    getWidthPixels(): number;
    getHeightPixels(): number;
    getCameraBoundsTile(x: number, y: number): number;
}

export class Cameraman {
    // Position
    private _x = 0;
    private _y = 0;

    // Target
    private _target: CameramanTarget | null = null;
    private _viewportWidth = 800;
    private _viewportHeight = 600;
    private _tileSize = 16;

    // Screen shake
    private screenShakeX = 0;
    private screenShakeY = 0;
    private shakeDurationRemaining = 0;
    private shakeMaxX = 0;
    private shakeMaxY = 0;
    private shakeTicksPerShake = 0;
    private shakeXCounter = 0;
    private shakeYCounter = 0;
    private shakeLeftRight = false;
    private shakeUpDown = false;
    private shakeStartTime = 0;
    private shakeTotalDuration = 0;

    // Zoom
    private zoom = 2.0;
    private zoomTo = 2.0;
    private runZoomTo = 2.0;
    private quickZoomTo = 0;
    private popZoomTo = 0;
    private zoomIncrement = 0.25;
    private minZoom = 0.25;
    private maxZoom = 3.0;

    // Auto-zoom by movement
    private autoZoomEnabled = true;
    private manualZoomEnabled = true;
    private runningZoom = 1.0;
    private walkingZoom = 1.5;

    // Timing
    private ticksSinceSnap = 0;
    private ticksSinceZoomOut = 0;
    private standingTicks = 0;
    private zoomBackInTicks = 0;
    private runningZoomTicks = 0;
    private walkingZoomTicks = 0;
    private snapSpeedX = 0;
    private snapSpeedY = 0;
    private runningTempZoom = 2.0;
    private walkingTempZoom = 2.0;
    private standingTempZoom = 2.0;

    // Auto-zoom timing thresholds (in ms)
    private ticksToWaitBeforeCentering = 1000;
    private ticksToCenterOnPlayer = 2000;
    private ticksToWaitBeforeZoomOut = 1000;
    private ticksToZoomOutWhileMoving = 1000;
    private ticksToWaitBeforeZoomBackIn = 200;
    private ticksToZoomBackIn = 1000;

    // Camera bounds
    private cameraStopTile = 4;
    private ignoreBounds = false;
    private mapProvider: CameraBoundsProvider | null = null;

    // ============================================================
    // Configuration
    // ============================================================

    setViewport(width: number, height: number): void {
        this._viewportWidth = width;
        this._viewportHeight = height;
    }

    setTileSize(size: number): void {
        this._tileSize = size;
    }

    setMapProvider(provider: CameraBoundsProvider): void {
        this.mapProvider = provider;
    }

    setIgnoreBounds(ignore: boolean): void {
        this.ignoreBounds = ignore;
    }

    // ============================================================
    // Target
    // ============================================================

    setTarget(target: CameramanTarget): void {
        this._target = target;
    }

    clearTarget(): void {
        this._target = null;
    }

    snapToTarget(): void {
        if (this._target) {
            this._x = this._target.x + this._target.width / 2;
            this._y = this._target.y + this._target.height / 2;
        }
    }

    setPosition(x: number, y: number): void {
        this._x = x;
        this._y = y;
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (!this._target) return;

        const xtarget = this.getXTarget();
        const ytarget = this.getYTarget();

        // Calculate distances
        const distX = Math.abs(this._x - xtarget);
        const distY = Math.abs(this._y - ytarget);
        const maxDistX = this._viewportWidth;
        const maxDistY = this._viewportHeight;

        // Movement speed tracking for auto-zoom
        const isMoving = this._target.isMoving ?? false;
        const isRunning = this._target.isRunning ?? false;

        if (!isMoving) {
            this.snapSpeedX = 0;
            this.snapSpeedY = 0;
            this.ticksSinceSnap = 0;
            this.ticksSinceZoomOut = 0;
            this.standingTicks += dt;
            this.runningZoomTicks = 0;
            this.walkingZoomTicks = 0;

            // Zoom back in after standing
            if (this.standingTicks > this.ticksToWaitBeforeZoomBackIn) {
                this.zoomBackInTicks += dt;
                if (this.zoomBackInTicks < this.ticksToZoomBackIn) {
                    this.runZoomTo = this.standingTempZoom -
                        Easing.easeInOutQuad(this.zoomBackInTicks, 0, this.standingTempZoom - this.zoomTo, this.ticksToZoomBackIn);
                } else {
                    this.runZoomTo = this.zoomTo;
                }
            }
        } else {
            this.ticksSinceSnap += dt;
            this.ticksSinceZoomOut += dt;
            this.standingTicks = 0;
            this.zoomBackInTicks = 0;
            this.standingTempZoom = this.runZoomTo;

            // Auto-zoom out when moving
            if (this.ticksSinceZoomOut > this.ticksToWaitBeforeZoomOut && this.autoZoomEnabled) {
                if (isRunning) {
                    this.runningZoomTicks += dt;
                    this.walkingZoomTicks = 0;
                    if (this.zoomTo > this.runningZoom && this.runningZoomTicks <= this.ticksToZoomOutWhileMoving) {
                        this.runZoomTo = this.runningTempZoom -
                            Easing.easeInOutQuad(this.runningZoomTicks, 0, this.runningTempZoom - this.runningZoom, this.ticksToZoomOutWhileMoving);
                    } else if (this.runningZoomTicks > this.ticksToZoomOutWhileMoving) {
                        this.runZoomTo = this.runningZoom;
                    }
                    this.walkingTempZoom = this.runZoomTo;
                } else {
                    this.walkingZoomTicks += dt;
                    this.runningZoomTicks = 0;
                    if (this.zoomTo > this.walkingZoom && this.walkingZoomTicks <= this.ticksToZoomOutWhileMoving) {
                        this.runZoomTo = this.walkingTempZoom -
                            Easing.easeInOutQuad(this.walkingZoomTicks, 0, this.walkingTempZoom - this.walkingZoom, this.ticksToZoomOutWhileMoving);
                    } else if (this.walkingZoomTicks > this.ticksToZoomOutWhileMoving) {
                        this.runZoomTo = this.walkingZoom;
                    }
                    this.runningTempZoom = this.runZoomTo;
                }
            }
        }

        // Smooth follow with easing
        const maxSpeed = 100.0;
        const currentSpeedX = Easing.easeOutCubic(distX, this.snapSpeedX, maxSpeed, maxDistX);
        const currentSpeedY = Easing.easeOutCubic(distY, this.snapSpeedY, maxSpeed, maxDistY);

        const pixelsToMoveX = currentSpeedX * dt * 0.01;
        const pixelsToMoveY = currentSpeedY * dt * 0.01;

        // Move toward target
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

        this.updateZoom(dt);
        this.updateScreenShake(dt);
    }

    // ============================================================
    // Target Calculation with Boundary Detection
    // ============================================================

    private getXTarget(): number {
        if (!this._target || !this.mapProvider || this.ignoreBounds) {
            return this._target ? this._target.x + this._target.width / 2 : this._x;
        }

        const playerX = this._target.x + this._target.width / 2;
        const playerY = this._target.y + this._target.height / 2;
        const viewportWidth = this._viewportWidth / this.zoom;
        const mapWidth = this.mapProvider.getWidthPixels();

        let leftBounds = -1;
        let rightBounds = -1;

        // Scan left for camera stop tiles
        for (let tx = Math.floor(playerX / this._tileSize); tx >= 0; tx--) {
            const tile = this.mapProvider.getCameraBoundsTile(tx * this._tileSize, playerY);
            if (tile === this.cameraStopTile || tx === 0) {
                leftBounds = (tx + 1) * this._tileSize;
                break;
            }
        }

        // Scan right
        const mapWidthTiles = mapWidth / this._tileSize;
        for (let tx = Math.floor(playerX / this._tileSize); tx < mapWidthTiles; tx++) {
            const tile = this.mapProvider.getCameraBoundsTile(tx * this._tileSize, playerY);
            if (tile === this.cameraStopTile || tx >= mapWidthTiles - 1) {
                rightBounds = tx * this._tileSize;
                break;
            }
        }

        // Determine target
        if (leftBounds !== -1 && rightBounds !== -1 && rightBounds - leftBounds <= viewportWidth) {
            return leftBounds + (rightBounds - leftBounds) / 2;
        }
        if (leftBounds !== -1 && playerX <= leftBounds + viewportWidth / 2) {
            return leftBounds + viewportWidth / 2;
        }
        if (rightBounds !== -1 && playerX >= rightBounds - viewportWidth / 2) {
            return rightBounds - viewportWidth / 2;
        }

        return playerX;
    }

    private getYTarget(): number {
        if (!this._target || !this.mapProvider || this.ignoreBounds) {
            return this._target ? this._target.y + this._target.height / 2 : this._y;
        }

        const playerX = this._target.x + this._target.width / 2;
        const playerY = this._target.y + this._target.height / 2;
        const viewportHeight = this._viewportHeight / this.zoom;
        const mapHeight = this.mapProvider.getHeightPixels();

        let topBounds = -1;
        let bottomBounds = -1;

        for (let ty = Math.floor(playerY / this._tileSize); ty >= 0; ty--) {
            const tile = this.mapProvider.getCameraBoundsTile(playerX, ty * this._tileSize);
            if (tile === this.cameraStopTile || ty === 0) {
                topBounds = (ty + 1) * this._tileSize;
                break;
            }
        }

        const mapHeightTiles = mapHeight / this._tileSize;
        for (let ty = Math.floor(playerY / this._tileSize); ty < mapHeightTiles; ty++) {
            const tile = this.mapProvider.getCameraBoundsTile(playerX, ty * this._tileSize);
            if (tile === this.cameraStopTile || ty >= mapHeightTiles - 1) {
                bottomBounds = ty * this._tileSize;
                break;
            }
        }

        if (topBounds !== -1 && bottomBounds !== -1 && bottomBounds - topBounds <= viewportHeight) {
            return topBounds + (bottomBounds - topBounds) / 2;
        }
        if (topBounds !== -1 && playerY <= topBounds + viewportHeight / 2) {
            return topBounds + viewportHeight / 2;
        }
        if (bottomBounds !== -1 && playerY >= bottomBounds - viewportHeight / 2) {
            return bottomBounds - viewportHeight / 2;
        }

        return playerY;
    }

    // ============================================================
    // Zoom
    // ============================================================

    private updateZoom(dt: number): void {
        const rate = dt * 0.01;

        if (this.quickZoomTo !== 0 && this.manualZoomEnabled) {
            // Quick zoom (for conversations, etc.)
            if (this.zoom < this.quickZoomTo) {
                this.zoom += rate;
                if (this.zoom >= this.quickZoomTo) this.zoom = this.quickZoomTo;
            } else if (this.zoom > this.quickZoomTo) {
                this.zoom -= rate;
                if (this.zoom <= this.quickZoomTo) this.zoom = this.quickZoomTo;
            }
        } else if (this.runZoomTo !== this.zoomTo && this.autoZoomEnabled) {
            // Auto-zoom from player movement
            const target = this.runZoomTo;
            if (this.zoom < target) {
                this.zoom += rate;
                if (this.zoom >= target) this.zoom = target;
            } else if (this.zoom > target) {
                this.zoom -= rate;
                if (this.zoom <= target) this.zoom = target;
            }
        } else {
            // Return to default zoom
            const slowRate = dt * 0.002;
            if (this.zoom < this.zoomTo) {
                this.zoom += slowRate;
                if (this.zoom >= this.zoomTo) this.zoom = this.zoomTo;
            } else if (this.zoom > this.zoomTo) {
                this.zoom -= slowRate;
                if (this.zoom <= this.zoomTo) this.zoom = this.zoomTo;
            }
        }
    }

    zoomIn(): void {
        if (this.zoomTo < this.maxZoom) {
            this.zoomTo += this.zoomIncrement;
            this.zoomTo = Math.min(this.zoomTo, this.maxZoom);
        }
        this.runZoomTo = this.zoomTo;
    }

    zoomOut(): void {
        if (this.zoomTo > this.minZoom) {
            this.zoomTo -= this.zoomIncrement;
            this.zoomTo = Math.max(this.zoomTo, this.minZoom);
        }
        this.runZoomTo = this.zoomTo;
    }

    resetZoom(): void {
        this.zoomTo = 2.0;
        this.runZoomTo = this.zoomTo;
    }

    quickZoomOut(): void {
        this.quickZoomTo = this.minZoom;
    }

    quickZoomIn(): void {
        this.quickZoomTo = this.maxZoom;
    }

    resetQuickZoom(): void {
        this.quickZoomTo = 0;
    }

    // ============================================================
    // Screen Shake
    // ============================================================

    setShakeScreen(durationMs: number, maxX: number, maxY: number, ticksPerShake: number): void {
        this.shakeStartTime = performance.now();
        this.shakeDurationRemaining += durationMs;
        this.shakeTotalDuration = this.shakeDurationRemaining;
        this.shakeMaxX = maxX;
        this.shakeMaxY = maxY;
        this.shakeTicksPerShake = ticksPerShake;
    }

    private updateScreenShake(dt: number): void {
        if (this.shakeDurationRemaining > 0) {
            this.shakeDurationRemaining -= dt;
            if (this.shakeDurationRemaining < 0) this.shakeDurationRemaining = 0;

            const elapsed = this.shakeTotalDuration - this.shakeDurationRemaining;
            const progress = elapsed / this.shakeTotalDuration;

            // Ease the shake intensity
            const xIntensity = Easing.easeInOutCubic(elapsed, 0, this.shakeMaxX, this.shakeTotalDuration);
            const yIntensity = Easing.easeInOutCubic(elapsed, 0, this.shakeMaxY, this.shakeTotalDuration);

            // Toggle direction at shake rate
            this.shakeXCounter += dt;
            if (this.shakeXCounter > this.shakeTicksPerShake) {
                this.shakeXCounter = 0;
                this.shakeLeftRight = !this.shakeLeftRight;
            }

            this.shakeYCounter += dt;
            if (this.shakeYCounter > this.shakeTicksPerShake * 2) {
                this.shakeYCounter = 0;
                this.shakeUpDown = !this.shakeUpDown;
            }

            const xThisTime = Easing.easeInOutCubic(this.shakeXCounter, 0, xIntensity, this.shakeTicksPerShake);
            const yThisTime = Easing.easeInOutCubic(this.shakeYCounter, 0, yIntensity, this.shakeTicksPerShake * 2);

            this.screenShakeX = this.shakeLeftRight ? xThisTime : -xThisTime;
            this.screenShakeY = this.shakeUpDown ? yThisTime : -yThisTime;
        } else {
            this.screenShakeX = 0;
            this.screenShakeY = 0;
        }
    }

    // ============================================================
    // Getters
    // ============================================================

    get x(): number { return this._x + this.screenShakeX / this.zoom; }
    get y(): number { return this._y + this.screenShakeY / this.zoom; }

    get rawX(): number { return this._x; }
    get rawY(): number { return this._y; }

    getZoom(): number {
        if (this.shakeMaxY !== 0) {
            return this.zoom + ((this.screenShakeY / this.shakeMaxY) * (this.shakeMaxY / (this._viewportWidth * this.zoom))) * 2;
        }
        return this.zoom;
    }

    getTargetZoom(): number { return this.zoomTo; }
    setZoomTo(z: number): void { this.zoomTo = z; this.runZoomTo = z; }

    setAutoZoom(enabled: boolean): void { this.autoZoomEnabled = enabled; }
    setManualZoom(enabled: boolean): void { this.manualZoomEnabled = enabled; }
}
