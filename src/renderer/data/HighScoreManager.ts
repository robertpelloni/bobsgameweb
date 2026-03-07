import { GameType } from '../puzzle/GameType';

export interface HighScore {
    name: string;
    score: number;
    level: number;
    lines: number;
    time: number;
    gameType: string;
    gameMode: string;
    date: number;
}

export type GameMode = 'marathon' | 'sprint' | 'ultra';

const STORAGE_KEY = 'bobsgame_highscores';
const MAX_SCORES_PER_MODE = 10;

export class HighScoreManager {
    private static scores: HighScore[] = [];
    private static loaded = false;

    static load(): void {
        if (this.loaded) return;
        
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.scores = JSON.parse(data);
            }
        } catch {
            this.scores = [];
        }
        this.loaded = true;
    }

    static save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
        } catch {
            console.warn('Failed to save high scores to localStorage');
        }
    }

    static addScore(
        name: string,
        score: number,
        level: number,
        lines: number,
        time: number,
        gameType: GameType,
        gameMode: GameMode
    ): number {
        this.load();

        const entry: HighScore = {
            name: name.substring(0, 10).toUpperCase(),
            score,
            level,
            lines,
            time,
            gameType: gameType.name,
            gameMode,
            date: Date.now(),
        };

        this.scores.push(entry);
        this.scores.sort((a, b) => b.score - a.score);

        const modeScores = this.scores.filter(s => s.gameMode === gameMode);
        if (modeScores.length > MAX_SCORES_PER_MODE) {
            const toRemove = modeScores[modeScores.length - 1];
            const idx = this.scores.indexOf(toRemove);
            if (idx !== -1) this.scores.splice(idx, 1);
        }

        this.save();

        return this.getRank(score, gameMode);
    }

    static getScores(gameMode?: GameMode, limit: number = 10): HighScore[] {
        this.load();
        
        let filtered = this.scores;
        if (gameMode) {
            filtered = this.scores.filter(s => s.gameMode === gameMode);
        }
        
        return filtered
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    static getRank(score: number, gameMode: GameMode): number {
        this.load();
        
        const modeScores = this.scores
            .filter(s => s.gameMode === gameMode)
            .sort((a, b) => b.score - a.score);
        
        for (let i = 0; i < modeScores.length; i++) {
            if (score >= modeScores[i].score) {
                return i + 1;
            }
        }
        
        return modeScores.length + 1;
    }

    static isHighScore(score: number, gameMode: GameMode): boolean {
        this.load();
        
        const modeScores = this.scores.filter(s => s.gameMode === gameMode);
        
        if (modeScores.length < MAX_SCORES_PER_MODE) return true;
        
        const lowestScore = Math.min(...modeScores.map(s => s.score));
        return score > lowestScore;
    }

    static getTopScore(gameMode: GameMode): number {
        this.load();
        
        const modeScores = this.scores.filter(s => s.gameMode === gameMode);
        if (modeScores.length === 0) return 0;
        
        return Math.max(...modeScores.map(s => s.score));
    }

    static clear(): void {
        this.scores = [];
        this.save();
    }
}
