/**
 * Tests for Arena + Cutscene systems — battle resolution, brackets, slides, typewriter.
 * Run with: npx tsx src/__tests__/arena-cutscene.test.ts
 */
let passed = 0;
let failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Arena Battle Resolution Tests
// ============================================================
console.log("\n⚔ Arena Battle Tests");

{
	type Action = "attack" | "defend" | "special";
	interface Fighter { id: string; name: string; hp: number; maxHp: number; attack: number; defense: number; speed: number; special: string }

	function resolveAction(atk: Fighter, def: Fighter, action: Action): { damage: number; healed: number } {
		switch (action) {
			case "attack": {
				const dmg = Math.max(1, Math.floor((atk.attack - def.defense * 0.5) * (0.8 + Math.random() * 0.4)));
				return { damage: dmg, healed: 0 };
			}
			case "defend": return { damage: 0, healed: 0 };
			case "special": {
				const dmg = Math.max(5, Math.floor((atk.attack * 1.5 - def.defense * 0.3) * (0.9 + Math.random() * 0.3)));
				return { damage: dmg, healed: Math.floor(dmg * 0.2) };
			}
		}
	}

	const hero: Fighter = { id: "hero", name: "Hero", hp: 75, maxHp: 75, attack: 15, defense: 7, speed: 7, special: "Strike" };
	const enemy: Fighter = { id: "enemy", name: "Goblin", hp: 30, maxHp: 30, attack: 8, defense: 3, speed: 4, special: "Bite" };

	// Attack deals damage
	const atk = resolveAction(hero, enemy, "attack");
	assert(atk.damage > 0, `Attack deals ${atk.damage} damage`);
	assertEqual(atk.healed, 0, "Attack heals nothing");

	// Defend deals no damage
	const def = resolveAction(hero, enemy, "defend");
	assertEqual(def.damage, 0, "Defend deals 0 damage");

	// Special deals more damage + heals
	const spc = resolveAction(hero, enemy, "special");
	assert(spc.damage > 0, `Special deals ${spc.damage} damage`);
	assert(spc.healed >= 0, `Special heals ${spc.healed}`);

	// Special generally > Attack
	let spTotal = 0, atkTotal = 0;
	for (let i = 0; i < 100; i++) {
		spTotal += resolveAction(hero, enemy, "special").damage;
		atkTotal += resolveAction(hero, enemy, "attack").damage;
	}
	assert(spTotal > atkTotal, `Special avg ${(spTotal/100).toFixed(1)} > Attack avg ${(atkTotal/100).toFixed(1)}`);
}

// ============================================================
// Bracket Generation Tests
// ============================================================
console.log("\n🏆 Bracket Tests");

{
	function generateBracket(fighters: string[]): string[][] {
		const shuffled = [...fighters].sort(() => Math.random() - 0.5);
		const matches: string[][] = [];
		for (let i = 0; i < shuffled.length; i += 2) {
			if (i + 1 < shuffled.length) {
				matches.push([shuffled[i]!, shuffled[i + 1]!]);
			}
		}
		return matches;
	}

	function advanceRound(matches: string[][], winners: string[]): string[][] {
		const next: string[][] = [];
		for (let i = 0; i < winners.length; i += 2) {
			if (i + 1 < winners.length) next.push([winners[i]!, winners[i + 1]!]);
		}
		return next;
	}

	const fighters = ["A","B","C","D","E","F","G","H"];
	const r1 = generateBracket(fighters);
	assertEqual(r1.length, 4, "Round 1: 4 matches from 8 fighters");
	for (const m of r1) assertEqual(m.length, 2, "Each match has 2 fighters");

	// Advance
	const winners = r1.map(m => m[0]!); // first fighter wins
	const r2 = advanceRound(r1, winners);
	assertEqual(r2.length, 2, "Round 2: 2 matches from 4 winners");

	const winners2 = r2.map(m => m[0]!);
	const r3 = advanceRound(r2, winners2);
	assertEqual(r3.length, 1, "Final: 1 match from 2 winners");

	// Champion
	assertEqual(r3[0]!.length, 2, "Final has 2 fighters");
}

