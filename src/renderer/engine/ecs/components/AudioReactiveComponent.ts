import { Component } from '../Component';

export class AudioReactiveComponent extends Component {
    public readonly typeName = 'AudioReactive';
    public frequencyBin: number = 0; // 0-127
    public sensitivity: number = 1.0;
    public property: 'scale' | 'rotation' | 'alpha' = 'scale';
}
