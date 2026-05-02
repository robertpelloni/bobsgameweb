/**
 * Cache — browser-based asset caching using IndexedDB.
 *
 * Ported from Java com.bobsgame.client.Cache.
 * Web adaptation stores game assets (sprites, maps, audio) in IndexedDB
 * for offline access and fast loading.
 */

export interface CacheEntry {
    key: string;
    data: ArrayBuffer | string;
    timestamp: number;
    version: string;
    type: string;
}

export class Cache {
    private dbName = 'bobsgame-cache';
    private storeName = 'assets';
    private db: IDBDatabase | null = null;
    private version = '3.0.2';
    private ready = false;

    // Stats
    private hitCount = 0;
    private missCount = 0;

    constructor() {}

    // ============================================================
    // Init
    // ============================================================

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.ready = true;
                resolve();
            };

            request.onerror = () => {
                console.error('[Cache] Failed to open IndexedDB');
                reject(request.error);
            };
        });
    }

    // ============================================================
    // CRUD
    // ============================================================

    async put(key: string, data: ArrayBuffer | string, type = 'binary'): Promise<void> {
        if (!this.db) return;
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const entry: CacheEntry = { key, data, timestamp: Date.now(), version: this.version, type };
        store.put(entry);
    }

    async get(key: string): Promise<CacheEntry | null> {
        if (!this.db) return null;
        return new Promise((resolve) => {
            const tx = this.db!.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(key);
            request.onsuccess = () => {
                if (request.result) {
                    this.hitCount++;
                    resolve(request.result);
                } else {
                    this.missCount++;
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }

    async has(key: string): Promise<boolean> {
        const entry = await this.get(key);
        return entry !== null;
    }

    async delete(key: string): Promise<void> {
        if (!this.db) return;
        const tx = this.db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(key);
    }

    async clear(): Promise<void> {
        if (!this.db) return;
        const tx = this.db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
    }

    // ============================================================
    // Fetch with Cache
    // ============================================================

    async fetchWithCache(url: string, type: 'arraybuffer' | 'text' = 'arraybuffer'): Promise<ArrayBuffer | string | null> {
        // Check cache first
        const cached = await this.get(url);
        if (cached && cached.version === this.version) {
            return cached.data;
        }

        // Fetch from network
        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            let data: ArrayBuffer | string;
            if (type === 'text') {
                data = await response.text();
            } else {
                data = await response.arrayBuffer();
            }

            // Store in cache
            await this.put(url, data, type);
            return data;
        } catch {
            return null;
        }
    }

    // ============================================================
    // Version Management
    // ============================================================

    async invalidateOldVersions(): Promise<number> {
        if (!this.db) return 0;
        return new Promise((resolve) => {
            const tx = this.db!.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            let deleted = 0;

            request.onsuccess = () => {
                const entries = request.result as CacheEntry[];
                for (const entry of entries) {
                    if (entry.version !== this.version) {
                        store.delete(entry.key);
                        deleted++;
                    }
                }
                resolve(deleted);
            };
        });
    }

    // ============================================================
    // Stats
    // ============================================================

    getStats(): { hits: number; misses: number; hitRate: number } {
        const total = this.hitCount + this.missCount;
        return {
            hits: this.hitCount,
            misses: this.missCount,
            hitRate: total > 0 ? this.hitCount / total : 0,
        };
    }

    isReady(): boolean { return this.ready; }
    getVersion(): string { return this.version; }
}
