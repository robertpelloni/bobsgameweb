/**
 * Tests for Mining, Farming, and Cooking.
 * Run: npx tsx src/__tests__/rpg-professions.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { MiningSystem } from "../renderer/engine/rpg/MiningSystem";
import { FarmingSystem } from "../renderer/engine/rpg/FarmingSystem";
import { CookingSystem } from "../renderer/engine/rpg/CookingSystem";

console.log("\n⛏ Mining System Tests");
{
	const mining = new MiningSystem();
	assertEqual(mining.getLevel(), 1, "Start at level 1");

	let itemsFound = 0;
	for(let i=0; i<50; i++) {
		const res = mining.mine("iron");
		itemsFound += res.items.length;
	}
	assert(itemsFound > 0, `Mined ${itemsFound} items in 50 swings`);
	assert(mining.getLevel() > 1, `Leveled up to ${mining.getLevel()}`);

	const resLow = mining.mine("mithril");
	assertEqual(resLow.msg, "Mining level too low", "Cannot mine high level ore early");
}

console.log("\n🌾 Farming System Tests");
{
	const farming = new FarmingSystem();
	assert(farming.plant(0, "wheat"), "Planted wheat");
	assertEqual(farming.getStage(0), "seed", "Initial stage is seed");

	farming.water(0);
	// In a real test we'd mock time, but here we just check logic flow
}

console.log("\n🍳 Cooking System Tests");
{
	const cooking = new CookingSystem();
	const meal1 = cooking.cook(["raw_meat", "herb"]);
	assertEqual(meal1.id, "stew", "Meat + Herb = Stew");
	assertEqual(meal1.buff.stat, "hp", "Stew buffs HP");

	const meal2 = cooking.cook(["raw_meat"]);
	assertEqual(meal2.id, "steak", "Meat only = Steak");

	const meal3 = cooking.cook(["shoe"]);
	assertEqual(meal3.id, "burnt", "Invalid ingredients = Burnt toast");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
