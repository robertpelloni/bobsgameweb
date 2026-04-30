/**
 * GameString — localized string lookup by ID.
 *
 * Ported from okgame C++ Engine/Engine/rpg/event/GameString.
 */
export class GameString {
    public id: number;
    public name: string;
    public text: string;

    constructor(id: number, name = '', text = '') {
        this.id = id;
        this.name = name;
        this.text = text;
    }

    static fromJSON(data: Record<string, unknown>): GameString {
        return new GameString(
            data.id as number ?? -1,
            data.name as string ?? '',
            data.text as string ?? '',
        );
    }

    toJSON(): Record<string, unknown> {
        return { id: this.id, name: this.name, text: this.text };
    }
}
