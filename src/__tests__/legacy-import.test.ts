import { MapDataRegistry } from "../shared/MapDataRegistry";

/**
 * Tests for the Legacy Asset Import Pipeline (v3.0.5)
 * Validates conversion of Java-extracted JSON maps to TypeScript engine format.
 */

let passed = 0;
let failed = 0;

function assertEqual(actual: unknown, expected: unknown, message: string): void {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		passed++; console.log(`  ✅ ${message}`);
	} else {
		failed++; console.error(`  ❌ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

async function runTests() {
    console.log("\n🏗️ Legacy Asset Import Pipeline Tests (v3.0.5)");

    const registry = new MapDataRegistry();
    
    const mockLegacyMap = {
        "id": 16,
        "legacyName": "TOWNYUUBackyardToolShed",
        "name": "TOWNYUU Backyard Tool Shed",
        "width": 14,
        "height": 19,
        "tileWidth": 32,
        "tileHeight": 32,
        "tiles": [
            [3, 3, 3, 3],
            [3, 7, 7, 3],
            [3, 6, 7, 3],
            [3, 3, 3, 3]
        ],
        "doors": [
            {
                "name": "toBackyard",
                "x": 1,
                "y": 2,
                "destinationMapName": "TOWN Outside Neighborhood",
                "destinationX": 6,
                "destinationY": 16
            }
        ]
    };

    const imported = registry.importLegacyMap(mockLegacyMap);

    console.log("\n🧪 Conversion Tests");
    assertEqual(imported.id, "16", "ID converted to string");
    assertEqual(imported.name, "TOWNYUU Backyard Tool Shed", "Name preserved");
    assertEqual(imported.width, 14, "Width preserved");
    assertEqual(imported.height, 19, "Height preserved");
    assertEqual(imported.tileSize, 32, "Tile size (32) mapped from tileWidth");

    console.log("\n🧪 Tile Mapping Tests (3=B, 7=G, 6=D)");
    assertEqual(imported.tiles[0], "BBBB", "Row 0 (all 3) -> BBBB");
    assertEqual(imported.tiles[1], "BGGB", "Row 1 (3,7,7,3) -> BGGB");
    assertEqual(imported.tiles[2], "BDGB", "Row 2 (3,6,7,3) -> BDGB");

    console.log("\n🧪 Warp/Door Mapping Tests");
    assertEqual(imported.entities.length, 1, "One entity (warp) created from door");
    const warp = imported.entities[0];
    assertEqual(warp.type, "warp", "Entity type is warp");
    assertEqual(warp.destination, "TOWN Outside Neighborhood", "Destination correctly mapped");
    assertEqual(warp.x, 1, "Warp X coordinate correct");
    assertEqual(warp.y, 2, "Warp Y coordinate correct");
    assertEqual(warp.destX, 6, "Destination X coordinate correct");
    assertEqual(warp.destY, 16, "Destination Y coordinate correct");

    console.log(`\n${"=".repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
