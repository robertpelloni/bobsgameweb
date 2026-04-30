import { Assets, Texture as PIXITexture } from 'pixi.js';
import { Texture } from './Texture';

class TextureCacheManager {
  private cache: Map<string, Texture> = new Map();
  private loading: Map<string, Promise<Texture>> = new Map();

  async load(path: string): Promise<Texture> {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const pending = this.loading.get(path);
    if (pending) return pending;

    const promise = this.loadTexture(path);
    this.loading.set(path, promise);

    try {
      const texture = await promise;
      this.cache.set(path, texture);
      return texture;
    } finally {
      this.loading.delete(path);
    }
  }

  private async loadTexture(path: string): Promise<Texture> {
    const pixiTexture = await Assets.load<PIXITexture>(path);
    return new Texture(pixiTexture);
  }

  get(path: string): Texture | undefined {
    return this.cache.get(path);
  }

  has(path: string): boolean {
    return this.cache.has(path);
  }

  set(path: string, texture: Texture): void {
    this.cache.set(path, texture);
  }

  unload(path: string): void {
    const texture = this.cache.get(path);
    if (texture) {
      texture.destroy();
      this.cache.delete(path);
      Assets.unload(path);
    }
  }

  clear(): void {
    for (const [path] of this.cache) {
      this.unload(path);
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

export const TextureCache = new TextureCacheManager();
