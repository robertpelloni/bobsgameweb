/**
 * Flag — boolean game state flag.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/Flag.
 * Flags track boolean state with server sync support.
 */
export class Flag {
    public id: number;
    public name: string;
    private _value = false;
    private _timeSet = -1;

    constructor(id: number, name = '') {
        this.id = id;
        this.name = name;
    }

    setValue(b: boolean): void {
        this._value = b;
        this._timeSet = Date.now();
    }

    initFromSave(b: boolean, timeSet: number): void {
        this._value = b;
        this._timeSet = timeSet;
    }

    getValue(): boolean {
        return this._value;
    }

    getTimeSet(): number {
        return this._timeSet;
    }

    static fromJSON(data: Record<string, unknown>): Flag {
        const flag = new Flag(data.id as number ?? -1, data.name as string ?? '');
        flag._value = (data.value as boolean) ?? false;
        flag._timeSet = (data.timeSet as number) ?? -1;
        return flag;
    }

    toJSON(): Record<string, unknown> {
        return { id: this.id, name: this.name, value: this._value, timeSet: this._timeSet };
    }
}
