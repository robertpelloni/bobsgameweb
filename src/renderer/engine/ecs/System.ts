import { Component } from './Component';
import { EntityId } from './Entity';

export abstract class System {
    public abstract update(dt: number, entities: Map<EntityId, Map<string, Component>>): void;
}
