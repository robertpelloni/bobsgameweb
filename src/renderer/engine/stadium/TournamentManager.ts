/**
 * TournamentManager — bracket tournament system for competitive play.
 *
 * Ported from Java com.bobsgame.server.TournamentManager.
 * Manages elimination brackets, match scheduling, and winner tracking.
 */

export interface TournamentMatch {
    matchID: string;
    player1ID: number;
    player2ID: number;
    winnerID: number;
    nextMatchID: string | null;
    isFinal: boolean;
    round: number;
    isComplete: boolean;
}

export interface Tournament {
    tournamentID: string;
    roomUUID: string;
    matches: TournamentMatch[];
    playerNames: Map<number, string>;
    isActive: boolean;
    currentRound: number;
    totalRounds: number;
}

export class TournamentManager {
    private activeTournaments: Map<string, Tournament> = new Map();
    private roomToTournament: Map<string, string> = new Map();

    // ============================================================
    // Create Tournament
    // ============================================================

    createBracket(roomUUID: string, playerIDs: number[], names: Map<number, string>): Tournament {
        const tournamentID = crypto.randomUUID();
        const tournament: Tournament = {
            tournamentID,
            roomUUID,
            matches: [],
            playerNames: new Map(names),
            isActive: true,
            currentRound: 0,
            totalRounds: Math.ceil(Math.log2(playerIDs.length)),
        };

        // Generate first round matches
        const numPlayers = playerIDs.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
        const matchesInRound = bracketSize / 2;

        for (let i = 0; i < matchesInRound; i++) {
            const p1 = i * 2 < numPlayers ? playerIDs[i * 2] : -1; // -1 = bye
            const p2 = i * 2 + 1 < numPlayers ? playerIDs[i * 2 + 1] : -1;

            const match: TournamentMatch = {
                matchID: `r0m${i}`,
                player1ID: p1,
                player2ID: p2,
                winnerID: -1,
                nextMatchID: null,
                isFinal: false,
                round: 0,
                isComplete: false,
            };

            // Auto-advance byes
            if (p1 === -1) { match.winnerID = p2; match.isComplete = true; }
            if (p2 === -1) { match.winnerID = p1; match.isComplete = true; }

            tournament.matches.push(match);
        }

        // Generate subsequent rounds
        for (let round = 1; round <= tournament.totalRounds; round++) {
            const matchesThisRound = matchesInRound / Math.pow(2, round);
            for (let i = 0; i < matchesThisRound; i++) {
                const isFinal = round === tournament.totalRounds;
                tournament.matches.push({
                    matchID: `r${round}m${i}`,
                    player1ID: -1,
                    player2ID: -1,
                    winnerID: -1,
                    nextMatchID: null,
                    isFinal,
                    round,
                    isComplete: false,
                });
            }
        }

        // Link matches
        this.linkMatches(tournament);

        // Auto-advance byes into next round
        this.propagateByes(tournament);

        this.activeTournaments.set(tournamentID, tournament);
        this.roomToTournament.set(roomUUID, tournamentID);

        return tournament;
    }

    private linkMatches(tournament: Tournament): void {
        for (const match of tournament.matches) {
            const nextRound = match.round + 1;
            const matchIndex = parseInt(match.matchID.split('m')[1]);
            const nextMatchIndex = Math.floor(matchIndex / 2);
            const nextMatch = tournament.matches.find(
                m => m.round === nextRound && m.matchID === `r${nextRound}m${nextMatchIndex}`
            );
            if (nextMatch) {
                match.nextMatchID = nextMatch.matchID;
            }
        }
    }

    private propagateByes(tournament: Tournament): void {
        for (const match of tournament.matches) {
            if (match.isComplete && match.winnerID >= 0 && match.nextMatchID) {
                const nextMatch = tournament.matches.find(m => m.matchID === match.nextMatchID);
                if (nextMatch) {
                    const matchIndex = parseInt(match.matchID.split('m')[1]);
                    if (matchIndex % 2 === 0) nextMatch.player1ID = match.winnerID;
                    else nextMatch.player2ID = match.winnerID;
                }
            }
        }
    }

    // ============================================================
    // Match Resolution
    // ============================================================

    reportMatchWinner(tournamentID: string, matchID: string, winnerID: number): TournamentMatch | null {
        const tournament = this.activeTournaments.get(tournamentID);
        if (!tournament) return null;

        const match = tournament.matches.find(m => m.matchID === matchID);
        if (!match || match.isComplete) return null;

        match.winnerID = winnerID;
        match.isComplete = true;

        // Advance winner to next round
        if (match.nextMatchID) {
            const nextMatch = tournament.matches.find(m => m.matchID === match.nextMatchID);
            if (nextMatch) {
                const matchIndex = parseInt(match.matchID.split('m')[1]);
                if (matchIndex % 2 === 0) nextMatch.player1ID = winnerID;
                else nextMatch.player2ID = winnerID;
            }
        }

        // Check if tournament is complete
        const finalMatch = tournament.matches.find(m => m.isFinal);
        if (finalMatch?.isComplete) {
            tournament.isActive = false;
        }

        return match;
    }

    // ============================================================
    // Query
    // ============================================================

    getTournament(tournamentID: string): Tournament | undefined {
        return this.activeTournaments.get(tournamentID);
    }

    getTournamentByRoom(roomUUID: string): Tournament | undefined {
        const id = this.roomToTournament.get(roomUUID);
        return id ? this.activeTournaments.get(id) : undefined;
    }

    getCurrentRoundMatches(tournamentID: string): TournamentMatch[] {
        const tournament = this.activeTournaments.get(tournamentID);
        if (!tournament) return [];

        // Find the current round (lowest round with incomplete matches)
        let currentRound = 0;
        for (const match of tournament.matches) {
            if (!match.isComplete && match.round > currentRound) {
                currentRound = match.round;
            }
        }

        return tournament.matches.filter(m => m.round === currentRound && !m.isComplete);
    }

    getChampion(tournamentID: string): number {
        const tournament = this.activeTournaments.get(tournamentID);
        if (!tournament || tournament.isActive) return -1;
        const finalMatch = tournament.matches.find(m => m.isFinal);
        return finalMatch?.winnerID ?? -1;
    }

    getActiveTournaments(): Tournament[] {
        return [...this.activeTournaments.values()].filter(t => t.isActive);
    }
}
