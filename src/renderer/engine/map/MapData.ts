export class MapData {
  public id: string = '';
  public name: string = '';
  public backgroundTextureName: string = '';
  public foregroundTextureName: string = '';
  public mapWidthPixels: number = 0;
  public mapHeightPixels: number = 0;
  
  public initialX: number = 0;
  public initialY: number = 0;
  
  public isIndoors: boolean = false;
  
  public bgmName: string = '';
  
  // To match the Java/C++ implementation:
  // We would have lists of Doors, Areas, Entities, Lights
  public doors: any[] = [];
  public areas: any[] = [];
  public lights: any[] = [];
  public entities: any[] = [];

  constructor() {}
}
