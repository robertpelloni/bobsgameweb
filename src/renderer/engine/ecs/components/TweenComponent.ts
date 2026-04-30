import { Component } from '../Component';

export interface Tween {
    property: string;
    startValue: number;
    endValue: number;
    duration: number;
    currentTime: number;
    easing: (t: number) => number;
}

export class TweenComponent extends Component {
    public readonly typeName = 'Tween';
    public activeTweens: Tween[] = [];
}
