/**
 * PeerConnection — WebRTC peer-to-peer connection for multiplayer networking.
 *
 * Ported from okgame C++ Engine/network/UDPPeerConnection.h (573 lines).
 * Replaces C++ UDP sockets with WebRTC DataChannels for browser P2P networking.
 * Used for real-time game state synchronization between players.
 */
import { Logger } from '../debug/Logger';

const log = new Logger('PeerConnection');

export enum PeerState {
    DISCONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    FAILED = 3,
    CLOSED = 4,
}

export interface PeerConfig {
    iceServers?: RTCConfiguration['iceServers'];
    onMessage?: (data: string) => void;
    onStateChange?: (state: PeerState) => void;
    onICECandidate?: (candidate: RTCIceCandidate) => void;
}

export class PeerConnection {
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private state: PeerState = PeerState.DISCONNECTED;

    // Identity
    userID = 0;
    userName = '';
    peerID = '';

    // Latency tracking
    private lastPingTime = 0;
    private latency = 0;
    private pingInterval: ReturnType<typeof setInterval> | null = null;

    // Stats
    private messagesSent = 0;
    private messagesReceived = 0;
    private bytesSent = 0;
    private bytesReceived = 0;

    // Callbacks
    private onMessageCallback?: (data: string) => void;
    private onStateChangeCallback?: (state: PeerState) => void;
    private onICECandidateCallback?: (candidate: RTCIceCandidate) => void;

    // Buffer
    private sendQueue: string[] = [];
    private maxQueueSize = 1000;

    constructor(config: PeerConfig = {}) {
        this.onMessageCallback = config.onMessage;
        this.onStateChangeCallback = config.onStateChange;
        this.onICECandidateCallback = config.onICECandidate;

        const iceServers = config.iceServers ?? [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ];

        this.peerConnection = new RTCPeerConnection({ iceServers });

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.onICECandidateCallback?.(event.candidate);
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const pcState = this.peerConnection?.connectionState;
            switch (pcState) {
                case 'connected':
                    this.setState(PeerState.CONNECTED);
                    this.startPing();
                    break;
                case 'disconnected':
                case 'failed':
                    this.setState(PeerState.FAILED);
                    this.stopPing();
                    break;
                case 'closed':
                    this.setState(PeerState.CLOSED);
                    this.stopPing();
                    break;
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };
    }

    // ============================================================
    // Connection Setup (Host side)
    // ============================================================

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) throw new Error('No peer connection');

        // Create data channel (host creates it)
        this.dataChannel = this.peerConnection.createDataChannel('game', {
            ordered: false,        // Unordered for low latency
            maxRetransmits: 0,     // No retransmits for real-time
        });
        this.setupDataChannel();

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.setState(PeerState.CONNECTING);
        return offer;
    }

    // ============================================================
    // Connection Setup (Join side)
    // ============================================================

    async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) throw new Error('No peer connection');

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.setState(PeerState.CONNECTING);
        return answer;
    }

    async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) throw new Error('No peer connection');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async addICECandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) throw new Error('No peer connection');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    // ============================================================
    // Data Channel Setup
    // ============================================================

    private setupDataChannel(): void {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            log.info(`DataChannel open with ${this.userName || this.peerID}`);
            this.flushSendQueue();
        };

        this.dataChannel.onclose = () => {
            log.info(`DataChannel closed with ${this.userName || this.peerID}`);
            this.setState(PeerState.CLOSED);
        };

        this.dataChannel.onmessage = (event) => {
            this.messagesReceived++;
            this.bytesReceived += (event.data as string).length;

            // Check for ping/pong
            const data = event.data as string;
            if (data === '__PING__') {
                this.send('__PONG__');
                return;
            }
            if (data === '__PONG__') {
                this.latency = Date.now() - this.lastPingTime;
                return;
            }

            this.onMessageCallback?.(data);
        };
    }

    // ============================================================
    // Sending
    // ============================================================

    send(message: string): boolean {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            // Queue for later
            if (this.sendQueue.length < this.maxQueueSize) {
                this.sendQueue.push(message);
            }
            return false;
        }

        try {
            this.dataChannel.send(message);
            this.messagesSent++;
            this.bytesSent += message.length;
            return true;
        } catch (err) {
            log.error(`Failed to send message to ${this.peerID}`, err);
            return false;
        }
    }

    private flushSendQueue(): void {
        while (this.sendQueue.length > 0) {
            const msg = this.sendQueue.shift()!;
            if (!this.send(msg)) {
                this.sendQueue.unshift(msg);
                break;
            }
        }
    }

    // ============================================================
    // Ping/Latency
    // ============================================================

    private startPing(): void {
        this.pingInterval = setInterval(() => {
            this.lastPingTime = Date.now();
            this.send('__PING__');
        }, 1000);
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // ============================================================
    // State
    // ============================================================

    private setState(state: PeerState): void {
        this.state = state;
        this.onStateChangeCallback?.(state);
    }

    getState(): PeerState { return this.state; }
    isConnected(): boolean { return this.state === PeerState.CONNECTED; }
    getLatency(): number { return this.latency; }

    // ============================================================
    // Stats
    // ============================================================

    getMessagesSent(): number { return this.messagesSent; }
    getMessagesReceived(): number { return this.messagesReceived; }
    getBytesSent(): number { return this.bytesSent; }
    getBytesReceived(): number { return this.bytesReceived; }
    getQueueSize(): number { return this.sendQueue.length; }

    // ============================================================
    // Cleanup
    // ============================================================

    close(): void {
        this.stopPing();
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.setState(PeerState.CLOSED);
        this.sendQueue = [];
    }

    destroy(): void {
        this.close();
        this.onMessageCallback = undefined;
        this.onStateChangeCallback = undefined;
        this.onICECandidateCallback = undefined;
    }
}
