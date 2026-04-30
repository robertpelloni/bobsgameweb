/**
 * GameStats — per-game statistics tracking for every game played.
 *
 * Ported from okgame C++ Puzzle/Stats/GameStats.
 */
export class GameStats {
    statsUUID = '';
    userName = '';
    userID = 0;

    // Game identification
    isGameTypeOrSequence = '';
    gameTypeName = '';
    gameTypeUUID = '';
    gameSequenceName = '';
    gameSequenceUUID = '';
    difficultyName = '';

    // Result
    won = 0;
    died = 0;
    lost = 0;
    complete = 0;
    isLocalMultiplayer = 0;
    isNetworkMultiplayer = 0;
    numPlayers = 1;

    // Performance
    level = 0;
    timeLasted = 0;
    timeStarted = 0;
    timeEnded = 0;
    blocksMade = 0;
    piecesMade = 0;
    blocksCleared = 0;
    piecesPlaced = 0;
    combosMade = 0;
    biggestCombo = 0;

    // Replay
    playerIDsCSV = '';

    constructor() {
        this.statsUUID = crypto.randomUUID();
        this.timeStarted = Date.now();
    }

    endGame(won: boolean): void {
        this.timeEnded = Date.now();
        this.timeLasted = this.timeEnded - this.timeStarted;
        this.won = won ? 1 : 0;
        this.lost = won ? 0 : 1;
        this.complete = 1;
    }

    static fromJSON(data: Record<string, unknown>): GameStats {
        const stats = new GameStats();
        Object.assign(stats, data);
        return stats;
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}
