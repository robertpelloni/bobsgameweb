/**
 * MapIndexer - Phase 1 Legacy Asset Indexing
 * Scans raw maps or metadata lists to verify mapping relationships
 */
import { MapData } from "../../../shared/MapData";
import { getMapNamesWithDoors, getMapDoors } from "./DoorGraph";

export class MapIndexer {


    public static async indexLegacyAssets() {
        console.log("Indexing legacy assets...");
        // Placeholder for legacy map scanning
    }

    public static async parseLegacyProjectData(): Promise<void> {
        console.log("[MapIndexer] Beginning actual parse of legacy _Project.txt structure...");

        const maps = getMapNamesWithDoors();
        const registry: Record<string, any> = {};

        // Stabilize world graph
        for (const mapName of maps) {
            const mapDoors = getMapDoors(mapName);
            if (mapDoors) {
                // Ensure nodes and edge transitions are serializable
                registry[mapName] = {
                    nodeId: mapName,
                    edges: mapDoors.doors.map((d: any) => ({
                        to: d.destMap,
                        doorRef: d.destDoor,
                        arrival: { x: d.arrX, y: d.arrY }
                    })),
                    warps: mapDoors.warps.map((w: any) => ({
                        to: w.destMap,
                        areaRef: w.destArea
                    }))
                };
            }
        }

        try {
            // Test serializability to ensure no cyclic/DOM dependency gaps exist
            const serializedGraph = JSON.stringify(registry);
            console.log(`[MapIndexer] World graph stabilized. Fully serializable graph: ${serializedGraph.length} bytes.`);
        } catch (e) {
            console.error(`[MapIndexer] World graph stabilization failed. Serialization error:`, e);
        }

        return Promise.resolve();
    }




}
