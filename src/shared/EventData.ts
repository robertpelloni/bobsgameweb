import { AssetData } from './AssetData';

export class EventData extends AssetData {
    constructor(id: number = -1, name: string = "") {
        super(id, name);
    }

    public toString(): string {
        return `EventData:{${super.toString()}},`;
    }

    public initFromString(t: string): string {
        t = t.substring(t.indexOf("EventData:{") + 10);
        t = super.initFromString(t);
        t = t.substring(t.indexOf("},") + 2);
        return t;
    }
}
