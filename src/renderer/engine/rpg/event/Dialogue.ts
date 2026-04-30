/**
 * Dialogue — tracks whether a conversation/dialogue has been completed.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/Dialogue.
 */
export class Dialogue {
    public id: number;
    public name: string;
    public caption: string;
    public comment: string;
    public text: string;

    private _done = false;
    private _timeSet = -1;

    constructor(id: number, name = '', caption = '', comment = '', text = '') {
        this.id = id;
        this.name = name;
        this.caption = caption;
        this.comment = comment;
        this.text = text;
    }

    setDone(b: boolean): void {
        this._done = b;
        this._timeSet = Date.now();
    }

    initFromSave(b: boolean, timeSet: number): void {
        this._done = b;
        this._timeSet = timeSet;
    }

    isDone(): boolean {
        return this._done;
    }

    getTimeSet(): number {
        return this._timeSet;
    }

    static fromJSON(data: Record<string, unknown>): Dialogue {
        const d = new Dialogue(
            data.id as number ?? -1,
            data.name as string ?? '',
            data.caption as string ?? '',
            data.comment as string ?? '',
            data.text as string ?? '',
        );
        d._done = (data.done as boolean) ?? false;
        d._timeSet = (data.timeSet as number) ?? -1;
        return d;
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id, name: this.name, caption: this.caption,
            comment: this.comment, text: this.text, done: this._done, timeSet: this._timeSet,
        };
    }
}
