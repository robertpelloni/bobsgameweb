/**
 * AreaData — defines a rectangular area on a map with spawn/event/warp properties.
 *
 * Ported from okgame C++ Engine/map/AreaData.
 * Used for NPC spawn points, warp zones, event triggers, and points of interest.
 */

export class AreaData {
    public id: number;
    public name: string;
    public mapX: number = 0;   // pixels 1x
    public mapY: number = 0;
    public width: number = 0;
    public height: number = 0;

    // Spawn properties
    public randomPointOfInterest = false;
    public randomNPCSpawnPoint = false;
    public standSpawnDirection = -1;
    public waitHereTicks = 0;
    public randomWaitTime = false;
    public onlyOneAllowed = false;
    public randomNPCStayHere = false;
    public randomSpawnChance = 1.0;
    public randomSpawnOnlyTryOnce = false;
    public randomSpawnOnlyOffscreen = false;
    public randomSpawnDelay = 1000;
    public randomSpawnKids = true;
    public randomSpawnAdults = true;
    public randomSpawnMales = true;
    public randomSpawnFemales = true;
    public randomSpawnCars = false;

    // Warp properties
    public isWarpArea = false;
    public destinationTypeID = '';
    public destinationMapName = '';
    public destinationWarpAreaName = '';
    public arrivalX = -1;
    public arrivalY = -1;

    // Auto-pilot
    public autoPilot = false;
    public playerFaceDirection = false;
    public suckPlayerIntoMiddle = false;

    // Event
    public eventData: Record<string, unknown> | null = null;
    public comment = '';

    // Connections to other areas
    public connections: string[] = [];

    constructor(id: number, name = '') {
        this.id = id;
        this.name = name;
    }

    // ============================================================
    // Bounds helpers
    // ============================================================

    get left(): number { return this.mapX; }
    get top(): number { return this.mapY; }
    get right(): number { return this.mapX + this.width; }
    get bottom(): number { return this.mapY + this.height; }
    get middleX(): number { return this.mapX + this.width / 2; }
    get middleY(): number { return this.mapY + this.height / 2; }

    containsPoint(x: number, y: number): boolean {
        return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
    }

    intersects(other: AreaData): boolean {
        return this.left < other.right && this.right > other.left &&
               this.top < other.bottom && this.bottom > other.top;
    }

    inRangeOfEntity(entityX: number, entityY: number, range: number): boolean {
        const dx = this.middleX - entityX;
        const dy = this.middleY - entityY;
        return Math.sqrt(dx * dx + dy * dy) <= range;
    }

    // ============================================================
    // Serialization
    // ============================================================

    static fromJSON(data: Record<string, unknown>): AreaData {
        const area = new AreaData(
            (data.id as number) ?? -1,
            (data.name as string) ?? '',
        );
        Object.assign(area, data);
        return area;
    }

    toJSON(): Record<string, unknown> {
        return { ...this, connections: [...this.connections] } as unknown as Record<string, unknown>;
    }
}

/**
 * WarpArea — an area that triggers a map transition when entered.
 */
export class WarpArea {
    public data: AreaData;

    constructor(data: AreaData) {
        this.data = data;
        this.data.isWarpArea = true;
    }

    get destination(): string {
        return this.data.destinationTypeID;
    }

    get arrivalX(): number {
        return this.data.arrivalX;
    }

    get arrivalY(): number {
        return this.data.arrivalY;
    }

    setDestination(typeID: string, mapName: string, areaName: string): void {
        this.data.destinationTypeID = typeID;
        this.data.destinationMapName = mapName;
        this.data.destinationWarpAreaName = areaName;
    }
}
