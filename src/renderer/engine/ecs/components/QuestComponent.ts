import { Component } from '../Component';

export interface Quest {
    id: string;
    title: string;
    description: string;
    status: 'inactive' | 'active' | 'completed';
    objectiveCount: number;
    currentObjective: number;
}

export class QuestComponent extends Component {
    public readonly typeName = 'Quest';
    public quests: Quest[] = [];
}
