import { Component } from '../Component';

export type AIState = 'idle' | 'patrol' | 'chase' | 'retreat';

export class AIComponent extends Component {
    public readonly typeName = 'AI';
    public state: AIState = 'idle';
    public detectionRadius: number = 150;
    public patrolPoints: { x: number, y: number }[] = [];
    public currentPatrolIndex: number = 0;
}
