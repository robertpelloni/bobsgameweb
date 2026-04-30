/**
 * ManifestLoader — load asset manifests from JSON for batch asset loading.
 *
 * Ported from okgame C++ Engine/shared/assets/ManifestLoader.h.
 * Reads manifest files listing all game assets with checksums and versions.
 */

export interface ManifestEntry {
    id: number;
    name: string;
    type: 'sprite' | 'map' | 'audio' | 'event' | 'font' | 'other';
    path: string;
    md5: string;
    version: number;
    size: number;
    preload: boolean;
}

export interface AssetManifest {
    version: string;
    entries: ManifestEntry[];
}

export class ManifestLoader {
    private manifests: Map<string, AssetManifest> = new Map();

    /**
     * Load a manifest from a URL.
     */
    async load(url: string): Promise<AssetManifest | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            const manifest = this.parseManifest(data);
            this.manifests.set(url, manifest);
            return manifest;
        } catch (err) {
            console.error(`[ManifestLoader] Failed to load: ${url}`, err);
            return null;
        }
    }

    /**
     * Parse manifest from raw JSON data.
     */
    parseManifest(data: Record<string, unknown>): AssetManifest {
        const version = (data.version as string) ?? '1.0';
        const rawEntries = (data.entries as Record<string, unknown>[]) ?? [];
        const entries: ManifestEntry[] = rawEntries.map(e => ({
            id: (e.id as number) ?? -1,
            name: (e.name as string) ?? '',
            type: (e.type as ManifestEntry['type']) ?? 'other',
            path: (e.path as string) ?? '',
            md5: (e.md5 as string) ?? '',
            version: (e.version as number) ?? 1,
            size: (e.size as number) ?? 0,
            preload: (e.preload as boolean) ?? false,
        }));

        return { version, entries };
    }

    /**
     * Get a loaded manifest.
     */
    getManifest(url: string): AssetManifest | undefined {
        return this.manifests.get(url);
    }

    /**
     * Get all entries of a specific type.
     */
    getEntriesByType(url: string, type: ManifestEntry['type']): ManifestEntry[] {
        const manifest = this.manifests.get(url);
        if (!manifest) return [];
        return manifest.entries.filter(e => e.type === type);
    }

    /**
     * Get entries that should be preloaded.
     */
    getPreloadEntries(url: string): ManifestEntry[] {
        const manifest = this.manifests.get(url);
        if (!manifest) return [];
        return manifest.entries.filter(e => e.preload);
    }

    /**
     * Look up an entry by name.
     */
    findEntry(url: string, name: string): ManifestEntry | undefined {
        const manifest = this.manifests.get(url);
        if (!manifest) return undefined;
        return manifest.entries.find(e => e.name === name);
    }

    /**
     * Get total size of all assets in a manifest.
     */
    getTotalSize(url: string): number {
        const manifest = this.manifests.get(url);
        if (!manifest) return 0;
        return manifest.entries.reduce((sum, e) => sum + e.size, 0);
    }

    /**
     * Verify manifest integrity (check all entries exist).
     */
    async verify(url: string): Promise<{ valid: boolean; missing: string[] }> {
        const manifest = this.manifests.get(url);
        if (!manifest) return { valid: false, missing: ['manifest'] };

        const missing: string[] = [];
        for (const entry of manifest.entries) {
            try {
                const response = await fetch(entry.path, { method: 'HEAD' });
                if (!response.ok) missing.push(entry.name);
            } catch {
                missing.push(entry.name);
            }
        }

        return { valid: missing.length === 0, missing };
    }
}
