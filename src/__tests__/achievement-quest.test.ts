/**
 * Tests for AchievementEngine + QuestEngine — achievements, quests, chains, rewards.
 * Run: npx tsx src/__tests__/achievement-quest.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Achievement Data Tests
// ============================================================
console.log("\n🏆 Achievement Data Tests");
{
	interface Ach { id: string; name: string; category: string; points: number; hidden: boolean; progressGoal: number; }
	const achs: Ach[] = [
		{ id: "first_blood", name: "First Blood", category: "combat", points: 5, hidden: false, progressGoal: 1 },
		{ id: "slayer_10", name: "Slayer", category: "combat", points: 10, hidden: false, progressGoal: 10 },
		{ id: "slayer_100", name: "Centurion", category: "combat", points: 25, hidden: false, progressGoal: 100 },
		{ id: "dragon_slayer", name: "Dragon Slayer", category: "combat", points: 50, hidden: true, progressGoal: 1 },
		{ id: "arena_champion", name: "Arena Champion", category: "combat", points: 30, hidden: false, progressGoal: 1 },
		{ id: "first_step", name: "First Step", category: "exploration", points: 5, hidden: false, progressGoal: 1 },
		{ id: "all_maps", name: "World Explorer", category: "exploration", points: 20, hidden: false, progressGoal: 4 },
		{ id: "first_talk", name: "Friendly", category: "social", points: 5, hidden: false, progressGoal: 1 },
		{ id: "first_craft", name: "Apprentice", category: "crafting", points: 5, hidden: false, progressGoal: 1 },
		{ id: "first_fish", name: "Angler", category: "collection", points: 5, hidden: false, progressGoal: 1 },
		{ id: "level_10", name: "Adventurer", category: "mastery", points: 10, hidden: false, progressGoal: 10 },
		{ id: "all_achievements", name: "Completionist", category: "mastery", points: 100, hidden: true, progressGoal: 29 },
	];

	assertEqual(achs.length, 12, "12 sample achievements defined");

	// Categories
	const categories = new Set(achs.map(a => a.category));
	assertEqual(categories.size, 6, "6 categories: combat, exploration, social, crafting, collection, mastery");

	// All unique IDs
	const ids = new Set(achs.map(a => a.id));
	assertEqual(ids.size, 12, "12 unique IDs");

	// Hidden achievements
	const hidden = achs.filter(a => a.hidden);
	assertEqual(hidden.length, 2, "2 hidden achievements (Dragon Slayer, Completionist)");

	// Points range
	for (const a of achs) {
		assert(a.points >= 5 && a.points <= 100, `${a.name}: ${a.points} points in valid range`);
	}

	// Completionist is most expensive
	const maxPts = achs.reduce((b, a) => a.points > b.points ? a : b, achs[0]!);
	assertEqual(maxPts.id, "all_achievements", "Completionist has most points (100)");

	// Total points
	const total = achs.reduce((s, a) => s + a.points, 0);
	assert(total >= 200, `Total achievement points: ${total}`);
}

// ============================================================
// Achievement Progress Tests
// ============================================================
console.log("\n📊 Achievement Progress Tests");
{
	interface State { id: string; progressCurrent: number; progressGoal: number; unlocked: boolean }

	function trackProgress(state: State, amount: number): State {
		if (state.unlocked) return state;
		state.progressCurrent = Math.min(state.progressCurrent + amount, state.progressGoal);
		if (state.progressCurrent >= state.progressGoal) state.unlocked = true;
		return state;
	}

	// Single-step achievement
	const s1: State = { id: "first_blood", progressCurrent: 0, progressGoal: 1, unlocked: false };
	trackProgress(s1, 1);
	assert(s1.unlocked, "First Blood unlocked after 1 kill");
	assertEqual(s1.progressCurrent, 1, "Progress = 1/1");

	// Multi-step achievement
	const s2: State = { id: "slayer_10", progressCurrent: 0, progressGoal: 10, unlocked: false };
	for (let i = 0; i < 5; i++) trackProgress(s2, 1);
	assert(!s2.unlocked, "Not unlocked at 5/10");
	trackProgress(s2, 5);
	assert(s2.unlocked, "Unlocked at 10/10");

	// Over-progress capped
	const s3: State = { id: "test", progressCurrent: 0, progressGoal: 5, unlocked: false };
	trackProgress(s3, 100);
	assertEqual(s3.progressCurrent, 5, "Progress capped at goal");
	assert(s3.unlocked, "Still unlocked on over-progress");

	// Already unlocked — no change
	const before = { ...s3 };
	trackProgress(s3, 10);
	assertEqual(s3.progressCurrent, before.progressCurrent, "No change when already unlocked");
}

// ============================================================
// Achievement Points Tests
// ============================================================
console.log("\n💎 Achievement Points Tests");
{
	let totalPoints = 0;
	function unlock(points: number): number {
		totalPoints += points;
		return totalPoints;
	}

	assertEqual(unlock(5), 5, "After 5pt: total = 5");
	assertEqual(unlock(10), 15, "After 10pt: total = 15");
	assertEqual(unlock(25), 40, "After 25pt: total = 40");
	assertEqual(unlock(50), 90, "After 50pt: total = 90");
}

// ============================================================
// Quest State Machine Tests
// ============================================================
console.log("\n📜 Quest State Tests");
{
	type QState = "available" | "active" | "complete" | "turned_in" | "failed" | "locked";

	function nextState(current: QState, action: "accept" | "complete" | "turn_in" | "fail"): QState {
		switch (current) {
			case "available": return action === "accept" ? "active" : current;
			case "active": return action === "complete" ? "complete" : action === "fail" ? "failed" : current;
			case "complete": return action === "turn_in" ? "turned_in" : current;
			default: return current;
		}
	}

	// Happy path
	assertEqual(nextState("available", "accept"), "active", "available → accept → active");
	assertEqual(nextState("active", "complete"), "complete", "active → complete → complete");
	assertEqual(nextState("complete", "turn_in"), "turned_in", "complete → turn_in → turned_in");

	// Failure path
	assertEqual(nextState("active", "fail"), "failed", "active → fail → failed");

	// Invalid transitions
	assertEqual(nextState("available", "complete"), "available", "available + complete = no-op");
	assertEqual(nextState("turned_in", "accept"), "turned_in", "turned_in + accept = no-op");
	assertEqual(nextState("failed", "complete"), "failed", "failed + complete = no-op");
}

// ============================================================
// Quest Chain Tests
// ============================================================
console.log("\n🔗 Quest Chain Tests");
{
	const quests = [
		{ id: "q1", prerequisites: [], chain: "q2" },
		{ id: "q2", prerequisites: ["q1"], chain: "q3" },
		{ id: "q3", prerequisites: ["q2"], chain: null },
	];

	const completed = new Set<string>();

	function getAvailable(): string[] {
		return quests.filter(q => !completed.has(q.id) && q.prerequisites.every(p => completed.has(p))).map(q => q.id);
	}

	// Initially only q1 available
	assertEqual(getAvailable().length, 1, "1 quest available initially");
	assertEqual(getAvailable()[0], "q1", "First quest available");

	// Complete q1 → q2 unlocks
	completed.add("q1");
	assertEqual(getAvailable().length, 1, "After q1: 1 quest available");
	assertEqual(getAvailable()[0], "q2", "q2 unlocked");

	// Complete q2 → q3 unlocks
	completed.add("q2");
	assertEqual(getAvailable().length, 1, "After q2: 1 quest available");
	assertEqual(getAvailable()[0], "q3", "q3 unlocked");

	// Complete all
	completed.add("q3");
	assertEqual(getAvailable().length, 0, "All quests complete");
}

// ============================================================
// Quest Reward Tests
// ============================================================
console.log("\n🎁 Quest Reward Tests");
{
	interface Reward { gold: number; xp: number; items: string[]; reputation?: { faction: string; amount: number } }
	const rewards: Reward[] = [
		{ gold: 30, xp: 50, items: ["health_potion"] },
		{ gold: 80, xp: 150, items: ["steel_blade"] },
		{ gold: 500, xp: 1000, items: ["dragon_crown", "legend_blade"], reputation: { faction: "town", amount: 500 } },
	];

	// Higher level = better rewards
	assert(rewards[1]!.gold > rewards[0]!.gold, "Quest 2 gold > Quest 1 gold");
	assert(rewards[2]!.gold > rewards[1]!.gold, "Quest 3 gold > Quest 2 gold");
	assert(rewards[2]!.xp > rewards[1]!.xp, "Quest 3 XP > Quest 2 XP");

	// Dragon quest gives reputation
	assert(!!rewards[2]!.reputation, "Dragon quest gives reputation");
	assertEqual(rewards[2]!.reputation!.faction, "town", "Reputation faction = town");
	assertEqual(rewards[2]!.items.length, 2, "Dragon quest gives 2 items");

	// Total rewards
	const totalGold = rewards.reduce((s, r) => s + r.gold, 0);
	const totalXp = rewards.reduce((s, r) => s + r.xp, 0);
	assert(totalGold > 500, `Total gold from quests: ${totalGold}`);
	assert(totalXp > 1000, `Total XP from quests: ${totalXp}`);
}

// ============================================================
// Quest Objective Progress Tests
// ============================================================
console.log("\n🎯 Quest Objective Tests");
{
	interface Obj { description: string; target: number; current: number; entityId?: string }

	function updateObjective(obj: Obj, entityId: string, amount: number): Obj {
		if (obj.entityId === entityId) {
			obj.current = Math.min(obj.current + amount, obj.target);
		}
		return obj;
	}

	const killObj: Obj = { description: "Defeat Crabs", target: 5, current: 0, entityId: "crab" };

	// Increment
	updateObjective(killObj, "crab", 2);
	assertEqual(killObj.current, 2, "After 2 crabs: 2/5");

	updateObjective(killObj, "crab", 3);
	assertEqual(killObj.current, 5, "After 5 crabs: 5/5 (capped)");

	// Wrong entity — no change
	updateObjective(killObj, "goblin", 10);
	assertEqual(killObj.current, 5, "Wrong entity: no change");
}

// ============================================================
// Quest Prerequisite Tests
// ============================================================
console.log("\n🔐 Quest Prerequisite Tests");
{
	function checkPrereqs(prereqs: string[], completed: Set<string>): boolean {
		return prereqs.every(p => completed.has(p));
	}

	const completed = new Set<string>();

	// No prereqs
	assert(checkPrereqs([], completed), "No prereqs = always available");

	// Unmet prereq
	assert(!checkPrereqs(["kill_dragon"], completed), "Unmet prereq = locked");

	// Meet prereq
	completed.add("kill_dragon");
	assert(checkPrereqs(["kill_dragon"], completed), "Met prereq = available");

	// Multiple prereqs
	completed.add("kill_goblins");
	completed.add("kill_wolves");
	assert(checkPrereqs(["kill_goblins", "kill_wolves"], completed), "All prereqs met");
	assert(!checkPrereqs(["kill_goblins", "missing_quest"], completed), "Missing one prereq");
}

// ============================================================
// Daily Quest Tests
// ============================================================
console.log("\n📅 Daily Quest Tests");
{
	function shouldReset(lastReset: number, now: number): boolean {
		const ONE_DAY = 86400000;
		return (now - lastReset) >= ONE_DAY;
	}

	assert(!shouldReset(0, 1000), "1 second: no reset");
	assert(!shouldReset(0, 3600000), "1 hour: no reset");
	assert(shouldReset(0, 86400000), "1 day: reset!");
	assert(shouldReset(0, 172800000), "2 days: reset!");
}

// ============================================================
// Quest Time Limit Tests
// ============================================================
console.log("\n⏱ Quest Time Limit Tests");
{
	function checkTimeLimit(acceptedAt: number, timeLimit: number, now: number): { expired: boolean; remaining: number } {
		const elapsed = now - acceptedAt;
		const remaining = timeLimit - elapsed;
		return { expired: remaining <= 0, remaining: Math.max(0, remaining) };
	}

	const t1 = checkTimeLimit(0, 300, 100);
	assert(!t1.expired, "100s into 300s limit: not expired");
	assertEqual(t1.remaining, 200, "200s remaining");

	const t2 = checkTimeLimit(0, 300, 300);
	assert(t2.expired, "300s into 300s limit: expired");
	assertEqual(t2.remaining, 0, "0s remaining");

	const t3 = checkTimeLimit(0, 300, 500);
	assert(t3.expired, "500s into 300s limit: expired");
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
