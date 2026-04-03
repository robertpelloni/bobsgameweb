import { ND } from './ND';

export abstract class NDGameEngine {
  public nd: ND; // Reference to the parent ND system
  
  constructor(nd: ND) {
    this.nd = nd;
  }

  public init(): void {}
  public cleanup(): void {}
  public update(dt: number): void {}
  public render(): void {}
  
  public abstract titleMenuUpdate(): void;
}
