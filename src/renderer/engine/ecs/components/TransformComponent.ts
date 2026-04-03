import { Component } from '../Component';

export class TransformComponent extends Component {
    public readonly typeName = 'Transform';
    public x: number = 0;
    public y: number = 0;
    public rotation: number = 0;
    public scaleX: number = 1;
    public scaleY: number = 1;
}
