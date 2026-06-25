/**
 * LegacyAssetPipeline — handles the recovery and ingestion of assets
 * from the Java (bobsgameonlinejava) and C++ (okgame) legacy codebases.
 *
 * This implements Phase 1 of the Great Recovery: indexing legacy metadata
 * and routing it into the modern `GameDataLoader` and `ManifestLoader` structures.
 */

import { AssetManifest, ManifestEntry } from '../shared/ManifestLoader';
import { MapData } from '../map/MapManager';
import { Logger } from '../debug/Logger';

const log = new Logger('LegacyAssetPipeline');

export interface LegacyMapIndex {
    id: number;
    name: string;
    path: string;
    width: number;
    height: number;
}

export interface LegacyAudioIndex {
    id: number;
    name: string;
    filename: string;
    type: 'sound' | 'music';
}

export class LegacyAssetPipeline {
    private mapCache: Map<string, LegacyMapIndex> = new Map();
    private audioCache: Map<string, LegacyAudioIndex> = new Map();

    constructor() {}

    /**
     * Parse raw extracted JSON from bobsgameonlinejava maps into the local index cache.
     */
    public indexMaps(rawJsonArray: any[]): void {
        let count = 0;
        for (const item of rawJsonArray) {
            if (item && typeof item.id === 'number' && typeof item.name === 'string') {
                const entry: LegacyMapIndex = {
                    id: item.id,
                    name: item.name,
                    path: item.file || item.path || '',
                    width: item.width || 0,
                    height: item.height || 0
                };
                this.mapCache.set(entry.name, entry);
                count++;
            }
        }
        log.info(`Indexed ${count} legacy maps into pipeline.`);
    }

    /**
     * Parse raw extracted audio arrays (SFX 0-87, BGM) into the local audio cache.
     */
    public indexAudio(rawJsonArray: any[]): void {
        let count = 0;
        for (const item of rawJsonArray) {
            if (item && typeof item.id === 'number' && typeof item.name === 'string') {
                const entry: LegacyAudioIndex = {
                    id: item.id,
                    name: item.name,
                    filename: item.filename || item.path || '',
                    type: item.type === 'music' ? 'music' : 'sound'
                };
                this.audioCache.set(entry.name, entry);
                count++;
            }
        }
        log.info(`Indexed ${count} legacy audio assets into pipeline.`);
    }

    /**
     * Converts the indexed legacy caches into a modern AssetManifest for preloading.
     */
    public generateManifest(version: string = "1.0"): AssetManifest {
        const entries: ManifestEntry[] = [];

        // Convert Map Index
        for (const map of this.mapCache.values()) {
            if (map.path) {
                entries.push({
                    id: map.id,
                    name: map.name,
                    type: 'map',
                    path: `/maps_v2/${map.path}`, // Route to modern map directory
                    md5: '', // To be generated if needed
                    version: 1,
                    size: 0,
                    preload: false
                });
            }
        }

        // Convert Audio Index
        for (const audio of this.audioCache.values()) {
            if (audio.filename) {
                entries.push({
                    id: audio.id,
                    name: audio.name,
                    type: 'audio',
                    path: `/audio/${audio.type === 'music' ? 'music' : 'sfx'}/${audio.filename}`,
                    md5: '',
                    version: 1,
                    size: 0,
                    preload: audio.type === 'music' ? false : true // Preload SFX
                });
            }
        }

        log.info(`Generated master AssetManifest with ${entries.length} entries.`);

        return {
            version,
            entries
        };
    }
}
