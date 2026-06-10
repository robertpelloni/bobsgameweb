/**
 * DoorGraphLoader — Loads the complete door graph from door_graph.json
 *
 * Contains 682+ door connections across 242+ maps, extracted from _Project.txt.
 * Falls back to the hardcoded DoorGraph for maps not in the JSON.
 */

export interface DoorGraphEntry {
  name: string;
  destMap: string;
  destDoor: string;
  x: number;
  y: number;
  arrivalX?: number;
  arrivalY?: number;
}

// Cached door graph data
let doorGraphCache: Record<string, DoorGraphEntry[]> | null = null;

/**
 * Load the door graph JSON. Call once at startup.
 */
export async function loadDoorGraph(): Promise<void> {
  if (doorGraphCache) return;
  try {
    // Cache-bust: append app version so browser fetches fresh JSON after deploys
    const { APP_VERSION } = await import('../../../shared/Config');
    const resp = await fetch(`/door_graph.json?v=${APP_VERSION}`);
    if (resp.ok) {
      doorGraphCache = await resp.json();
      const mapCount = Object.keys(doorGraphCache!).length;
      const doorCount = Object.values(doorGraphCache!).reduce((sum, d) => sum + d.length, 0);
      console.log(`[DoorGraphLoader] Loaded: ${mapCount} maps, ${doorCount} doors`);
    } else {
      console.warn('[DoorGraphLoader] Failed to load door_graph.json:', resp.status);
      doorGraphCache = {};
    }
  } catch (e) {
    console.warn('[DoorGraphLoader] Error loading door_graph.json:', e);
    doorGraphCache = {};
  }
}

/**
 * Get all doors for a given map name.
 */
export function getDoorGraphForMap(mapName: string): DoorGraphEntry[] {
  if (!doorGraphCache) return [];
  return doorGraphCache[mapName] || [];
}

/**
 * Check if the door graph has been loaded.
 */
export function isDoorGraphLoaded(): boolean {
  return doorGraphCache !== null;
}
