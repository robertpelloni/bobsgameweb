import { GameType } from "./GameType";

export class GameSequence {
    public uuid: string = "";
    public name: string = "My New Game Sequence";
    public description: string = "This is an empty game sequence.";
    
    public importExport_gameUUIDs: string[] = [];
    public gameTypes: GameType[] = [];
    
    public randomizeSequence: boolean = true;
    public currentDifficultyName: string = "Beginner";

    public downloaded: boolean = false;

    public creatorUserID: number = 0;
    public creatorUserName: string = "";
    public dateCreated: number = 0;
    public lastModified: number = 0;
    public howManyTimesUpdated: number = 0;
    public upVotes: number = 0;
    public downVotes: number = 0;
    public yourVote: string = "none";

    constructor() {
        this.uuid = crypto.randomUUID();
    }
}

export class NetworkGameSequence extends GameSequence {
    public importExport_games: GameType[] = [];

    constructor(g?: GameSequence) {
        super();
        if (g) {
            this.uuid = g.uuid;
            this.name = g.name;
            this.description = g.description;
            this.importExport_gameUUIDs = [...g.importExport_gameUUIDs];
            this.gameTypes = [...g.gameTypes];
            this.randomizeSequence = g.randomizeSequence;
            this.currentDifficultyName = g.currentDifficultyName;
            this.creatorUserID = g.creatorUserID;
            this.creatorUserName = g.creatorUserName;
            this.dateCreated = g.dateCreated;
            this.lastModified = g.lastModified;
            this.howManyTimesUpdated = g.howManyTimesUpdated;
            this.upVotes = g.upVotes;
            this.downVotes = g.downVotes;
        }
    }

    public toBase64GZippedXML(): string {
        // TODO: implement XML serialization and GZip
        return btoa(JSON.stringify(this));
    }

    public static fromBase64GZippedXML(b64GZipXML: string): NetworkGameSequence | null {
        // TODO: implement XML deserialization and GZip
        try {
            const data = JSON.parse(atob(b64GZipXML));
            const ngs = new NetworkGameSequence();
            Object.assign(ngs, data);
            return ngs;
        } catch {
            return null;
        }
    }
}
