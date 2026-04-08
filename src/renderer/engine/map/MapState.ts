/**
 * MapState — tracks per-map state (visited, areas triggered, etc).
 *
 * Ported from okgame C++ Engine/map/MapState.
 */

export class MapState {
    public id: number;
    public name: string;

    /** Areas that have been triggered/entered */
    public triggeredAreaIDs: Set<number> = new Set();

    /** Doors that have been opened */
    public openedDoorIDs: Set<number> = new Set();

    /** Custom state variables */
    public variables: Map<string, number | string | boolean> = new Map();

    constructor(id: number, name = '') {
        this.id = id;
        this.name = name;
    }

    triggerArea(areaId: number): void {
        this.triggeredAreaIDs.add(areaId);
    }

    isAreaTriggered(areaId: number): boolean {
        return this.triggeredAreaIDs.has(areaId);
    }

    openDoor(doorId: number): void {
        this.openedDoorIDs.add(doorId);
    }

    isDoorOpen(doorId: number): boolean {
        return this.openedDoorIDs.has(doorId);
    }

    setVariable(key: string, value: number | string | boolean): void {
        this.variables.set(key, value);
    }

    getVariable(key: string): number | string | boolean | undefined {
        return this.variables.get(key);
    }

    static fromJSON(data: Record<string, unknown>): MapState {
        const state = new MapState(
            (data.id as number) ?? -1,
            (data.name as string) ?? '',
        );
        if (Array.isArray(data.triggeredAreaIDs)) {
            for (const id of data.triggeredAreaIDs as number[]) state.triggeredAreaIDs.add(id);
        }
        if (Array.isArray(data.openedDoorIDs)) {
            for (const id of data.openedDoorIDs as number[]) state.openedDoorIDs.add(id);
        }
        if (data.variables && typeof data.variables === 'object') {
            for (const [k, v] of Object.entries(data.variables as Record<string, unknown>)) {
                state.variables.set(k, v as number | string | boolean);
            }
        }
        return state;
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            name: this.name,
            triggeredAreaIDs: Array.from(this.triggeredAreaIDs),
            openedDoorIDs: Array.from(this.openedDoorIDs),
            variables: Object.fromEntries(this.variables),
        };
    }
}
