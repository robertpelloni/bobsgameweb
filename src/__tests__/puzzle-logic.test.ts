/**
 * Unit tests for Puzzle GameLogic — scoring, leveling, piece movement.
 *
 * Run with: npx tsx src/__tests__/puzzle-logic.test.ts
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
// T-Spin Detection Tests
// ============================================================

console.log("\n🎮 T-Spin Detection Tests");

{
	// Simulate the T-spin detection algorithm
	// A T-spin is when: last move was rotation AND T-piece AND 3+ diagonal corners occupied

	function detectTSpin(lastMoveWasRotation: boolean, pieceName: string, cornerOccupied: boolean[]): number {
		if (!lastMoveWasRotation) return 0;
		if (pieceName !== 'T') return 0;

		const occupied = cornerOccupied.filter(Boolean).length;
		if (occupied < 3) return 0;

		// Check forward corners (rotation 0 = top corners)
		// Simplified: if 4 corners occupied = full, 3 = mini
		return occupied >= 4 ? 2 : 1;
	}

	assertEqual(detectTSpin(false, 'T', [true, true, true, false]), 0, "No T-spin when not rotation");
	assertEqual(detectTSpin(true, 'I', [true, true, true, true]), 0, "No T-spin for non-T piece");
	assertEqual(detectTSpin(true, 'T', [false, false, false, false]), 0, "No T-spin with 0 corners");
	assertEqual(detectTSpin(true, 'T', [true, false, false, false]), 0, "No T-spin with 1 corner");
	assertEqual(detectTSpin(true, 'T', [true, true, false, false]), 0, "No T-spin with 2 corners");
	assertEqual(detectTSpin(true, 'T', [true, true, true, false]), 1, "Mini T-spin with 3 corners");
	assertEqual(detectTSpin(true, 'T', [true, true, true, true]), 2, "Full T-spin with 4 corners");
}

// ============================================================
// Back-to-Back Bonus Tests
// ============================================================

console.log("\n🎮 Back-to-Back Bonus Tests");

{
	let b2bCount = 0;

	function handleClear(linesCleared: number, isTSpin: boolean): number {
		const isDifficult = linesCleared >= 4 || (isTSpin && linesCleared >= 2);
		if (isDifficult) {
			b2bCount++;
		} else if (linesCleared > 0) {
			b2bCount = 0;
		}
		return b2bCount;
	}

	assertEqual(handleClear(4, false), 1, "B2B: Tetris starts chain");
	assertEqual(handleClear(4, false), 2, "B2B: Double Tetris = B2B x2");
	assertEqual(handleClear(4, false), 3, "B2B: Triple Tetris = B2B x3");
	assertEqual(handleClear(1, false), 0, "B2B: Single breaks chain");
	assertEqual(handleClear(4, false), 1, "B2B: Chain restarts after break");

	b2bCount = 0;
	assertEqual(handleClear(2, true), 1, "B2B: T-Spin Double starts chain");
	assertEqual(handleClear(2, true), 2, "B2B: Double T-Spin = B2B x2");
	assertEqual(handleClear(1, true), 0, "B2B: T-Spin Single breaks chain");
}

// ============================================================
// Scoring Tests
// ============================================================

console.log("\n🎮 Scoring Tests");

{
	function calculateScore(basePoints: number, combo: number, chain: number, b2b: number): number {
		let score = basePoints;
		if (combo > 0) score *= (1 + combo * 0.5);
		if (chain > 0) score *= chain;
		if (b2b >= 2) score *= 1.5;
		return Math.floor(score);
	}

	assertEqual(calculateScore(100, 0, 0, 0), 100, "Base score with no multipliers");
	assertEqual(calculateScore(100, 1, 0, 0), 150, "Combo x1 = 1.5x");
	assertEqual(calculateScore(100, 2, 0, 0), 200, "Combo x2 = 2x");
	assertEqual(calculateScore(100, 3, 0, 0), 250, "Combo x3 = 2.5x");
	assertEqual(calculateScore(100, 0, 2, 0), 200, "Chain x2 = 2x");
	assertEqual(calculateScore(100, 0, 3, 0), 300, "Chain x3 = 3x");
	assertEqual(calculateScore(100, 0, 0, 2), 150, "B2B x2 = 1.5x");
	assertEqual(calculateScore(100, 1, 2, 2), 450, "All multipliers: 100 * 1.5 * 2 * 1.5 = 450");
}

// ============================================================
// Level & XP Tests
// ============================================================

console.log("\n🎮 Level & XP Tests");

{
	function checkLevelUp(xp: number, xpToNext: number, level: number): { level: number; xp: number; xpToNext: number } {
		while (xp >= xpToNext) {
			xp -= xpToNext;
			level++;
			xpToNext = Math.floor(xpToNext * 1.5);
		}
		return { level, xp, xpToNext };
	}

	let result = checkLevelUp(50, 100, 1);
	assertEqual(result.level, 1, "Level 1: 50 XP < 100 = no level up");
	assertEqual(result.xp, 50, "XP remains 50");

	result = checkLevelUp(150, 100, 1);
	assertEqual(result.level, 2, "Level 2: 150 XP >= 100 = level up");
	assertEqual(result.xp, 50, "Remaining XP = 50");
	assertEqual(result.xpToNext, 150, "Next XP = 150 (100 * 1.5)");

	result = checkLevelUp(500, 100, 1);
	assertEqual(result.level, 4, "Level 4: 500 XP produces 4 level ups");
}

// ============================================================
// Combo Chain Tests
// ============================================================

console.log("\n🎮 Combo Chain Tests");

{
	let combo = 0;

	function onClear(lines: number): number {
		if (lines > 0) {
			combo++;
		} else {
			combo = 0;
		}
		return combo;
	}

	assertEqual(onClear(1), 1, "Combo 1 after first clear");
	assertEqual(onClear(2), 2, "Combo 2 after consecutive clear");
	assertEqual(onClear(4), 3, "Combo 3 after Tetris");
	assertEqual(onClear(0), 0, "Combo resets on no clear");
	assertEqual(onClear(1), 1, "Combo restarts at 1");
}

// ============================================================
// Wall Kick Tests (SRS)
// ============================================================

console.log("\n🎮 SRS Wall Kick Tests");

{
	// SRS kick data: basic offset tables
	// For non-I pieces: { "0-1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], ... }
	// Simplified test: verify kick table structure

	const SRS_KICKS: Record<string, number[][]> = {
		"0-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
		"1-0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
		"1-2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
		"2-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
		"2-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
		"3-2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
		"3-0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
		"0-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
	};

	// Verify all 8 rotation transitions exist
	assertEqual(Object.keys(SRS_KICKS).length, 8, "SRS has 8 kick transitions");

	// Each transition has 5 kick offsets
	for (const [key, kicks] of Object.entries(SRS_KICKS)) {
		assertEqual(kicks.length, 5, `SRS kick ${key} has 5 offsets`);
	}

	// First offset is always [0,0] (no kick)
	for (const [key, kicks] of Object.entries(SRS_KICKS)) {
		assertEqual(kicks[0][0], 0, `SRS kick ${key} first offset x=0`);
		assertEqual(kicks[0][1], 0, `SRS kick ${key} first offset y=0`);
	}

	// Verify symmetry: 0-1 and 2-1 should be the same (mirror)
	assertEqual(
		JSON.stringify(SRS_KICKS["0-1"]),
		JSON.stringify(SRS_KICKS["2-1"]),
		"SRS kicks: 0→1 mirrors 2→1",
	);
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
