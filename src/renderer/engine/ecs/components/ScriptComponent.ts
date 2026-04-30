import { Component } from '../Component';

export type ScriptFunction = (dt: number, entityId: number, world: any) => void;

export class ScriptComponent extends Component {
    public readonly typeName = 'Script';
    public scriptName: string = '';
    public updateFn: ScriptFunction | null = null;
    
    // For hot-reloading
    public sourceCode: string = '';
}
