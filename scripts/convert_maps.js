import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ZIP_PATH = 'C:\\Users\\hyper\\workspace\\bg\\bobsgameonlinejava\\bobsgame_v8830.zip';
const MAPS_DIR = path.resolve('data/maps');
const MANIFEST_PATH = path.join(MAPS_DIR, 'legacy-house-manifest.json');

const MapTile = {
  EMPTY: 0,
  GRASS: 1,
  PATH: 2,
  WALL: 3,
  WATER: 4,
  TREE: 5,
  DOOR: 6,
  FLOOR: 7,
  ROOF: 8,
  SAND: 9,
  FLOWER: 10,
  BRIDGE: 11,
  STONE: 12,
  CHEST: 13,
  SIGN: 14,
  STAIRS_DOWN: 15,
  STAIRS_UP: 16,
};

const TARGET_MAPS = [
  { outputId: 5, legacyName: 'TOWNYUUDownstairs', name: 'TOWNYUU Downstairs', floorTile: MapTile.FLOOR },
  { outputId: 6, legacyName: 'TOWNYUUUpstairs', name: 'TOWNYUU Upstairs', floorTile: MapTile.FLOOR },
  { outputId: 7, legacyName: 'TOWNYUUUpstairsParentsRoom', name: 'TOWNYUU Upstairs Parents Room', floorTile: MapTile.FLOOR },
  { outputId: 8, legacyName: 'TOWNYUUBasement', name: 'TOWNYUU Basement', floorTile: MapTile.STONE },
  { outputId: 9, legacyName: 'TOWNYUUGarage', name: 'TOWNYUU Garage', floorTile: MapTile.STONE },
  { outputId: 10, legacyName: 'TOWNYUUAttic', name: 'TOWNYUU Attic', floorTile: MapTile.FLOOR },
  { outputId: 11, legacyName: 'TOWNYUUDownstairsBathroom', name: 'TOWNYUU Downstairs Bathroom', floorTile: MapTile.FLOOR },
  { outputId: 12, legacyName: 'TOWNYUUUpstairsYuusRoom', name: "TOWNYUU Upstairs Yuu's Room", floorTile: MapTile.FLOOR },
  { outputId: 13, legacyName: 'TOWNYUUUpstairsBabyRoom', name: 'TOWNYUU Upstairs Baby Room', floorTile: MapTile.FLOOR },
  { outputId: 14, legacyName: 'TOWNYUUUpstairsBrothersRoom', name: 'TOWNYUU Upstairs Brothers Room', floorTile: MapTile.FLOOR },
  { outputId: 15, legacyName: 'TOWNYUUUpstairsBathroom', name: 'TOWNYUU Upstairs Bathroom', floorTile: MapTile.FLOOR },
  { outputId: 16, legacyName: 'TOWNYUUBackyardToolShed', name: 'TOWNYUU Backyard Tool Shed', floorTile: MapTile.FLOOR },
  { outputId: 17, legacyName: 'TOWNOutsideNeighborhood', name: 'TOWN Outside Neighborhood', floorTile: MapTile.GRASS },
  { outputId: 18, legacyName: 'TOWNTown', name: 'TOWN Town', floorTile: MapTile.PATH },
  { outputId: 19, legacyName: 'TOWNOutsideForest', name: 'TOWN Outside Forest', floorTile: MapTile.GRASS },
  { outputId: 20, legacyName: 'INTROTown', name: 'INTRO Town', floorTile: MapTile.GRASS },
  { outputId: 21, legacyName: 'SCHOOLPlayground', name: 'SCHOOL Playground', floorTile: MapTile.SAND },
];

const LEGACY_NAME_TO_DISPLAY_NAME = new Map(
  TARGET_MAPS.map((map) => [map.legacyName, map.name]),
);

const MANUAL_TRANSITION_REPAIRS = {
  TOWNYUUDownstairs: {
    doors: {
      toFrontYard: { destinationMapName: 'TOWN Outside Neighborhood', destinationX: 126, destinationY: 31 },
    },
  },
  TOWNOutsideNeighborhood: {
    doors: {
      toYuusHouse: { destinationMapName: 'TOWNYUU Downstairs', destinationX: 28, destinationY: 31 },
      toYuusHouseBack: { destinationMapName: 'TOWNYUU Downstairs', destinationX: 53, destinationY: 23 },
    },
  },
  TOWNYUUGarage: {
    warps: {
      toAttic: { destinationMapName: 'TOWNYUU Attic', destinationX: 8, destinationY: 16 },
    },
  },
  TOWNYUUAttic: {
    warps: {
      toGarage: { destinationMapName: 'TOWNYUU Garage', destinationX: 8, destinationY: 14 },
    },
  },
  TOWNYUUDownstairsBathroom: {
    doors: {
      Light0: { destinationMapName: 'TOWNYUU Downstairs', destinationX: 53, destinationY: 23 },
    },
  },
};

