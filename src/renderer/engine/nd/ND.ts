import { Container, Graphics, Sprite, Texture, Rectangle, RenderTexture } from 'pixi.js';
import { NDGameEngine } from './NDGameEngine';

export class ND {
  public container: Container;
  
  public activeGame: NDGameEngine | null = null;
  public zoom: number = 1.0;
  public alpha: number = 1.0;
  
  // Simulated hardware screens
  public topScreen: Container;
  public bottomScreen: Container;
  private ndCase: Graphics;

  private readonly SCREEN_WIDTH = 256;
  private readonly SCREEN_HEIGHT = 192;
  private readonly SCREEN_GAP = 90; // The hinge gap
  
  constructor() {
    this.container = new Container();
    this.topScreen = new Container();
    this.bottomScreen = new Container();
    this.ndCase = new Graphics();
  }
  
  public init() {
    // Draw a placeholder virtual console case
    this.ndCase.roundRect(-20, -20, this.SCREEN_WIDTH + 40, this.SCREEN_HEIGHT * 2 + this.SCREEN_GAP + 40, 20);
    this.ndCase.fill(0xcccccc);
    this.ndCase.stroke({ color: 0x888888, width: 4 });
    
    // Draw screen bezels
    this.ndCase.rect(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    this.ndCase.fill(0x000000);
    this.ndCase.rect(0, this.SCREEN_HEIGHT + this.SCREEN_GAP, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    this.ndCase.fill(0x000000);
    
    // Setup top screen masking
    const topMask = new Graphics();
    topMask.rect(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    topMask.fill(0xffffff);
    this.topScreen.mask = topMask;
    this.topScreen.addChild(topMask);

    // Setup bottom screen masking
    const bottomMask = new Graphics();
    bottomMask.rect(0, this.SCREEN_HEIGHT + this.SCREEN_GAP, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    bottomMask.fill(0xffffff);
    this.bottomScreen.mask = bottomMask;
    this.bottomScreen.position.y = this.SCREEN_HEIGHT + this.SCREEN_GAP;
    this.bottomScreen.addChild(bottomMask);

    this.container.addChild(this.ndCase);
    this.container.addChild(this.topScreen);
    this.container.addChild(this.bottomScreen);

    // Center pivot for zooming/rotating
    this.container.pivot.set(this.SCREEN_WIDTH / 2, (this.SCREEN_HEIGHT * 2 + this.SCREEN_GAP) / 2);
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
    if (this.activeGame) {
      this.activeGame.cleanup();
    }
    
    this.activeGame = game;
    if (game) {
      game.init();
    }
  }
}

