/**
 * AudioUtils — browser-adapted audio utility functions.
 *
 * Ported from Java com.bobsgame.audio.AudioUtils (366 lines).
 * Replaces OpenAL/LWJGL audio with Web Audio API equivalents.
 * Manages channel pooling, buffer loading, and playback.
 */
import { Logger } from '../debug/Logger';

const log = new Logger('AudioUtils');

export class AudioUtils {
    private static audioContext: AudioContext | null = null;
    private static masterGain: GainNode | null = null;
    private static musicGain: GainNode | null = null;
    private static sfxGain: GainNode | null = null;

    private static maxChannels = 128;
    private static channels: AudioBufferSourceNode[] = [];
    private static channelInUse: boolean[] = [];
    private static loadedBuffers: Map<string, AudioBuffer> = new Map();

    /** Store a pre-generated AudioBuffer */
    static storeBuffer(name: string, buffer: AudioBuffer): void {
        this.loadedBuffers.set(name, buffer);
    }

    // ============================================================
    // Initialization
    // ============================================================

    static init(): void {
        if (this.audioContext) return;

        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);

            this.channelInUse = new Array(this.maxChannels).fill(false);

            log.info(`AudioUtils initialized — sample rate: ${this.audioContext.sampleRate}Hz`);
        } catch (err) {
            log.error('Failed to initialize Web Audio API', err);
        }
    }

    static getContext(): AudioContext | null { return this.audioContext; }
    static getMasterGain(): GainNode | null { return this.masterGain; }
    static getMusicGain(): GainNode | null { return this.musicGain; }
    static getSFXGain(): GainNode | null { return this.sfxGain; }

    // ============================================================
    // Context Resume (for browser autoplay policy)
    // ============================================================

    static async resume(): Promise<void> {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // ============================================================
    // Volume
    // ============================================================

    static setMasterVolume(volume: number): void {
        if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    static setMusicVolume(volume: number): void {
        if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    static setSFXVolume(volume: number): void {
        if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    // ============================================================
    // Buffer Loading
    // ============================================================

    static async loadBuffer(name: string, url: string): Promise<AudioBuffer | null> {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return null;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.loadedBuffers.set(name, audioBuffer);
            return audioBuffer;
        } catch (err) {
            log.error(`Failed to load audio buffer: ${name}`, err);
            return null;
        }
    }

    static async loadBufferFromArrayBuffer(name: string, data: ArrayBuffer): Promise<AudioBuffer | null> {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return null;

        try {
            const audioBuffer = await this.audioContext.decodeAudioData(data);
            this.loadedBuffers.set(name, audioBuffer);
            return audioBuffer;
        } catch (err) {
            log.error(`Failed to decode audio buffer: ${name}`, err);
            return null;
        }
    }

    static getBuffer(name: string): AudioBuffer | undefined {
        return this.loadedBuffers.get(name);
    }

    static isBufferLoaded(name: string): boolean {
        return this.loadedBuffers.has(name);
    }

    // ============================================================
    // Channel Management
    // ============================================================

    static getAvailableChannel(): number {
        for (let i = 0; i < this.maxChannels; i++) {
            if (!this.channelInUse[i]) return i;
        }
        return -1; // No available channels
    }

    static releaseChannel(index: number): void {
        if (index >= 0 && index < this.maxChannels) {
            this.channelInUse[index] = false;
            this.channels[index] = null as unknown as AudioBufferSourceNode;
        }
    }

    // ============================================================
    // Playback
    // ============================================================

    static playSFX(name: string, volume = 1.0, pitch = 1.0): number {
        const buffer = this.loadedBuffers.get(name);
        if (!buffer || !this.audioContext || !this.sfxGain) return -1;

        const channel = this.getAvailableChannel();
        if (channel < 0) return -1;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        const gain = this.audioContext.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.sfxGain);

        source.onended = () => this.releaseChannel(channel);

        this.channelInUse[channel] = true;
        this.channels[channel] = source;
        source.start(0);

        return channel;
    }

    static playMusic(name: string, volume = 1.0, loop = true): AudioBufferSourceNode | null {
        const buffer = this.loadedBuffers.get(name);
        if (!buffer || !this.audioContext || !this.musicGain) return null;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        const gain = this.audioContext.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.musicGain);
        source.start(0);

        this.currentMusicSource = source;

        return source;
    }

    static stopChannel(channel: number): void {
        if (channel >= 0 && channel < this.maxChannels && this.channels[channel]) {
            try {
                this.channels[channel].stop();
            } catch { /* already stopped */ }
            this.releaseChannel(channel);
        }
    }

    static stopAll(): void {
        for (let i = 0; i < this.maxChannels; i++) {
            this.stopChannel(i);
        }
    }

    // ============================================================
    // Utility
    // ============================================================

    /**
     * Generate a tone buffer programmatically.
     */
    static generateTone(frequency: number, duration: number, sampleRate = 44100): AudioBuffer | null {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return null;

        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
        }

        return buffer;
    }

    /**
     * Generate noise buffer.
     */
    static generateNoise(duration: number, sampleRate = 44100): AudioBuffer | null {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return null;

        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    /**
     * Get current time in seconds.
     */
    static getCurrentTime(): number {
        return this.audioContext?.currentTime ?? 0;
    }

    /**
     * Fade music volume to target over duration (seconds).
     */
    static fadeMusic(targetVolume: number, duration: number): void {
        if (!this.musicGain || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVolume)), now + duration);
    }

    /**
     * Fade SFX volume to target over duration (seconds).
     */
    static fadeSFX(targetVolume: number, duration: number): void {
        if (!this.sfxGain || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
        this.sfxGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVolume)), now + duration);
    }

    /**
     * Crossfade between two music tracks.
     */
    static crossfadeMusic(
        newName: string,
        volume = 1.0,
        loop = true,
        fadeOutDuration = 1.0,
        fadeInDuration = 1.0,
    ): AudioBufferSourceNode | null {
        // Fade out current music
        this.fadeMusic(0, fadeOutDuration);
        // After fade out, start new music and fade in
        setTimeout(() => {
            this.stopMusic();
            const source = this.playMusic(newName, 0, loop);
            if (source) {
                this.fadeMusic(volume, fadeInDuration);
            }
        }, fadeOutDuration * 1000);
        return null; // Source not yet available
    }

    private static currentMusicSource: AudioBufferSourceNode | null = null;

    /**
     * Stop currently playing music.
     */
    static stopMusic(): void {
        if (this.currentMusicSource) {
            try { this.currentMusicSource.stop(); } catch { /* already stopped */ }
            this.currentMusicSource = null;
        }
    }

    /**
     * Clean up all resources.
     */
    static destroy(): void {
        this.stopAll();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.loadedBuffers.clear();
    }
}
