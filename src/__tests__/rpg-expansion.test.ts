/**
 * Tests for Alchemy, Mounts, and Skill Trees.
 * Run: npx tsx src/__tests__/rpg-expansion.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { AlchemySystem } from "../renderer/engine/rpg/AlchemySystem";
import { MountSystem } from "../renderer/engine/rpg/MountSystem";
import { SkillTreeSystem } from "../renderer/engine/rpg/SkillTreeSystem";

console.log("\n⚗ Alchemy System Tests");
{
	const alchemy = new AlchemySystem();
	assertEqual(alchemy.getLevel(), 1, "Start at level 1");

	// Test Brewing Minor Health (Requires 2x herb, 1x liquid)
	const reagents = [
		{ id: "h1", name: "Green Herb", type: "herb" as const, quality: 1, potency: 5 },
		{ id: "h2", name: "Green Herb", type: "herb" as const, quality: 1, potency: 5 },
		{ id: "l1", name: "Spring Water", type: "liquid" as const, quality: 1, potency: 2 }
	];

	const res = alchemy.brew("minor_health", reagents);
	assert(res.msg !== "Unknown recipe", "Recipe found");

	// Level up
	for(let i=0; i<20; i++) {
		alchemy.brew("minor_health", reagents);
	}
	assert(alchemy.getLevel() > 1, `Leveled up after brewing: ${alchemy.getLevel()}`);
}

console.log("\n🏇 Mount System Tests");
{
	const mounts = new MountSystem();
	assert(mounts.getOwned().length > 0, "Starts with a horse");
	assertEqual(mounts.getActiveMount(), null, "No mount active by default");

	mounts.summon("brown_horse");
	assert(mounts.getActiveMount() !== null, "Horse summoned");
	assertEqual(mounts.getActiveMount()?.name, "Brown Horse", "Summoned correct mount");

	// Speed tests
	const roadSpeed = mounts.getSpeedMultiplier("road");
	const forestSpeed = mounts.getSpeedMultiplier("forest");
	assert(roadSpeed > 1.5, `Road speed (${roadSpeed}) has bonus > 1.5`);
	assertEqual(forestSpeed, 1.5, "Forest speed has no bonus");

	// Fatigue
	mounts.update(10, true);
	assert(mounts.getFatigue() > 0, "Fatigue increased while moving");

	mounts.update(100, false);
	assertEqual(mounts.getFatigue(), 0, "Fatigue recovered while resting");
}

console.log("\n🌳 Skill Tree Tests");
{
	const tree = new SkillTreeSystem();
	assertEqual(tree.getSP(), 0, "Start with 0 SP");

	// Try unlock without SP
	const res1 = tree.unlockSkill("strike");
	assert(!res1.success, "Cannot unlock without SP");

	// Add SP and unlock
	tree.addSP(5);
	const res2 = tree.unlockSkill("strike");
	assert(res2.success, "Unlocked Strike with SP");
	assert(tree.isUnlocked("strike"), "Strike is marked as unlocked");
	assertEqual(tree.getSP(), 4, "SP deducted (5 -> 4)");

	// Test Prerequisite
	const res3 = tree.unlockSkill("power_strike");
	assert(res3.success, "Unlocked Power Strike (Prereq: Strike met)");

	// Test Failed Prerequisite
	tree.addSP(10);
	const res4 = tree.unlockSkill("fireball");
	assert(!res4.success, "Cannot unlock Fireball without Meditation");
	assertEqual(res4.msg, "Requires Meditation", "Error msg mentions missing prereq");

	// Respec
	tree.respec();
	assertEqual(tree.getUnlocked().length, 0, "All skills cleared after respec");
	assertEqual(tree.getSP(), 15, "All SP refunded");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
