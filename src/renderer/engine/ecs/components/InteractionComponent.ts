import { Component } from '../Component';

export type InteractionType = 'dialogue' | 'battle' | 'quest' | 'teleport' | 'shop';

export interface Interaction {
    type: InteractionType;
    params: any;
}

export class InteractionComponent extends Component {
    public readonly typeName = 'Interaction';
    public interactions: Interaction[] = [];
}
