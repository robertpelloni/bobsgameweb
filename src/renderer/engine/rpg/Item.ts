/**
 * Item — RPG inventory item.
 *
 * Ported from okgame C++ Engine/Engine/rpg/Item.
 * Items have an ID, name, description, sprite reference, and acquired state.
 */
export class Item {
    public id: number;
    public name: string;
    public description: string;
    public spriteAssetName: string;
    public acquired = false;
    public timeSet = -1;

    constructor(id: number, name = '', description = '', spriteAssetName = '') {
        this.id = id;
        this.name = name;
        this.description = description;
        this.spriteAssetName = spriteAssetName;
    }

    setAcquired(b: boolean): void {
        this.acquired = b;
        this.timeSet = Date.now();
    }

    isAcquired(): boolean {
        return this.acquired;
    }

    static fromJSON(data: Record<string, unknown>): Item {
        const item = new Item(
            data.id as number ?? -1,
            data.name as string ?? '',
            data.description as string ?? '',
            data.spriteAssetName as string ?? '',
        );
        item.acquired = (data.acquired as boolean) ?? false;
        item.timeSet = (data.timeSet as number) ?? -1;
        return item;
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            spriteAssetName: this.spriteAssetName,
            acquired: this.acquired,
            timeSet: this.timeSet,
        };
    }
}
