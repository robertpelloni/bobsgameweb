/**
 * Leaderboard — top scores and rankings for games.
 *
 * Ported from okgame C++ Puzzle/Stats/LeaderBoardAndHighScoreBoardEntry.
 */
export interface LeaderboardEntry {
    rank: number;
    userID: number;
    userName: string;
    score: number;
    eloScore: number;
    planesWalkerPoints: number;
    totalGamesPlayed: number;
    totalBlocksCleared: number;
    totalTimePlayed: number;
    biggestCombo: number;
    mostBlocksCleared: number;
    fastestTime: number;
    longestTime: number;
    dateAchieved: number;
}

export class Leaderboard {
    gameTypeName = '';
    gameTypeUUID = '';
    gameSequenceName = '';
    gameSequenceUUID = '';
    difficultyName = '';

    private entries: LeaderboardEntry[] = [];
    private maxEntries = 100;

    constructor(gameName: string, gameUUID: string, difficulty = 'Beginner') {
        this.gameTypeName = gameName;
        this.gameTypeUUID = gameUUID;
        this.difficultyName = difficulty;
    }

    addEntry(entry: Omit<LeaderboardEntry, 'rank'>): void {
        const fullEntry: LeaderboardEntry = { ...entry, rank: 0 };
        this.entries.push(fullEntry);
        this.sortAndRank();
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
    }

    getTopN(n: number): LeaderboardEntry[] {
        return this.entries.slice(0, n);
    }

    getEntryForUser(userID: number): LeaderboardEntry | undefined {
        return this.entries.find(e => e.userID === userID);
    }

    getUserRank(userID: number): number {
        return this.entries.find(e => e.userID === userID)?.rank ?? -1;
    }

    private sortAndRank(): void {
        this.entries.sort((a, b) => b.score - a.score);
        this.entries.forEach((entry, i) => {
            entry.rank = i + 1;
        });
    }

    getCount(): number { return this.entries.length; }

    static fromJSON(data: Record<string, unknown>): Leaderboard {
        const lb = new Leaderboard(
            data.gameTypeName as string ?? '',
            data.gameTypeUUID as string ?? '',
            data.difficultyName as string ?? 'Beginner',
        );
        lb.entries = (data.entries as LeaderboardEntry[]) ?? [];
        return lb;
    }

    toJSON(): Record<string, unknown> {
        return {
            gameTypeName: this.gameTypeName,
            gameTypeUUID: this.gameTypeUUID,
            difficultyName: this.difficultyName,
            entries: this.entries,
        };
    }
}
