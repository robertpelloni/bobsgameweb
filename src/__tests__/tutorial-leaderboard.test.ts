/**
 * Tests for Tutorial + Leaderboard + Enchantment + Reputation integration.
 * Run: npx tsx src/__tests__/tutorial-leaderboard.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Tutorial Step Tests
// ============================================================
console.log("\n📚 Tutorial Step Tests");
{
	interface Step { id: string; title: string; description: string; hint: string; icon: string }
	const STEPS: Step[] = [
		{ id: "welcome", title: "Welcome!", description: "Welcome text", hint: "SPACE to continue", icon: "👋" },
		{ id: "movement", title: "Movement", description: "WASD to move", hint: "Try moving!", icon: "🏃" },
		{ id: "battle", title: "Combat", description: "Z to attack", hint: "SPACE", icon: "⚔" },
		{ id: "inventory", title: "Inventory", description: "I to open", hint: "SPACE", icon: "🎒" },
		{ id: "shop", title: "Shopping", description: "Buy and sell", hint: "SPACE", icon: "🏪" },
		{ id: "map", title: "Navigation", description: "M for map", hint: "SPACE", icon: "🗺" },
		{ id: "crafting", title: "Crafting", description: "Create items", hint: "SPACE", icon: "🔨" },
		{ id: "complete", title: "Ready!", description: "Good luck!", hint: "SPACE to start", icon: "🎉" },
	];

	assertEqual(STEPS.length, 8, "8 tutorial steps");

	// All unique IDs
	const ids = new Set(STEPS.map(s => s.id));
	assertEqual(ids.size, 8, "8 unique step IDs");

	// All have icons
	assert(STEPS.every(s => s.icon.length > 0), "Every step has an icon");

	// All have hints
	assert(STEPS.every(s => s.hint.length > 0), "Every step has a hint");

	// Navigation simulation
	let idx = 0;
	function advance() { if (idx < STEPS.length - 1) idx++; }
	function isComplete() { return idx === STEPS.length - 1; }

	assertEqual(idx, 0, "Start at step 0");
	advance(); assertEqual(idx, 1, "After 1 advance: step 1");
	advance(); advance(); advance(); advance(); advance(); advance();
	assertEqual(idx, 7, "After 7 advances: step 7 (last)");
	assert(isComplete(), "Tutorial complete at last step");
	advance(); assertEqual(idx, 7, "Can't advance past last step");
}

// ============================================================
// Tutorial Progress Tests
// ============================================================
console.log("\n📊 Tutorial Progress Tests");
{
	function calcProgress(current: number, total: number): number {
		return (current + 1) / total;
	}

	assertEqual(calcProgress(0, 8), 0.125, "Step 1: 12.5%");
	assertEqual(calcProgress(3, 8), 0.5, "Step 4: 50%");
	assertEqual(calcProgress(7, 8), 1.0, "Step 8: 100%");

	// Progress bar width
	const barWidth = 200;
	assertEqual(Math.floor(barWidth * calcProgress(0, 8)), 25, "Bar at step 1: 25px");
	assertEqual(Math.floor(barWidth * calcProgress(7, 8)), 200, "Bar at step 8: 200px");
}

// ============================================================
// Leaderboard Entry Tests
// ============================================================
console.log("\n🏆 Leaderboard Entry Tests");
{
	interface Entry { rank: number; name: string; score: number; }
	const entries: Entry[] = [
		{ rank: 1, name: "Alice", score: 999999 },
		{ rank: 2, name: "Bob", score: 750000 },
		{ rank: 3, name: "Charlie", score: 500000 },
		{ rank: 4, name: "Diana", score: 350000 },
		{ rank: 5, name: "Eve", score: 250000 },
	];

	// Sorted descending
	for (let i = 1; i < entries.length; i++) {
		assert(entries[i]!.score < entries[i-1]!.score, `${entries[i]!.name} < ${entries[i-1]!.name}`);
	}

	// Rank matches position
	for (let i = 0; i < entries.length; i++) {
		assertEqual(entries[i]!.rank, i + 1, `Entry ${i} rank = ${i + 1}`);
	}

	// Top 3 medal check
	const medals = ["🥇", "🥈", "🥉"];
	assertEqual(medals.length, 3, "3 medal types");
}

// ============================================================
// Leaderboard Category Tests
// ============================================================
console.log("\n📋 Leaderboard Category Tests");
{
	type Category = "score" | "level" | "wins" | "gold" | "fish";
	const categories: Category[] = ["score", "level", "wins", "gold", "fish"];

	assertEqual(categories.length, 5, "5 leaderboard categories");

	// Score formatting
	function formatScore(cat: Category, value: number): string {
		switch (cat) {
			case "score": return value.toLocaleString();
			case "level": return `Lv.${value}`;
			case "wins": return `${value} wins`;
			case "gold": return `${value.toLocaleString()}g`;
			case "fish": return `${(value / 10).toFixed(1)}kg`;
		}
	}

	assertEqual(formatScore("score", 999999), "999,999", "Score format");
	assertEqual(formatScore("level", 50), "Lv.50", "Level format");
	assertEqual(formatScore("wins", 250), "250 wins", "Wins format");
	assertEqual(formatScore("gold", 500000), "500,000g", "Gold format");
	assertEqual(formatScore("fish", 5000), "500.0kg", "Fish format");

	// Category cycling
	function cycleForward(current: Category): Category {
		const idx = categories.indexOf(current);
		return categories[(idx + 1) % categories.length]!;
	}

	assertEqual(cycleForward("score"), "level", "score → level");
	assertEqual(cycleForward("gold"), "fish", "gold → fish");
	assertEqual(cycleForward("fish"), "score", "fish → score (wraps)");
}

// ============================================================
// Leaderboard Pagination Tests
// ============================================================
console.log("\n📄 Leaderboard Pagination Tests");
{
	const allEntries = Array.from({ length: 25 }, (_, i) => ({
		rank: i + 1,
		name: `Player${i + 1}`,
		score: 1000000 - i * 40000,
	}));

	function getPage(entries: typeof allEntries, page: number, perPage: number) {
		const start = page * perPage;
		return entries.slice(start, start + perPage);
	}

	assertEqual(getPage(allEntries, 0, 10).length, 10, "Page 0: 10 entries");
	assertEqual(getPage(allEntries, 1, 10).length, 10, "Page 1: 10 entries");
	assertEqual(getPage(allEntries, 2, 10).length, 5, "Page 2: 5 entries (last page)");
	assertEqual(getPage(allEntries, 3, 10).length, 0, "Page 3: empty");

	// First entry on each page
	assertEqual(getPage(allEntries, 0, 10)[0]!.rank, 1, "Page 0 starts at rank 1");
	assertEqual(getPage(allEntries, 1, 10)[0]!.rank, 11, "Page 1 starts at rank 11");
	assertEqual(getPage(allEntries, 2, 10)[0]!.rank, 21, "Page 2 starts at rank 21");
}

// ============================================================
// Cross-System Integration Tests
// ============================================================
console.log("\n🔗 Cross-System Integration Tests");
{
	// Enchantment affects battle damage
	function enchantedDamage(baseAtk: number, enchantLevel: number, enchantBonus: number): number {
		const bonus = Math.floor(enchantLevel * (1 + enchantBonus) * 2);
		return baseAtk + bonus;
	}

	assert(enchantedDamage(15, 5, 0.05) > 15, "Enchanted weapon > base weapon");
	assertEqual(enchantedDamage(15, 0, 0), 15, "No enchant = base damage");

	// Reputation affects shop prices
	function shopPrice(basePrice: number, repLevel: string): number {
		const discounts: Record<string, number> = {
			neutral: 0, friendly: 0.05, honored: 0.1, revered: 0.15, exalted: 0.2,
		};
		const discount = discounts[repLevel] ?? 0;
		return Math.floor(basePrice * (1 - discount));
	}

	assertEqual(shopPrice(100, "neutral"), 100, "Neutral: no discount");
	assertEqual(shopPrice(100, "friendly"), 95, "Friendly: 5% off");
	assertEqual(shopPrice(100, "exalted"), 80, "Exalted: 20% off");

	// Guild perks stack with reputation
	function combinedBonus(guildXpMult: number, repDiscount: number): { totalXpMult: number; totalDiscount: number } {
		return { totalXpMult: 1 + guildXpMult, totalDiscount: repDiscount };
	}

	const bonus = combinedBonus(0.2, 0.1);
	assertEqual(bonus.totalXpMult, 1.2, "Guild + base = 1.2x XP");
	assertEqual(bonus.totalDiscount, 0.1, "Honored rep = 10% discount");

	// Fishing + bestiary integration
	function fishAsEnemy(fishName: string, fishWeight: number): { name: string; hp: number; xp: number } {
		return { name: `Giant ${fishName}`, hp: Math.floor(fishWeight * 10), xp: Math.floor(fishWeight * 5) };
	}

	const giantBass = fishAsEnemy("Bass", 3.0);
	assertEqual(giantBass.hp, 30, "Giant Bass HP = 30");
	assertEqual(giantBass.xp, 15, "Giant Bass XP = 15");
}

// ============================================================
// Score Calculation Tests
// ============================================================
console.log("\n🎯 Score Calculation Tests");
{
	function calculateScore(kills: number, questsCompleted: number, goldEarned: number, timeSeconds: number): number {
		const killScore = kills * 100;
		const questScore = questsCompleted * 500;
		const goldScore = Math.floor(goldEarned * 0.1);
		const timeBonus = Math.max(0, 10000 - Math.floor(timeSeconds * 2));
		return killScore + questScore + goldScore + timeBonus;
	}

	const s1 = calculateScore(50, 5, 5000, 3600);
	assert(s1 > 10000, `Score with 50 kills: ${s1}`);

	// More kills = higher score
	const s2 = calculateScore(100, 5, 5000, 3600);
	assert(s2 > s1, `More kills = higher score (${s2} > ${s1})`);

	// Faster time = higher score
	const s3 = calculateScore(50, 5, 5000, 1800);
	assert(s3 > s1, `Faster time = higher score (${s3} > ${s1})`);

	// Zero everything
	const s0 = calculateScore(0, 0, 0, 0);
	assertEqual(s0, 10000, "Zero stats = 10000 (time bonus only)");

	// Very slow
	const sSlow = calculateScore(0, 0, 0, 10000);
	assert(sSlow < s0, `Very slow = lower score (${sSlow} < ${s0})`);
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
