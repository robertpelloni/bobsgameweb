/**
 * BobEvent — a game event with commands, triggers, and conditions.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/BobEvent.
 * Events are the core scripting mechanism for the RPG world.
 */
import { EventCommand } from './EventCommand';

export enum EventTrigger {
    AUTO = 'auto',
    TALK = 'talk',
    TOUCH = 'touch',
    COLLISION = 'collision',
    TIMER = 'timer',
    FLAG_CHANGE = 'flag_change',
    SKILL_THRESHOLD = 'skill_threshold',
    ENTER_AREA = 'enter_area',
    EXIT_AREA = 'exit_area',
    ITEM_ACQUIRED = 'item_acquired',
    DIALOGUE_DONE = 'dialogue_done',
    CUSTOM = 'custom',
}

export class BobEvent {
    public id: number;
    public name: string;
    public trigger: EventTrigger;
    public enabled = true;
    public commands: EventCommand[] = [];

    /** Whether this event is currently executing. */
    private _running = false;
    private _currentCommandIndex = 0;

    constructor(id: number, name = '', trigger: EventTrigger = EventTrigger.CUSTOM) {
        this.id = id;
        this.name = name;
        this.trigger = trigger;
    }

    /** Start executing this event's commands. */
    start(): void {
        this._running = true;
        this._currentCommandIndex = 0;
        for (const cmd of this.commands) {
            cmd.reset();
        }
    }

    /** Check if the event has finished. */
    isComplete(): boolean {
        return !this._running || this._currentCommandIndex >= this.commands.length;
    }

    /** Get the current command being executed. */
    getCurrentCommand(): EventCommand | null {
        if (this._currentCommandIndex < this.commands.length) {
            return this.commands[this._currentCommandIndex]!;
        }
        return null;
    }

    /** Advance to the next command. */
    advance(): void {
        this._currentCommandIndex++;
        if (this._currentCommandIndex >= this.commands.length) {
            this._running = false;
        }
    }

    /** Stop the event immediately. */
    stop(): void {
        this._running = false;
        this._currentCommandIndex = this.commands.length;
    }

    isRunning(): boolean {
        return this._running;
    }

    static fromJSON(data: Record<string, unknown>): BobEvent {
        const evt = new BobEvent(
            data.id as number ?? -1,
            data.name as string ?? '',
            (data.trigger as EventTrigger) ?? EventTrigger.CUSTOM,
        );
        evt.enabled = (data.enabled as boolean) ?? true;
        if (Array.isArray(data.commands)) {
            for (const cmd of data.commands as Record<string, unknown>[]) {
                evt.commands.push(EventCommand.fromJSON(cmd));
            }
        }
        return evt;
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            name: this.name,
            trigger: this.trigger,
            enabled: this.enabled,
            commands: this.commands.map(c => c.toJSON()),
        };
    }
}
