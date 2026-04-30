/**
 * MapStateData — serializable map state for save/load.
 *
 * Ported from okgame C++ Engine/map/MapStateData.h.
 * Stores per-map state including changed tiles, opened doors, cleared areas.
 */

export interface TileChange {
    x: number;
    y: number;
    layer: number;
    oldTileID: number;
    newTileID: number;
}

export interface DoorState {
    doorName: string;
    isOpen: boolean;
}

export interface AreaState {
    areaName: string;
    isCleared: boolean;
    wasVisited: boolean;
    entityStates: Map<number, EntityMapState>;
}

export interface EntityMapState {
    entityID: number;
    isActive: boolean;
    x: number;
    y: number;
    direction: number;
}

export class MapStateData {
    mapName = '';
    wasVisited = false;
    changes: TileChange[] = [];
    doors: DoorState[] = [];
    areas: AreaState[] = [];
    entityStates: EntityMapState[] = [];
    customData: Record<string, unknown> = {};

    // ============================================================
    // Tile Changes
    // ============================================================

    addTileChange(change: TileChange): void {
        // Replace existing change at same position
        const idx = this.changes.findIndex(
            c => c.x === change.x && c.y === change.y && c.layer === change.layer
        );
        if (idx >= 0) {
            this.changes[idx] = change;
        } else {
            this.changes.push(change);
        }
    }

    getTileChange(x: number, y: number, layer: number): TileChange | undefined {
        return this.changes.find(c => c.x === x && c.y === y && c.layer === layer);
    }

    clearTileChanges(): void {
        this.changes = [];
    }

    // ============================================================
    // Doors
    // ============================================================

    setDoorOpen(doorName: string, isOpen: boolean): void {
        const door = this.doors.find(d => d.doorName === doorName);
        if (door) {
            door.isOpen = isOpen;
        } else {
            this.doors.push({ doorName, isOpen });
        }
    }

    isDoorOpen(doorName: string): boolean {
        return this.doors.find(d => d.doorName === doorName)?.isOpen ?? false;
    }

    // ============================================================
    // Areas
    // ============================================================

    setAreaCleared(areaName: string, cleared: boolean): void {
        const area = this.areas.find(a => a.areaName === areaName);
        if (area) {
            area.isCleared = cleared;
        } else {
            this.areas.push({ areaName, isCleared: cleared, wasVisited: true, entityStates: new Map() });
        }
    }

    isAreaCleared(areaName: string): boolean {
        return this.areas.find(a => a.areaName === areaName)?.isCleared ?? false;
    }

    setAreaVisited(areaName: string): void {
        const area = this.areas.find(a => a.areaName === areaName);
        if (area) {
            area.wasVisited = true;
        } else {
            this.areas.push({ areaName, isCleared: false, wasVisited: true, entityStates: new Map() });
        }
    }

    wasAreaVisited(areaName: string): boolean {
        return this.areas.find(a => a.areaName === areaName)?.wasVisited ?? false;
    }

    // ============================================================
    // Entity States
    // ============================================================

    setEntityState(state: EntityMapState): void {
        const idx = this.entityStates.findIndex(e => e.entityID === state.entityID);
        if (idx >= 0) {
            this.entityStates[idx] = state;
        } else {
            this.entityStates.push(state);
        }
    }

    getEntityState(entityID: number): EntityMapState | undefined {
        return this.entityStates.find(e => e.entityID === entityID);
    }

    isEntityActive(entityID: number): boolean {
        return this.entityStates.find(e => e.entityID === entityID)?.isActive ?? true;
    }

    // ============================================================
    // Serialization
    // ============================================================

    toJSON(): Record<string, unknown> {
        return {
            mapName: this.mapName,
            wasVisited: this.wasVisited,
            changes: this.changes,
            doors: this.doors,
            areas: this.areas.map(a => ({
                ...a,
                entityStates: Object.fromEntries(a.entityStates),
            })),
            entityStates: this.entityStates,
            customData: this.customData,
        };
    }

    static fromJSON(data: Record<string, unknown>): MapStateData {
        const ms = new MapStateData();
        ms.mapName = (data.mapName as string) ?? '';
        ms.wasVisited = (data.wasVisited as boolean) ?? false;
        ms.changes = (data.changes as TileChange[]) ?? [];
        ms.doors = (data.doors as DoorState[]) ?? [];
        ms.entityStates = (data.entityStates as EntityMapState[]) ?? [];
        ms.customData = (data.customData as Record<string, unknown>) ?? {};
        return ms;
    }
}
