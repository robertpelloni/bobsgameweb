/**
 * EventParameter — typed parameter for EventCommand.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/EventParameter.
 */
export enum EventParameterType {
    STRING = 0,
    NUMBER = 1,
    FLAG_ID = 2,
    SKILL_ID = 3,
    DIALOGUE_ID = 4,
    ITEM_ID = 5,
    EVENT_ID = 6,
    DIRECTION = 7,
    COLOR = 8,
    COORDINATE = 9,
}

export class EventParameter {
    public type: EventParameterType;
    public value: string | number;

    constructor(type: EventParameterType, value: string | number) {
        this.type = type;
        this.value = value;
    }

    asString(): string {
        return String(this.value);
    }

    asNumber(): number {
        return Number(this.value);
    }

    static fromJSON(data: Record<string, unknown>): EventParameter {
        return new EventParameter(
            (data.type as EventParameterType) ?? EventParameterType.STRING,
            (data.value as string | number) ?? '',
        );
    }

    toJSON(): Record<string, unknown> {
        return { type: this.type, value: this.value };
    }
}
