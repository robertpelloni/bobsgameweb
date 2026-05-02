import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ZIP_PATH = "C:\\Users\\hyper\\workspace\\bg\\bobsgameonlinejava\\bobsgame_v8830.zip";
const MAPS_DIR = "data/maps";
const TEMP_DIR = "temp_extraction";

const TILE_LEGEND = {
    0: ' ', // Empty
    1: 'G', // Grass
    2: 'D', // Dirt
    3: 'S', // Sand
    4: 'W', // Water
    5: 'F', // woodFloor
    6: 'X', // stoneWall
    7: 'B', // brickWall
    8: 'R', // carpetRed
    9: 'L', // carpetBlue
    10: 'C', // concrete
    11: 'A', // asphalt
    12: 'H', // shingleRoof
    13: 'V', // window
    14: 'O', // door
};

const MAP_CONFIGS = [
    { id: 5, name: "TOWNYUUDownstairs", prefix: "Map_TOWNYUUDownstairs", width: 27, height: 28 },
    { id: 6, name: "TOWNYUUUpstairs", prefix: "Map_TOWNYUUUpstairs", width: 27, height: 28 },
    { id: 7, name: "TOWNYUUUpstairsParentsRoom", prefix: "Map_TOWNYUUUpstairsParentsRoom", width: 23, height: 23 },
    { id: 8, name: "TOWNYUUBasement", prefix: "Map_TOWNYUUBasement", width: 62, height: 37 },
    { id: 9, name: "TOWNYUUGarage", prefix: "Map_TOWNYUUGarage", width: 27, height: 30 },
    { id: 10, name: "TOWNYUUAttic", prefix: "Map_TOWNYUUAttic", width: 27, height: 30 },
];

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });

function extractFile(filename) {
    const target = path.join(TEMP_DIR, filename);
    if (fs.existsSync(target)) return target;
    try {
        // Using powershell Expand-Archive might be better if unzip isn't available, 
        // but the previous log suggested bash commands. 
        // We'll try to use a more robust extraction if possible.
        // For now, sticking to the user's hinted command.
        execSync(`unzip -p "${ZIP_PATH}" "${filename}" > "${target}"`, { stdio: 'ignore' });
        return target;
    } catch (e) {
        console.error(`Failed to extract ${filename}: ${e.message}`);
        return null;
    }
}

function convertMap(config) {
    console.log(`Converting Map ${config.id}: ${config.name}...`);
    
    // Use layer 0 as the ground layer
    const binPath = extractFile(`${config.prefix}_0.bin`);
    if (!binPath || !fs.existsSync(binPath)) {
        console.error(`  Error: Layer 0 binary not found for ${config.name}`);
        return;
    }

    const buffer = fs.readFileSync(binPath);
    const tiles = [];
    
    for (let y = 0; y < config.height; y++) {
        let row = "";
        for (let x = 0; x < config.width; x++) {
            const index = (y * config.width + x) * 4;
            if (index + 3 >= buffer.length) {
                row += " ";
                continue;
            }
            // Binary format is 32-bit little endian
            const tileIdx = buffer.readUInt32LE(index);
            row += TILE_LEGEND[tileIdx] || (tileIdx === 0 ? " " : "G"); // Default to grass if unknown
        }
        tiles.push(row);
    }

    const mapJson = {
        id: config.id,
        name: config.name,
        width: config.width,
        height: config.height,
        tileSize: 8,
        tiles: tiles,
        legend: {
            " ": "empty",
            "G": "grass",
            "D": "dirt",
            "S": "sand",
            "W": "water",
            "F": "woodFloor",
            "X": "stoneWall",
            "B": "brickWall",
            "R": "carpetRed",
            "L": "carpetBlue",
            "C": "concrete",
            "A": "asphalt",
            "H": "shingleRoof",
            "V": "window",
            "O": "door"
        },
        entities: [],
        events: []
    };

    const outputPath = path.join(MAPS_DIR, `map_${config.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(mapJson, null, 2));
    console.log(`  Saved to ${outputPath}`);
}

MAP_CONFIGS.forEach(convertMap);

console.log("Conversion complete.");
