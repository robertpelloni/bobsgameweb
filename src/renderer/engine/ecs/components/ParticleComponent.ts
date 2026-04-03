import { Component } from '../Component';

export interface ParticleConfig {
    count: number;
    color: number;
    life: number;
    speed: number;
    size: number;
    gravity: number;
}

export class ParticleComponent extends Component {
    public readonly typeName = 'Particle';
    public emitters: ParticleConfig[] = [];
}
