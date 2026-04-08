/**
 * AudioManager — Web Audio API sound management for music and SFX.
 *
 * Ported from Java com.bobsgame.client.engine.sound.AudioManager.
 * Manages music tracks and sound effects with volume, fade, and pooling.
 */

export interface AudioTrack {
    name: string;
    source: string;
    volume: number;
    loop: boolean;
}

export class AudioChannel {
    private context: AudioContext | null = null;
    private gainNode: GainNode | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private buffer: AudioBuffer | null = null;
    private _playing = false;
    private _paused = false;
    private _volume = 1.0;
    private startTime = 0;
    private pauseOffset = 0;

    name = '';
    loop = false;

    constructor(name: string) {
        this.name = name;
    }

    async load(url: string): Promise<boolean> {
        try {
            if (!this.context) this.context = new AudioContext();
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.buffer = await this.context.decodeAudioData(arrayBuffer);
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination);
            this.gainNode.gain.value = this._volume;
            return true;
        } catch {
            console.warn(`[AudioChannel] Failed to load: ${url}`);
            return false;
        }
    }

    play(): void {
        if (!this.buffer || !this.context || !this.gainNode) return;

        this.stop();
        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.buffer = this.buffer;
        this.sourceNode.loop = this.loop;
        this.sourceNode.connect(this.gainNode);
        this.sourceNode.start(0, this.pauseOffset);
        this.startTime = this.context.currentTime - this.pauseOffset;
        this._playing = true;
        this._paused = false;

        this.sourceNode.onended = () => {
            this._playing = false;
            this.pauseOffset = 0;
        };
    }

    stop(): void {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch { /* already stopped */ }
            this.sourceNode = null;
        }
        this._playing = false;
        this._paused = false;
        this.pauseOffset = 0;
    }

    pause(): void {
        if (!this._playing || !this.context) return;
        this.pauseOffset = this.context.currentTime - this.startTime;
        this.stop();
        this._paused = true;
    }

    resume(): void {
        if (this._paused) this.play();
    }

    setVolume(v: number): void {
        this._volume = Math.max(0, Math.min(1, v));
        if (this.gainNode) this.gainNode.gain.value = this._volume;
    }

    fadeIn(durationMs: number): void {
        if (!this.gainNode || !this.context) return;
        this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(this._volume, this.context.currentTime + durationMs / 1000);
    }

    fadeOut(durationMs: number): void {
        if (!this.gainNode || !this.context) return;
        this.gainNode.gain.setValueAtTime(this._volume, this.context.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + durationMs / 1000);
        setTimeout(() => this.stop(), durationMs);
    }

    isPlaying(): boolean { return this._playing; }
    isPaused(): boolean { return this._paused; }
    getVolume(): number { return this._volume; }
}

export class AudioManager {
    private musicChannels: Map<string, AudioChannel> = new Map();
    private soundChannels: Map<string, AudioChannel> = new Map();
    private soundPool: AudioChannel[] = [];
    private maxSimultaneousSounds = 8;

    private masterVolume = 1.0;
    private musicVolume = 0.7;
    private sfxVolume = 1.0;

    // Track definitions
    private musicTracks: Map<string, AudioTrack> = new Map();
    private soundTracks: Map<string, AudioTrack> = new Map();

    constructor() {}

    // ============================================================
    // Registration
    // ============================================================

    registerMusic(track: AudioTrack): void {
        this.musicTracks.set(track.name, track);
    }

    registerSound(track: AudioTrack): void {
        this.soundTracks.set(track.name, track);
    }

    // ============================================================
    // Music
    // ============================================================

    async playMusic(name: string, fadeInMs = 0): Promise<void> {
        const track = this.musicTracks.get(name);
        if (!track) return;

        let channel = this.musicChannels.get(name);
        if (!channel) {
            channel = new AudioChannel(name);
            channel.loop = track.loop ?? true;
            await channel.load(track.source);
            this.musicChannels.set(name, channel);
        }

        channel.setVolume(this.musicVolume * this.masterVolume);
        channel.play();
        if (fadeInMs > 0) channel.fadeIn(fadeInMs);
    }

    stopMusic(name: string, fadeOutMs = 0): void {
        const channel = this.musicChannels.get(name);
        if (!channel) return;

        if (fadeOutMs > 0) {
            channel.fadeOut(fadeOutMs);
        } else {
            channel.stop();
        }
    }

    stopAllMusic(fadeOutMs = 0): void {
        for (const channel of this.musicChannels.values()) {
            if (fadeOutMs > 0) {
                channel.fadeOut(fadeOutMs);
            } else {
                channel.stop();
            }
        }
    }

    getMusicByName(name: string): AudioChannel | undefined {
        return this.musicChannels.get(name);
    }

    // ============================================================
    // Sound Effects
    // ============================================================

    async playSound(name: string, volume = 1.0): Promise<void> {
        const track = this.soundTracks.get(name);
        if (!track) return;

        // Find available channel or create new
        let channel = this.soundPool.find(c => !c.isPlaying());
        if (!channel) {
            if (this.soundPool.length >= this.maxSimultaneousSounds) {
                // Stop oldest
                channel = this.soundPool.shift()!;
                channel.stop();
            }
            channel = new AudioChannel(name);
            this.soundPool.push(channel);
        }

        channel.name = name;
        channel.loop = false;
        await channel.load(track.source);
        channel.setVolume(volume * this.sfxVolume * this.masterVolume);
        channel.play();
    }

    stopAllSounds(): void {
        for (const channel of this.soundPool) {
            channel.stop();
        }
    }

    getSoundByName(name: string): AudioChannel | undefined {
        return this.soundPool.find(c => c.name === name);
    }

    // ============================================================
    // Volume
    // ============================================================

    setMasterVolume(v: number): void {
        this.masterVolume = Math.max(0, Math.min(1, v));
    }

    setMusicVolume(v: number): void {
        this.musicVolume = Math.max(0, Math.min(1, v));
        for (const channel of this.musicChannels.values()) {
            channel.setVolume(this.musicVolume * this.masterVolume);
        }
    }

    setSFXVolume(v: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, v));
    }

    getMasterVolume(): number { return this.masterVolume; }
    getMusicVolume(): number { return this.musicVolume; }
    getSFXVolume(): number { return this.sfxVolume; }

    // ============================================================
    // Update
    // ============================================================

    update(): void {
        // Audio is managed by Web Audio API, no per-frame updates needed
    }

    destroy(): void {
        this.stopAllMusic();
        this.stopAllSounds();
        this.musicChannels.clear();
        this.soundPool = [];
    }
}
