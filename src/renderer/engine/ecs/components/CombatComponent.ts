import { Component } from '../Component';

export class CombatComponent extends Component {
    public readonly typeName = 'Combat';
    public hp: number = 100;
    public maxHp: number = 100;
    public atk: number = 10;
    public def: number = 5;
    public isPlayer: boolean = false;
    public level: number = 1;
}
