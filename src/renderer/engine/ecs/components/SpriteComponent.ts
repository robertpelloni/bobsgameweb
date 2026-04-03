import { Component } from '../Component';
import { Sprite, AnimatedSprite, Texture } from 'pixi.js';

export class SpriteComponent extends Component {
    public readonly typeName = 'Sprite';
    public sprite: Sprite | AnimatedSprite | null = null;
    public assetId: string = '';
    public visible: boolean = true;
    public alpha: number = 1.0;
    
    // Animation support
    public animations: Map<string, Texture[]> = new Map();
    public currentAnimation: string = '';
}
