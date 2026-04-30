import { Component } from '../Component';

export interface PathPoint { x: number, y: number }

export class PathfindingComponent extends Component {
    public readonly typeName = 'Pathfinding';
    public targetX: number = 0;
    public targetY: number = 0;
    public path: PathPoint[] = [];
    public isCalculating: boolean = false;
    public moveSpeed: number = 100;
}
