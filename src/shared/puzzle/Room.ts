import { GameSequence } from "./GameSequence";

export enum SendGarbageToRule {
    SEND_GARBAGE_TO_ALL_PLAYERS,
    SEND_GARBAGE_TO_ALL_PLAYERS_50_PERCENT_CHANCE,
    SEND_GARBAGE_TO_RANDOM_PLAYER,
    SEND_GARBAGE_TO_EACH_PLAYER_IN_ROTATION,
    SEND_GARBAGE_TO_PLAYER_WITH_LEAST_BLOCKS,
}

export class Room {
    public uuid: string = "";

    public room_IsGameSequenceOrType: string = "";
    public room_GameTypeName: string = "";
    public room_GameSequenceName: string = "";
    public room_GameTypeUUID: string = "";
    public room_GameSequenceUUID: string = "";

    public room_DifficultyName: string = "Beginner";
    public singleplayer_RandomizeSequence: boolean = true;

    public multiplayer_NumPlayers: number = 0;
    public multiplayer_HostUserID: number = 0;

    public multiplayer_MaxPlayers: number = 0;
    public multiplayer_PrivateRoom: boolean = false;
    public multiplayer_TournamentRoom: boolean = false;
    public multiplayer_AllowDifferentDifficulties: boolean = true;
    public multiplayer_AllowDifferentGameSequences: boolean = true;

    public endlessMode: boolean = false;
    public multiplayer_GameEndsWhenOnePlayerRemains: boolean = true;
    public multiplayer_GameEndsWhenSomeoneCompletesCreditsLevel: boolean = true;
    public multiplayer_DisableVSGarbage: boolean = false;

    public gameSpeedStart: number = 0.01;
    public gameSpeedChangeRate: number = 0.02;
    public gameSpeedMaximum: number = 1.0;
    public levelUpMultiplier: number = 1.0;
    public levelUpCompoundMultiplier: number = 1.0;

    public multiplayer_AllowNewPlayersDuringGame: boolean = false;
    public multiplayer_UseTeams: boolean = false;

    public multiplayer_GarbageMultiplier: number = 1.0;
    public multiplayer_GarbageLimit: number = 0;
    public multiplayer_GarbageScaleByDifficulty: boolean = true;
    public multiplayer_SendGarbageTo: SendGarbageToRule = SendGarbageToRule.SEND_GARBAGE_TO_ALL_PLAYERS;

    public floorSpinLimit: number = -1;
    public totalYLockDelayLimit: number = -1;
    public lockDelayDecreaseRate: number = 0;
    public lockDelayMinimum: number = 0;

    public stackWaitLimit: number = -1;
    public spawnDelayLimit: number = -1;
    public spawnDelayDecreaseRate: number = 0;
    public spawnDelayMinimum: number = 0;
    public dropDelayMinimum: number = 0;

    public gameSequence: GameSequence | null = null;

    constructor() {
        this.uuid = crypto.randomUUID();
    }

    public setDefaults(): void {
        const r = new Room();
        this.multiplayer_GameEndsWhenOnePlayerRemains = r.multiplayer_GameEndsWhenOnePlayerRemains;
        this.multiplayer_GameEndsWhenSomeoneCompletesCreditsLevel = r.multiplayer_GameEndsWhenSomeoneCompletesCreditsLevel;
        this.multiplayer_DisableVSGarbage = r.multiplayer_DisableVSGarbage;
        this.gameSpeedStart = r.gameSpeedStart;
        this.gameSpeedChangeRate = r.gameSpeedChangeRate;
        this.gameSpeedMaximum = r.gameSpeedMaximum;
        this.levelUpMultiplier = r.levelUpMultiplier;
        this.levelUpCompoundMultiplier = r.levelUpCompoundMultiplier;
        this.multiplayer_AllowNewPlayersDuringGame = r.multiplayer_AllowNewPlayersDuringGame;
        this.multiplayer_UseTeams = r.multiplayer_UseTeams;
        this.multiplayer_GarbageMultiplier = r.multiplayer_GarbageMultiplier;
        this.multiplayer_GarbageLimit = r.multiplayer_GarbageLimit;
        this.multiplayer_GarbageScaleByDifficulty = r.multiplayer_GarbageScaleByDifficulty;
        this.multiplayer_SendGarbageTo = r.multiplayer_SendGarbageTo;
        this.floorSpinLimit = r.floorSpinLimit;
        this.totalYLockDelayLimit = r.totalYLockDelayLimit;
        this.lockDelayDecreaseRate = r.lockDelayDecreaseRate;
        this.lockDelayMinimum = r.lockDelayMinimum;
        this.stackWaitLimit = r.stackWaitLimit;
        this.spawnDelayLimit = r.spawnDelayLimit;
        this.spawnDelayDecreaseRate = r.spawnDelayDecreaseRate;
        this.spawnDelayMinimum = r.spawnDelayMinimum;
        this.dropDelayMinimum = r.dropDelayMinimum;
    }
}
