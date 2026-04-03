import { Component } from '../Component';

export class LightComponent extends Component {
    public readonly typeName = 'Light';
    public radius: number = 100;
    public color: number = 0xffffff;
    public intensity: number = 1.0;
    public flicker: boolean = false;
    public flickerSpeed: number = 5.0;
    public baseRadius: number = 100;
}
