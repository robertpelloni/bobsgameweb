export class ImageUtils {
    public static async loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    }

    public static async getImageData(url: string, width?: number, height?: number): Promise<ImageData> {
        const img = await this.loadImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = width || img.width;
        canvas.height = height || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    public static imageDataToRGBArray(data: ImageData): number[][] {
        const pixels: number[][] = [];
        for (let y = 0; y < data.height; y++) {
            const row: number[] = [];
            for (let x = 0; x < data.width; x++) {
                const idx = (y * data.width + x) * 4;
                const r = data.data[idx];
                const g = data.data[idx + 1];
                const b = data.data[idx + 2];
                // Ignore alpha for now or handle it? SpriteEditor uses 0 for transparent.
                const color = (r << 16) | (g << 8) | b;
                row.push(color);
            }
            pixels.push(row);
        }
        return pixels;
    }
}
