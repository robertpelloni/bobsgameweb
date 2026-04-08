/**
 * WaveData — WAV file parser for browser-based audio decoding.
 *
 * Ported from Java engine com.bobsgame.audio.WaveData.
 * Uses Web Audio API for decoding.
 */

export interface DecodedWaveData {
    data: Float32Array;
    sampleRate: number;
    channels: number;
    duration: number;
}

export class WaveData {
    /**
     * Decode a WAV file from an ArrayBuffer using Web Audio API.
     */
    static async decode(arrayBuffer: ArrayBuffer): Promise<DecodedWaveData | null> {
        try {
            const ctx = new AudioContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);

            const result: DecodedWaveData = {
                data: channelData,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels,
                duration: audioBuffer.duration,
            };

            ctx.close();
            return result;
        } catch (err) {
            console.error('[WaveData] Decode failed:', err);
            return null;
        }
    }

    /**
     * Create a WAV file ArrayBuffer from raw PCM float samples.
     */
    static encode(samples: Float32Array, sampleRate: number, channels = 1): ArrayBuffer {
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = channels * bytesPerSample;
        const dataSize = samples.length * bytesPerSample;
        const bufferSize = 44 + dataSize;

        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);

        // RIFF header
        WaveData.writeString(view, 0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        WaveData.writeString(view, 8, 'WAVE');

        // fmt chunk
        WaveData.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // chunk size
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // data chunk
        WaveData.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // PCM samples
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    }

    /**
     * Generate a tone as a WAV ArrayBuffer.
     */
    static generateTone(
        frequency: number,
        durationMs: number,
        sampleRate = 44100,
        volume = 0.5,
        type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
    ): ArrayBuffer {
        const numSamples = Math.floor(sampleRate * durationMs / 1000);
        const samples = new Float32Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample = 0;

            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
                    break;
                case 'sawtooth':
                    sample = 2 * (frequency * t - Math.floor(frequency * t + 0.5));
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (frequency * t - Math.floor(frequency * t + 0.5))) - 1;
                    break;
            }

            // Apply volume envelope
            const attackTime = 0.01;
            const releaseTime = 0.05;
            const envelope = t < attackTime ? t / attackTime
                : t > durationMs / 1000 - releaseTime ? (durationMs / 1000 - t) / releaseTime
                    : 1;

            samples[i] = sample * volume * envelope;
        }

        return WaveData.encode(samples, sampleRate);
    }

    /**
     * Generate a melody from frequency/duration pairs.
     */
    static generateMelody(
        notes: { freq: number; durationMs: number }[],
        sampleRate = 44100,
        volume = 0.4,
    ): ArrayBuffer {
        const allSamples: number[] = [];

        for (const note of notes) {
            const numSamples = Math.floor(sampleRate * note.durationMs / 1000);
            for (let i = 0; i < numSamples; i++) {
                const t = i / sampleRate;
                const envelope = Math.min(1, Math.min(t / 0.01, (note.durationMs / 1000 - t) / 0.05));
                allSamples.push(Math.sin(2 * Math.PI * note.freq * t) * volume * envelope);
            }
        }

        return WaveData.encode(new Float32Array(allSamples), sampleRate);
    }

    private static writeString(view: DataView, offset: number, str: string): void {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
}
