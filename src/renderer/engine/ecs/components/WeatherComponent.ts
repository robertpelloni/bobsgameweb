import { Component } from '../Component';

export type WeatherType = 'none' | 'rain' | 'snow' | 'fog';

export class WeatherComponent extends Component {
    public readonly typeName = 'Weather';
    public type: WeatherType = 'none';
    public intensity: number = 1.0;
}
