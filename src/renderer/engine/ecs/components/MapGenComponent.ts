import { Component } from '../Component';

export type GenType = 'dungeon' | 'forest' | 'maze';

export class MapGenComponent extends Component {
    public readonly typeName = 'MapGen';
    public type: GenType = 'dungeon';
    public seed: number = 0;
    public width: number = 50;
    public height: number = 50;
}
