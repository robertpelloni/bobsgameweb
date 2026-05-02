/**
 * Tests for Enchantment + Reputation systems.
 * Run: npx tsx src/__tests__/enchant-rep.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Enchantment Success Rate Tests
// ============================================================
console.log("\n🔮 Enchantment Rate Tests");
{
	const RATES: Record<number, number> = { 1:1.0, 2:0.9, 3:0.8, 4:0.7, 5:0.6, 6:0.5, 7:0.4, 8:0.3, 9:0.2, 10:0.1 };

	assertEqual(RATES[1], 1.0, "+1 is guaranteed (100%)");
	assertEqual(RATES[5], 0.6, "+5 = 60%");
	assertEqual(RATES[10], 0.1, "+10 = 10%");

	// Rates decrease monotonically
	for (let i = 2; i <= 10; i++) {
		assert(RATES[i]! < RATES[i-1]!, `+${i} rate < +${i-1} rate`);
	}
}

// ============================================================
// Upgrade Cost Tests
// ============================================================
console.log("\n💰 Upgrade Cost Tests");
{
	const COSTS: Record<number, number> = { 1:50, 2:100, 3:200, 4:400, 5:800, 6:1600, 7:3200, 8:6400, 9:12800, 10:25600 };

	// Costs double each level
	for (let i = 2; i <= 10; i++) {
		assertEqual(COSTS[i], COSTS[i-1]! * 2, `+${i} cost = 2 × +${i-1} cost`);
	}

	// Total cost to +10
	const total = Object.values(COSTS).reduce((s, c) => s + c, 0);
	assert(total > 50000, `Total cost to +10: ${total}g (expensive!)`);
}

// ============================================================
// Enchantment Application Tests
// ============================================================
console.log("\n⚔ Enchantment Apply Tests");
{
	type EType = "fire"|"ice"|"lightning"|"holy"|"shadow"|"nature";
	const CONFIG: Record<EType, { color: number; attackBonus: number }> = {
		fire: { color: 0xff4422, attackBonus: 0.05 },
		ice: { color: 0x44ccff, attackBonus: 0.04 },
		lightning: { color: 0xffcc44, attackBonus: 0.06 },
		holy: { color: 0xffffaa, attackBonus: 0.03 },
		shadow: { color: 0xaa44ff, attackBonus: 0.07 },
		nature: { color: 0x44ff88, attackBonus: 0.04 },
	};

	const types: EType[] = ["fire","ice","lightning","holy","shadow","nature"];
	assertEqual(types.length, 6, "6 enchantment types");

	// All have unique colors
	const colors = new Set(types.map(t => CONFIG[t].color));
	assertEqual(colors.size, 6, "6 unique colors");

	// Bonus calculation
	function getAttackBonus(level: number, type: EType): number {
		return Math.floor(level * (1 + CONFIG[type].attackBonus) * 2);
	}

	assertEqual(getAttackBonus(1, "fire"), 2, "Fire +1: 2 attack");
	assertEqual(getAttackBonus(5, "fire"), 10, "Fire +5: 10 attack");
	assertEqual(getAttackBonus(10, "shadow"), 21, "Shadow +10: 21 attack");
	assert(getAttackBonus(10, "shadow") > getAttackBonus(10, "holy"), "Shadow > Holy at +10");
}

// ============================================================
// Simulated Enchantment Tests
// ============================================================
console.log("\n🎲 Simulated Enchant Tests");
{
	const RATES: Record<number, number> = { 1:1, 2:0.9, 3:0.8, 4:0.7, 5:0.6, 6:0.5, 7:0.4, 8:0.3, 9:0.2, 10:0.1 };
	
	function simulateEnchant(currentLevel: number, luckBonus = 0): { success: boolean; newLevel: number; destroyed: boolean } {
		const target = currentLevel + 1;
		if (target > 10) return { success: false, newLevel: currentLevel, destroyed: false };
		const rate = Math.min(1, (RATES[target] ?? 0.1) + luckBonus);
		if (Math.random() < rate) return { success: true, newLevel: target, destroyed: false };
		if (target >= 8 && Math.random() < 0.3) return { success: false, newLevel: 0, destroyed: true };
		return { success: false, newLevel: Math.max(1, currentLevel - 1), destroyed: false };
	}

	// +1 always succeeds
	let successCount = 0;
	for (let i = 0; i < 50; i++) {
		if (simulateEnchant(0).success) successCount++;
	}
	assertEqual(successCount, 50, "+1 from +0: 100% success");

	// +5 sometimes succeeds
	let p5success = 0;
	for (let i = 0; i < 200; i++) {
		if (simulateEnchant(4).success) p5success++;
	}
	assert(p5success > 80 && p5success < 160, `+5 success: ${p5success}/200 (~60%)`);

	// Luck bonus helps
	let luckSuccess = 0;
	for (let i = 0; i < 200; i++) {
		if (simulateEnchant(4, 0.2).success) luckSuccess++;
	}
	assert(luckSuccess > p5success, `Luck bonus: ${luckSuccess} > base: ${p5success}`);
}

// ============================================================
// Reputation Level Tests
// ============================================================
console.log("\n🏆 Reputation Level Tests");
{
	type RepLevel = "hated"|"hostile"|"unfriendly"|"neutral"|"friendly"|"honored"|"revered"|"exalted";
	const THRESHOLDS: { min: number; level: RepLevel }[] = [
		{ min: -Infinity, level: "hated" },
		{ min: -1000, level: "hostile" },
		{ min: -500, level: "unfriendly" },
		{ min: -100, level: "neutral" },
		{ min: 100, level: "friendly" },
		{ min: 500, level: "honored" },
		{ min: 1500, level: "revered" },
		{ min: 3000, level: "exalted" },
	];

	function getLevel(value: number): RepLevel {
		let level: RepLevel = "hated";
		for (const t of THRESHOLDS) { if (value >= t.min) level = t.level; }
		return level;
	}

	assertEqual(getLevel(-5000), "hated", "-5000 = hated");
	assertEqual(getLevel(-750), "hostile", "-750 = hostile");
	assertEqual(getLevel(-200), "unfriendly", "-200 = unfriendly");
	assertEqual(getLevel(0), "neutral", "0 = neutral");
	assertEqual(getLevel(100), "friendly", "100 = friendly");
	assertEqual(getLevel(500), "honored", "500 = honored");
	assertEqual(getLevel(1500), "revered", "1500 = revered");
	assertEqual(getLevel(3000), "exalted", "3000 = exalted");
	assertEqual(getLevel(9999), "exalted", "9999 = exalted");

	// 8 levels total
	assertEqual(THRESHOLDS.length, 8, "8 reputation levels");
}

// ============================================================
// Faction Data Tests
// ============================================================
console.log("\n⚔ Faction Tests");
{
	const FACTIONS = ["town", "forest", "beach", "dragon", "underground"] as const;
	assertEqual(FACTIONS.length, 5, "5 factions");

	// Each faction unique
	const set = new Set(FACTIONS);
	assertEqual(set.size, 5, "5 unique faction IDs");
}

// ============================================================
// Reputation Change Tests
// ============================================================
console.log("\n📈 Reputation Change Tests");
{
	let rep: Record<string, number> = { town: 0, forest: 0, beach: 0, dragon: 0, underground: 0 };

	function addRep(faction: string, amount: number): void {
		rep[faction] = Math.max(-5000, Math.min(10000, (rep[faction] ?? 0) + amount));
		// Cross effects
		if (faction === "town") rep["underground"] = (rep["underground"] ?? 0) + Math.floor(amount * -0.3);
		if (faction === "dragon") { rep["town"] = (rep["town"] ?? 0) + Math.floor(amount * -0.3); }
	}

	// Gain town rep
	addRep("town", 200);
	assertEqual(rep.town, 200, "+200 town = 200");
	// Underground decreases
	assert(rep.underground < 0, `Underground decreased: ${rep.underground}`);

	// Gain dragon rep hurts town
	addRep("dragon", 100);
	assert(rep.dragon > 0, `Dragon increased: ${rep.dragon}`);
	assert(rep.town < 200, `Town decreased from dragon: ${rep.town}`);

	// Clamping
	addRep("town", 50000);
	assert(rep.town <= 10000, `Town clamped at 10000: ${rep.town}`);

	addRep("town", -100000);
	assert(rep.town >= -5000, `Town clamped at -5000: ${rep.town}`);
}

// ============================================================
// Reputation Rewards Tests
// ============================================================
console.log("\n🎁 Reputation Reward Tests");
{
	type RepLevel = "hated"|"hostile"|"unfriendly"|"neutral"|"friendly"|"honored"|"revered"|"exalted";
	const LEVELS: RepLevel[] = ["hated","hostile","unfriendly","neutral","friendly","honored","revered","exalted"];

	function meetsRequirement(current: RepLevel, required: RepLevel): boolean {
		return LEVELS.indexOf(current) >= LEVELS.indexOf(required);
	}

	assert(meetsRequirement("exalted", "friendly"), "Exalted meets friendly");
	assert(meetsRequirement("honored", "honored"), "Honored meets honored");
	assert(!meetsRequirement("neutral", "friendly"), "Neutral doesn't meet friendly");
	assert(!meetsRequirement("hated", "neutral"), "Hated doesn't meet neutral");
	assert(meetsRequirement("revered", "friendly"), "Revered meets friendly");

	// Reward availability
	const rewards = [
		{ faction: "town", required: "friendly" as RepLevel, claimed: false },
		{ faction: "town", required: "honored" as RepLevel, claimed: false },
		{ faction: "town", required: "exalted" as RepLevel, claimed: false },
	];

	function available(currentLevel: RepLevel): number {
		return rewards.filter(r => !r.claimed && meetsRequirement(currentLevel, r.required)).length;
	}

	assertEqual(available("neutral"), 0, "Neutral: 0 rewards available");
	assertEqual(available("friendly"), 1, "Friendly: 1 reward");
	assertEqual(available("honored"), 2, "Honored: 2 rewards");
	assertEqual(available("exalted"), 3, "Exalted: 3 rewards");
}

// ============================================================
// NPC Affinity Tests
// ============================================================
console.log("\n👤 NPC Affinity Tests");
{
	let affinity = 0;
	function modify(amount: number): number {
		affinity = Math.max(-100, Math.min(100, affinity + amount));
		return affinity;
	}

	assertEqual(modify(50), 50, "+50 affinity = 50");
	assertEqual(modify(80), 100, "+80 capped at 100");
	assertEqual(modify(-200), -100, "-200 clamped at -100");
	assertEqual(modify(150), 50, "+150 from -100 = 50");
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
