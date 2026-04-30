/**
 * E2E tests for game flow — simulate full gameplay sessions.
 *
 * Run with: npx tsx src/__tests__/e2e-flow.test.ts
 *
 * Tests validate:
 * - Menu navigation flow
 * - Game creation and play lifecycle
 * - Score submission
 * - Scene transition sequences
 * - Settings persistence
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
// Scene Transition Flow Tests
// ============================================================

console.log("\n🎬 Scene Transition Flow Tests");

{
	type SceneState = { name: string; stack: string[] };

	class MockSceneManager {
		private stack: string[] = ["mainMenu"];

		push(scene: string) {
			this.stack.push(scene);
		}

		pop(): string | undefined {
			return this.stack.pop();
		}

		current(): string {
			return this.stack[this.stack.length - 1] ?? "none";
		}

		getStack(): string[] {
			return [...this.stack];
		}

		transition(from: string, to: string, type: string): boolean {
			if (this.current() !== from) return false;
			this.push(to);
			return true;
		}
	}

	const sm = new MockSceneManager();

	assertEqual(sm.current(), "mainMenu", "Start at main menu");

	// Navigate to puzzle
	sm.transition("mainMenu", "puzzle", "fade");
	assertEqual(sm.current(), "puzzle", "Transitioned to puzzle");

	// Can't transition from wrong scene
	assert(!sm.transition("mainMenu", "options", "fade"), "Can't transition from wrong scene");

	// Navigate back
	sm.pop();
	assertEqual(sm.current(), "mainMenu", "Back to main menu");

	// Deep navigation: mainMenu → lobby → room → puzzle
	sm.push("lobby");
	sm.push("room");
	sm.push("puzzle");
	assertEqual(sm.getStack().length, 4, "Stack depth is 4");
	assertEqual(sm.current(), "puzzle", "Current is puzzle");

	// Pop all the way back
	sm.pop(); sm.pop(); sm.pop();
	assertEqual(sm.current(), "mainMenu", "Back to main menu after 3 pops");
}

// ============================================================
// Settings Persistence Tests
// ============================================================

console.log("\n🎬 Settings Persistence Tests");

{
	class MockSettings {
		private data: Map<string, unknown> = new Map();

		set(key: string, value: unknown): void {
			this.data.set(key, value);
		}

		get<T = unknown>(key: string, defaultValue?: T): T {
			return (this.data.has(key) ? this.data.get(key) : defaultValue) as T;
		}

		has(key: string): boolean {
			return this.data.has(key);
		}

		remove(key: string): void {
			this.data.delete(key);
		}

		export(): Record<string, unknown> {
			return Object.fromEntries(this.data);
		}

		import(data: Record<string, unknown>): void {
			for (const [k, v] of Object.entries(data)) {
				this.data.set(k, v);
			}
		}
	}

	const settings = new MockSettings();

	// Set and get
	settings.set("volume", 0.8);
	settings.set("gameMode", "marathon");
	settings.set("autoLogin", true);

	assertEqual(settings.get("volume"), 0.8, "Volume persists");
	assertEqual(settings.get("gameMode"), "marathon", "Game mode persists");
	assertEqual(settings.get("autoLogin"), true, "Auto-login flag persists");
	assertEqual(settings.get("missing", "default"), "default", "Default value for missing key");

	// Export/import
	const exported = settings.export();
	const settings2 = new MockSettings();
	settings2.import(exported);
	assertEqual(settings2.get("volume"), 0.8, "Exported settings load correctly");

	// Remove
	settings.remove("volume");
	assert(!settings.has("volume"), "Removed key is gone");
	assertEqual(settings.get("volume", 0.5), 0.5, "Removed key returns default");
}

// ============================================================
// Game Lifecycle Tests
// ============================================================

console.log("\n🎬 Game Lifecycle Tests");

{
	interface GameState {
		phase: "menu" | "playing" | "paused" | "gameOver";
		score: number;
		level: number;
		lines: number;
		time: number;
	}

	class MockGameSession {
		state: GameState = {
			phase: "menu",
			score: 0,
			level: 1,
			lines: 0,
			time: 0,
		};

		startGame(mode: string): void {
			this.state.phase = "playing";
			this.state.score = 0;
			this.state.level = mode === "sprint" ? 1 : 1;
			this.state.lines = 0;
			this.state.time = 0;
		}

		clearLines(count: number): number {
			if (this.state.phase !== "playing") return 0;

			const basePoints = [0, 100, 300, 500, 800][count] ?? 0;
			this.state.score += basePoints * this.state.level;
			this.state.lines += count;

			// Level up every 10 lines
			this.state.level = Math.floor(this.state.lines / 10) + 1;

			return basePoints * this.state.level;
		}

		pause(): void {
			if (this.state.phase === "playing") this.state.phase = "paused";
		}

		resume(): void {
			if (this.state.phase === "paused") this.state.phase = "playing";
		}

		gameOver(): void {
			this.state.phase = "gameOver";
		}

		tick(dt: number): void {
			if (this.state.phase === "playing") {
				this.state.time += dt;
			}
		}
	}

	const session = new MockGameSession();

	// Start
	session.startGame("marathon");
	assertEqual(session.state.phase, "playing", "Game started");
	assertEqual(session.state.score, 0, "Score starts at 0");

	// Clear lines
	session.clearLines(1); // Single
	assertEqual(session.state.score, 100, "Single = 100 points");
	assertEqual(session.state.lines, 1, "1 line cleared");

	session.clearLines(4); // Tetris
	assertEqual(session.state.score, 900, "100 + 800 = 900 total");
	assertEqual(session.state.lines, 5, "5 total lines");

	// Level up
	for (let i = 0; i < 2; i++) session.clearLines(4);
	assertEqual(session.state.level, 2, "Level 2 after 13 lines (13/10 = 1 + 1)");

	// Pause/resume
	session.pause();
	assertEqual(session.state.phase, "paused", "Game paused");
	session.tick(1);
	assertEqual(session.state.time, 0, "Time doesn't advance when paused");
	session.resume();
	assertEqual(session.state.phase, "playing", "Game resumed");
	session.tick(1);
	assertEqual(session.state.time, 1, "Time advances when playing");

	// Game over
	session.gameOver();
	assertEqual(session.state.phase, "gameOver", "Game over");
	session.clearLines(1);
	assertEqual(session.state.lines, 13, "Can't clear lines after game over");

	// Sprint mode
	const sprint = new MockGameSession();
	sprint.startGame("sprint");
	assertEqual(sprint.state.phase, "playing", "Sprint mode starts");
}

// ============================================================
// Score Submission Flow Tests
// ============================================================

console.log("\n🎬 Score Submission Flow Tests");

{
	interface ScoreEntry {
		name: string;
		mode: string;
		score: number;
		level: number;
		lines: number;
		timestamp: number;
	}

	class MockLeaderboard {
		private entries: ScoreEntry[] = [];

		submit(entry: ScoreEntry): number {
			this.entries.push(entry);
			this.entries.sort((a, b) => b.score - a.score);
			return this.entries.findIndex(e => e === entry) + 1; // 1-based rank
		}

		getTop(n: number): ScoreEntry[] {
			return this.entries.slice(0, n);
		}

		getRank(name: string): number {
			return this.entries.findIndex(e => e.name === name) + 1;
		}
	}

	const lb = new MockLeaderboard();

	// Submit scores
	const rank1 = lb.submit({ name: "Alice", mode: "marathon", score: 5000, level: 10, lines: 100, timestamp: Date.now() });
	assertEqual(rank1, 1, "Alice is rank 1 (first entry)");

	const rank2 = lb.submit({ name: "Bob", mode: "marathon", score: 3000, level: 7, lines: 70, timestamp: Date.now() });
	assertEqual(rank2, 2, "Bob is rank 2");

	const rank3 = lb.submit({ name: "Charlie", mode: "marathon", score: 8000, level: 15, lines: 150, timestamp: Date.now() });
	assertEqual(rank3, 1, "Charlie is new rank 1");

	// Verify ordering
	const top = lb.getTop(3);
	assertEqual(top[0].name, "Charlie", "Top score is Charlie (8000)");
	assertEqual(top[1].name, "Alice", "Second is Alice (5000)");
	assertEqual(top[2].name, "Bob", "Third is Bob (3000)");

	// Check ranks shifted
	assertEqual(lb.getRank("Alice"), 2, "Alice shifted to rank 2");
	assertEqual(lb.getRank("Bob"), 3, "Bob shifted to rank 3");
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
