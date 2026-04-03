import { Component } from '../Component';
import { Graphics } from '../../../graphics/Graphics';

export type RenderCallback = (g: Graphics) => void;

export class GraphicsComponent extends Component {
    public readonly typeName = 'Graphics';
    public graphics: Graphics = new Graphics();
    public renderCallback: RenderCallback | null = null;
    public clearOnUpdate: boolean = true;
}