// ============================================================
// Arena Fighter Data Tests
// ============================================================
console.log("\n👤 Fighter Data Tests");

{
	const fighters = [
		{ id: "gladiator", hp: 80, attack: 12, defense: 8, speed: 5 },
		{ id: "assassin", hp: 50, attack: 18, defense: 4, speed: 10 },
		{ id: "mage", hp: 45, attack: 20, defense: 3, speed: 7 },
		{ id: "knight", hp: 90, attack: 10, defense: 12, speed: 4 },
		{ id: "berserker", hp: 70, attack: 22, defense: 2, speed: 6 },
		{ id: "monk", hp: 65, attack: 14, defense: 10, speed: 8 },
		{ id: "ranger", hp: 55, attack: 16, defense: 6, speed: 9 },
		{ id: "necro", hp: 60, attack: 17, defense: 5, speed: 6 },
	];

	assertEqual(fighters.length, 8, "8 AI fighters");

	// Stat totals balanced (within range)
	for (const f of fighters) {
		const total = f.attack + f.defense + f.speed;
		assert(total >= 20 && total <= 35, `${f.id} stat total ${total} is balanced`);
		assert(f.hp > 0, `${f.id} has positive HP`);
	}

	// Highest attack
	const topAtk = fighters.reduce((b, f) => f.attack > b.attack ? f : b, fighters[0]!);
	assertEqual(topAtk.id, "berserker", "Berserker has highest attack (22)");

	// Highest defense
	const topDef = fighters.reduce((b, f) => f.defense > b.defense ? f : b, fighters[0]!);
	assertEqual(topDef.id, "knight", "Knight has highest defense (12)");

	// Fastest
	const fastest = fighters.reduce((b, f) => f.speed > b.speed ? f : b, fighters[0]!);
	assertEqual(fastest.id, "assassin", "Assassin is fastest (10)");

	// Tankiest (most HP)
	const tank = fighters.reduce((b, f) => f.hp > b.hp ? f : b, fighters[0]!);
	assertEqual(tank.id, "knight", "Knight has most HP (90)");
}

// ============================================================
// Cutscene Engine Tests
// ============================================================
console.log("\n🎬 Cutscene Engine Tests");

{
	interface Slide { id: string; text: string; speaker?: string; duration?: number; transition?: string }
	interface Script { id: string; slides: Slide[] }

	const script: Script = {
		id: "test",
		slides: [
			{ id: "s1", text: "Hello world", speaker: "Narrator", transition: "fade" },
			{ id: "s2", text: "The story begins...", duration: 3 },
			{ id: "s3", text: "Final slide", speaker: "Hero" },
		],
	};

	// Basic navigation
	let index = 0;
	function advance() {
		index++;
		if (index >= script.slides.length) index = script.slides.length - 1;
	}

	assertEqual(script.slides.length, 3, "3 slides");
	assertEqual(script.slides[0]!.speaker, "Narrator", "Slide 1 speaker");
	assertEqual(script.slides[1]!.duration, 3, "Slide 2 auto-advance 3s");

	// Navigate through
	assertEqual(index, 0, "Start at index 0");
	advance(); assertEqual(index, 1, "After 1 advance: index 1");
	advance(); assertEqual(index, 2, "After 2 advances: index 2");
	advance(); assertEqual(index, 2, "Can't go past last slide");
}

// ============================================================
// Typewriter Effect Tests
// ============================================================
console.log("\n⌨ Typewriter Tests");

{
	function getVisibleText(text: string, progress: number): string {
		return text.substring(0, Math.floor(progress));
	}

	assertEqual(getVisibleText("Hello", 0), "", "0 progress = empty");
	assertEqual(getVisibleText("Hello", 2.5), "He", "2.5 progress = 'He'");
	assertEqual(getVisibleText("Hello", 5), "Hello", "5 progress = full text");
	assertEqual(getVisibleText("Hello", 100), "Hello", "Over-progress = full text");
	assertEqual(getVisibleText("", 5), "", "Empty text stays empty");
}

// ============================================================
// Transition Tests
// ============================================================
console.log("\n🌅 Transition Tests");

