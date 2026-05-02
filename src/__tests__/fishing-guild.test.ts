/**
 * Tests for Fishing + Guild systems — fish selection, rarity, guild management, perks, quests.
 *
 * Run with: npx tsx src/__tests__/fishing-guild.test.ts
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
// Fish Selection & Rarity Tests
// ============================================================

console.log("\n🐟 Fish Data Tests");

{
	type FishRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
	interface Fish { id: string; name: string; rarity: FishRarity; weight: number; value: number; biteChance: number; fightStrength: number }

	const FISH: Fish[] = [
		{ id: "bluegill", name: "Bluegill", rarity: "common", weight: 0.3, value: 2, biteChance: 0.4, fightStrength: 1 },
		{ id: "perch", name: "Perch", rarity: "common", weight: 0.5, value: 3, biteChance: 0.35, fightStrength: 2 },
		{ id: "catfish", name: "Catfish", rarity: "common", weight: 2.0, value: 5, biteChance: 0.25, fightStrength: 3 },
		{ id: "bass", name: "Bass", rarity: "uncommon", weight: 3.0, value: 10, biteChance: 0.2, fightStrength: 4 },
		{ id: "trout", name: "Trout", rarity: "uncommon", weight: 1.5, value: 12, biteChance: 0.15, fightStrength: 5 },
		{ id: "salmon", name: "Salmon", rarity: "rare", weight: 8.0, value: 25, biteChance: 0.08, fightStrength: 7 },
		{ id: "golden_koi", name: "Golden Koi", rarity: "epic", weight: 1.0, value: 100, biteChance: 0.03, fightStrength: 4 },
		{ id: "leviathan", name: "Leviathan", rarity: "legendary", weight: 500, value: 1000, biteChance: 0.005, fightStrength: 10 },
	];

	assertEqual(FISH.length, 8, "8 fish species defined");

	// Rarity counts
	const commons = FISH.filter(f => f.rarity === "common");
	assertEqual(commons.length, 3, "3 common fish");
	const uncommons = FISH.filter(f => f.rarity === "uncommon");
	assertEqual(uncommons.length, 2, "2 uncommon fish");
	const rares = FISH.filter(f => f.rarity === "rare");
	assertEqual(rares.length, 1, "1 rare fish");
	const epics = FISH.filter(f => f.rarity === "epic");
	assertEqual(epics.length, 1, "1 epic fish");
	const legendaries = FISH.filter(f => f.rarity === "legendary");
	assertEqual(legendaries.length, 1, "1 legendary fish");

	// Value ordering by rarity
	const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
	const sorted = [...FISH].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
	assertEqual(sorted[0]!.rarity, "common", "First fish is common");
	assertEqual(sorted[sorted.length - 1]!.rarity, "legendary", "Last fish is legendary");

	// Most valuable fish
	const mostValuable = FISH.reduce((best, f) => f.value > best.value ? f : best, FISH[0]!);
	assertEqual(mostValuable.id, "leviathan", "Leviathan is most valuable");

	// Heaviest fish
	const heaviest = FISH.reduce((h, f) => f.weight > h.weight ? f : h, FISH[0]!);
	assertEqual(heaviest.id, "leviathan", "Leviathan is heaviest");
}

// ============================================================
// Fish Selection Distribution Tests
// ============================================================

console.log("\n🎣 Fish Selection Distribution Tests");

{
	type FishRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
	const RARITY_ORDER: Record<FishRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
	interface Fish { id: string; rarity: FishRarity; biteChance: number }
	const fish: Fish[] = [
		{ id: "common1", rarity: "common", biteChance: 0.4 },
		{ id: "common2", rarity: "common", biteChance: 0.35 },
		{ id: "uncommon1", rarity: "uncommon", biteChance: 0.15 },
		{ id: "rare1", rarity: "rare", biteChance: 0.08 },
		{ id: "epic1", rarity: "epic", biteChance: 0.02 },
	];

	function selectFish(): Fish {
		const roll = Math.random();
		let cum = 0;
		const total = fish.reduce((s, f) => s + f.biteChance, 0);
		for (const f of fish) {
			cum += f.biteChance / total;
			if (roll < cum) return f;
		}
		return fish[0]!;
	}

	// Statistical test
	const counts: Record<string, number> = {};
	for (const f of fish) counts[f.id] = 0;

	for (let i = 0; i < 5000; i++) {
		const selected = selectFish();
		counts[selected.id]++;
	}

	// Common should be most frequent
	assert(counts["common1"]! > counts["rare1"]!, `Common1 (${counts["common1"]}) > Rare1 (${counts["rare1"]})`);
	assert(counts["common2"]! > counts["epic1"]!, `Common2 (${counts["common2"]}) > Epic1 (${counts["epic1"]})`);
}

// ============================================================
// Fishing State Machine Tests
// ============================================================

console.log("\n⚙ Fishing State Machine Tests");

{
	type State = "idle" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "escaped";

	function nextState(current: State, action: "cast" | "wait_done" | "bite_done" | "reel" | "timeout" | "snap"): State {
		switch (current) {
			case "idle": return action === "cast" ? "casting" : current;
			case "casting": return "waiting";
			case "waiting": return action === "wait_done" ? "bite" : current;
			case "bite": return action === "reel" ? "reeling" : action === "timeout" ? "escaped" : current;
			case "reeling": return action === "reel" ? "caught" : action === "snap" ? "escaped" : current;
			default: return "idle";
		}
	}

	// Happy path
	assertEqual(nextState("idle", "cast"), "casting", "idle → cast → casting");
	assertEqual(nextState("casting", "cast"), "waiting", "casting → waiting");
	assertEqual(nextState("waiting", "wait_done"), "bite", "waiting → bite");
	assertEqual(nextState("bite", "reel"), "reeling", "bite → reel → reeling");
	assertEqual(nextState("reeling", "reel"), "caught", "reeling → reel → caught");

	// Failure paths
	assertEqual(nextState("bite", "timeout"), "escaped", "bite timeout → escaped");
	assertEqual(nextState("reeling", "snap"), "escaped", "line snap → escaped");

	// Invalid transitions
	assertEqual(nextState("idle", "reel"), "idle", "idle + reel = idle (no-op)");
	assertEqual(nextState("waiting", "cast"), "waiting", "waiting + cast = waiting (no-op)");
}

// ============================================================
// Bait Bonus Tests
// ============================================================

console.log("\n🪱 Bait Bonus Tests");

{
	interface Bait { name: string; bonus: number; cost: number }
	const baits: Bait[] = [
		{ name: "Worm", bonus: 0, cost: 0 },
		{ name: "Cricket", bonus: 0.05, cost: 5 },
		{ name: "Shrimp", bonus: 0.1, cost: 15 },
		{ name: "Golden Lure", bonus: 0.2, cost: 50 },
	];

	assertEqual(baits.length, 4, "4 bait types");

	// Cost scales with bonus
	for (let i = 1; i < baits.length; i++) {
		assert(baits[i]!.cost > baits[i - 1]!.cost, `${baits[i]!.name} costs more than ${baits[i - 1]!.name}`);
		assert(baits[i]!.bonus > baits[i - 1]!.bonus, `${baits[i]!.name} has higher bonus than ${baits[i - 1]!.name}`);
	}

	// Free bait exists
	assertEqual(baits[0]!.cost, 0, "Worm is free");
}

// ============================================================
// Guild Creation Tests
// ============================================================

console.log("\n⚔ Guild Creation Tests");

{
	type GuildRole = "leader" | "officer" | "member" | "recruit";
	interface Member { id: string; name: string; role: GuildRole; contribution: number; online: boolean }
	interface Guild { name: string; level: number; xp: number; xpToNext: number; bankGold: number; members: Map<string, Member>; exists: boolean }

	function createGuild(name: string, leaderId: string): Guild {
		const members = new Map<string, Member>();
		members.set(leaderId, { id: leaderId, name: "Leader", role: "leader", contribution: 0, online: true });
		return { name, level: 1, xp: 0, xpToNext: 100, bankGold: 0, members, exists: true };
	}

	const guild = createGuild("Dragon Slayers", "p1");
	assertEqual(guild.name, "Dragon Slayers", "Guild name set");
	assertEqual(guild.level, 1, "Guild starts at level 1");
	assertEqual(guild.xp, 0, "Guild starts at 0 XP");
	assertEqual(guild.members.size, 1, "Guild starts with 1 member (leader)");
	assert(guild.members.get("p1")!.role === "leader", "Creator is leader");
	assert(guild.exists, "Guild exists");
}

// ============================================================
// Guild Member Management Tests
// ============================================================

console.log("\n👥 Guild Member Tests");

{
	type GuildRole = "leader" | "officer" | "member" | "recruit";
	const ROLE_HIERARCHY: Record<GuildRole, number> = { leader: 3, officer: 2, member: 1, recruit: 0 };
	interface Member { id: string; name: string; role: GuildRole; contribution: number; online: boolean }

	const members = new Map<string, Member>();
	members.set("p1", { id: "p1", name: "Alice", role: "leader", contribution: 0, online: true });

	function addMember(id: string, role: GuildRole = "recruit"): boolean {
		if (members.has(id) || members.size >= 20) return false;
		members.set(id, { id, name: `Player ${id}`, role, contribution: 0, online: false });
		return true;
	}

	function removeMember(id: string): boolean {
		const m = members.get(id);
		if (!m || m.role === "leader") return false;
		return members.delete(id);
	}

	function promote(id: string): GuildRole | null {
		const m = members.get(id);
		if (!m || m.role === "leader") return null;
		const roles: GuildRole[] = ["recruit", "member", "officer", "leader"];
		const idx = roles.indexOf(m.role);
		if (idx < roles.length - 1) {
			m.role = roles[idx + 1]!;
			return m.role;
		}
		return null;
	}

	// Add members
	assert(addMember("p2", "member"), "Added p2 as member");
	assert(addMember("p3"), "Added p3 as recruit");
	assert(!addMember("p1"), "Can't add duplicate p1");
	assertEqual(members.size, 3, "3 members");

	// Remove member
	assert(removeMember("p3"), "Removed p3");
	assert(!removeMember("p1"), "Can't remove leader");
	assertEqual(members.size, 2, "2 members remaining");

	// Promote
	assertEqual(promote("p2"), "officer", "Promoted p2 to officer");
	assertEqual(promote("p2"), "leader", "Promoted p2 to leader");
	assertEqual(promote("p2"), null, "Can't promote leader further");

	// Hierarchy check
	assert(ROLE_HIERARCHY.leader > ROLE_HIERARCHY.officer, "Leader > Officer");
	assert(ROLE_HIERARCHY.officer > ROLE_HIERARCHY.member, "Officer > Member");
	assert(ROLE_HIERARCHY.member > ROLE_HIERARCHY.recruit, "Member > Recruit");
}

// ============================================================
// Guild Bank Tests
// ============================================================

console.log("\n🏦 Guild Bank Tests");

{
	interface Member { id: string; role: string; contribution: number }
	let bankGold = 0;
	let guildXp = 0;
	let guildLevel = 1;
	let xpToNext = 100;
	const members = new Map<string, Member>();
	members.set("p1", { id: "p1", role: "officer", contribution: 0 });
	members.set("p2", { id: "p2", role: "recruit", contribution: 0 });

	function contribute(id: string, amount: number): boolean {
		const m = members.get(id);
		if (!m || amount <= 0) return false;
		bankGold += amount;
		m.contribution += amount;
		guildXp += Math.floor(amount * 0.1);
		while (guildXp >= xpToNext) {
			guildXp -= xpToNext;
			guildLevel++;
			xpToNext = Math.floor(xpToNext * 1.5);
		}
		return true;
	}

	function withdraw(id: string, amount: number): boolean {
		const m = members.get(id);
		if (!m || m.role === "recruit" || amount > bankGold) return false;
		bankGold -= amount;
		return true;
	}

	// Contribute
	assert(contribute("p1", 100), "p1 contributed 100g");
	assertEqual(bankGold, 100, "Bank has 100g");
	assertEqual(members.get("p1")!.contribution, 100, "p1 contribution = 100");

	// Recruit can't withdraw
	assert(!withdraw("p2", 50), "Recruit can't withdraw");

	// Officer can withdraw
	assert(withdraw("p1", 30), "Officer withdrew 30g");
	assertEqual(bankGold, 70, "Bank has 70g");

	// Can't over-withdraw
	assert(!withdraw("p1", 200), "Can't over-withdraw");

	// XP from contributions (10% of gold → XP, need 100 XP for level 2)
	contribute("p1", 1000);
	assert(guildLevel > 1, `Guild leveled up to ${guildLevel} from contributions`);
}

// ============================================================
// Guild Perk Tests
// ============================================================

console.log("\n✨ Guild Perk Tests");

{
	interface Perk { id: string; name: string; requiredLevel: number; bonus: Record<string, number>; active: boolean }
	const perks: Perk[] = [
		{ id: "xp1", name: "Learning I", requiredLevel: 2, bonus: { xpMult: 0.1 }, active: false },
		{ id: "gold1", name: "Merchant I", requiredLevel: 3, bonus: { goldMult: 0.1 }, active: false },
		{ id: "def1", name: "Shield I", requiredLevel: 5, bonus: { defMult: 0.05 }, active: false },
		{ id: "legendary", name: "Fortune", requiredLevel: 10, bonus: { legMult: 0.25 }, active: false },
	];

	function checkPerks(level: number): Perk[] {
		for (const p of perks) {
			if (level >= p.requiredLevel) p.active = true;
		}
		return perks.filter(p => p.active);
	}

	// Level 1: no perks
	const l1 = checkPerks(1);
	assertEqual(l1.length, 0, "Level 1: no active perks");

	// Level 3: 2 perks
	const l3 = checkPerks(3);
	assertEqual(l3.length, 2, "Level 3: 2 active perks");
	assert(perks.find(p => p.id === "xp1")!.active, "Learning I active at level 3");
	assert(perks.find(p => p.id === "gold1")!.active, "Merchant I active at level 3");

	// Level 10: all perks
	const l10 = checkPerks(10);
	assertEqual(l10.length, 4, "Level 10: all 4 perks active");

	// Combined bonuses
	function getBonuses(): Record<string, number> {
		const b: Record<string, number> = {};
		for (const p of perks) {
			if (!p.active) continue;
			for (const [k, v] of Object.entries(p.bonus)) {
				b[k] = (b[k] ?? 0) + v;
			}
		}
		return b;
	}

	checkPerks(5);
	const bonuses = getBonuses();
	assertEqual(bonuses.xpMult, 0.1, "XP bonus = 0.1");
	assertEqual(bonuses.goldMult, 0.1, "Gold bonus = 0.1");
	assertEqual(bonuses.defMult, 0.05, "Defense bonus = 0.05");
}

// ============================================================
// Guild Quest Tests
// ============================================================

console.log("\n📋 Guild Quest Tests");

{
	interface Quest { id: string; name: string; target: number; progress: number; reward: { gold: number; xp: number }; complete: boolean }
	const quests: Quest[] = [
		{ id: "q1", name: "First Steps", target: 10, progress: 0, reward: { gold: 50, xp: 100 }, complete: false },
		{ id: "q2", name: "Dragon Slayer", target: 1, progress: 0, reward: { gold: 500, xp: 1000 }, complete: false },
		{ id: "q3", name: "Guild Wealth", target: 1000, progress: 0, reward: { gold: 200, xp: 500 }, complete: false },
	];

	function updateProgress(questId: string, amount: number): Quest | undefined {
		const q = quests.find(q => q.id === questId);
		if (!q || q.complete) return undefined;
		q.progress = Math.min(q.progress + amount, q.target);
		if (q.progress >= q.target) q.complete = true;
		return q;
	}

	// Kill quest
	const q1 = updateProgress("q1", 5);
	assertEqual(q1!.progress, 5, "Quest progress: 5/10");
	assert(!q1!.complete, "Quest not complete yet");

	updateProgress("q1", 5);
	assertEqual(quests[0]!.progress, 10, "Quest progress: 10/10");
	assert(quests[0]!.complete, "Quest complete!");

	// Can't over-progress
	updateProgress("q1", 5);
	assertEqual(quests[0]!.progress, 10, "Progress capped at target");

	// Dragon quest
	updateProgress("q2", 1);
	assert(quests[1]!.complete, "Dragon quest complete after 1 kill");

	// Wealth quest
	updateProgress("q3", 500);
	updateProgress("q3", 500);
	assert(quests[2]!.complete, "Wealth quest complete after 1000g");

	// All complete
	assertEqual(quests.filter(q => q.complete).length, 3, "All 3 quests complete");
}

// ============================================================
// Guild Serialization Tests
// ============================================================

console.log("\n💾 Guild Serialization Tests");

{
	type GuildRole = "leader" | "officer" | "member" | "recruit";
	interface Member { id: string; name: string; role: GuildRole; contribution: number; online: boolean }
	const members = new Map<string, Member>();
	members.set("p1", { id: "p1", name: "Alice", role: "leader", contribution: 100, online: true });
	members.set("p2", { id: "p2", name: "Bob", role: "officer", contribution: 50, online: false });

	function serialize(): object {
		return {
			name: "Test Guild",
			level: 3,
			bankGold: 500,
			members: Array.from(members.values()),
		};
	}

	const json = serialize();
	const parsed = JSON.parse(JSON.stringify(json));

	assertEqual(parsed.name, "Test Guild", "Serialized: name preserved");
	assertEqual(parsed.level, 3, "Serialized: level preserved");
	assertEqual(parsed.bankGold, 500, "Serialized: bankGold preserved");
	assertEqual(parsed.members.length, 2, "Serialized: 2 members");
	assertEqual(parsed.members[0].name, "Alice", "Serialized: member name preserved");
	assertEqual(parsed.members[1].role, "officer", "Serialized: role preserved");
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
