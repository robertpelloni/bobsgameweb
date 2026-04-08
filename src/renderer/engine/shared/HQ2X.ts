/**
 * HQ2X — high-quality 2x upscaling algorithm for pixel art.
 *
 * Ported from Java com.bobsgame.client.HQ2X.
 * Detects pixel edges and interpolates to produce smooth 2x output.
 */

/**
 * Simple 2x upscale with nearest-neighbor interpolation.
 * For full HQ2X, each 1x pixel becomes a 2x2 block.
 */
export class HQ2X {
    /**
     * Upscale an image buffer by 2x using nearest-neighbor (fast).
     */
    static upscaleNearest(
        src: Uint8ClampedArray,
        srcWidth: number,
        srcHeight: number,
    ): { data: Uint8ClampedArray; width: number; height: number } {
        const dstWidth = srcWidth * 2;
        const dstHeight = srcHeight * 2;
        const dst = new Uint8ClampedArray(dstWidth * dstHeight * 4);

        for (let y = 0; y < srcHeight; y++) {
            for (let x = 0; x < srcWidth; x++) {
                const si = (y * srcWidth + x) * 4;
                const r = src[si], g = src[si + 1], b = src[si + 2], a = src[si + 3];

                // Fill 2x2 block
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const di = ((y * 2 + dy) * dstWidth + (x * 2 + dx)) * 4;
                        dst[di] = r;
                        dst[di + 1] = g;
                        dst[di + 2] = b;
                        dst[di + 3] = a;
                    }
                }
            }
        }

        return { data: dst, width: dstWidth, height: dstHeight };
    }

    /**
     * Upscale using edge-aware interpolation (HQ2X-lite).
     * Detects horizontal/vertical edges and applies directional blending.
     */
    static upscaleHQ2XLite(
        src: Uint8ClampedArray,
        srcWidth: number,
        srcHeight: number,
    ): { data: Uint8ClampedArray; width: number; height: number } {
        const dstWidth = srcWidth * 2;
        const dstHeight = srcHeight * 2;
        const dst = new Uint8ClampedArray(dstWidth * dstHeight * 4);

        const getPixel = (x: number, y: number): [number, number, number, number] => {
            if (x < 0 || x >= srcWidth || y < 0 || y >= srcHeight) return [0, 0, 0, 0];
            const i = (y * srcWidth + x) * 4;
            return [src[i], src[i + 1], src[i + 2], src[i + 3]];
        };

        const colorDiff = (a: number[], b: number[]): number => {
            return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
        };

        const threshold = 48;

        for (let y = 0; y < srcHeight; y++) {
            for (let x = 0; x < srcWidth; x++) {
                const c = getPixel(x, y);
                const t = getPixel(x, y - 1);
                const b2 = getPixel(x, y + 1);
                const l = getPixel(x - 1, y);
                const r = getPixel(x + 1, y);

                const edgeH = colorDiff(t, b2) > threshold;
                const edgeV = colorDiff(l, r) > threshold;

                // Calculate 4 output pixels for this 2x2 block
                const setPixel = (dx: number, dy: number, pr: number, pg: number, pb: number, pa: number) => {
                    const di = ((y * 2 + dy) * dstWidth + (x * 2 + dx)) * 4;
                    dst[di] = pr;
                    dst[di + 1] = pg;
                    dst[di + 2] = pb;
                    dst[di + 3] = pa;
                };

                if (!edgeH && !edgeV) {
                    // Smooth area — interpolate with neighbors
                    const blend = (a: number, b: number) => Math.round((a * 3 + b) / 4);
                    setPixel(0, 0, blend(c[0], l[0]), blend(c[1], l[1]), blend(c[2], l[2]), c[3]);
                    setPixel(1, 0, blend(c[0], r[0]), blend(c[1], r[1]), blend(c[2], r[2]), c[3]);
                    setPixel(0, 1, blend(c[0], t[0]), blend(c[1], t[1]), blend(c[2], t[2]), c[3]);
                    setPixel(1, 1, blend(c[0], b2[0]), blend(c[1], b2[1]), blend(c[2], b2[2]), c[3]);
                } else if (edgeV && !edgeH) {
                    // Vertical edge — blend top/bottom
                    const blendT = (a: number, b: number) => Math.round((a * 3 + b) / 4);
                    setPixel(0, 0, c[0], c[1], c[2], c[3]);
                    setPixel(1, 0, c[0], c[1], c[2], c[3]);
                    setPixel(0, 1, blendT(c[0], b2[0]), blendT(c[1], b2[1]), blendT(c[2], b2[2]), c[3]);
                    setPixel(1, 1, blendT(c[0], b2[0]), blendT(c[1], b2[1]), blendT(c[2], b2[2]), c[3]);
                } else if (edgeH && !edgeV) {
                    // Horizontal edge — blend left/right
                    const blendL = (a: number, b: number) => Math.round((a * 3 + b) / 4);
                    setPixel(0, 0, blendL(c[0], l[0]), blendL(c[1], l[1]), blendL(c[2], l[2]), c[3]);
                    setPixel(1, 0, blendL(c[0], r[0]), blendL(c[1], r[1]), blendL(c[2], r[2]), c[3]);
                    setPixel(0, 1, c[0], c[1], c[2], c[3]);
                    setPixel(1, 1, c[0], c[1], c[2], c[3]);
                } else {
                    // Both edges — diagonal, use center pixel
                    setPixel(0, 0, c[0], c[1], c[2], c[3]);
                    setPixel(1, 0, c[0], c[1], c[2], c[3]);
                    setPixel(0, 1, c[0], c[1], c[2], c[3]);
                    setPixel(1, 1, c[0], c[1], c[2], c[3]);
                }
            }
        }

        return { data: dst, width: dstWidth, height: dstHeight };
    }

    /**
     * Upscale an ImageData or canvas by 2x using HQ2X-lite.
     */
    static upscaleCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
        const ctx = canvas.getContext('2d')!;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = HQ2X.upscaleHQ2XLite(imageData.data, canvas.width, canvas.height);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = result.width;
        outCanvas.height = result.height;
        const outCtx = outCanvas.getContext('2d')!;
        const outData = new Uint8ClampedArray(result.data.length);
        outData.set(result.data);
        outCtx.putImageData(new ImageData(outData, result.width, result.height), 0, 0);
        return outCanvas;
    }
}
