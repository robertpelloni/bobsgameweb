/**
 * OggDecoder — decode Ogg Vorbis audio files using Web Audio API.
 *
 * Ported from Java com.bobsgame.audio.OggDecoder.
 * Browser-native decoding via AudioContext.decodeAudioData.
 */
export interface DecodedAudio {
    data: Float32Array;
    sampleRate: number;
    channels: number;
    duration: number;
    numberOfSamples: number;
}

export class OggDecoder {
    /**
     * Decode an Ogg Vorbis file from ArrayBuffer.
     */
    static async decode(arrayBuffer: ArrayBuffer): Promise<DecodedAudio | null> {
        try {
            const ctx = new AudioContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);

            const result: DecodedAudio = {
                data: channelData,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels,
                duration: audioBuffer.duration,
                numberOfSamples: audioBuffer.length,
            };

            ctx.close();
            return result;
        } catch (err) {
            console.error('[OggDecoder] Decode failed:', err);
            return null;
        }
    }

    /**
     * Decode and get all channels.
     */
    static async decodeAllChannels(arrayBuffer: ArrayBuffer): Promise<Float32Array[] | null> {
        try {
            const ctx = new AudioContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const channels: Float32Array[] = [];
            for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                channels.push(audioBuffer.getChannelData(i));
            }
            ctx.close();
            return channels;
        } catch (err) {
            console.error('[OggDecoder] Decode failed:', err);
            return null;
        }
    }

    /**
     * Load and decode an Ogg file from URL.
     */
    static async fromURL(url: string): Promise<DecodedAudio | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const buffer = await response.arrayBuffer();
            return OggDecoder.decode(buffer);
        } catch (err) {
            console.error('[OggDecoder] Load failed:', err);
            return null;
        }
    }

    /**
     * Convert decoded audio to a WAV ArrayBuffer for playback.
     */
    static toWav(audio: DecodedAudio): ArrayBuffer {
        const numChannels = audio.channels;
        const sampleRate = audio.sampleRate;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const dataSize = audio.numberOfSamples * blockAlign;
        const bufferSize = 44 + dataSize;

        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);

        // RIFF header
        const writeStr = (off: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        writeStr(8, 'WAVE');

        // fmt chunk
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // data chunk
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < audio.numberOfSamples; i++) {
            const s = Math.max(-1, Math.min(1, audio.data[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += bytesPerSample;
            if (numChannels === 2 && i + 1 < audio.numberOfSamples) {
                // Duplicate mono to stereo if needed
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                offset += bytesPerSample;
            }
        }

        return buffer;
    }
}
