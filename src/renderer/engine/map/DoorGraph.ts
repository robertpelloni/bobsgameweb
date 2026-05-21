/**
 * DoorGraph — Real door connections extracted from _Project.txt
 *
 * This data maps each map's doors to their destination maps and arrival positions.
 * The door names and destinations are parsed from the actual game metadata.
 * Arrival coordinates are in pixels at 1X scale (divide by 8 for tile coords).
 */

export interface DoorInfo {
  name: string;
  destMap: string;
  destDoor: string;
  arrX: number; // arrival X in pixels (1X)
  arrY: number; // arrival Y in pixels (1X)
}

export interface MapDoors {
  doors: DoorInfo[];
  warps: { name: string; destMap: string; destArea: string }[];
}

/** Complete door connectivity graph for all YUU house maps + exteriors */
const DOOR_GRAPH: Record<string, MapDoors> = {
  'TOWNYUUUpstairsYuusRoom': {
    doors: [
      { name: 'toHallway', destMap: 'TOWNYUUUpstairs', destDoor: 'toYuusRoom', arrX: 160, arrY: 160 },
    ],
    warps: [],
  },
  'TOWNYUUUpstairs': {
    doors: [
      { name: 'toParentsRoom', destMap: 'TOWNYUUUpstairsParentsRoom', destDoor: 'toHallway', arrX: 104, arrY: 112 },
      { name: 'toLittleBrothersRoom', destMap: 'TOWNYUUUpstairsBabyRoom', destDoor: 'toHallway', arrX: 288, arrY: 112 },
      { name: 'toBathroom', destMap: 'TOWNYUUUpstairsBathroom', destDoor: 'toHallway', arrX: 432, arrY: 112 },
      { name: 'toBrothersRoom', destMap: 'TOWNYUUUpstairsBrothersRoom', destDoor: 'toHallway', arrX: 208, arrY: 72 },
      { name: 'toYuusRoom', destMap: 'TOWNYUUUpstairsYuusRoom', destDoor: 'toHallway', arrX: 392, arrY: 72 },
    ],
    warps: [],
  },
  'TOWNYUUDownstairs': {
    doors: [
      { name: 'toBathroom', destMap: 'TOWNYUUDownstairsBathroom', destDoor: 'toDownstairs', arrX: 224, arrY: 288 },
      { name: 'toBasement', destMap: 'TOWNYUUBasement', destDoor: 'toKitchen', arrX: 40, arrY: 104 },
      { name: 'toGarage', destMap: 'TOWNYUUGarage', destDoor: 'toKitchen', arrX: 16, arrY: 88 },
      { name: 'toBackyard', destMap: 'TOWNOutsideNeighborhood', destDoor: 'toYuusHouseBack', arrX: 256, arrY: 72 },
      { name: 'toFrontYard', destMap: 'TOWNOutsideNeighborhood', destDoor: 'toYuusHouse', arrX: 104, arrY: 320 },
    ],
    warps: [],
  },
  'TOWNYUUUpstairsBabyRoom': {
    doors: [
      { name: 'toHallway', destMap: 'TOWNYUUUpstairs', destDoor: 'toLittleBrothersRoom', arrX: 72, arrY: 72 },
    ],
    warps: [],
  },
  'TOWNYUUUpstairsBrothersRoom': {
    doors: [
      { name: 'toHallway', destMap: 'TOWNYUUUpstairs', destDoor: 'toBrothersRoom', arrX: 208, arrY: 160 },
    ],
    warps: [],
  },
  'TOWNYUUUpstairsBathroom': {
    doors: [
      { name: 'toHallway', destMap: 'TOWNYUUUpstairs', destDoor: 'toBathroom', arrX: 72, arrY: 72 },
    ],
    warps: [],
  },
  'TOWNYUUUpstairsParentsRoom': {
    doors: [
      { name: 'toHallway', destMap: 'TOWNYUUUpstairs', destDoor: 'toParentsRoom', arrX: 48, arrY: 72 },
    ],
    warps: [],
  },
  'TOWNYUUBasement': {
    doors: [
      { name: 'toKitchen', destMap: 'TOWNYUUDownstairs', destDoor: 'toBasement', arrX: 40, arrY: 72 },
    ],
    warps: [],
  },
  'TOWNYUUGarage': {
    doors: [
      { name: 'toKitchen', destMap: 'TOWNYUUDownstairs', destDoor: 'toGarage', arrX: 192, arrY: 88 },
    ],
    warps: [],
  },
  'TOWNYUUBackyardToolShed': {
    doors: [
      { name: 'toBackyard', destMap: 'TOWNOutsideNeighborhood', destDoor: 'toHouseShed', arrX: 48, arrY: 128 },
    ],
    warps: [],
  },
  'TOWNYUUDownstairsBathroom': {
    doors: [
      { name: 'toDownstairs', destMap: 'TOWNYUUDownstairs', destDoor: 'toBathroom', arrX: 48, arrY: 120 },
    ],
    warps: [],
  },
};

/**
 * Get doors for a specific map
 */
export function getMapDoors(mapName: string): MapDoors | null {
  return DOOR_GRAPH[mapName] ?? null;
}

/**
 * Find the door in the destination map that matches the destDoor name,
 * and return its arrival position in tile coordinates.
 */
export function getArrivalPosition(destMapName: string, destDoorName: string): { x: number; y: number } | null {
  const mapDoors = DOOR_GRAPH[destMapName];
  if (!mapDoors) return null;

  // Find the door with the matching name
  const door = mapDoors.doors.find(d => d.name === destDoorName);
  if (door) {
    // Arrival coords are in 1X pixels; convert to tile coords
    return { x: Math.floor(door.arrX / 8), y: Math.floor(door.arrY / 8) };
  }

  // If we can't find the named door, use the first door's arrival
  if (mapDoors.doors.length > 0) {
    const first = mapDoors.doors[0];
    return { x: Math.floor(first.arrX / 8), y: Math.floor(first.arrY / 8) };
  }

  return null;
}

/**
 * Get all map names that have door data
 */
export function getMapNamesWithDoors(): string[] {
  return Object.keys(DOOR_GRAPH);
}
