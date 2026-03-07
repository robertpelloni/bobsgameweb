import { EventEmitter } from 'eventemitter3';
import { Assets, Texture as PIXITexture, Spritesheet } from 'pixi.js';
import { Howl } from 'howler';

export interface AssetLoaderEvents {
  'progress': (loaded: number, total: number, percent: number) => void;
  'load': (key: string, asset: unknown) => void;
  'error': (key: string, error: Error) => void;
  'complete': () => void;
}

export interface AssetManifest {
  textures?: Record<string, string>;
  spritesheets?: Record<string, string>;
  audio?: Record<string, string | string[]>;
  json?: Record<string, string>;
  fonts?: Record<string, string>;
}

interface QueuedAsset {
  key: string;
  type: 'texture' | 'spritesheet' | 'audio' | 'json' | 'font';
  src: string | string[];
}

class AssetLoaderClass extends EventEmitter<AssetLoaderEvents> {
  private queue: QueuedAsset[] = [];
  private loaded: Map<string, unknown> = new Map();
  private _loading: boolean = false;
  private _progress: number = 0;

  addTexture(key: string, src: string): this {
    this.queue.push({ key, type: 'texture', src });
    return this;
  }

  addSpritesheet(key: string, src: string): this {
    this.queue.push({ key, type: 'spritesheet', src });
    return this;
  }

  addAudio(key: string, src: string | string[]): this {
    this.queue.push({ key, type: 'audio', src });
    return this;
  }

  addJson(key: string, src: string): this {
    this.queue.push({ key, type: 'json', src });
    return this;
  }

  addFont(key: string, src: string): this {
    this.queue.push({ key, type: 'font', src });
    return this;
  }

  addManifest(manifest: AssetManifest): this {
    if (manifest.textures) {
      for (const [key, src] of Object.entries(manifest.textures)) {
        this.addTexture(key, src);
      }
    }
    if (manifest.spritesheets) {
      for (const [key, src] of Object.entries(manifest.spritesheets)) {
        this.addSpritesheet(key, src);
      }
    }
    if (manifest.audio) {
      for (const [key, src] of Object.entries(manifest.audio)) {
        this.addAudio(key, src);
      }
    }
    if (manifest.json) {
      for (const [key, src] of Object.entries(manifest.json)) {
        this.addJson(key, src);
      }
    }
    if (manifest.fonts) {
      for (const [key, src] of Object.entries(manifest.fonts)) {
        this.addFont(key, src);
      }
    }
    return this;
  }

  async load(): Promise<void> {
    if (this._loading) return;
    this._loading = true;
    this._progress = 0;

    const total = this.queue.length;
    let loadedCount = 0;

    const items = [...this.queue];
    this.queue = [];

    for (const item of items) {
      try {
        const asset = await this.loadAsset(item);
        this.loaded.set(item.key, asset);
        loadedCount++;
        this._progress = loadedCount / total;
        this.emit('progress', loadedCount, total, this._progress);
        this.emit('load', item.key, asset);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.emit('error', item.key, error);
        loadedCount++;
        this._progress = loadedCount / total;
        this.emit('progress', loadedCount, total, this._progress);
      }
    }

    this._loading = false;
    this.emit('complete');
  }

  private async loadAsset(item: QueuedAsset): Promise<unknown> {
    switch (item.type) {
      case 'texture':
        return Assets.load<PIXITexture>(item.src as string);

      case 'spritesheet':
        return Assets.load<Spritesheet>(item.src as string);

      case 'audio':
        return new Promise<Howl>((resolve, reject) => {
          const howl = new Howl({
            src: Array.isArray(item.src) ? item.src : [item.src],
            onload: () => resolve(howl),
            onloaderror: (_id, error) => reject(new Error(String(error))),
          });
        });

      case 'json':
        return Assets.load(item.src as string);

      case 'font':
        return Assets.load(item.src as string);

      default:
        throw new Error(`Unknown asset type: ${item.type}`);
    }
  }

  get<T>(key: string): T | undefined {
    return this.loaded.get(key) as T | undefined;
  }

  getTexture(key: string): PIXITexture | undefined {
    return this.get<PIXITexture>(key);
  }

  getSpritesheet(key: string): Spritesheet | undefined {
    return this.get<Spritesheet>(key);
  }

  getAudio(key: string): Howl | undefined {
    return this.get<Howl>(key);
  }

  getJson<T = unknown>(key: string): T | undefined {
    return this.get<T>(key);
  }

  has(key: string): boolean {
    return this.loaded.has(key);
  }

  unload(key: string): void {
    const asset = this.loaded.get(key);
    if (!asset) return;

    if (asset instanceof PIXITexture) {
      asset.destroy();
    } else if (asset instanceof Howl) {
      asset.unload();
    }

    this.loaded.delete(key);
  }

  clear(): void {
    for (const key of this.loaded.keys()) {
      this.unload(key);
    }
    this.queue = [];
  }

  get loading(): boolean {
    return this._loading;
  }

  get progress(): number {
    return this._progress;
  }

  get queueSize(): number {
    return this.queue.length;
  }

  get loadedCount(): number {
    return this.loaded.size;
  }
}

export const AssetLoader = new AssetLoaderClass();
