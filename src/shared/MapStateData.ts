import { AssetData } from './AssetData';

export class MapStateData extends AssetData {
    constructor(id: number = -1, name: string = "") {
        super(id, name);
    }

    public toString(): string {
        return `MapStateData:{${super.toString()}},`;
    }

    public initFromString(t: string): string {
        t = t.substring(t.indexOf("MapStateData:{") + 13);
        t = super.initFromString(t);
        t = t.substring(t.indexOf("},") + 2);
        return t;
    }
}
