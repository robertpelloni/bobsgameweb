/**
 * EventManager — manages all game events, flags, skills, dialogues, items, and strings.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/EventManager.
 * Central registry and execution engine for the RPG event system.
 */
import { Flag } from './Flag';
import { Skill } from './Skill';
import { Dialogue } from './Dialogue';
import { GameString } from './GameString';
import { BobEvent, EventTrigger } from './BobEvent';
import { EventCommand } from './EventCommand';
import { EventParameterType } from './EventParameter';

export class EventManager {
    public flags: Map<number, Flag> = new Map();
    public skills: Map<number, Skill> = new Map();
    public dialogues: Map<number, Dialogue> = new Map();
    public strings: Map<number, GameString> = new Map();
    public events: Map<number, BobEvent> = new Map();

    /** Active (running) events queue */
    private activeEvents: BobEvent[] = [];

    // ============================================================
    // Flag Operations
    // ============================================================

    getFlag(id: number): Flag | undefined {
        return this.flags.get(id);
    }

    getOrCreateFlag(id: number, name = ''): Flag {
        let flag = this.flags.get(id);
        if (!flag) {
            flag = new Flag(id, name);
            this.flags.set(id, flag);
        }
        return flag;
    }

    setFlag(id: number, value: boolean): void {
        this.getOrCreateFlag(id).setValue(value);
    }

    checkFlag(id: number): boolean {
        return this.flags.get(id)?.getValue() ?? false;
    }

    // ============================================================
    // Skill Operations
    // ============================================================

    getSkill(id: number): Skill | undefined {
        return this.skills.get(id);
    }

    getOrCreateSkill(id: number, name = ''): Skill {
        let skill = this.skills.get(id);
        if (!skill) {
            skill = new Skill(id, name);
            this.skills.set(id, skill);
        }
        return skill;
    }

    setSkill(id: number, value: number): void {
        this.getOrCreateSkill(id).setValue(value);
    }

    getSkillValue(id: number): number {
        return this.skills.get(id)?.getValue() ?? 0;
    }

    // ============================================================
    // Dialogue Operations
    // ============================================================

    getDialogue(id: number): Dialogue | undefined {
        return this.dialogues.get(id);
    }

    getOrCreateDialogue(id: number, name = ''): Dialogue {
        let d = this.dialogues.get(id);
        if (!d) {
            d = new Dialogue(id, name);
            this.dialogues.set(id, d);
        }
        return d;
    }

    isDialogueDone(id: number): boolean {
        return this.dialogues.get(id)?.isDone() ?? false;
    }

    setDialogueDone(id: number, done: boolean): void {
        this.getOrCreateDialogue(id).setDone(done);
    }

    // ============================================================
    // String Operations
    // ============================================================

    getString(id: number): string {
        return this.strings.get(id)?.text ?? '';
    }

    getOrCreateString(id: number, name = '', text = ''): GameString {
        let s = this.strings.get(id);
        if (!s) {
            s = new GameString(id, name, text);
            this.strings.set(id, s);
        }
        return s;
    }

    // ============================================================
    // Event Registration & Execution
    // ============================================================

    registerEvent(event: BobEvent): void {
        this.events.set(event.id, event);
    }

    /** Trigger all events matching the given trigger type. */
    triggerEvents(trigger: EventTrigger, context?: Record<string, unknown>): void {
        for (const event of this.events.values()) {
            if (event.enabled && event.trigger === trigger && !event.isRunning()) {
                event.start();
                this.activeEvents.push(event);
            }
        }
    }

    /** Update all active events. Called each frame. */
    update(): void {
        // Remove completed events
        this.activeEvents = this.activeEvents.filter(e => {
            if (e.isComplete()) {
                return false;
            }
            return true;
        });
    }

    /** Get all currently running events. */
    getActiveEvents(): readonly BobEvent[] {
        return this.activeEvents;
    }

    // ============================================================
    // Command Evaluation
    // ============================================================

    /**
     * Evaluate a condition command. Returns true if the condition is met.
     */
    evaluateCondition(command: EventCommand): boolean {
        const cmd = command.commandString;
        const params = command.parameters;

        switch (cmd) {
            case 'IF_FLAG': {
                const flagId = params[0]?.asNumber() ?? -1;
                return this.checkFlag(flagId);
            }
            case 'IF_NOT_FLAG': {
                const flagId = params[0]?.asNumber() ?? -1;
                return !this.checkFlag(flagId);
            }
            case 'IF_SKILL_ABOVE': {
                const skillId = params[0]?.asNumber() ?? -1;
                const threshold = params[1]?.asNumber() ?? 0;
                return this.getSkillValue(skillId) > threshold;
            }
            case 'IF_SKILL_BELOW': {
                const skillId = params[0]?.asNumber() ?? -1;
                const threshold = params[1]?.asNumber() ?? 0;
                return this.getSkillValue(skillId) < threshold;
            }
            case 'IF_DIALOGUE_DONE': {
                const dialogueId = params[0]?.asNumber() ?? -1;
                return this.isDialogueDone(dialogueId);
            }
            case 'IF_DIALOGUE_NOT_DONE': {
                const dialogueId = params[0]?.asNumber() ?? -1;
                return !this.isDialogueDone(dialogueId);
            }
            default:
                return true;
        }
    }

    // ============================================================
    // Serialization
    // ============================================================

    loadFromSave(data: Record<string, unknown>): void {
        // Load flags
        const flags = data.flags as Record<string, unknown>[] | undefined;
        if (flags) {
            for (const f of flags) {
                const flag = Flag.fromJSON(f);
                this.flags.set(flag.id, flag);
            }
        }

        // Load skills
        const skills = data.skills as Record<string, unknown>[] | undefined;
        if (skills) {
            for (const s of skills) {
                const skill = Skill.fromJSON(s);
                this.skills.set(skill.id, skill);
            }
        }

        // Load dialogues
        const dialogues = data.dialogues as Record<string, unknown>[] | undefined;
        if (dialogues) {
            for (const d of dialogues) {
                const dialogue = Dialogue.fromJSON(d);
                this.dialogues.set(dialogue.id, dialogue);
            }
        }

        // Load events
        const events = data.events as Record<string, unknown>[] | undefined;
        if (events) {
            for (const e of events) {
                const event = BobEvent.fromJSON(e);
                this.events.set(event.id, event);
            }
        }

        // Load strings
        const strings = data.strings as Record<string, unknown>[] | undefined;
        if (strings) {
            for (const s of strings) {
                const str = GameString.fromJSON(s);
                this.strings.set(str.id, str);
            }
        }
    }

    getSaveData(): Record<string, unknown> {
        return {
            flags: Array.from(this.flags.values()).map(f => f.toJSON()),
            skills: Array.from(this.skills.values()).map(s => s.toJSON()),
            dialogues: Array.from(this.dialogues.values()).map(d => d.toJSON()),
            events: Array.from(this.events.values()).map(e => e.toJSON()),
            strings: Array.from(this.strings.values()).map(s => s.toJSON()),
        };
    }
}
