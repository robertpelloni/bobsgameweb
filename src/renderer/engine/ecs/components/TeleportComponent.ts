import { Component } from '../Component';

export class TeleportComponent extends Component {
    public readonly typeName = 'Teleport';
    public targetMapId: string = "";
    public targetX: number = 0;
    public targetY: number = 0;
    public width: number = 32;
    public height: number = 32;
}
