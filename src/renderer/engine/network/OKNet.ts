/**
 * OKNet — game network protocol layer for bob's game online services.
 *
 * Ported from okgame C++ Engine/shared/OKNet + Java com.bobsgame.game.BobNet.
 * Handles authentication, game server discovery, and matchmaking.
 */
import { NetworkManager, type LobbyRoom } from '../network/NetworkManager';

export interface ServerInfo {
    id: string;
    name: string;
    host: string;
    port: number;
    region: string;
    playersOnline: number;
    maxPlayers: number;
    ping: number;
}

export interface MatchmakingConfig {
    gameMode: string;
    difficulty: string;
    maxWaitMs: number;
    isRanked: boolean;
}

export class OKNet {
    private networkManager: NetworkManager;
    private servers: ServerInfo[] = [];
    private connected = false;
    private authenticated = false;
    private userID = -1;
    private userName = '';

    // Matchmaking
    private matchmakingActive = false;
    private matchmakingStartTime = 0;
    private matchmakingConfig: MatchmakingConfig | null = null;

    // Callbacks
    onServerList?: (servers: ServerInfo[]) => void;
    onAuthenticated?: (userID: number, userName: string) => void;
    onMatchFound?: (room: LobbyRoom) => void;
    onMatchmakingTimeout?: () => void;
    onError?: (message: string) => void;

    constructor(networkManager?: NetworkManager) {
        this.networkManager = networkManager ?? new NetworkManager();
    }

    // ============================================================
    // Connection
    // ============================================================

    async connect(serverURL: string): Promise<boolean> {
        this.networkManager.connect(serverURL);

        return new Promise((resolve) => {
            this.networkManager.on('connected', () => {
                this.connected = true;
                resolve(true);
            });
            this.networkManager.on('error', () => {
                resolve(false);
            });

            // Timeout after 5 seconds
            setTimeout(() => resolve(false), 5000);
        });
    }

    disconnect(): void {
        this.networkManager.disconnect();
        this.connected = false;
        this.authenticated = false;
        this.userID = -1;
    }

    // ============================================================
    // Authentication
    // ============================================================

    async login(username: string, _password: string): Promise<boolean> {
        if (!this.connected) return false;

        // For now, simple auth
        this.authenticated = true;
        this.userID = Math.floor(Math.random() * 1000000);
        this.userName = username;
        this.onAuthenticated?.(this.userID, username);
        return true;
    }

    // ============================================================
    // Server Discovery
    // ============================================================

    async requestServerList(): Promise<ServerInfo[]> {
        if (!this.connected) return [];

        this.networkManager.listRooms();
        // Simulate server list for now
        this.servers = [
            { id: 'us-east-1', name: 'US East', host: 'ws.bobsgame.com', port: 443, region: 'us-east', playersOnline: 42, maxPlayers: 100, ping: 15 },
            { id: 'eu-west-1', name: 'EU West', host: 'eu.bobsgame.com', port: 443, region: 'eu-west', playersOnline: 28, maxPlayers: 100, ping: 85 },
            { id: 'ap-south-1', name: 'Asia Pacific', host: 'ap.bobsgame.com', port: 443, region: 'ap-south', playersOnline: 15, maxPlayers: 100, ping: 180 },
        ];
        this.onServerList?.(this.servers);
        return this.servers;
    }

    getBestServer(): ServerInfo | undefined {
        if (this.servers.length === 0) return undefined;
        return this.servers.reduce((best, s) => s.ping < best.ping ? s : best);
    }

    // ============================================================
    // Matchmaking
    // ============================================================

    startMatchmaking(config: MatchmakingConfig): void {
        this.matchmakingActive = true;
        this.matchmakingStartTime = Date.now();
        this.matchmakingConfig = config;

        // Simulate matchmaking
        setTimeout(() => {
            if (this.matchmakingActive) {
                this.matchmakingActive = false;
                this.onMatchFound?.({
                    id: crypto.randomUUID(),
                    name: `Match-${Date.now()}`,
                    players: 1,
                    maxPlayers: 2,
                    hasPassword: false,
                    gameMode: config.gameMode,
                    startLevel: 1,
                    isTournament: false,
                    state: 'lobby',
                });
            }
        }, 2000 + Math.random() * 3000);

        // Timeout
        setTimeout(() => {
            if (this.matchmakingActive) {
                this.stopMatchmaking();
                this.onMatchmakingTimeout?.();
            }
        }, config.maxWaitMs);
    }

    stopMatchmaking(): void {
        this.matchmakingActive = false;
    }

    getMatchmakingElapsed(): number {
        if (!this.matchmakingActive) return 0;
        return Date.now() - this.matchmakingStartTime;
    }

    // ============================================================
    // Access
    // ============================================================

    getNetworkManager(): NetworkManager { return this.networkManager; }
    isConnected(): boolean { return this.connected; }
    isAuthenticated(): boolean { return this.authenticated; }
    getUserID(): number { return this.userID; }
    getUserName(): string { return this.userName; }
    isMatchmaking(): boolean { return this.matchmakingActive; }
    getServers(): ServerInfo[] { return this.servers; }
}
