import { Container } from 'pixi.js';
import { NDGameEngine } from './NDGameEngine';

export class ND {
  public container: Container;
  
  public activeGame: NDGameEngine | null = null;
  public zoom: number = 1.0;
  public alpha: number = 1.0;
  
  constructor() {
    this.container = new Container();
  }
  
  public init() {
    // Initialize the ND screen texture, mask, overlay, etc.
  }
  
  public update(dt: number) {
    if (this.activeGame) {
      this.activeGame.update(dt);
    }
  }
  
  public render() {
    if (this.activeGame) {
      this.activeGame.render();
    }
  }
  
  public setGame(game: NDGameEngine | null) {
    this.activeGame = game;
    if (game) {
      game.init();
    }
  }
}
