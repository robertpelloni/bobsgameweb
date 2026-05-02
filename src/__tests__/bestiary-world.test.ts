/**
 * Tests for Bestiary + World Map systems — enemies, difficulty, filtering, power ratings.
 *
 * Run with: npx tsx src/__tests__/bestiary-world.test.ts
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

// ============================================================
// Bestiary Enemy Classification Tests
// ============================================================

console.log("\n📖 Bestiary Classification Tests");

{
	type EnemyType = "normal" | "elite" | "boss";

	function getEnemyType(hp: number, gold: number): EnemyType {
		if (gold >= 200) return "boss";
		if (hp >= 50) return "elite";
		return "normal";
	}

	assertEqual(getEnemyType(12, 3), "normal", "Crab = normal");
	assertEqual(getEnemyType(20, 8), "normal", "Forest Goblin = normal");
	assertEqual(getEnemyType(40, 20), "normal", "Fire Elemental = normal (HP < 50, gold < 200)");
	assertEqual(getEnemyType(60, 30), "elite", "Lava Golem = elite (HP ≥ 50)");
	assertEqual(getEnemyType(200, 500), "boss", "Ancient Dragon = boss (gold ≥ 200)");
	assertEqual(getEnemyType(200, 50), "elite", "High HP but low gold = elite");
	assertEqual(getEnemyType(100, 200), "boss", "Gold threshold triggers boss even at lower HP");
}

// ============================================================
// Difficulty Rating Tests
// ============================================================

console.log("\n⭐ Difficulty Rating Tests");

{
	function getDifficulty(hp: number, attack: number): number {
		const power = hp + attack * 2;
		if (power < 25) return 1;
		if (power < 50) return 2;
		if (power < 100) return 3;
		if (power < 200) return 4;
		return 5;
	}

	assertEqual(getDifficulty(12, 4), 1, "Crab = 1 star");
	assertEqual(getDifficulty(8, 6), 1, "Jellyfish = 1 star");
	assertEqual(getDifficulty(20, 5), 2, "Forest Goblin = 2 stars");
	assertEqual(getDifficulty(30, 8), 2, "Wild Wolf = 2 stars");
	assertEqual(getDifficulty(40, 12), 3, "Fire Elemental = 3 stars");
	assertEqual(getDifficulty(60, 15), 3, "Lava Golem = 3 stars");
	assertEqual(getDifficulty(80, 15), 4, "Ancient Golem = 4 stars");
	assertEqual(getDifficulty(200, 30), 5, "Ancient Dragon = 5 stars");

	// Edge cases
	assertEqual(getDifficulty(0, 0), 1, "0/0 = 1 star minimum");
	assertEqual(getDifficulty(500, 50), 5, "Overpowered = 5 stars");
}

// ============================================================
// Power Calculation Tests
// ============================================================

console.log("\n⚔ Power Calculation Tests");

{
	function calcPower(hp: number, atk: number, def: number): number {
		return hp + atk * 2 + def;
	}

	assertEqual(calcPower(200, 30, 15), 275, "Dragon power = 275");
	assertEqual(calcPower(12, 4, 3), 23, "Crab power = 23");
	assertEqual(calcPower(60, 15, 8), 98, "Lava Golem power = 98");

	// Power ordering
	const enemies = [
		{ name: "Crab", power: calcPower(12, 4, 3) },
		{ name: "Goblin", power: calcPower(20, 5, 2) },
		{ name: "Golem", power: calcPower(60, 15, 8) },
		{ name: "Dragon", power: calcPower(200, 30, 15) },
	];
	enemies.sort((a, b) => a.power - b.power);
	assertEqual(enemies[0]!.name, "Crab", "Crab weakest");
	assertEqual(enemies[3]!.name, "Dragon", "Dragon strongest");
}

// ============================================================
// Location Filtering Tests
// ============================================================

console.log("\n🗺 Location Filtering Tests");

{
	interface Enemy { name: string; location: string }
	const enemies: Enemy[] = [
		{ name: "Crab", location: "Sunset Beach" },
		{ name: "Jellyfish", location: "Sunset Beach" },
		{ name: "Goblin", location: "Dark Forest" },
		{ name: "Wolf", location: "Dark Forest" },
		{ name: "Fire Elemental", location: "Dragon's Lair" },
		{ name: "Ancient Dragon", location: "Dragon's Lair" },
	];

	function filter(location: string | null): Enemy[] {
		if (!location) return enemies;
		return enemies.filter(e => e.location === location);
	}

	assertEqual(filter(null).length, 6, "All locations = 6 enemies");
	assertEqual(filter("Sunset Beach").length, 2, "Beach = 2 enemies");
	assertEqual(filter("Dark Forest").length, 2, "Forest = 2 enemies");
	assertEqual(filter("Dragon's Lair").length, 2, "Lair = 2 enemies");
	assertEqual(filter("TOWNYUU").length, 0, "TOWNYUU = 0 enemies");

	// Verify specific enemies in locations
	const beachEnemies = filter("Sunset Beach");
	assert(beachEnemies.some(e => e.name === "Crab"), "Crab found at beach");
	assert(beachEnemies.some(e => e.name === "Jellyfish"), "Jellyfish found at beach");
}

// ============================================================
// Encounter Rate Tests
// ============================================================

console.log("\n🎲 Encounter Rate Tests");

{
	const encounterRates: Record<string, number> = {
		townyuu: 0,
		dark_forest: 0.15,
		beach: 0.05,
		dragon_lair: 0.3,
	};

	// Verify rates are valid [0, 1]
	for (const [map, rate] of Object.entries(encounterRates)) {
		assert(rate >= 0 && rate <= 1, `${map} encounter rate ${rate} is valid [0,1]`);
	}

	// Town is safe
	assertEqual(encounterRates.townyuu, 0, "TOWNYUU has zero encounter rate");

	// Dragon's Lair is most dangerous
	assert(encounterRates.dragon_lair > encounterRates.dark_forest, "Lair > Forest encounter rate");
	assert(encounterRates.dragon_lair > encounterRates.beach, "Lair > Beach encounter rate");
	assert(encounterRates.dark_forest > encounterRates.beach, "Forest > Beach encounter rate");

	// Simulate encounters
	let encounters = 0;
	const trials = 10000;
	for (let i = 0; i < trials; i++) {
		if (Math.random() < encounterRates.dark_forest) encounters++;
	}
	const observed = encounters / trials;
	assert(Math.abs(observed - 0.15) < 0.05, `Forest encounter rate ~15% (observed: ${(observed * 100).toFixed(1)}%)`);
}

// ============================================================
// HP Bar Color Tests
// ============================================================

console.log("\n💊 HP Bar Color Tests");

{
	function getBarColor(ratio: number): string {
		if (ratio > 0.5) return "green";
		if (ratio > 0.25) return "yellow";
		return "red";
	}

	assertEqual(getBarColor(1.0), "green", "100% HP = green");
	assertEqual(getBarColor(0.75), "green", "75% HP = green");
	assertEqual(getBarColor(0.5), "yellow", "50% HP = yellow");
	assertEqual(getBarColor(0.3), "yellow", "30% HP = yellow");
	assertEqual(getBarColor(0.25), "red", "25% HP = red");
	assertEqual(getBarColor(0.1), "red", "10% HP = red");
	assertEqual(getBarColor(0.0), "red", "0% HP = red");
}

// ============================================================
// XP/Gold Reward Curve Tests
// ============================================================

console.log("\n📈 Reward Curve Tests");

{
	interface Enemy { name: string; hp: number; xp: number; gold: number }
	const enemies: Enemy[] = [
		{ name: "Crab", hp: 12, xp: 8, gold: 3 },
		{ name: "Goblin", hp: 20, xp: 15, gold: 8 },
		{ name: "Wolf", hp: 30, xp: 25, gold: 12 },
		{ name: "Fire Elemental", hp: 40, xp: 35, gold: 20 },
		{ name: "Lava Golem", hp: 60, xp: 50, gold: 30 },
		{ name: "Dragon", hp: 200, xp: 200, gold: 500 },
	];

	// XP scales with HP (roughly)
	for (let i = 1; i < enemies.length; i++) {
		assert(enemies[i]!.xp > enemies[i - 1]!.xp, `${enemies[i]!.name} gives more XP than ${enemies[i - 1]!.name}`);
		assert(enemies[i]!.gold > enemies[i - 1]!.gold, `${enemies[i]!.name} drops more gold than ${enemies[i - 1]!.name}`);
	}

	// XP/HP ratio sanity check
	for (const e of enemies) {
		const ratio = e.xp / e.hp;
		assert(ratio >= 0.5 && ratio <= 1.5, `${e.name} XP/HP ratio ${ratio.toFixed(2)} is reasonable`);
	}
}

// ============================================================
// Map Area Connectivity Tests
// ============================================================

console.log("\n🗺 Map Connectivity Tests");

{
	interface Warp { from: string; to: string }
	const warps: Warp[] = [
		{ from: "townyuu", to: "dark_forest" },
		{ from: "townyuu", to: "beach" },
		{ from: "dark_forest", to: "townyuu" },
		{ from: "dark_forest", to: "dragon_lair" },
		{ from: "beach", to: "townyuu" },
		{ from: "dragon_lair", to: "dark_forest" },
	];

	// Every warp has a return path
	for (const warp of warps) {
		const hasReturn = warps.some(w => w.from === warp.to && w.to === warp.from);
		assert(hasReturn, `${warp.from} → ${warp.to} has return path`);
	}

	// Count outgoing warps per map
	function outCount(map: string): number {
		return warps.filter(w => w.from === map).length;
	}
	assertEqual(outCount("townyuu"), 2, "TOWNYUU has 2 exits");
	assertEqual(outCount("dark_forest"), 2, "Dark Forest has 2 exits");
	assertEqual(outCount("beach"), 1, "Beach has 1 exit");
	assertEqual(outCount("dragon_lair"), 1, "Dragon's Lair has 1 exit");
}

// ============================================================
// Scroll/Pagination Tests
// ============================================================

console.log("\n📜 Scroll/Pagination Tests");

{
	const items = Array.from({ length: 11 }, (_, i) => `Enemy ${i + 1}`);
	const maxVisible = 5;

	function getVisible(items: string[], offset: number, max: number): string[] {
		return items.slice(offset, offset + max);
	}

	// Page 1
	const p1 = getVisible(items, 0, maxVisible);
	assertEqual(p1.length, 5, "Page 1 shows 5 items");
	assertEqual(p1[0], "Enemy 1", "Page 1 starts at Enemy 1");

	// Page 2
	const p2 = getVisible(items, 5, maxVisible);
	assertEqual(p2.length, 5, "Page 2 shows 5 items");
	assertEqual(p2[0], "Enemy 6", "Page 2 starts at Enemy 6");

	// Page 3
	const p3 = getVisible(items, 10, maxVisible);
	assertEqual(p3.length, 1, "Page 3 shows 1 item");
	assertEqual(p3[0], "Enemy 11", "Page 3 shows last enemy");

	// Max scroll offset
	const maxOffset = Math.max(0, items.length - maxVisible);
	assertEqual(maxOffset, 6, "Max scroll offset = 6");
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
