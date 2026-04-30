/**
 * EntityData — entity definition data with spawn position, sprite, animation, physics flags.
 *
 * Ported from okgame C++ Engine/map/EntityData.
 */
export enum RenderOrder {
    GROUND = 0,
    GROUND_DETAILS = 1,
    BELOW_ENTITY = 2,
    ENTITY = 3,
    ABOVE_ENTITY = 4,
    ABOVE_ALL = 5,
    UI = 6,
}

export class EntityData {
    id = -1;
    name = 'Entity';
    comment = '';

    // Sprite
    spriteName = '';
    initialFrame = 0;

    // Spawn
    spawnX = 0;
    spawnY = 0;

    // Physics flags
    pushable = false;
    nonWalkable = false;
    toAlpha = 1.0;
    scale = 1.0;
    disableShadow = false;

    // Rendering
    layer = 0;
    renderOrder: RenderOrder = RenderOrder.ENTITY;
    aboveWhenEqual = false;
    alwaysOnBottom = false;
    alwaysOnTop = false;

    // Animation
    animateThroughFrames = false;
    ticksBetweenFrames = 100;
    randomUpToTicksBetweenFrames = false;
    randomFrames = false;
    ticksBetweenAnimation = 0;
    loopAnimation = true;
    animationDisabled = false;

    // Movement
    walkSpeed = 1;
    ticksPerPixelMoved = 10;

    // Interaction
    hitLayerDisabled = false;
    ignoreHitPlayer = false;
    ignoreHitEntities = false;
    dontUsePathfinding = false;
    pullPlayer = false;
    pushPlayer = false;

    // Event
    eventID = -1;
    onlyHereDuringEvent = false;

    // Behavior
    behaviorList: string[] = [];
    connectionTypeIDList: string[] = [];

    // Type
    isNPC = false;

    constructor(data?: Partial<EntityData>) {
        if (data) Object.assign(this, data);
    }

    static fromJSON(data: Record<string, unknown>): EntityData {
        return new EntityData({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? 'Entity',
            spriteName: (data.spriteName as string) ?? '',
            spawnX: (data.spawnXPixels1X as number) ?? 0,
            spawnY: (data.spawnYPixels1X as number) ?? 0,
            initialFrame: (data.initialFrame as number) ?? 0,
            pushable: (data.pushable as boolean) ?? false,
            nonWalkable: (data.nonWalkable as boolean) ?? false,
            layer: (data.layer as number) ?? 0,
            ticksPerPixelMoved: (data.ticksPerPixelMoved as number) ?? 10,
            disableShadow: (data.disableShadow as boolean) ?? false,
            isNPC: (data.isNPC as boolean) ?? false,
        });
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}