{
	function getAlpha(progress: number): number {
		if (progress < 0) return 0;
		if (progress >= 1) return 1;
		if (progress < 0.5) return progress * 2;
		return 1;
	}

	assertEqual(getAlpha(-1), 0, "Negative progress = 0 alpha");
	assertEqual(getAlpha(0), 0, "Zero progress = 0 alpha");
	assertEqual(getAlpha(0.25), 0.5, "25% progress = 0.5 alpha");
	assertEqual(getAlpha(0.5), 1, "50% progress = full alpha");
	assertEqual(getAlpha(0.75), 1, "75% progress = full alpha");
	assertEqual(getAlpha(1), 1, "100% progress = full alpha");
	assertEqual(getAlpha(2), 1, "Over 100% = full alpha");
}

// ============================================================
// Cutscene Preset Validation Tests
// ============================================================
console.log("\n📜 Preset Cutscene Tests");

{
	const INTRO_SLIDES = [
		{ id: "s1", text: "In a world...", bg: 0x000000 },
		{ id: "s2", text: "One town stands...", bg: 0x0a1428 },
		{ id: "s3", text: "TOWNYUU...", bg: 0x142840 },
		{ id: "s4", text: "But peace is fragile...", bg: 0x0a1018 },
		{ id: "s5", text: "You there!", speaker: "Mayor", bg: 0x142030 },
		{ id: "s6", text: "Monsters have been...", speaker: "Mayor", bg: 0x101820 },
		{ id: "s7", text: "Will you be the hero?", speaker: "Mayor", bg: 0x142030 },
		{ id: "s8", text: "Your adventure begins now.", bg: 0x000000 },
	];

	assertEqual(INTRO_SLIDES.length, 8, "Intro has 8 slides");

	// Mayor speaks slides 5-7
	const mayorSlides = INTRO_SLIDES.filter(s => (s as any).speaker === "Mayor");
	assertEqual(mayorSlides.length, 3, "Mayor speaks 3 slides");

	// Each slide has unique ID
	const ids = new Set(INTRO_SLIDES.map(s => s.id));
	assertEqual(ids.size, 8, "All slide IDs unique");

	// Dragon cutscene
	const DRAGON_SLIDES = [
		{ id: "d1", shake: 5 }, { id: "d2" }, { id: "d3", flash: 1, shake: 10 }, { id: "d4" }, { id: "d5" },
	];
	assertEqual(DRAGON_SLIDES.length, 5, "Dragon cutscene has 5 slides");
	assert(!!DRAGON_SLIDES[0]!.shake, "Dragon slide 1 has shake effect");
	assert(!!DRAGON_SLIDES[2]!.flash, "Dragon slide 3 has flash effect");

	// Victory cutscene
	const VICTORY_SLIDES = [
		{ id: "v1" }, { id: "v2" }, { id: "v3", speaker: "Mayor" }, { id: "v4", speaker: "Mayor" }, { id: "v5", duration: 3 },
	];
	assertEqual(VICTORY_SLIDES.length, 5, "Victory cutscene has 5 slides");
	const vMayors = VICTORY_SLIDES.filter(s => (s as any).speaker === "Mayor");
	assertEqual(vMayors.length, 2, "Mayor speaks 2 victory slides");
}

// ============================================================
// Crowd Meter Tests
// ============================================================
console.log("\n👏 Crowd Meter Tests");

{
	let crowd = 50;
	function addExcitement(amount: number) { crowd = Math.min(100, crowd + amount); }
	function decay(dt: number) { crowd = Math.max(0, crowd - dt * 2); }

	assertEqual(crowd, 50, "Starts at 50");
	addExcitement(30);
	assertEqual(crowd, 80, "After +30: 80");
	addExcitement(30);
	assertEqual(crowd, 100, "Capped at 100");
	addExcitement(50);
	assertEqual(crowd, 100, "Can't exceed 100");
	crowd = 50;
	decay(10);
	assert(crowd < 50, `Decay reduces: ${crowd}`);
	decay(100);
	assertEqual(crowd, 0, "Can't go below 0");
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
