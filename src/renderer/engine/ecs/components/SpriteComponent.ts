import { Component } from '../Component';
import { Sprite } from 'pixi.js';

export class SpriteComponent extends Component {
    public readonly typeName = 'Sprite';
    public sprite: Sprite | null = null;
    public assetId: string = '';
    public visible: boolean = true;
    public alpha: number = 1.0;
}
