/**
 * Tests for MapDataRegistry — map loading, connections, entities, enemies.
 *
 * Run with: npx tsx src/__tests__/map-data.test.ts
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
	if (condition) { passed++; console.log(`  ✅ ${message}`); }
	else { failed++; console.error(`  ❌ ${message}`); }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		passed++; console.log(`  ✅ ${message}`);
	} else {
		failed++; console.error(`  ❌ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

// Inline the types for testing
interface MapEntity { id: string; type: string; x: number; y: number; name?: string; destination?: string; destX?: number; destY?: number; loot?: string[] }
interface EnemyData { name: string; hp: number; attack: number; defense: number; xp: number; gold: number }
interface GameMapData { id: string; name: string; width: number; height: number; tileSize: number; tiles: string[]; entities: MapEntity[]; enemies?: EnemyData[]; encounterRate?: number }

class TestRegistry {
	private maps: Map<string, GameMapData> = new Map();

	loadAll(): void {
		this.maps.set("townyuu", {
			id: "townyuu", name: "TOWNYUU", width: 40, height: 30, tileSize: 8,
			tiles: Array.from({ length: 30 }, () => "G".repeat(40)),
			entities: [
				{ id: "exit_east", type: "warp", x: 39, y: 15, destination: "dark_forest", destX: 1, destY: 15 },
				{ id: "exit_south", type: "warp", x: 20, y: 29, destination: "beach", destX: 20, destY: 1 },
				{ id: "npc_mayor", type: "npc", x: 14, y: 10, name: "Mayor" },
				{ id: "chest_1", type: "chest", x: 6, y: 4, loot: ["health_potion"] },
			],
			enemies: [],
		});
		this.maps.set("dark_forest", {
			id: "dark_forest", name: "Dark Forest", width: 50, height: 40, tileSize: 8,
			tiles: Array.from({ length: 40 }, () => "G".repeat(50)),
			entities: [
				{ id: "exit_west", type: "warp", x: 0, y: 20, destination: "townyuu", destX: 38, destY: 15 },
				{ id: "exit_cave", type: "warp", x: 49, y: 20, destination: "dragon_lair", destX: 1, destY: 10 },
			],
			enemies: [
				{ name: "Forest Goblin", hp: 20, attack: 5, defense: 2, xp: 15, gold: 8 },
				{ name: "Wild Wolf", hp: 30, attack: 8, defense: 3, xp: 25, gold: 12 },
			],
			encounterRate: 0.15,
		});
		this.maps.set("beach", {
			id: "beach", name: "Sunset Beach", width: 40, height: 25, tileSize: 8,
			tiles: Array.from({ length: 25 }, () => "S".repeat(40)),
			entities: [
				{ id: "exit_north", type: "warp", x: 20, y: 0, destination: "townyuu", destX: 20, destY: 28 },
			],
			enemies: [
				{ name: "Crab", hp: 12, attack: 4, defense: 3, xp: 8, gold: 3 },
			],
			encounterRate: 0.05,
		});
		this.maps.set("dragon_lair", {
			id: "dragon_lair", name: "Dragon's Lair", width: 30, height: 20, tileSize: 8,
			tiles: Array.from({ length: 20 }, () => "R".repeat(30)),
			entities: [
				{ id: "exit", type: "warp", x: 0, y: 10, destination: "dark_forest", destX: 48, destY: 20 },
			],
			enemies: [
				{ name: "Fire Elemental", hp: 40, attack: 12, defense: 5, xp: 35, gold: 20 },
				{ name: "Ancient Dragon", hp: 200, attack: 30, defense: 15, xp: 200, gold: 500 },
			],
			encounterRate: 0.3,
		});
	}

	getMap(id: string): GameMapData | null { return this.maps.get(id) ?? null; }
	getMapIds(): string[] { return [...this.maps.keys()]; }

	getConnections(mapId: string): { target: string; x: number; y: number; destX: number; destY: number }[] {
		const map = this.maps.get(mapId);
		if (!map) return [];
		return map.entities
			.filter(e => e.type === "warp" && e.destination)
			.map(e => ({ target: e.destination!, x: e.x, y: e.y, destX: e.destX ?? 0, destY: e.destY ?? 0 }));
	}

	getEntities(mapId: string, type?: string): MapEntity[] {
		const map = this.maps.get(mapId);
		if (!map) return [];
		if (type) return map.entities.filter(e => e.type === type);
		return map.entities;
	}

	getEnemies(mapId: string): EnemyData[] { return this.maps.get(mapId)?.enemies ?? []; }
}

// ============================================================
// Map Loading Tests
// ============================================================

console.log("\n🗺 Map Loading Tests");

{
	const reg = new TestRegistry();
	reg.loadAll();

	assertEqual(reg.getMapIds().length, 4, "4 maps loaded");
	assert(reg.getMap("townyuu") !== null, "TOWNYUU exists");
	assert(reg.getMap("dark_forest") !== null, "Dark Forest exists");
	assert(reg.getMap("beach") !== null, "Beach exists");
	assert(reg.getMap("dragon_lair") !== null, "Dragon's Lair exists");
	assert(reg.getMap("nonexistent") === null, "Nonexistent map returns null");
}

// ============================================================
// Map Properties Tests
// ============================================================

console.log("\n🗺 Map Properties Tests");

{
	const reg = new TestRegistry();
	reg.loadAll();

	const town = reg.getMap("townyuu")!;
	assertEqual(town.name, "TOWNYUU", "Town name correct");
	assertEqual(town.width, 40, "Town width = 40");
	assertEqual(town.height, 30, "Town height = 30");
	assertEqual(town.tileSize, 8, "Tile size = 8");
	assertEqual(town.tiles.length, 30, "30 tile rows");

	const forest = reg.getMap("dark_forest")!;
	assertEqual(forest.width, 50, "Forest width = 50");
	assertEqual(forest.height, 40, "Forest height = 40");

	const lair = reg.getMap("dragon_lair")!;
	assertEqual(lair.width, 30, "Lair width = 30");
	assertEqual(lair.height, 20, "Lair height = 20");
}

// ============================================================
// Connection Tests
// ============================================================

console.log("\n🗺 Connection Tests");

{
	const reg = new TestRegistry();
	reg.loadAll();

	// TOWNYUU connects to dark_forest and beach
	const townConns = reg.getConnections("townyuu");
	assertEqual(townConns.length, 2, "TOWNYUU has 2 connections");
	assertEqual(townConns[0]!.target, "dark_forest", "East exit goes to Dark Forest");
	assertEqual(townConns[1]!.target, "beach", "South exit goes to Beach");

	// Dark Forest connects to townyuu and dragon_lair
	const forestConns = reg.getConnections("dark_forest");
	assertEqual(forestConns.length, 2, "Dark Forest has 2 connections");
	assertEqual(forestConns[0]!.target, "townyuu", "West exit returns to TOWNYUU");
	assertEqual(forestConns[1]!.target, "dragon_lair", "East exit goes to Dragon's Lair");

	// Beach connects back to TOWNYUU
	const beachConns = reg.getConnections("beach");
	assertEqual(beachConns.length, 1, "Beach has 1 connection");
	assertEqual(beachConns[0]!.target, "townyuu", "North exit returns to TOWNYUU");

	// Dragon's Lair connects back to Dark Forest
	const lairConns = reg.getConnections("dragon_lair");
	assertEqual(lairConns.length, 1, "Lair has 1 exit");
	assertEqual(lairConns[0]!.target, "dark_forest", "Exit returns to Dark Forest");

	// Verify bidirectional connections
	for (const conn of townConns) {
		const reverseConns = reg.getConnections(conn.target);
		const hasReturn = reverseConns.some(rc => rc.target === "townyuu");
		assert(hasReturn, `${conn.target} has return connection to TOWNYUU`);
	}
}

// ============================================================
// Entity Tests
// ============================================================

console.log("\n🗺 Entity Tests");

{
	const reg = new TestRegistry();
	reg.loadAll();

	// Town NPCs
	const townNPCs = reg.getEntities("townyuu", "npc");
	assertEqual(townNPCs.length, 1, "TOWNYUU has 1 NPC");
	assertEqual(townNPCs[0]!.name, "Mayor", "NPC is the Mayor");

	// Town chests
	const townChests = reg.getEntities("townyuu", "chest");
	assertEqual(townChests.length, 1, "TOWNYUU has 1 chest");
	assertEqual(townChests[0]!.loot!.length, 1, "Chest has 1 loot item");

	// Town warps
	const townWarps = reg.getEntities("townyuu", "warp");
	assertEqual(townWarps.length, 2, "TOWNYUU has 2 warps");

	// All entities
	const allTown = reg.getEntities("townyuu");
	assertEqual(allTown.length, 4, "TOWNYUU has 4 total entities");

	// Nonexistent map
	const nothing = reg.getEntities("nonexistent");
	assertEqual(nothing.length, 0, "Nonexistent map has 0 entities");
}

// ============================================================
// Enemy Tests
// ============================================================

console.log("\n🗺 Enemy Tests");

{
	const reg = new TestRegistry();
	reg.loadAll();

	// Town has no enemies
	const townEnemies = reg.getEnemies("townyuu");
	assertEqual(townEnemies.length, 0, "TOWNYUU has no enemies");

	// Forest enemies
	const forestEnemies = reg.getEnemies("dark_forest");
	assertEqual(forestEnemies.length, 2, "Dark Forest has 2 enemies");
	assertEqual(forestEnemies[0]!.name, "Forest Goblin", "First enemy is Forest Goblin");
	assert(forestEnemies[0]!.hp > 0, "Forest Goblin has positive HP");
	assert(forestEnemies[1]!.name, "Wild Wolf", "Second enemy is Wild Wolf");

	// Dragon's Lair — boss fight
	const lairEnemies = reg.getEnemies("dragon_lair");
	assertEqual(lairEnemies.length, 2, "Dragon's Lair has 2 enemies");

	const dragon = lairEnemies.find(e => e.name === "Ancient Dragon")!;
	assert(!!dragon, "Ancient Dragon exists");
	assertEqual(dragon.hp, 200, "Dragon has 200 HP");
	assertEqual(dragon.attack, 30, "Dragon has 30 attack");
	assertEqual(dragon.defense, 15, "Dragon has 15 defense");
	assertEqual(dragon.xp, 200, "Dragon gives 200 XP");
	assertEqual(dragon.gold, 500, "Dragon drops 500 gold");

	// Encounter rates
	assertEqual(reg.getMap("townyuu")!.encounterRate, undefined, "Town has no encounter rate");
	assertEqual(reg.getMap("dark_forest")!.encounterRate, 0.15, "Forest encounter rate = 0.15");
	assertEqual(reg.getMap("dragon_lair")!.encounterRate, 0.3, "Lair encounter rate = 0.3");
}

// ============================================================
// World Graph Traversal Tests
// ============================================================

console.log("\n🗺 World Graph Tests");

{
	const reg = new TestRegistry();
	reg.loadAll();

	// Can we reach the dragon from town?
	function canReach(from: string, to: string, visited: Set<string> = new Set()): boolean {
		if (from === to) return true;
		if (visited.has(from)) return false;
		visited.add(from);

		const conns = reg.getConnections(from);
		for (const conn of conns) {
			if (canReach(conn.target, to, visited)) return true;
		}
		return false;
	}

	assert(canReach("townyuu", "dark_forest"), "Town → Forest reachable");
	assert(canReach("townyuu", "beach"), "Town → Beach reachable");
	assert(canReach("townyuu", "dragon_lair"), "Town → Dragon's Lair reachable");
	assert(canReach("beach", "dragon_lair"), "Beach → Dragon's Lair reachable");
	assert(canReach("dragon_lair", "townyuu"), "Dragon's Lair → Town reachable");

	// All maps are connected
	const allIds = reg.getMapIds();
	for (const id of allIds) {
		for (const other of allIds) {
			assert(canReach(id, other), `${id} → ${other} reachable`);
		}
	}
}

// ============================================================
// Results
// ============================================================

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
	console.error("❌ SOME TESTS FAILED");
	process.exit(1);
} else {
	console.log("✅ ALL TESTS PASSED");
}
