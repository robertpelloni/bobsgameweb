import { Component } from '../Component';

export abstract class Behavior extends Component {
    public abstract onUpdate(dt: number): void;
    public abstract onInit(): void;
}

export class BehaviorComponent extends Component {
    public readonly typeName = 'Behavior';
    public behaviors: Behavior[] = [];
}
