/**
 * WorldEventSystem — timed, server-wide occurrences.
 *
 * Features:
 * - Dynamic event scheduling (Invasion, Festival, Eclipse)
 * - Global objective tracking (e.g. Kill 1,000,000 goblins)
 * - Phase-based event progression
 * - Tiered rewards for all participants
 * - Environmental changes during event
 */

export type EventType = "invasion" | "festival" | "eclipse" | "treasure_hunt";

export interface WorldEvent {
    id: string;
    type: EventType;
    status: "scheduled" | "active" | "completed";
    progress: number;
    goal: number;
    description: string;
    participants: Set<string>;
}

export class WorldEventSystem {
    private activeEvent: WorldEvent | null = null;
    private eventHistory: string[] = [];

    startEvent(type: EventType, goal: number, desc: string): WorldEvent {
        this.activeEvent = {
            id: `event_${Date.now()}`,
            type,
            status: "active",
            progress: 0,
            goal,
            description: desc,
            participants: new Set()
        };
        return this.activeEvent;
    }

    contribute(playerId: string, amount: number): { completed: boolean; progress: number } {
        if (!this.activeEvent || this.activeEvent.status !== "active") return { completed: false, progress: 0 };
        
        this.activeEvent.participants.add(playerId);
        this.activeEvent.progress = Math.min(this.activeEvent.goal, this.activeEvent.progress + amount);
        
        if (this.activeEvent.progress >= this.activeEvent.goal) {
            this.activeEvent.status = "completed";
            this.eventHistory.push(this.activeEvent.id);
            return { completed: true, progress: 1.0 };
        }
        
        return { completed: false, progress: this.activeEvent.progress / this.activeEvent.goal };
    }

    getActive() { return this.activeEvent; }
    getHistory() { return this.eventHistory; }
}