if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}

function unzipEntry(entryName) {
  try {
    return execSync(`unzip -p "${ZIP_PATH}" "${entryName}"`, {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`Failed to extract ${entryName} from archive: ${error.message}`);
  }
}

function extractProjectText() {
  return unzipEntry('_Project.txt').toString('utf8');
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readTickField(record, key) {
  const fieldMatch = record.match(new RegExp(`${escapeRegex(key)}:\`([^\`]*)\``));
  return fieldMatch ? fieldMatch[1] : '';
}

function readNumberField(record, key, fallback = 0) {
  const raw = readTickField(record, key);
  if (raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function extractMapSection(projectText, legacyName) {
  const marker = `:${legacyName}:name:\`${legacyName}\``;
  const markerIndex = projectText.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Could not find map section for ${legacyName} in _Project.txt`);
  }

  const sectionStart = projectText.lastIndexOf('MAP:', markerIndex);
  if (sectionStart === -1) {
    throw new Error(`Could not determine MAP: section start for ${legacyName}`);
  }

  let nextMapIndex = projectText.indexOf('\r\nMAP:', markerIndex);
  if (nextMapIndex === -1) nextMapIndex = projectText.indexOf('\nMAP:', markerIndex);
  if (nextMapIndex === -1) nextMapIndex = projectText.length;

  return projectText.slice(sectionStart, nextMapIndex);
}

function extractBraceBlock(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return '';

  let index = markerIndex + marker.length;
  let depth = 1;
  const start = index;

  while (index < text.length && depth > 0) {
    const ch = text[index];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    index++;
  }

  if (depth !== 0) {
    throw new Error(`Unbalanced block while parsing marker ${marker}`);
  }

  return text.slice(start, index - 1);
}

function splitTopLevelRecords(block) {
  const records = [];
  let start = 0;
  let depth = 0;

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (ch === ',' && depth === 0) {
      const record = block.slice(start, i).trim();
      if (record.length > 0) records.push(record);
      start = i + 1;
    }
  }

  const trailing = block.slice(start).trim();
  if (trailing.length > 0) records.push(trailing);
  return records;
}

function readLayerBuffer(legacyName, layer) {
  return unzipEntry(`Map_${legacyName}_${layer}.bin`);
}

function readLayerInts(legacyName, layer, width, height) {
  const buffer = readLayerBuffer(legacyName, layer);
  const expectedLength = width * height * 4;
  if (buffer.length < expectedLength) {
    throw new Error(
      `Layer ${layer} for ${legacyName} is too short. Expected ${expectedLength} bytes, got ${buffer.length}`,
    );
  }

  const ints = [];
  for (let i = 0; i < width * height; i++) {
    ints.push(buffer.readUInt32BE(i * 4));
  }
  return ints;
}

function normalizeLegacyDestinationName(legacyName) {
  return LEGACY_NAME_TO_DISPLAY_NAME.get(legacyName) ?? null;
}

function toTileCoord(pixelValue) {
  return Math.max(0, Math.floor(pixelValue / 8));
}

function toTileCoordAllowNegative(pixelValue) {
  if (!Number.isFinite(pixelValue) || pixelValue < 0) return -1;
  return Math.floor(pixelValue / 8);
}

function classifyWarpTile(areaRecord) {
  const combined = `${areaRecord.name} ${areaRecord.comment} ${areaRecord.destinationMapName}`.toLowerCase();
  if (combined.includes('attic') || combined.includes('upstairs') || combined.includes('stairs up')) {
    return MapTile.STAIRS_UP;
  }
  if (combined.includes('basement') || combined.includes('downstairs') || combined.includes('stairs down')) {
    return MapTile.STAIRS_DOWN;
  }
  return MapTile.PATH;
}

function buildBaseTiles(width, height, hitLayer, floorTile) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      const hit = hitLayer[y * width + x] ?? 1;
      tiles[y][x] = hit === 0 ? floorTile : MapTile.WALL;
    }
  }
  return tiles;
}

function findDefaultSpawn(tiles) {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const centerX = Math.floor(width / 2);

  for (let y = height - 2; y >= 1; y--) {
    for (let offset = 0; offset < width; offset++) {
      const left = centerX - offset;
      const right = centerX + offset;
      if (left >= 1 && tiles[y][left] !== MapTile.WALL) return { x: left, y };
      if (right < width - 1 && tiles[y][right] !== MapTile.WALL) return { x: right, y };
    }
  }

  return { x: 1, y: 1 };
}

function parseDoorRecords(section) {
  const doorBlock = extractBraceBlock(section, 'doorDataList:{');
  const records = [];
  const doorRegex = /name:`([^`]*)`,id:`(\d+)`,spriteName:`[^`]*`,spawnXPixels1X:`([\d.]+)`,spawnYPixels1X:`([\d.]+)`[\s\S]*?arrivalXPixels1X:`(-?\d+)`,arrivalYPixels1X:`(-?\d+)`[\s\S]*?destinationMapName:`([^`]*)`,destinationDoorName:`([^`]*)`/g;

  for (const match of doorBlock.matchAll(doorRegex)) {
    const destinationMapName = normalizeLegacyDestinationName(match[7]);
    if (!destinationMapName) continue;
    records.push({
      name: match[1],
      x: toTileCoord(Number(match[3])),
      y: toTileCoord(Number(match[4])),
      destinationMapName,
      destinationDoorName: match[8],
      destinationX: toTileCoordAllowNegative(Number(match[5])),
      destinationY: toTileCoordAllowNegative(Number(match[6])),
    });
  }

  return records;
}

function parseAreaWarpRecords(section) {
  const stateBlock = extractBraceBlock(section, 'stateDataList:{');
  const areaBlock = extractBraceBlock(stateBlock, 'areaDataList:{');
  const records = [];
  const areaRegex = /name:`([^`]*)`,id:`(\d+)`,mapXPixels1X:`(-?\d+)`,mapYPixels1X:`(-?\d+)`,widthPixels1X:`(\d+)`,heightPixels1X:`(\d+)`[\s\S]*?comment:`([^`]*)`[\s\S]*?arrivalXPixels1X:`(-?\d+)`,arrivalYPixels1X:`(-?\d+)`,isWarpArea:`(true|false)`,destinationMapName:`([^`]*)`,destinationWarpAreaName:`([^`]*)`/g;

  for (const match of areaBlock.matchAll(areaRegex)) {
    if (match[10] !== 'true') continue;
    const destinationMapName = normalizeLegacyDestinationName(match[11]);
    if (!destinationMapName) continue;
    records.push({
      name: match[1],
      comment: match[7],
      x: toTileCoord(Number(match[3])),
      y: toTileCoord(Number(match[4])),
      width: Math.max(1, toTileCoord(Number(match[5]))),
      height: Math.max(1, toTileCoord(Number(match[6]))),
      isWarpArea: true,
      destinationMapName,
      destinationWarpAreaName: match[12],
      destinationX: toTileCoordAllowNegative(Number(match[8])),
      destinationY: toTileCoordAllowNegative(Number(match[9])),
    });
  }

  return records;
}

function findNearestWalkableTile(map, startX, startY) {
  const width = map.width;
  const height = map.height;
  const visited = new Set();
  const queue = [{ x: startX, y: startY }];

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (
      current.x >= 0 && current.x < width &&
      current.y >= 0 && current.y < height &&
      map.tiles[current.y]?.[current.x] !== MapTile.WALL
    ) {
      return { x: current.x, y: current.y };
    }

    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nextX = current.x + dx;
      const nextY = current.y + dy;
      const nextKey = `${nextX},${nextY}`;
      if (!visited.has(nextKey) && nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
        queue.push({ x: nextX, y: nextY });
      }
    }
  }

  return { x: Math.max(0, Math.min(width - 1, startX)), y: Math.max(0, Math.min(height - 1, startY)) };
}

function resolveTransitions(maps) {
  const mapsByName = new Map(maps.map((map) => [map.name, map]));

  for (const map of maps) {
    for (const door of map.doors) {
      const targetMap = mapsByName.get(door.destinationMapName);
      if (!targetMap) continue;
      if (door.destinationX >= 0 && door.destinationY >= 0) continue;

      let fallback = null;
      if (door.destinationDoorName) {
        const targetDoor = targetMap.doors.find((candidate) => candidate.name === door.destinationDoorName);
        if (targetDoor) {
          fallback = findNearestWalkableTile(targetMap, targetDoor.x, targetDoor.y);
        }
      }

      if (!fallback) {
        fallback = findNearestWalkableTile(targetMap, targetMap.defaultSpawnX, targetMap.defaultSpawnY);
      }

      door.destinationX = fallback.x;
      door.destinationY = fallback.y;
    }

    for (const warp of map.warps) {
      const targetMap = mapsByName.get(warp.destinationMapName);
      if (!targetMap) continue;
      if (warp.destinationX >= 0 && warp.destinationY >= 0) continue;

      let fallback = null;
      if (warp.destinationWarpAreaName) {
        const targetWarp = targetMap.warps.find((candidate) => candidate.name === warp.destinationWarpAreaName);
        if (targetWarp) {
          fallback = findNearestWalkableTile(targetMap, targetWarp.x, targetWarp.y);
        }
      }

      if (!fallback) {
        fallback = findNearestWalkableTile(targetMap, targetMap.defaultSpawnX, targetMap.defaultSpawnY);
      }

      warp.destinationX = fallback.x;
      warp.destinationY = fallback.y;
    }
  }
}

function repairTransitions(legacyName, doors, warps) {
  const repair = MANUAL_TRANSITION_REPAIRS[legacyName];
  if (!repair) return;

  if (repair.doors) {
    for (const door of doors) {
      const override = repair.doors[door.name];
      if (!override) continue;
      Object.assign(door, override);
    }
  }

  if (repair.warps) {
    for (const warp of warps) {
      const override = repair.warps[warp.name];
      if (!override) continue;
      Object.assign(warp, override);
    }
  }
}

function applyInteractiveMarkers(tiles, doors, warps) {
  for (const door of doors) {
    if (tiles[door.y]?.[door.x] !== undefined) {
      tiles[door.y][door.x] = MapTile.DOOR;
    }
  }

  for (const warp of warps) {
    const markerTile = classifyWarpTile(warp);
    for (let dy = 0; dy < warp.height; dy++) {
      for (let dx = 0; dx < warp.width; dx++) {
        const tx = warp.x + dx;
        const ty = warp.y + dy;
        if (tiles[ty]?.[tx] !== undefined && tiles[ty][tx] !== MapTile.WALL) {
          tiles[ty][tx] = markerTile;
        }
      }
    }
  }
}

function convertMap(projectText, config) {
  const section = extractMapSection(projectText, config.legacyName);
  const width = readNumberField(section, 'widthTiles1X');
  const height = readNumberField(section, 'heightTiles1X');
  const isOutside = readTickField(section, 'isOutside') === 'true';

  if (!width || !height) {
    throw new Error(`Missing width/height for ${config.legacyName}`);
  }

  const hitLayer = readLayerInts(config.legacyName, 11, width, height);
  const tiles = buildBaseTiles(width, height, hitLayer, config.floorTile);
  const doors = parseDoorRecords(section);
  const warps = parseAreaWarpRecords(section);
  applyInteractiveMarkers(tiles, doors, warps);

  const defaultSpawn = findDefaultSpawn(tiles);

  return {
    id: config.outputId,
    legacyName: config.legacyName,
    name: config.name,
    width,
    height,
    tileWidth: 32,
    tileHeight: 32,
    defaultSpawnX: defaultSpawn.x,
    defaultSpawnY: defaultSpawn.y,
    tiles,
    doors,
    warps,
    lights: [],
    isOutside,
    source: {
      archive: path.basename(ZIP_PATH),
      hitLayer: 11,
      conversion: 'legacy-house-layout-v2',
      derivedFrom: '_Project.txt + Map_*_11.bin',
    },
  };
}

function sanitizeOutputs(maps) {
  for (const map of maps) {
    for (const door of map.doors) {
      delete door.destinationDoorName;
    }
    for (const warp of map.warps) {
      delete warp.destinationWarpAreaName;
    }
  }
}

function writeOutputs(maps) {
  const manifest = [];

  for (const map of maps) {
    const fileName = `map_${map.id}.json`;
    const outputPath = path.join(MAPS_DIR, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(map, null, 2) + '\n');
    manifest.push({ id: map.id, name: map.name, path: `/maps/${fileName}` });
    console.log(`Saved ${map.name} -> ${outputPath}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Saved manifest -> ${MANIFEST_PATH}`);
}

function main() {
  console.log('Converting legacy Yuu house maps from bobsgame_v8830.zip...');
  const projectText = extractProjectText();
  const maps = TARGET_MAPS.map((config) => convertMap(projectText, config));
  resolveTransitions(maps);
  for (const map of maps) {
    repairTransitions(map.legacyName, map.doors, map.warps);
  }
  sanitizeOutputs(maps);
  writeOutputs(maps);
  console.log(`Converted ${maps.length} legacy maps.`);
}

main();
