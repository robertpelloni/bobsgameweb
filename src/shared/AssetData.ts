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
        while (nameClean.includes('`')) {
            nameClean = nameClean.replace('`', '');
        }
        return `name:`${nameClean}`,id:`${this._id}`,`;
    }

    public initFromString(t: string): string {
        let start = t.indexOf("name:`") + 6;
        let end = t.indexOf("`", start);
        this._name = t.substring(start, end);
        t = t.substring(end + 2);

        start = t.indexOf("id:`") + 4;
        end = t.indexOf("`", start);
        this._id = parseInt(t.substring(start, end));
        t = t.substring(end + 2);

        return t;
    }
}
