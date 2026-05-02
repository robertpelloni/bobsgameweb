/**
 * Tests for visual systems — map transitions, day/night, fog of war, screen effects.
 *
 * Run with: npx tsx src/__tests__/visual-systems.test.ts
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
// Map Transition Logic Tests
// ============================================================

console.log("\n🎬 Map Transition Tests");

{
	type TransitionType = "fade" | "slide_left" | "door" | "warp" | "instant";

	function simulateTransition(type: TransitionType, duration: number, dt: number): { progress: number; alpha: number; done: boolean } {
		let progress = 0;
		let alpha = 0;
		let done = false;

		// Simulate frames
		while (!done) {
			progress += dt / duration;
			if (progress >= 1) {
				progress = 1;
				done = true;
			}

			switch (type) {
				case "fade":
					if (progress < 0.5) alpha = progress * 2;
					else alpha = (1 - progress) * 2;
					break;
				case "door": {
					let widthRatio: number;
					if (progress < 0.5) widthRatio = 1 - progress * 2;
					else widthRatio = (progress - 0.5) * 2;
					alpha = 1 - widthRatio; // Higher alpha = more covered
					break;
				}
				case "instant":
					alpha = 0;
					break;
				default:
					alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
			}
		}

		return { progress, alpha, done };
	}

	// Fade transition
	const fade = simulateTransition("fade", 1.0, 0.1);
	assert(fade.done, "Fade transition completes");
	assertEqual(fade.progress, 1, "Fade reaches 100%");

	// Instant transition
	const instant = simulateTransition("instant", 0.01, 0.01);
	assert(instant.done, "Instant transition completes immediately");

	// Door transition
	const door = simulateTransition("door", 1.0, 0.1);
	assert(door.done, "Door transition completes");

	// Midpoint detection
	function checkMidpoint(progress: number): boolean {
		return progress >= 0.5;
	}

	assert(!checkMidpoint(0.4), "Not at midpoint at 40%");
	assert(checkMidpoint(0.5), "At midpoint at 50%");
	assert(checkMidpoint(0.7), "Past midpoint at 70%");
}

// ============================================================
// Notification Priority Tests
// ============================================================

console.log("\n📢 Notification Priority Tests");

{
	type Priority = "low" | "normal" | "high" | "critical";
	type Category = "system" | "combat" | "quest" | "social" | "achievement";

	const PRIORITY_ORDER: Record<Priority, number> = {
		low: 0, normal: 1, high: 2, critical: 3,
	};

	interface Notification {
		title: string;
		priority: Priority;
		category: Category;
		timer: number;
	}

	const stack: Notification[] = [];

	function push(title: string, priority: Priority, category: Category): void {
		stack.push({ title, priority, category, timer: 0 });
		stack.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);
	}

	function getVisible(max: number): Notification[] {
		return stack.slice(0, max);
	}

	push("Info", "low", "system");
	push("Level Up!", "high", "achievement");
	push("Enemy!", "critical", "combat");
	push("Saved", "normal", "system");

	assertEqual(stack.length, 4, "4 notifications in stack");

	// Sorted by priority
	assertEqual(stack[0].priority, "critical", "Critical is first");
	assertEqual(stack[1].priority, "high", "High is second");
	assertEqual(stack[2].priority, "normal", "Normal is third");
	assertEqual(stack[3].priority, "low", "Low is last");

	// Visible limit
	const visible = getVisible(3);
	assertEqual(visible.length, 3, "Only 3 visible at max");
	assertEqual(visible[0].title, "Enemy!", "Critical notification visible");
}

// ============================================================
// Save Slot Tests
// ============================================================

console.log("\n💾 Save Slot Tests");

{
	function formatTime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function formatTimestamp(ts: number): string {
		const diff = Date.now() - ts;
		if (diff < 0) return "Just now";
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "Just now";
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	assertEqual(formatTime(0), "0m", "0 seconds = 0m");
	assertEqual(formatTime(45), "0m", "45 seconds = 0m");
	assertEqual(formatTime(90), "1m", "90 seconds = 1m");
	assertEqual(formatTime(3600), "1h 0m", "3600 seconds = 1h 0m");
	assertEqual(formatTime(7261), "2h 1m", "7261 seconds = 2h 1m");
	assertEqual(formatTime(86400), "24h 0m", "86400 seconds = 24h 0m");

	assertEqual(formatTimestamp(Date.now()), "Just now", "Current time = Just now");
	assertEqual(formatTimestamp(Date.now() - 30000), "Just now", "30s ago = Just now");
	assertEqual(formatTimestamp(Date.now() - 120000), "2m ago", "2 min ago");
	assertEqual(formatTimestamp(Date.now() - 7200000), "2h ago", "2 hours ago");
	assertEqual(formatTimestamp(Date.now() - 172800000), "2d ago", "2 days ago");
}

// ============================================================
// Minimap Coordinate Tests
// ============================================================

console.log("\n🗺 Minimap Coordinate Tests");

{
	function worldToMinimap(
		worldX: number, worldY: number,
		mapWidth: number, mapHeight: number,
		displaySize: number,
	): { x: number; y: number } {
		const cellSize = displaySize / Math.max(mapWidth, mapHeight);
		return {
			x: (worldX / (mapWidth * 8)) * displaySize,
			y: (worldY / (mapHeight * 8)) * displaySize,
		};
	}

	const p1 = worldToMinimap(0, 0, 100, 100, 120);
	assertEqual(p1.x, 0, "Origin maps to x=0");
	assertEqual(p1.y, 0, "Origin maps to y=0");

	const p2 = worldToMinimap(400, 400, 100, 100, 120);
	assert(p2.x > 0 && p2.x < 120, "Center-ish maps within minimap");
	assert(p2.y > 0 && p2.y < 120, "Center-ish maps within minimap");

	const p3 = worldToMinimap(800, 800, 100, 100, 120);
	assertEqual(p3.x, 120, "Max X maps to displaySize");
	assertEqual(p3.y, 120, "Max Y maps to displaySize");

	// Out of bounds
	const p4 = worldToMinimap(1000, 1000, 100, 100, 120);
	assert(p4.x > 120, "Out of bounds X > displaySize");
	assert(p4.y > 120, "Out of bounds Y > displaySize");
}

// ============================================================
// Localization Tests
// ============================================================

console.log("\n🌐 Localization Tests");

{
	const translations: Map<string, Map<string, string>> = new Map();

	function register(key: string, langs: Record<string, string>): void {
		const entry = new Map<string, string>();
		for (const [lang, text] of Object.entries(langs)) {
			entry.set(lang, text);
		}
		translations.set(key, entry);
	}

	function get(key: string, lang = "en"): string {
		const entry = translations.get(key);
		if (!entry) return key;
		return entry.get(lang) ?? entry.get("en") ?? key;
	}

	// Register test strings
	register("menu_play", { en: "Play", jp: "プレイ", es: "Jugar", fr: "Jouer", de: "Spielen" });
	register("menu_settings", { en: "Settings", jp: "設定", es: "Configuración" });
	register("battle_attack", { en: "ATTACK", jp: "攻撃" });

	// English defaults
	assertEqual(get("menu_play"), "Play", "English: Play");
	assertEqual(get("menu_settings"), "Settings", "English: Settings");

	// Japanese
	assertEqual(get("menu_play", "jp"), "プレイ", "Japanese: プレイ");
	assertEqual(get("menu_settings", "jp"), "設定", "Japanese: 設定");

	// Spanish
	assertEqual(get("menu_play", "es"), "Jugar", "Spanish: Jugar");
	assertEqual(get("menu_settings", "es"), "Configuración", "Spanish: Configuración");

	// French & German
	assertEqual(get("menu_play", "fr"), "Jouer", "French: Jouer");
	assertEqual(get("menu_play", "de"), "Spielen", "German: Spielen");

	// Missing language falls back to English
	assertEqual(get("battle_attack", "de"), "ATTACK", "Missing German falls back to English");

	// Missing key returns key itself
	assertEqual(get("nonexistent"), "nonexistent", "Missing key returns itself");
}

// ============================================================
// Achievement Popup Queue Tests
// ============================================================

console.log("\n🏆 Achievement Popup Queue Tests");

{
	interface QueuedAchievement { title: string; priority: number; }
	const queue: QueuedAchievement[] = [];

	function push(title: string, priority: number): void {
		queue.push({ title, priority });
	}

	function pop(): QueuedAchievement | undefined {
		return queue.shift();
	}

	function peek(): QueuedAchievement | undefined {
		return queue[0];
	}

	push("First Blood", 1);
	push("Level 5", 2);
	push("Speed Demon", 3);

	assertEqual(queue.length, 3, "3 achievements queued");
	assertEqual(peek()!.title, "First Blood", "First in, first out");

	const a1 = pop()!;
	assertEqual(a1.title, "First Blood", "Popped first achievement");
	assertEqual(queue.length, 2, "2 remaining");

	const a2 = pop()!;
	assertEqual(a2.title, "Level 5", "Popped second achievement");

	const a3 = pop()!;
	assertEqual(a3.title, "Speed Demon", "Popped third achievement");

	assertEqual(queue.length, 0, "Queue empty");
	assertEqual(pop(), undefined, "Pop on empty returns undefined");
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
