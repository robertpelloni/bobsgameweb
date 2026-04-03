import { Component } from '../Component';

export interface SkillNode {
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
    cost: number;
    prerequisites: string[]; // IDs of required skills
}

export class SkillTreeComponent extends Component {
    public readonly typeName = 'SkillTree';
    public skills: SkillNode[] = [];
}
