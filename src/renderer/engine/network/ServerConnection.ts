/**
 * ServerConnection — persistent connection to the game server.
 *
 * Ported from okgame C++ Engine/network/TCPServerConnection.
 * Web adaptation uses WebSocket for persistent bidirectional communication.
 */

export interface ServerStats {
    serversOnline: number;
    usersOnline: number;
    serverUptime: number;
}

export interface ServerConfig {
    host: string;
    port: number;
    useSSL: boolean;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    pingInterval: number;
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
    host: 'ws.bobsgame.com',
    port: 443,
    useSSL: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    pingInterval: 30000,
};

export class ServerConnection {
    private config: ServerConfig;
    private ws: WebSocket | null = null;
    private connected = false;
    private authenticated = false;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;

    // State
    serverStats: ServerStats = { serversOnline: 0, usersOnline: 0, serverUptime: 0 };
    clientLocation = '';
    private userID = -1;
    private userName = '';
    private latency = 0;
    private lastPingSent = 0;

    // Message queue
    private incomingQueue: string[] = [];
    private outgoingQueue: string[] = [];

    // Callbacks
    onConnected?: () => void;
    onDisconnected?: () => void;
    onMessage?: (message: string) => void;
    onAuthenticated?: (userID: number, userName: string) => void;
    onStats?: (stats: ServerStats) => void;
    onError?: (error: string) => void;
    onLatencyUpdate?: (latencyMs: number) => void;

    constructor(config?: Partial<ServerConfig>) {
        this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    }

    // ============================================================
    // Connection
    // ============================================================

    connect(): void {
        const protocol = this.config.useSSL ? 'wss' : 'ws';
        const url = `${protocol}://${this.config.host}:${this.config.port}`;

        try {
            this.ws = new WebSocket(url);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                this.startPing();
                this.flushOutgoing();
                this.onConnected?.();
            };

            this.ws.onclose = () => {
                this.connected = false;
                this.authenticated = false;
                this.stopPing();
                this.onDisconnected?.();
                this.tryReconnect();
            };

            this.ws.onerror = () => {
                this.onError?.('Connection error');
            };

            this.ws.onmessage = (event) => {
                const data = typeof event.data === 'string' ? event.data : '';
                this.incomingQueue.push(data);
                this.onMessage?.(data);
                this.handleMessage(data);
            };
        } catch (err) {
            this.onError?.(`Connect failed: ${err}`);
            this.tryReconnect();
        }
    }

    disconnect(): void {
        this.stopPing();
        this.stopReconnect();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.authenticated = false;
    }

    private tryReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.onError?.('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval * this.reconnectAttempts;
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    private stopReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ============================================================
    // Authentication
    // ============================================================

    authenticate(userID: number, userName: string, token: string): void {
        this.send(JSON.stringify({
            type: 'auth',
            userID,
            userName,
            token,
        }));
    }

    private handleAuthResponse(data: Record<string, unknown>): void {
        if (data.success) {
            this.authenticated = true;
            this.userID = (data.userID as number) ?? -1;
            this.userName = (data.userName as string) ?? '';
            this.onAuthenticated?.(this.userID, this.userName);
        } else {
            this.onError?.(data.error as string ?? 'Authentication failed');
        }
    }

    // ============================================================
    // Messaging
    // ============================================================

    send(message: string): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            this.outgoingQueue.push(message);
        }
    }

    sendJSON(data: Record<string, unknown>): void {
        this.send(JSON.stringify(data));
    }

    private flushOutgoing(): void {
        while (this.outgoingQueue.length > 0) {
            const msg = this.outgoingQueue.shift()!;
            this.send(msg);
        }
    }

    pollIncoming(): string[] {
        const messages = [...this.incomingQueue];
        this.incomingQueue = [];
        return messages;
    }

    // ============================================================
    // Ping / Latency
    // ============================================================

    private startPing(): void {
        this.pingTimer = setInterval(() => {
            this.lastPingSent = Date.now();
            this.sendJSON({ type: 'ping', timestamp: this.lastPingSent });
        }, this.config.pingInterval);
    }

    private stopPing(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    private handlePong(data: Record<string, unknown>): void {
        if (data.timestamp) {
            this.latency = Date.now() - (data.timestamp as number);
            this.onLatencyUpdate?.(this.latency);
        }
    }

    // ============================================================
    // Message Handler
    // ============================================================

    private handleMessage(raw: string): void {
        try {
            const data = JSON.parse(raw);
            const type = data.type as string;

            switch (type) {
                case 'auth_response': this.handleAuthResponse(data); break;
                case 'pong': this.handlePong(data); break;
                case 'server_stats':
                    this.serverStats = {
                        serversOnline: (data.serversOnline as number) ?? 0,
                        usersOnline: (data.usersOnline as number) ?? 0,
                        serverUptime: (data.serverUptime as number) ?? 0,
                    };
                    this.onStats?.(this.serverStats);
                    break;
            }
        } catch {
            // Non-JSON message, already forwarded via onMessage
        }
    }

    // ============================================================
    // Location
    // ============================================================

    updateLocation(location: string): void {
        this.clientLocation = location;
        this.sendJSON({ type: 'location', location });
    }

    // ============================================================
    // Status
    // ============================================================

    isConnected(): boolean { return this.connected; }
    isAuthenticated(): boolean { return this.authenticated; }
    getUserID(): number { return this.userID; }
    getUserName(): string { return this.userName; }
    getLatency(): number { return this.latency; }
    getReconnectAttempts(): number { return this.reconnectAttempts; }
}
