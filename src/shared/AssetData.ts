export class AssetData {
    protected _name: string = "";
    protected _id: number = -1;

    constructor(id: number = -1, name: string = "") {
        this._id = id;
        this._name = name;
    }

    public get name(): string { return this._name; }
    public set name(value: string) { this._name = value; }

    public get id(): number { return this._id; }
    public set id(value: number) { this._id = value; }

    public toJSON(): string {
        return JSON.stringify(this);
    }

    public toString(): string {
        let nameClean = this._name;
        const bt = String.fromCharCode(96);
        while (nameClean.includes(bt)) {
            nameClean = nameClean.replace(bt, '');
        }
        return "name:" + bt + nameClean + bt + ",id:" + bt + this._id + bt + ",";
    }

    public initFromString(t: string): string {
        const bt = String.fromCharCode(96);
        let start = t.indexOf("name:" + bt) + 5 + bt.length;
        let end = t.indexOf(bt, start);
        this._name = t.substring(start, end);
        t = t.substring(end + 2);

        start = t.indexOf("id:" + bt) + 3 + bt.length;
        end = t.indexOf(bt, start);
        this._id = parseInt(t.substring(start, end));
        t = t.substring(end + 2);

        return t;
    }
}
