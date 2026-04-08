/**
 * Door — map door with open/close animation and warp destination.
 *
 * Ported from okgame C++ Engine/map/Door.
 */
import { AreaData } from './Area';

export class DoorData {
    public id: number;
    public name: string;
    public mapX = 0;
    public mapY = 0;
    public width = 32;
    public height = 64;
    public doorknobX = 0;
    public doorknobY = 0;

    public isOpen = false;
    public stayOpen = false;

    // Warp destination
    public destinationTypeID = '';
    public destinationMapName = '';
    public destinationDoorName = '';
    public arrivalX = -1;
    public arrivalY = -1;

    // Spawn (for NPC spawning from doors)
    public randomNPCSpawnPoint = false;
    public randomSpawnChance = 1.0;
    public randomSpawnDelay = 1000;

    constructor(id: number, name = '') {
        this.id = id;
        this.name = name;
    }

    static fromJSON(data: Record<string, unknown>): DoorData {
        const door = new DoorData(
            (data.id as number) ?? -1,
            (data.name as string) ?? '',
        );
        Object.assign(door, data);
        return door;
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as unknown as Record<string, unknown>;
    }
}

export class Door {
    public data: DoorData;
    public showActionIcon = true;
    private _opening = false;

    constructor(data: DoorData) {
        this.data = data;
    }

    isOpen(): boolean { return this.data.isOpen; }

    setOpen(b: boolean): void {
        this.data.isOpen = b;
        if (b) this.data.stayOpen = true;
    }

    /** Trigger the door opening animation. */
    open(): void {
        this._opening = true;
        this.data.isOpen = true;
    }

    close(): void {
        this.data.isOpen = false;
        this.data.stayOpen = false;
    }

    /** Enter the door — returns the destination map info. */
    enter(): { mapName: string; x: number; y: number } | null {
        if (!this.data.isOpen && !this._opening) {
            this.open();
            return null; // Door was closed, now opening
        }
        if (this.data.destinationTypeID) {
            return {
                mapName: this.data.destinationMapName,
                x: this.data.arrivalX,
                y: this.data.arrivalY,
            };
        }
        return null;
    }
}
