import { AssetData } from './AssetData';

export class DoorData extends AssetData {
  /** X position of the door in tile coordinates */
  public x: number = 0;
  /** Y position of the door in tile coordinates */
  public y: number = 0;
  /** Width of the door area in tiles (for warp areas) */
  public width: number = 1;
  /** Height of the door area in tiles (for warp areas) */
  public height: number = 1;
  /** Whether this is a warp area (multi-tile trigger zone) */
  public isWarpArea: boolean = false;
  /** Name of the destination map */
  public destinationMapName: string = "";
  /** X coordinate in the destination map (tile coords) */
  public destinationX: number = 0;
  /** Y coordinate in the destination map (tile coords) */
  public destinationY: number = 0;
  /** Whether the door is locked */
  public locked: boolean = false;
  /** Item required to unlock (null if none) */
  public requiresItem: string | null = null;

  constructor(id: number = -1, name: string = "") {
    super(id, name);
  }

  public toString(): string {
    return `DoorData:{${super.toString()},x:${this.x},y:${this.y},dest:${this.destinationMapName}(${this.destinationX},${this.destinationY})}},`;
  }

  public initFromString(t: string): string {
    t = t.substring(t.indexOf("DoorData:{") + 9);
    t = super.initFromString(t);
    t = t.substring(t.indexOf("},") + 2);
    return t;
  }
}
