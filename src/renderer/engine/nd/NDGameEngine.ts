export abstract class NDGameEngine {
  public nd: any; // Reference to the parent ND system
  
  constructor(nd: any) {
    this.nd = nd;
  }

  public init(): void {}
  public update(dt: number): void {}
  public render(): void {}
  
  public abstract titleMenuUpdate(): void;
}
