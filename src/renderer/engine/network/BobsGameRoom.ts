/**
 * BobsGameRoom — multiplayer game room configuration and state.
 *
 * Ported from Java com.bobsgame.net.BobsGameRoom.
 * Full room settings for matchmaking, game rules, and multiplayer options.
 */

export interface RoomConfig {
    // Game selection
    isGameSequenceOrType: 'sequence' | 'type';
    gameTypeName: string;
    gameTypeUUID: string;
    gameSequenceName: string;
    gameSequenceUUID: string;
    difficultyName: string;

    // Players
    numPlayers: number;
    hostUserID: number;
    maxPlayers: number;
    isPrivate: boolean;
    isTournament: boolean;

    // Rules
    endlessMode: boolean;
    gameEndsWhenOnePlayerRemains: boolean;
    gameEndsWhenSomeoneCompletesCreditsLevel: boolean;
    disableVSGarbage: boolean;

    // Speed
    gameSpeedStart: number;
    gameSpeedChangeRate: number;
    gameSpeedMaximum: number;
    levelUpMultiplier: number;
    levelUpCompoundMultiplier: number;

    // Multiplayer
    allowNewPlayersDuringGame: boolean;
    useTeams: boolean;
    garbageMultiplier: number;
    garbageLimit: number;
    garbageScaleByDifficulty: boolean;
    sendGarbageTo: number;
    allowDifferentDifficulties: boolean;
    allowDifferentGameSequences: boolean;

    // Advanced
    floorSpinLimit: number;
    totalYLockDelayLimit: number;
    lockDelayDecreaseRate: number;
    lockDelayMinimum: number;
    stackWaitLimit: number;
    spawnDelayLimit: number;
    spawnDelayDecreaseRate: number;
    spawnDelayMinimum: number;
    dropDelayMinimum: number;

    // Random
    randomizeSequence: boolean;
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
    isGameSequenceOrType: 'type',
    gameTypeName: '',
    gameTypeUUID: '',
    gameSequenceName: '',
    gameSequenceUUID: '',
    difficultyName: 'Beginner',
    numPlayers: 0,
    hostUserID: 0,
    maxPlayers: 2,
    isPrivate: false,
    isTournament: false,
    endlessMode: false,
    gameEndsWhenOnePlayerRemains: true,
    gameEndsWhenSomeoneCompletesCreditsLevel: true,
    disableVSGarbage: false,
    gameSpeedStart: 0.01,
    gameSpeedChangeRate: 0.02,
    gameSpeedMaximum: 1.0,
    levelUpMultiplier: 1.0,
    levelUpCompoundMultiplier: 1.0,
    allowNewPlayersDuringGame: false,
    useTeams: false,
    garbageMultiplier: 1.0,
    garbageLimit: 0,
    garbageScaleByDifficulty: true,
    sendGarbageTo: 0,
    allowDifferentDifficulties: true,
    allowDifferentGameSequences: true,
    floorSpinLimit: -1,
    totalYLockDelayLimit: -1,
    lockDelayDecreaseRate: 0,
    lockDelayMinimum: 0,
    stackWaitLimit: -1,
    spawnDelayLimit: -1,
    spawnDelayDecreaseRate: 0,
    spawnDelayMinimum: 0,
    dropDelayMinimum: 0,
    randomizeSequence: true,
};

export class BobsGameRoom {
    uuid = '';
    config: RoomConfig;
    timeStarted = 0;
    timeLastGotUpdate = 0;

    // Player list
    playerUserIDs: number[] = [];
    playerNames: string[] = [];
    playerConfirmed: boolean[] = [];

    // State
    gameStarted = false;
    gameOver = false;

    constructor(config?: Partial<RoomConfig>) {
        this.config = { ...DEFAULT_ROOM_CONFIG, ...config };
    }

    // ============================================================
    // Players
    // ============================================================

    addPlayer(userID: number, name: string): void {
        if (this.playerUserIDs.includes(userID)) return;
        if (this.playerUserIDs.length >= this.config.maxPlayers) return;
        this.playerUserIDs.push(userID);
        this.playerNames.push(name);
        this.playerConfirmed.push(false);
        this.config.numPlayers = this.playerUserIDs.length;
    }

    removePlayer(userID: number): void {
        const idx = this.playerUserIDs.indexOf(userID);
        if (idx >= 0) {
            this.playerUserIDs.splice(idx, 1);
            this.playerNames.splice(idx, 1);
            this.playerConfirmed.splice(idx, 1);
            this.config.numPlayers = this.playerUserIDs.length;

            // Transfer host if needed
            if (userID === this.config.hostUserID && this.playerUserIDs.length > 0) {
                this.config.hostUserID = this.playerUserIDs[0];
            }
        }
    }

    confirmPlayer(userID: number): void {
        const idx = this.playerUserIDs.indexOf(userID);
        if (idx >= 0) this.playerConfirmed[idx] = true;
    }

    isAllConfirmed(): boolean {
        return this.playerConfirmed.length > 0 && this.playerConfirmed.every(c => c);
    }

    isHost(userID: number): boolean {
        return userID === this.config.hostUserID;
    }

    // ============================================================
    // Serialization
    // ============================================================

    toString(): string {
        const parts: string[] = [];
        parts.push(`uuid:${this.uuid}`);
        parts.push(`gameType:${this.config.gameTypeName}`);
        parts.push(`difficulty:${this.config.difficultyName}`);
        parts.push(`players:${this.config.numPlayers}/${this.config.maxPlayers}`);
        parts.push(`started:${this.gameStarted}`);
        return parts.join(',');
    }

    static fromString(s: string): BobsGameRoom {
        const room = new BobsGameRoom();
        const parts = s.split(',');
        for (const part of parts) {
            const [key, value] = part.split(':');
            if (key === 'uuid') room.uuid = value;
            else if (key === 'gameType') room.config.gameTypeName = value;
            else if (key === 'difficulty') room.config.difficultyName = value;
        }
        return room;
    }

    toJSON(): Record<string, unknown> {
        return { uuid: this.uuid, config: this.config, players: this.playerUserIDs, started: this.gameStarted };
    }

    // ============================================================
    // Accessors
    // ============================================================

    getPlayerCount(): number { return this.playerUserIDs.length; }
    getPlayerNames(): string[] { return [...this.playerNames]; }
    getConfig(): RoomConfig { return this.config; }
    getUUID(): string { return this.uuid; }
}
