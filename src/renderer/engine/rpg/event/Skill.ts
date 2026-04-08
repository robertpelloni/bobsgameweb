/**
 * Skill — numeric skill/stat value.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/Skill.
 */
export class Skill {
    public id: number;
    public name: string;
    private _value = 0;
    private _timeSet = -1;

    constructor(id: number, name = '') {
        this.id = id;
        this.name = name;
    }

    setValue(f: number): void {
        this._value = f;
        this._timeSet = Date.now();
    }

    initFromSave(f: number, timeSet: number): void {
        this._value = f;
        this._timeSet = timeSet;
    }

    getValue(): number {
        return this._value;
    }

    getTimeSet(): number {
        return this._timeSet;
    }

    static fromJSON(data: Record<string, unknown>): Skill {
        const skill = new Skill(data.id as number ?? -1, data.name as string ?? '');
        skill._value = (data.value as number) ?? 0;
        skill._timeSet = (data.timeSet as number) ?? -1;
        return skill;
    }

    toJSON(): Record<string, unknown> {
        return { id: this.id, name: this.name, value: this._value, timeSet: this._timeSet };
    }
}
