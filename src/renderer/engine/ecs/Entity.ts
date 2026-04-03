export type EntityId = number;

export class Entity {
    public readonly id: EntityId;
    private static nextId: EntityId = 0;

    constructor() {
        this.id = ++Entity.nextId;
    }
}
