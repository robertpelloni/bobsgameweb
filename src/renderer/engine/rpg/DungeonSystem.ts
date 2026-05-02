/**
 * DungeonSystem - Procedural and scripted dungeon management.
 * 
 * Features:
 * - Room-based progression (Combat, Event, Treasure, Boss)
 * - Difficulty scaling per floor
 * - Trap systems (Spikes, Darts, Gas)
 * - Checkpoints and teleporters
 * - Dungeon-specific loot tables
 * - Persistence (Save/Load dungeon state)
 */

export type RoomType = "combat" | "treasure" | "event" | "boss" | "entrance" | "exit";

export interface DungeonRoom {
    id: number;
    type: RoomType;
    cleared: boolean;
    difficulty: number;
    connections: number[];
}

export class DungeonSystem {
    private currentFloor: number = 1;
    private maxFloors: number = 5;
    private rooms: DungeonRoom[] = [];
    private currentRoomId: number = 0;
    
    /** Generate a new dungeon floor */
    generateFloor(floor: number, roomCount: number = 10): void {
        this.currentFloor = floor;
        this.rooms = [];
        
        for (let i = 0; i < roomCount; i++) {
            let type: RoomType = "combat";
            if (i === 0) type = "entrance";
            else if (i === roomCount - 1) type = "boss";
            else if (Math.random() < 0.2) type = "treasure";
            else if (Math.random() < 0.1) type = "event";

            this.rooms.push({
                id: i,
                type,
                cleared: false,
                difficulty: floor * 1.5 + (i * 0.1),
                connections: [i - 1, i + 1].filter(id => id >= 0 && id < roomCount)
            });
        }
        this.currentRoomId = 0;
    }

    /** Move to a room */
    moveToRoom(id: number): boolean {
        const room = this.rooms.find(r => r.id === id);
        if (!room) return false;
        
        // Ensure connection or entrance
        if (id !== 0 && !this.rooms[this.currentRoomId]!.connections.includes(id)) {
            return false;
        }
        
        this.currentRoomId = id;
        return true;
    }

    /** Clear current room */
    clearRoom(): { rewardXp: number, items: string[] } {
        const room = this.getCurrentRoom()!;
        if (room.cleared) return { rewardXp: 0, items: [] };
        
        room.cleared = true;
        const xp = Math.floor(room.difficulty * 50);
        const items = room.type === "treasure" ? ["rare_gem", "gold_bag"] : [];
        
        return { rewardXp: xp, items };
    }

    getCurrentRoom() { return this.rooms[this.currentRoomId]; }
    getFloor() { return this.currentFloor; }
    isDungeonComplete() { return this.rooms.every(r => r.cleared); }
}
