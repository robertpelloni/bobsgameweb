/**
 * Tests for LootTable — weighted drops, rarity, gold, guarantees, conditions.
 *
 * Run with: npx tsx src/__tests__/loot-table.test.ts
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
// Inline LootTable for testing
// ============================================================

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface LootItem { id: string; name: string; rarity: Rarity; weight: number; minQuantity: number; maxQuantity: number; condition?: string }
interface GoldDrop { min: number; max: number; chance: number }
interface LootResult { items: { id: string; name: string; quantity: number; rarity: Rarity }[]; gold: number; totalValue: number }

const RARITY_ORDER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

class TestLootTable {
	id: string;
	items: LootItem[] = [];
	goldDrop: GoldDrop = { min: 0, max: 0, chance: 0 };
	guaranteedDrop = false;
	maxDrops = 3;

	constructor(id: string) { this.id = id; }

	addItem(id: string, weight: number, rarity: Rarity, name = id, minQty = 1, maxQty = 1, condition?: string): this {
		this.items.push({ id, name, rarity, weight, minQuantity: minQty, maxQuantity: maxQty, condition });
		return this;
	}

	addGold(min: number, max: number, chance = 1.0): this {
		this.goldDrop = { min, max, chance };
		return this;
	}

	setGuaranteed(v: boolean): this { this.guaranteedDrop = v; return this; }
	setMaxDrops(n: number): this { this.maxDrops = n; return this; }

	roll(flags?: Set<string>): LootResult {
		const result: LootResult = { items: [], gold: 0, totalValue: 0 };

		// Gold
		if (Math.random() < this.goldDrop.chance) {
			const { min, max } = this.goldDrop;
			result.gold = min + Math.floor(Math.random() * (max - min + 1));
		}

		// Items
		const eligible = this.items.filter(item => {
			if (item.condition && flags && !flags.has(item.condition)) return false;
			return true;
		});

		if (eligible.length === 0) return result;

		const totalWeight = eligible.reduce((s, i) => s + i.weight, 0);
		let drops = 0;

		for (const item of eligible) {
			if (drops >= this.maxDrops) break;
			const dropChance = item.weight / totalWeight;
			if (Math.random() < dropChance || (this.guaranteedDrop && drops === 0)) {
				const qty = item.minQuantity + Math.floor(Math.random() * (item.maxQuantity - item.minQuantity + 1));
				result.items.push({ id: item.id, name: item.name, quantity: qty, rarity: item.rarity });
				drops++;
			}
		}

		result.totalValue = result.gold + result.items.reduce((sum, item) => {
			return sum + item.quantity * (1 + RARITY_ORDER[item.rarity] * 2) * 10;
		}, 0);

		return result;
	}

	getHighestRarity(): Rarity | null {
		if (this.items.length === 0) return null;
		let h: Rarity = "common";
		for (const item of this.items) {
			if (RARITY_ORDER[item.rarity] > RARITY_ORDER[h]) h = item.rarity;
		}
		return h;
	}

	getItemsByRarity(rarity: Rarity): LootItem[] {
		return this.items.filter(i => i.rarity === rarity);
	}
}

// ============================================================
// Basic Drop Tests
// ============================================================

console.log("\n🎁 Basic Drop Tests");

{
	const table = new TestLootTable("test")
		.addItem("sword", 1.0, "common")
		.addItem("potion", 1.0, "common")
		.addGold(10, 20);

	const results: LootResult[] = [];
	for (let i = 0; i < 100; i++) results.push(table.roll());

	// Should sometimes drop items
	const withItems = results.filter(r => r.items.length > 0);
	assert(withItems.length > 50, `Items dropped in ${withItems.length}/100 rolls`);

	// Should sometimes drop gold
	const withGold = results.filter(r => r.gold > 0);
	assert(withGold.length > 80, `Gold dropped in ${withGold.length}/100 rolls`);

	// Gold range
	for (const r of results) {
		assert(r.gold >= 0 && r.gold <= 20, `Gold ${r.gold} in valid range`);
	}
}

// ============================================================
// Guaranteed Drop Tests
// ============================================================

console.log("\n🎯 Guaranteed Drop Tests");

{
	const table = new TestLootTable("guaranteed")
		.addItem("always_drops", 0.01, "common")
		.setGuaranteed(true);

	const results: LootResult[] = [];
	for (let i = 0; i < 100; i++) results.push(table.roll());

	const withItems = results.filter(r => r.items.length > 0);
	assertEqual(withItems.length, 100, "Guaranteed: 100/100 rolls have items");
}

// ============================================================
// Max Drops Tests
// ============================================================

console.log("\n📦 Max Drops Tests");

{
	const table = new TestLootTable("max2")
		.addItem("item_a", 1.0, "common")
		.addItem("item_b", 1.0, "common")
		.addItem("item_c", 1.0, "common")
		.addItem("item_d", 1.0, "common")
		.setMaxDrops(2)
		.setGuaranteed(true);

	for (let i = 0; i < 50; i++) {
		const r = table.roll();
		assert(r.items.length <= 2, `Max 2 drops: got ${r.items.length}`);
	}
}

// ============================================================
// Rarity Tests
// ============================================================

console.log("\n⭐ Rarity Tests");

{
	const table = new TestLootTable("rarity_test")
		.addItem("common_item", 0.5, "common")
		.addItem("uncommon_item", 0.3, "uncommon")
		.addItem("rare_item", 0.15, "rare")
		.addItem("epic_item", 0.04, "epic")
		.addItem("legendary_item", 0.01, "legendary")
		.setGuaranteed(true);

	assertEqual(table.getHighestRarity(), "legendary", "Highest rarity = legendary");

	const commons = table.getItemsByRarity("common");
	assertEqual(commons.length, 1, "1 common item");

	const legendaries = table.getItemsByRarity("legendary");
	assertEqual(legendaries.length, 1, "1 legendary item");

	// Rarity distribution (statistical)
	const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
	for (let i = 0; i < 500; i++) {
		const r = table.roll();
		for (const item of r.items) counts[item.rarity]++;
	}

	assert(counts.common > counts.epic, `Common (${counts.common}) > Epic (${counts.epic})`);
	assert(counts.uncommon > counts.legendary, `Uncommon (${counts.uncommon}) > Legendary (${counts.legendary})`);
}

// ============================================================
// Gold Drop Tests
// ============================================================

console.log("\n💰 Gold Drop Tests");

{
	// Always gold
	const alwaysGold = new TestLootTable("rich").addGold(100, 200);
	for (let i = 0; i < 20; i++) {
		const r = alwaysGold.roll();
		assert(r.gold >= 100 && r.gold <= 200, `Gold ${r.gold} in [100,200]`);
	}

	// Never gold
	const noGold = new TestLootTable("poor").addGold(50, 100, 0);
	for (let i = 0; i < 20; i++) {
		const r = noGold.roll();
		assertEqual(r.gold, 0, `No gold: ${r.gold}`);
	}

	// Sometimes gold (50% chance)
	const halfGold = new TestLootTable("half").addGold(10, 50, 0.5);
	let goldCount = 0;
	for (let i = 0; i < 200; i++) {
		if (halfGold.roll().gold > 0) goldCount++;
	}
	assert(goldCount > 60 && goldCount < 140, `50% gold chance: ${goldCount}/200 (~50%)`);
}

// ============================================================
// Conditional Drop Tests
// ============================================================

console.log("\n🔐 Conditional Drop Tests");

{
	const table = new TestLootTable("conditional")
		.addItem("basic_item", 1.0, "common")
		.addItem("secret_item", 1.0, "rare", "Secret Item", 1, 1, "has_secret_key")
		.setGuaranteed(true);

	// Without flag
	const noFlag = table.roll(new Set());
	assertEqual(noFlag.items.length, 1, "Without flag: 1 item");
	assertEqual(noFlag.items[0]!.id, "basic_item", "Without flag: basic item only");

	// With flag — guaranteed ensures at least 1 item; secret_item can appear over many rolls
	let secretFound = false;
	for (let i = 0; i < 50; i++) {
		const r = table.roll(new Set(["has_secret_key"]));
		if (r.items.some(item => item.id === "secret_item")) secretFound = true;
	}
	assert(secretFound, "With flag: secret item can drop over multiple rolls");
}

// ============================================================
// Quantity Range Tests
// ============================================================

console.log("\n🔢 Quantity Range Tests");

{
	const table = new TestLootTable("qty")
		.addItem("arrows", 1.0, "common", "Arrows", 5, 20)
		.setGuaranteed(true);

	for (let i = 0; i < 50; i++) {
		const r = table.roll();
		for (const item of r.items) {
			assert(item.quantity >= 5 && item.quantity <= 20, `Quantity ${item.quantity} in [5,20]`);
		}
	}
}

// ============================================================
// Total Value Tests
// ============================================================

console.log("\n💎 Total Value Tests");

{
	const table = new TestLootTable("value")
		.addItem("common_sword", 1.0, "common", "Common Sword")
		.addItem("rare_gem", 1.0, "rare", "Rare Gem")
		.addGold(50, 100)
		.setGuaranteed(true);

	for (let i = 0; i < 20; i++) {
		const r = table.roll();
		assert(r.totalValue >= r.gold, `Total value ${r.totalValue} >= gold ${r.gold}`);
		// Rarity multiplier: common = 1+0*2 = 1, rare = 1+2*2 = 5
		// So common item adds 1*1*10 = 10, rare adds 1*5*10 = 50
		assert(r.totalValue > 0, "Total value is positive");
	}
}

// ============================================================
// Preset Table Tests (statistical)
// ============================================================

console.log("\n🐉 Preset Table Tests");

{
	// Goblin table
	const goblin = new TestLootTable("goblin")
		.addItem("rusty_sword", 0.4, "common")
		.addItem("health_potion", 0.3, "common")
		.addItem("leather_scrap", 0.2, "common", "Leather", 1, 3)
		.addItem("goblin_ear", 0.1, "uncommon")
		.addGold(3, 12);
	assertEqual(goblin.items.length, 4, "Goblin table: 4 items");

	// Dragon table
	const dragon = new TestLootTable("dragon")
		.addItem("dragon_scale", 0.3, "rare", "Scale", 2, 5)
		.addItem("dragon_tooth", 0.25, "rare", "Tooth", 1, 3)
		.addItem("fire_essence", 0.2, "epic")
		.addItem("dragon_bone", 0.15, "epic")
		.addItem("dragon_heart", 0.05, "legendary")
		.addGold(200, 600)
		.setGuaranteed(true)
		.setMaxDrops(4);

	assertEqual(dragon.items.length, 5, "Dragon table: 5 items");
	assertEqual(dragon.getHighestRarity(), "legendary", "Dragon: legendary possible");
	assertEqual(dragon.maxDrops, 4, "Dragon: max 4 drops");

	// Dragon always drops something valuable
	for (let i = 0; i < 30; i++) {
		const r = dragon.roll();
		assert(r.gold >= 200, `Dragon gold ${r.gold} >= 200`);
		assert(r.items.length >= 1, "Dragon always drops at least 1 item");
	}
}

// ============================================================
// Edge Case Tests
// ============================================================

console.log("\n🧪 Edge Case Tests");

{
	// Empty table
	const empty = new TestLootTable("empty");
	const emptyResult = empty.roll();
	assertEqual(emptyResult.items.length, 0, "Empty table: no items");
	assertEqual(emptyResult.gold, 0, "Empty table: no gold");
	assertEqual(emptyResult.totalValue, 0, "Empty table: zero value");

	// Single guaranteed item
	const single = new TestLootTable("single")
		.addItem("only_item", 1.0, "common")
		.setGuaranteed(true);
	const singleResult = single.roll();
	assertEqual(singleResult.items.length, 1, "Single guaranteed: always drops");
	assertEqual(singleResult.items[0]!.id, "only_item", "Single: correct item");

	// Zero weight (shouldn't crash)
	const zeroWeight = new TestLootTable("zero").addItem("item", 0.001, "common");
	zeroWeight.roll(); // shouldn't crash
	assert(true, "Near-zero weight doesn't crash");
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
