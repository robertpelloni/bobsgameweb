/**
 * NetworkGameSave — server-side game save data for cloud sync.
 *
 * Ported from Java com.bobsgame.net.GameSave.
 * Manages user profile, stats, settings, and unlock progress.
 */

export interface GameSaveData {
    userID: number;
    userName: string;
    lastLoginTime: number;
    totalPlayTime: number;

    // RPG progress
    money: number;
    flags: Record<string, boolean>;
    skills: Record<string, number>;
    gameStrings: Record<string, string>;
    items: number[];

    // Puzzle stats per game type
    gamesPlayed: Record<string, number>;
    gamesWon: Record<string, number>;
    highScores: Record<string, number>;
    elo: number;

    // Settings (synced across devices)
    settings: Record<string, unknown>;

    // Unlock progress
    unlockedGames: string[];
    unlockedSprites: string[];
    achievements: string[];
}

export class NetworkGameSave {
    data: GameSaveData;

    constructor(userID = -1, userName = '') {
        this.data = {
            userID,
            userName,
            lastLoginTime: Date.now(),
            totalPlayTime: 0,
            money: 0,
            flags: {},
            skills: {},
            gameStrings: {},
            items: [],
            gamesPlayed: {},
            gamesWon: {},
            highScores: {},
            elo: 1000,
            settings: {},
            unlockedGames: [],
            unlockedSprites: [],
            achievements: [],
        };
    }

    // ============================================================
    // Flags
    // ============================================================

    getFlag(name: string): boolean {
        return this.data.flags[name] ?? false;
    }

    setFlag(name: string, value: boolean): void {
        this.data.flags[name] = value;
    }

    // ============================================================
    // Skills
    // ============================================================

    getSkill(name: string): number {
        return this.data.skills[name] ?? 0;
    }

    setSkill(name: string, value: number): void {
        this.data.skills[name] = value;
    }

    incrementSkill(name: string, amount = 1): void {
        this.data.skills[name] = (this.data.skills[name] ?? 0) + amount;
    }

    // ============================================================
    // Game Strings
    // ============================================================

    getGameString(name: string): string {
        return this.data.gameStrings[name] ?? '';
    }

    setGameString(name: string, value: string): void {
        this.data.gameStrings[name] = value;
    }

    // ============================================================
    // Stats
    // ============================================================

    recordGamePlayed(gameType: string, won: boolean, score: number): void {
        this.data.gamesPlayed[gameType] = (this.data.gamesPlayed[gameType] ?? 0) + 1;
        if (won) {
            this.data.gamesWon[gameType] = (this.data.gamesWon[gameType] ?? 0) + 1;
        }
        const current = this.data.highScores[gameType] ?? 0;
        if (score > current) {
            this.data.highScores[gameType] = score;
        }
    }

    getGamesPlayed(gameType: string): number {
        return this.data.gamesPlayed[gameType] ?? 0;
    }

    getGamesWon(gameType: string): number {
        return this.data.gamesWon[gameType] ?? 0;
    }

    getHighScore(gameType: string): number {
        return this.data.highScores[gameType] ?? 0;
    }

    getElo(): number { return this.data.elo; }

    updateElo(opponentElo: number, won: boolean, k = 32): void {
        const expected = 1 / (1 + Math.pow(10, (opponentElo - this.data.elo) / 400));
        const actual = won ? 1 : 0;
        this.data.elo = Math.round(this.data.elo + k * (actual - expected));
    }

    // ============================================================
    // Unlocks
    // ============================================================

    unlockGame(gameID: string): void {
        if (!this.data.unlockedGames.includes(gameID)) {
            this.data.unlockedGames.push(gameID);
        }
    }

    isGameUnlocked(gameID: string): boolean {
        return this.data.unlockedGames.includes(gameID);
    }

    unlockAchievement(id: string): void {
        if (!this.data.achievements.includes(id)) {
            this.data.achievements.push(id);
        }
    }

    hasAchievement(id: string): boolean {
        return this.data.achievements.includes(id);
    }

    // ============================================================
    // Serialization
    // ============================================================

    toJSON(): Record<string, unknown> {
        return { ...this.data };
    }

    static fromJSON(data: Record<string, unknown>): NetworkGameSave {
        const save = new NetworkGameSave(data.userID as number, data.userName as string);
        Object.assign(save.data, data);
        return save;
    }

    encode(): string {
        return JSON.stringify(this.data);
    }

    static decode(s: string): NetworkGameSave {
        try {
            const data = JSON.parse(s);
            return NetworkGameSave.fromJSON(data);
        } catch {
            return new NetworkGameSave();
        }
    }
}
