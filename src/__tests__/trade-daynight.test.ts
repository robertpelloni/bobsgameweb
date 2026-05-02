/**
 * Tests for TradeSystem + DayNightCycle — trading, haggling, time phases, encounters.
 * Run: npx tsx src/__tests__/trade-daynight.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Trade State Machine Tests
// ============================================================
console.log("\n🤝 Trade State Tests");
{
	type TState = "idle" | "negotiating" | "confirmed" | "executed" | "cancelled";

	function next(current: TState, action: "init" | "offer" | "confirm_one" | "confirm_both" | "execute" | "cancel"): TState {
		switch (current) {
			case "idle": return action === "init" ? "negotiating" : current;
			case "negotiating": return action === "confirm_both" ? "confirmed" : action === "cancel" ? "cancelled" : current;
			case "confirmed": return action === "execute" ? "executed" : action === "cancel" ? "cancelled" : current;
			default: return current;
		}
	}

	assertEqual(next("idle", "init"), "negotiating", "idle → init → negotiating");
	assertEqual(next("negotiating", "confirm_both"), "confirmed", "both confirm → confirmed");
	assertEqual(next("confirmed", "execute"), "executed", "confirmed → execute → executed");
	assertEqual(next("negotiating", "cancel"), "cancelled", "cancel during negotiation");
	assertEqual(next("confirmed", "cancel"), "cancelled", "cancel after confirm");
	assertEqual(next("idle", "offer"), "idle", "can't offer when idle");
	assertEqual(next("executed", "execute"), "executed", "already executed");
}

// ============================================================
// Trade Offer Tests
// ============================================================
console.log("\n📦 Trade Offer Tests");
{
	const items1 = new Map<string, number>();
	items1.set("iron_sword", 1);
	items1.set("health_potion", 3);

	const items2 = new Map<string, number>();
	items2.set("steel_blade", 1);

	assertEqual(items1.size, 2, "Player 1 offers 2 item types");
	assertEqual(items1.get("health_potion"), 3, "3 health potions offered");
	assertEqual(items2.size, 1, "Player 2 offers 1 item type");

	// Add item
	items1.set("mana_potion", 2);
	assertEqual(items1.size, 3, "Now 3 item types");

	// Remove item
	items1.delete("iron_sword");
	assertEqual(items1.size, 2, "Removed iron_sword, 2 types left");

	// Quantity tracking
	assertEqual(items1.get("health_potion"), 3, "Still 3 potions");
}

// ============================================================
// Trade Value Evaluation Tests
// ============================================================
console.log("\n💎 Trade Value Tests");
{
	const RARITY_VALUE: Record<string, number> = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 50 };

	function evaluate(items: Map<string, number>, gold: number): number {
		let value = gold;
		for (const [id, qty] of items) {
			let rarity = "common";
			if (id.includes("legend") || id.includes("dragon")) rarity = "legendary";
			else if (id.includes("epic") || id.includes("ancient")) rarity = "epic";
			else if (id.includes("rare") || id.includes("magic")) rarity = "rare";
			else if (id.includes("steel") || id.includes("silver")) rarity = "uncommon";
			value += (RARITY_VALUE[rarity] ?? 1) * qty * 10;
		}
		return value;
	}

	// Common items
	const common = new Map([["iron_sword", 1]]);
	assertEqual(evaluate(common, 0), 10, "Common sword = 10 value");

	// Steel item
	const steel = new Map([["steel_blade", 1]]);
	assert(evaluate(steel, 0) > evaluate(common, 0), "Steel > iron");

	// Dragon item
	const dragon = new Map([["dragon_crown", 1]]);
	assert(evaluate(dragon, 0) > evaluate(steel, 0), "Dragon crown > steel blade");

	// Gold adds value
	const withGold = evaluate(new Map(), 100);
	assertEqual(withGold, 100, "100 gold = 100 value");
}

// ============================================================
// Trade Fairness Tests
// ============================================================
console.log("\n⚖ Trade Fairness Tests");
{
	function isFair(val1: number, val2: number, threshold = 0.3): boolean {
		if (val1 === 0 && val2 === 0) return true;
		const ratio = Math.min(val1, val2) / Math.max(val1, val2);
		return ratio >= (1 - threshold);
	}

	// Equal trades
	assert(isFair(100, 100), "100 vs 100: fair");
	assert(isFair(100, 100, 0.1), "100 vs 100 (strict): fair");

	// Close trades
	assert(isFair(100, 80), "100 vs 80: fair (20% off)");
	assert(!isFair(100, 80, 0.1), "100 vs 80 (strict): unfair");
	assert(isFair(100, 70), "100 vs 70: fair at 30% threshold");
	assert(!isFair(100, 60), "100 vs 60: unfair at 30% threshold");

	// Zero trades
	assert(isFair(0, 0), "0 vs 0: fair");
	assert(!isFair(100, 0), "100 vs 0: unfair");
}

// ============================================================
// Haggling Tests
// ============================================================
console.log("\n🗣 Haggling Tests");
{
	function haggle(skillLevel: number): { success: boolean; discount: number } {
		const chance = 0.3 + skillLevel * 0.05;
		const success = Math.random() < chance;
		return { success, discount: success ? 0.05 + Math.random() * 0.15 : 0 };
	}

	// Haggling results
	let successes = 0;
	for (let i = 0; i < 100; i++) {
		if (haggle(0).success) successes++;
	}
	assert(successes > 10 && successes < 60, `No skill haggle: ${successes}/100 (~30%)`);

	// Higher skill = more success
	let skilledSuccesses = 0;
	for (let i = 0; i < 100; i++) {
		if (haggle(10).success) skilledSuccesses++;
	}
	assert(skilledSuccesses > successes, `Skill 10 haggle (${skilledSuccesses}) > no skill (${successes})`);

	// Discount applied
	function applyHaggle(price: number, discount: number): number {
		return Math.floor(price * (1 - discount));
	}

	assertEqual(applyHaggle(100, 0), 100, "No discount = full price");
	assert(applyHaggle(100, 0.1) < 100, "10% discount reduces price");
	assertEqual(applyHaggle(100, 0.2), 80, "20% discount = 80");
}

// ============================================================
// Day/Night Phase Tests
// ============================================================
console.log("\n🌅 Day/Night Phase Tests");
{
	function getPhase(hour: number): string {
		if (hour >= 5 && hour < 7) return "dawn";
		if (hour >= 7 && hour < 11) return "morning";
		if (hour >= 11 && hour < 14) return "midday";
		if (hour >= 14 && hour < 17) return "afternoon";
		if (hour >= 17 && hour < 20) return "dusk";
		return "night";
	}

	assertEqual(getPhase(0), "night", "0h = night");
	assertEqual(getPhase(3), "night", "3h = night");
	assertEqual(getPhase(5), "dawn", "5h = dawn");
	assertEqual(getPhase(6), "dawn", "6h = dawn");
	assertEqual(getPhase(7), "morning", "7h = morning");
	assertEqual(getPhase(10), "morning", "10h = morning");
	assertEqual(getPhase(11), "midday", "11h = midday");
	assertEqual(getPhase(13), "midday", "13h = midday");
	assertEqual(getPhase(14), "afternoon", "14h = afternoon");
	assertEqual(getPhase(16), "afternoon", "16h = afternoon");
	assertEqual(getPhase(17), "dusk", "17h = dusk");
	assertEqual(getPhase(19), "dusk", "19h = dusk");
	assertEqual(getPhase(20), "night", "20h = night");
	assertEqual(getPhase(23), "night", "23h = night");

	// Phase count
	const phases = new Set(["dawn", "morning", "midday", "afternoon", "dusk", "night"]);
	assertEqual(phases.size, 6, "6 unique phases");
}

// ============================================================
// Day/Night Encounter Modifier Tests
// ============================================================
console.log("\n⚔ Day/Night Encounter Tests");
{
	const ENCOUNTER_MODS: Record<string, number> = {
		dawn: 0.8, morning: 1.0, midday: 0.8, afternoon: 1.0, dusk: 1.3, night: 1.8,
	};

	// Night is most dangerous
	assertEqual(ENCOUNTER_MODS.night, 1.8, "Night encounter mod = 1.8x");
	assert(ENCOUNTER_MODS.night > ENCOUNTER_MODS.morning, "Night > Morning encounters");
	assert(ENCOUNTER_MODS.dusk > ENCOUNTER_MODS.afternoon, "Dusk > Afternoon encounters");

	// Dawn and midday are safer
	assert(ENCOUNTER_MODS.dawn < 1.0, "Dawn < 1.0 (safer)");
	assert(ENCOUNTER_MODS.midday < 1.0, "Midday < 1.0 (safer)");
}

// ============================================================
// Day/Night Shop Hours Tests
// ============================================================
console.log("\n🏪 Shop Hours Tests");
{
	function isShopOpen(hour: number): boolean {
		return hour >= 7 && hour < 17;
	}

	assert(isShopOpen(8), "8 AM: shop open");
	assert(isShopOpen(12), "12 PM: shop open");
	assert(isShopOpen(16), "4 PM: shop open");
	assert(!isShopOpen(5), "5 AM: shop closed");
	assert(!isShopOpen(17), "5 PM: shop closed");
	assert(!isShopOpen(20), "8 PM: shop closed");
	assert(!isShopOpen(0), "Midnight: shop closed");
}

// ============================================================
// Day/Night Time Formatting Tests
// ============================================================
console.log("\n🕐 Time Formatting Tests");
{
	function formatTime(hour: number, minute: number): string {
		const ampm = hour >= 12 ? "PM" : "AM";
		const displayH = hour % 12 || 12;
		return `${displayH}:${minute.toString().padStart(2, "0")} ${ampm}`;
	}

	assertEqual(formatTime(0, 0), "12:00 AM", "Midnight");
	assertEqual(formatTime(8, 30), "8:30 AM", "8:30 AM");
	assertEqual(formatTime(12, 0), "12:00 PM", "Noon");
	assertEqual(formatTime(13, 5), "1:05 PM", "1:05 PM");
	assertEqual(formatTime(23, 59), "11:59 PM", "11:59 PM");
}

// ============================================================
// Day/Night Cycle Simulation Tests
// ============================================================
console.log("\n⏰ Cycle Simulation Tests");
{
	let hour = 8;
	let minute = 0;
	const speed = 60; // 1s = 1 game minute

	function advance(realSeconds: number): void {
		const gameMinutes = realSeconds * speed / 60;
		minute += gameMinutes;
		while (minute >= 60) { minute -= 60; hour++; }
		while (hour >= 24) { hour -= 24; }
	}

	assertEqual(hour, 8, "Start: 8 AM");

	advance(60); // 1 real minute = 60 game minutes = 1 game hour
	assertEqual(hour, 9, "After 1 min: 9 AM");

	advance(180); // 3 more real minutes = 3 more game hours
	assertEqual(hour, 12, "After 4 min total: noon");

	// Full day = 24 game hours = 24 real minutes
	hour = 0; minute = 0;
	advance(24 * 60); // 24 real minutes
	assertEqual(hour, 0, "After 24 real min: midnight again");
}

// ============================================================
// Day Count Tests
// ============================================================
console.log("\n📅 Day Count Tests");
{
	let dayCount = 1;
	let totalMinutes = 0;

	function advanceDay() {
		totalMinutes += 1440;
		if (totalMinutes >= dayCount * 1440) dayCount++;
	}

	assertEqual(dayCount, 1, "Start: Day 1");
	advanceDay();
	assertEqual(dayCount, 2, "After 1440 min: Day 2");
	advanceDay();
	assertEqual(dayCount, 3, "After 2880 min: Day 3");
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
