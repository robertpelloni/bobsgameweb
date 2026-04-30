/**
 * VisualScriptSystem — ECS system that processes EventSheet/visual script components.
 *
 * Ported from Java com.bobsgame.client.engine.ecs.systems.VisualScriptSystem.
 * Runs event-driven logic on entities with EventSheetComponents.
 */
import type { World } from '../World';
import type { Entity } from '../Entity';

export interface VisualScriptComponent {
    events: VisualScriptEvent[];
    activeEventIndex: number;
    isRunning: boolean;
    waitTicks: number;
    loop: boolean;
}

export interface VisualScriptEvent {
    type: string;
    params: Record<string, unknown>;
    delay: number;
}

export class VisualScriptSystem {
    private world: World | null = null;
    private scripts: Map<number, VisualScriptComponent> = new Map();
    private enabled = true;

    constructor(world?: World) {
        if (world) this.world = world;
    }

    setWorld(world: World): void {
        this.world = world;
    }

    /**
     * Register a visual script for an entity.
     */
    registerScript(entityID: number, script: VisualScriptComponent): void {
        this.scripts.set(entityID, script);
    }

    /**
     * Remove a script.
     */
    unregisterScript(entityID: number): void {
        this.scripts.delete(entityID);
    }

    /**
     * Start a script for an entity.
     */
    startScript(entityID: number): void {
        const script = this.scripts.get(entityID);
        if (script) {
            script.isRunning = true;
            script.activeEventIndex = 0;
            script.waitTicks = 0;
        }
    }

    /**
     * Stop a script.
     */
    stopScript(entityID: number): void {
        const script = this.scripts.get(entityID);
        if (script) {
            script.isRunning = false;
        }
    }

    /**
     * Update all active scripts.
     */
    update(dt: number): void {
        if (!this.enabled) return;

        for (const [entityID, script] of this.scripts) {
            if (!script.isRunning) continue;

            // Wait
            if (script.waitTicks > 0) {
                script.waitTicks -= dt;
                continue;
            }

            // Process current event
            if (script.activeEventIndex >= script.events.length) {
                if (script.loop) {
                    script.activeEventIndex = 0;
                } else {
                    script.isRunning = false;
                }
                continue;
            }

            const event = script.events[script.activeEventIndex];
            this.executeEvent(entityID, event);

            // Advance
            script.activeEventIndex++;
            if (event.delay > 0) {
                script.waitTicks = event.delay;
            }
        }
    }

    private executeEvent(entityID: number, event: VisualScriptEvent): void {
        switch (event.type) {
            case 'move':
                // Move entity
                break;
            case 'wait':
                // Handled by waitTicks
                break;
            case 'set_flag':
                // Set a game flag
                break;
            case 'play_animation':
                // Play animation on entity
                break;
            case 'spawn_entity':
                // Spawn a new entity
                break;
            case 'destroy_entity':
                // Destroy this entity
                this.unregisterScript(entityID);
                break;
            case 'dialogue':
                // Show dialogue
                break;
            case 'play_sound':
                // Play a sound effect
                break;
            default:
                // Unknown event type
                break;
        }
    }

    // ============================================================
    // Queries
    // ============================================================

    getScript(entityID: number): VisualScriptComponent | undefined {
        return this.scripts.get(entityID);
    }

    isScriptRunning(entityID: number): boolean {
        return this.scripts.get(entityID)?.isRunning ?? false;
    }

    getActiveEventCount(): number {
        let count = 0;
        for (const script of this.scripts.values()) {
            if (script.isRunning) count++;
        }
        return count;
    }

    isEnabled(): boolean { return this.enabled; }
    setEnabled(v: boolean): void { this.enabled = v; }

    destroy(): void {
        this.scripts.clear();
    }
}
