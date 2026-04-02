import { AssetData } from './AssetData';

export class DoorData extends AssetData {
    constructor(id: number = -1, name: string = "") {
        super(id, name);
    }

    public toString(): string {
        return `DoorData:{${super.toString()}},`;
    }

    public initFromString(t: string): string {
        t = t.substring(t.indexOf("DoorData:{") + 9);
        t = super.initFromString(t);
        t = t.substring(t.indexOf("},") + 2);
        return t;
    }
}
