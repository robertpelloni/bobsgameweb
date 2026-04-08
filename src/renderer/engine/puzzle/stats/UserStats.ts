/**
 * UserStats — cumulative stats per user for a specific game and difficulty.
 *
 * Ported from okgame C++ Puzzle/Stats/UserStatsForSpecificGameAndDifficulty.
 */
export class UserStats {
    userName = '';
    userID = -1;

    isGameTypeOrSequence = '';
    gameTypeName = '';
    gameTypeUUID = '';
    gameSequenceName = '';
    gameSequenceUUID = '';
    difficultyName = '';

    // Totals
    totalGamesPlayed = 0;
    singlePlayerGamesPlayed = 0;
    tournamentGamesPlayed = 0;
    localMultiplayerGamesPlayed = 0;
    tournamentGamesWon = 0;
    tournamentGamesLost = 0;
    singlePlayerGamesCompleted = 0;
    singlePlayerGamesLost = 0;
    singlePlayerHighestLevelReached = 0;

    // Time
    totalTimePlayed = 0;
    longestGameLength = 0;
    averageGameLength = 0;
    fastestClearedLength = 0;

    // Rating
    eloScore = 0;
    planesWalkerPoints = 0;

    // Accumulators
    totalBlocksMade = 0;
    totalPiecesMade = 0;
    totalBlocksCleared = 0;
    totalPiecesPlaced = 0;
    totalCombosMade = 0;
    biggestCombo = 0;
    mostBlocksCleared = 0;

    // Timestamps
    firstTimePlayed = 0;
    lastTimePlayed = 0;

    // Reference stats UUIDs
    longestTimeStatsUUID = '';
    fastestTimeClearedStatsUUID = '';
    mostBlocksClearedStatsUUID = '';

    /**
     * Merge a completed game's stats into this user's cumulative stats.
     */
    mergeGameStats(stats: { won: number; lost: number; timeLasted: number; blocksCleared: number; piecesPlaced: number; combosMade: number; biggestCombo: number; level: number }): void {
        this.totalGamesPlayed++;
        this.singlePlayerGamesPlayed++;

        if (stats.won) {
            this.singlePlayerGamesCompleted++;
        } else {
            this.singlePlayerGamesLost++;
        }

        if (stats.level > this.singlePlayerHighestLevelReached) {
            this.singlePlayerHighestLevelReached = stats.level;
        }

        this.totalTimePlayed += stats.timeLasted;
        this.totalBlocksCleared += stats.blocksCleared;
        this.totalPiecesPlaced += stats.piecesPlaced;
        this.totalCombosMade += stats.combosMade;

        if (stats.biggestCombo > this.biggestCombo) {
            this.biggestCombo = stats.biggestCombo;
        }
        if (stats.blocksCleared > this.mostBlocksCleared) {
            this.mostBlocksCleared = stats.blocksCleared;
        }
        if (stats.timeLasted > this.longestGameLength) {
            this.longestGameLength = stats.timeLasted;
        }
        if (this.fastestClearedLength === 0 || (stats.won && stats.timeLasted < this.fastestClearedLength)) {
            this.fastestClearedLength = stats.timeLasted;
        }

        this.averageGameLength = this.totalTimePlayed / this.totalGamesPlayed;
        this.lastTimePlayed = Date.now();
        if (this.firstTimePlayed === 0) this.firstTimePlayed = Date.now();
    }

    static fromJSON(data: Record<string, unknown>): UserStats {
        const stats = new UserStats();
        Object.assign(stats, data);
        return stats;
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}
