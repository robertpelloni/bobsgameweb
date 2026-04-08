/**
 * EventCommand — a single command in a BobEvent, with typed parameters and child commands.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/EventCommand.
 * Supports command parsing from serialized strings.
 */
import { EventParameter, EventParameterType } from './EventParameter';

export enum EventCommandType {
    COMMAND = 0,
    QUALIFIER_TRUE = 1,
    QUALIFIER_FALSE = 2,
}

export class EventCommand {
    public commandString: string;
    public type: EventCommandType;
    public parameters: EventParameter[] = [];
    public children: EventCommand[] = [];
    public parent: EventCommand | null = null;
    public currentChildIndex = 0;

    constructor(commandString: string, parameters: EventParameter[], type: EventCommandType) {
        this.commandString = commandString;
        this.parameters = parameters;
        this.type = type;
    }

    getNumParams(): number {
        return this.parameters.length;
    }

    addChild(cmd: EventCommand): void {
        cmd.parent = this;
        this.children.push(cmd);
    }

    getNextChild(): EventCommand | null {
        if (this.currentChildIndex < this.children.length) {
            return this.children[this.currentChildIndex++];
        }
        return null;
    }

    reset(): void {
        this.currentChildIndex = 0;
        for (const child of this.children) {
            child.reset();
        }
    }

    /**
     * Parse an event command from a serialized command string.
     * Format: "COMMAND:PARAM1:PARAM2:..."
     */
    static parse(commandString: string): EventCommand {
        const parts = commandString.split(':');
        const cmd = parts[0] ?? '';
        const params: EventParameter[] = [];

        for (let i = 1; i < parts.length; i++) {
            const raw = parts[i]!;
            // Try to parse as number
            const num = Number(raw);
            if (!isNaN(num) && raw.trim() !== '') {
                params.push(new EventParameter(EventParameterType.NUMBER, num));
            } else {
                params.push(new EventParameter(EventParameterType.STRING, raw));
            }
        }

        let type = EventCommandType.COMMAND;
        if (cmd === 'IF_TRUE') type = EventCommandType.QUALIFIER_TRUE;
        if (cmd === 'IF_FALSE') type = EventCommandType.QUALIFIER_FALSE;

        return new EventCommand(cmd, params, type);
    }

    static fromJSON(data: Record<string, unknown>): EventCommand {
        const params = Array.isArray(data.parameters)
            ? (data.parameters as Record<string, unknown>[]).map(p => EventParameter.fromJSON(p))
            : [];
        const cmd = new EventCommand(
            data.commandString as string ?? '',
            params,
            (data.type as EventCommandType) ?? EventCommandType.COMMAND,
        );
        if (Array.isArray(data.children)) {
            for (const child of data.children as Record<string, unknown>[]) {
                cmd.addChild(EventCommand.fromJSON(child));
            }
        }
        return cmd;
    }

    toJSON(): Record<string, unknown> {
        return {
            commandString: this.commandString,
            type: this.type,
            parameters: this.parameters.map(p => p.toJSON()),
            children: this.children.map(c => c.toJSON()),
        };
    }
}
