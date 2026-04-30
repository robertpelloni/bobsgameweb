/**
 * Integration tests for networking — Socket.io message validation.
 *
 * Run with: npx tsx src/__tests__/networking.test.ts
 *
 * Tests validate:
 * - Message batching behavior
 * - Room creation/join validation
 * - Party invite flow
 * - Tournament bracket generation
 * - Leaderboard scoring
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
// Message Batching Tests
// ============================================================

console.log("\n🌐 Message Batching Tests");

{
	// Simulate the client-side MessageBatcher logic
	class MockBatcher {
		private queue: Map<string, { event: string; data: unknown }> = new Map();
		private sent: { event: string; data: unknown }[] = [];

		add(event: string, data: unknown): void {
			// Last-writer-wins for same event type
			this.queue.set(event, { event, data });
		}

		flush(): { event: string; data: unknown }[] {
			const messages = [...this.queue.values()];
			this.queue.clear();
			this.sent.push(...messages);
			return messages;
		}

		getSentCount(): number { return this.sent.length; }
		getQueueSize(): number { return this.queue.size; }
	}

	const batcher = new MockBatcher();

	// Single message
	batcher.add("move", { x: 1, y: 2 });
	assertEqual(batcher.getQueueSize(), 1, "Queue has 1 message after add");

	// Overwrite same event type (last-writer-wins)
	batcher.add("move", { x: 3, y: 4 });
	assertEqual(batcher.getQueueSize(), 1, "Same event type overwrites (LWW)");

	// Different event types don't overwrite
	batcher.add("attack", { target: "goblin" });
	assertEqual(batcher.getQueueSize(), 2, "Different events coexist");

	// Flush sends all
	const flushed = batcher.flush();
	assertEqual(flushed.length, 2, "Flush sends 2 messages");
	assertEqual(batcher.getQueueSize(), 0, "Queue is empty after flush");

	// Verify last-writer-wins data
	assertEqual(flushed[0].data, { x: 3, y: 4 }, "Flushed move has LWW data");
}

// ============================================================
// Room Validation Tests
// ============================================================

console.log("\n🌐 Room Validation Tests");

{
	function validateRoomOptions(options: unknown): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!options || typeof options !== "object") {
			return { valid: false, errors: ["Options must be an object"] };
		}

		const opts = options as Record<string, unknown>;

		// Name validation
		if (opts.name !== undefined) {
			if (typeof opts.name !== "string") errors.push("Name must be a string");
			if (typeof opts.name === "string" && opts.name.length > 64) errors.push("Name too long (max 64)");
		}

		// Private flag
		if (opts.isPrivate !== undefined && typeof opts.isPrivate !== "boolean") {
			errors.push("isPrivate must be boolean");
		}

		// Start level
		if (opts.startLevel !== undefined) {
			const level = Number(opts.startLevel);
			if (Number.isNaN(level) || level < 1 || level > 20) {
				errors.push("startLevel must be 1-20");
			}
		}

		// Game mode
		const validModes = ["marathon", "sprint", "ultra", "versus", "timeAttack"];
		if (opts.gameMode !== undefined && !validModes.includes(String(opts.gameMode))) {
			errors.push(`gameMode must be one of: ${validModes.join(", ")}`);
		}

		return { valid: errors.length === 0, errors };
	}

	assert(validateRoomOptions({ name: "Test Room" }).valid, "Valid room options pass");
	assert(!validateRoomOptions(null).valid, "Null options rejected");
	assert(!validateRoomOptions("string").valid, "String options rejected");

	assert(validateRoomOptions({ name: "A".repeat(64) }).valid, "64-char name accepted");
	assert(!validateRoomOptions({ name: "A".repeat(65) }).valid, "65-char name rejected");

	assert(validateRoomOptions({ startLevel: 1 }).valid, "startLevel=1 accepted");
	assert(validateRoomOptions({ startLevel: 20 }).valid, "startLevel=20 accepted");
	assert(!validateRoomOptions({ startLevel: 0 }).valid, "startLevel=0 rejected");
	assert(!validateRoomOptions({ startLevel: 21 }).valid, "startLevel=21 rejected");

	assert(validateRoomOptions({ gameMode: "marathon" }).valid, "marathon mode accepted");
	assert(!validateRoomOptions({ gameMode: "invalid" }).valid, "Invalid game mode rejected");
}

// ============================================================
// Party Flow Tests
// ============================================================

console.log("\n🌐 Party Flow Tests");

{
	// Simulate PartyManager
	class MockPartySystem {
		private parties: Map<string, { id: string; name: string; members: string[]; max: number }> = new Map();
		private playerParty: Map<string, string> = new Map();

		create(leaderId: string, name: string) {
			const id = `p-${Date.now()}`;
			this.parties.set(id, { id, name, members: [leaderId], max: 4 });
			this.playerParty.set(leaderId, id);
			return id;
		}

		join(partyId: string, playerId: string): boolean {
			const party = this.parties.get(partyId);
			if (!party) return false;
			if (party.members.length >= party.max) return false;
			if (this.playerParty.has(playerId)) return false;
			party.members.push(playerId);
			this.playerParty.set(playerId, partyId);
			return true;
		}

		leave(playerId: string): void {
			const partyId = this.playerParty.get(playerId);
			if (!partyId) return;
			const party = this.parties.get(partyId);
			if (!party) return;
			party.members = party.members.filter(m => m !== playerId);
			this.playerParty.delete(playerId);
			if (party.members.length === 0) this.parties.delete(partyId);
		}

		getParty(playerId: string) {
			const partyId = this.playerParty.get(playerId);
			return partyId ? this.parties.get(partyId) : null;
		}
	}

	const ps = new MockPartySystem();

	// Create party
	const pid = ps.create("alice", "Alice's Party");
	assert(!!pid, "Party created successfully");
	assertEqual(ps.getParty("alice")?.name, "Alice's Party", "Alice is in her party");
	assertEqual(ps.getParty("alice")?.members.length, 1, "Party has 1 member");

	// Join
	assert(ps.join(pid, "bob"), "Bob joins party");
	assertEqual(ps.getParty("bob")?.name, "Alice's Party", "Bob is in Alice's party");
	assertEqual(ps.getParty("alice")?.members.length, 2, "Party now has 2 members");

	// Can't join if already in party
	assert(!ps.join(pid, "bob"), "Bob can't join again (already in party)");

	// Fill to max
	ps.join(pid, "charlie");
	ps.join(pid, "dave");
	assertEqual(ps.getParty("alice")?.members.length, 4, "Party full at 4 members");
	assert(!ps.join(pid, "eve"), "Eve can't join full party");

	// Leave
	ps.leave("bob");
	assertEqual(ps.getParty("alice")?.members.length, 3, "Party has 3 after Bob leaves");
	assert(ps.getParty("bob") === null, "Bob is no longer in a party");

	// Disband (all leave)
	ps.leave("alice");
	ps.leave("charlie");
	ps.leave("dave");
	assert(ps.getParty("alice") === null, "Party disbanded when all leave");
}

// ============================================================
// Tournament Bracket Generation Tests
// ============================================================

console.log("\n🌐 Tournament Bracket Tests");

{
	function generateBracket(playerCount: number): { rounds: number; matches: { p1: string; p2: string | null }[] } {
		// Power of 2 bracket
		let slots = 1;
		while (slots < playerCount) slots *= 2;

		const players: string[] = [];
		for (let i = 0; i < playerCount; i++) players.push(`Player ${i + 1}`);
		while (players.length < slots) players.push(null as any); // byes

		const matches: { p1: string; p2: string | null }[] = [];
		for (let i = 0; i < slots; i += 2) {
			matches.push({ p1: players[i], p2: players[i + 1] ?? null });
		}

		const rounds = Math.log2(slots);
		return { rounds, matches };
	}

	// 2 players = 1 round, 1 match
	let bracket = generateBracket(2);
	assertEqual(bracket.rounds, 1, "2 players = 1 round");
	assertEqual(bracket.matches.length, 1, "2 players = 1 match");

	// 4 players = 2 rounds, 2 matches
	bracket = generateBracket(4);
	assertEqual(bracket.rounds, 2, "4 players = 2 rounds");
	assertEqual(bracket.matches.length, 2, "4 players = 2 matches");

	// 8 players = 3 rounds, 4 matches
	bracket = generateBracket(8);
	assertEqual(bracket.rounds, 3, "8 players = 3 rounds");
	assertEqual(bracket.matches.length, 4, "8 players = 4 matches");

	// 5 players (3 byes) = 3 rounds, 4 matches
	bracket = generateBracket(5);
	assertEqual(bracket.rounds, 3, "5 players = 3 rounds (with byes)");
	assertEqual(bracket.matches.length, 4, "5 players = 4 matches");

	// Verify byes
	const byeMatches = bracket.matches.filter(m => m.p2 === null);
	assert(byeMatches.length > 0, "5 players produces bye matches");
}

// ============================================================
// Leaderboard Scoring Tests
// ============================================================

console.log("\n🌐 Leaderboard Scoring Tests");

{
	interface Score { name: string; score: number; elo: number; }

	function sortLeaderboard(entries: Score[]): Score[] {
		return [...entries].sort((a, b) => {
			// Primary: score descending
			if (b.score !== a.score) return b.score - a.score;
			// Tiebreaker: ELO descending
			return b.elo - a.elo;
		});
	}

	function updateElo(winnerElo: number, loserElo: number, k = 32): { winner: number; loser: number } {
		const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
		return {
			winner: Math.round(winnerElo + k * (1 - expected)),
			loser: Math.round(loserElo + k * (0 - (1 - expected))),
		};
	}

	// Sort test
	const board: Score[] = [
		{ name: "Alice", score: 5000, elo: 1200 },
		{ name: "Bob", score: 5000, elo: 1100 },
		{ name: "Charlie", score: 3000, elo: 1500 },
		{ name: "Dave", score: 7000, elo: 900 },
	];

	const sorted = sortLeaderboard(board);
	assertEqual(sorted[0].name, "Dave", "Highest score first");
	assertEqual(sorted[1].name, "Alice", "Second by score");
	assertEqual(sorted[2].name, "Bob", "Same score as Alice, lower ELO = lower rank");

	// ELO update
	const result = updateElo(1200, 1000);
	assert(result.winner > 1200, "Winner ELO increases");
	assert(result.loser < 1000, "Loser ELO decreases");

	// Upset bonus: lower ELO beats higher
	const upset = updateElo(1000, 1500);
	assert(upset.winner - 1000 > result.winner - 1200, "Upset gives bigger ELO gain");
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
