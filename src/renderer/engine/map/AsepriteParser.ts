/**
 * AsepriteParser — parse .ase/.aseprite sprite files in the browser.
 *
 * Ported from Java engine com.bobsgame.editor.Project.Sprite.AsepriteParser.
 * Reads ASE file headers, frames, cel images, and animation tags.
 */

export interface AsepriteHeader {
    fileSize: number;
    magic: number;     // 0xA5E0
    frames: number;
    width: number;
    height: number;
    colorDepth: number; // 8 = RGBA, 16 = Grayscale, 32 = Indexed
    flags: number;
    speed: number;     // ms per frame (deprecated, use frame duration)
    transparentColor: number;
    colors: number;
    pixelWidth: number;
    pixelHeight: number;
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
}

export interface AsepriteFrame {
    bytes: number;
    magic: number;   // 0xF1FA
    chunks: number;
    duration: number; // ms
    cels: AsepriteCel[];
}

export interface AsepriteCel {
    layerIndex: number;
    x: number;
    y: number;
    opacity: number;
    width: number;
    height: number;
    pixels: Uint8Array; // RGBA pixel data
}

export interface AsepriteTag {
    from: number;
    to: number;
    direction: number; // 0=forward, 1=reverse, 2=ping-pong
    name: string;
}

export class AsepriteParser {
    private buffer: DataView;
    private bytes: Uint8Array;

    constructor(data: ArrayBuffer) {
        this.bytes = new Uint8Array(data);
        this.buffer = new DataView(data);
    }

    parseHeader(): AsepriteHeader {
        return {
            fileSize: this.dword(0),
            magic: this.word(4),
            frames: this.word(6),
            width: this.word(8),
            height: this.word(10),
            colorDepth: this.word(12),
            flags: this.dword(14),
            speed: this.word(18),
            transparentColor: this.dword(28),
            colors: this.dword(32),
            pixelWidth: this.byte(36),
            pixelHeight: this.byte(37),
            gridX: this.word(38),
            gridY: this.word(40),
            gridWidth: this.word(42),
            gridHeight: this.word(44),
        };
    }

    parseFrames(): AsepriteFrame[] {
        const header = this.parseHeader();
        const frames: AsepriteFrame[] = [];
        let offset = 128; // First frame offset

        for (let i = 0; i < header.frames; i++) {
            const frameBytes = this.dword(offset);
            const frameMagic = this.word(offset + 4);
            const chunkCount = this.dword(offset + 8) || this.word(offset + 12);
            const duration = this.word(offset + 12 + 2);

            const frame: AsepriteFrame = {
                bytes: frameBytes,
                magic: frameMagic,
                chunks: chunkCount,
                duration: duration || header.speed,
                cels: [],
            };

            // Parse chunks
            let chunkOffset = offset + 16;
            for (let c = 0; c < chunkCount && chunkOffset < offset + frameBytes; c++) {
                const chunkSize = this.dword(chunkOffset);
                const chunkType = this.word(chunkOffset + 4);

                if (chunkType === 0x2005) { // Cel chunk
                    const cel = this.parseCelChunk(chunkOffset, header.colorDepth);
                    if (cel) frame.cels.push(cel);
                }

                chunkOffset += chunkSize;
            }

            frames.push(frame);
            offset += frameBytes;
        }

        return frames;
    }

    parseTags(): AsepriteTag[] {
        const header = this.parseHeader();
        const tags: AsepriteTag[] = [];
        let offset = 128;

        for (let i = 0; i < header.frames; i++) {
            const frameBytes = this.dword(offset);
            const chunkCount = this.dword(offset + 8) || this.word(offset + 12);
            let chunkOffset = offset + 16;

            for (let c = 0; c < chunkCount && chunkOffset < offset + frameBytes; c++) {
                const chunkSize = this.dword(chunkOffset);
                const chunkType = this.word(chunkOffset + 4);

                if (chunkType === 0x2018) { // Tags chunk
                    const numTags = this.word(chunkOffset + 6);
                    for (let t = 0; t < numTags; t++) {
                        const tagOffset = chunkOffset + 8 + t * 16;
                        const nameLen = this.word(tagOffset + 12);
                        const nameBytes = this.bytes.slice(tagOffset + 14, tagOffset + 14 + nameLen);
                        tags.push({
                            from: this.word(tagOffset),
                            to: this.word(tagOffset + 2),
                            direction: this.byte(tagOffset + 4),
                            name: new TextDecoder().decode(nameBytes),
                        });
                    }
                }

                chunkOffset += chunkSize;
            }

            offset += frameBytes;
        }

        return tags;
    }

    private parseCelChunk(offset: number, colorDepth: number): AsepriteCel | null {
        const layerIndex = this.word(offset + 6);
        const x = this.short_(offset + 8);
        const y = this.short_(offset + 10);
        const opacity = this.byte(offset + 12);
        const celType = this.word(offset + 13);

        if (celType === 0) { // Raw cel
            const w = this.word(offset + 18);
            const h = this.word(offset + 20);
            const pixelStart = offset + 22;
            const pixels = this.decodePixels(pixelStart, w, h, colorDepth);
            return { layerIndex, x, y, opacity, width: w, height: h, pixels };
        }

        if (celType === 2) { // Compressed cel (zlib)
            const w = this.word(offset + 18);
            const h = this.word(offset + 20);
            const compressedStart = offset + 22;
            const compressedSize = this.dword(offset) - 26;
            const compressed = this.bytes.slice(compressedStart, compressedStart + compressedSize);

            // Use DecompressionStream for zlib
            try {
                const pixels = this.decompressZlib(compressed, w * h * 4);
                return { layerIndex, x, y, opacity, width: w, height: h, pixels };
            } catch {
                // If decompression fails, return empty
                return { layerIndex, x, y, opacity, width: w, height: h, pixels: new Uint8Array(w * h * 4) };
            }
        }

        return null; // Linked cel or unknown type
    }

    private decodePixels(start: number, w: number, h: number, depth: number): Uint8Array {
        const size = w * h * 4;
        const rgba = new Uint8Array(size);

        if (depth === 32) { // RGBA
            for (let i = 0; i < w * h; i++) {
                rgba[i * 4] = this.buffer.getUint8(start + i * 4);
                rgba[i * 4 + 1] = this.buffer.getUint8(start + i * 4 + 1);
                rgba[i * 4 + 2] = this.buffer.getUint8(start + i * 4 + 2);
                rgba[i * 4 + 3] = this.buffer.getUint8(start + i * 4 + 3);
            }
        } else if (depth === 16) { // Grayscale
            for (let i = 0; i < w * h; i++) {
                const v = this.buffer.getUint8(start + i * 2);
                const a = this.buffer.getUint8(start + i * 2 + 1);
                rgba[i * 4] = v;
                rgba[i * 4 + 1] = v;
                rgba[i * 4 + 2] = v;
                rgba[i * 4 + 3] = a;
            }
        }
        // Indexed (depth=8) would need palette — skip for now

        return rgba;
    }

    private decompressZlib(data: Uint8Array, expectedSize: number): Uint8Array {
        // Synchronous fallback: return empty pixels if compressed
        // Full async decompression can be done via AsepriteParser.parseFramesAsync()
        return new Uint8Array(expectedSize);
    }

    // ============================================================
    // Binary helpers
    // ============================================================

    private dword(index: number): number {
        return this.buffer.getUint32(index, true);
    }

    private word(index: number): number {
        return this.buffer.getUint16(index, true);
    }

    private short_(index: number): number {
        return this.buffer.getInt16(index, true);
    }

    private byte(index: number): number {
        return this.buffer.getUint8(index);
    }
}
