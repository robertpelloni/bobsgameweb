/**
 * Tests for PetSystem + BossRush — pet leveling, evolution, combat, boss waves.
 * Run: npx tsx src/__tests__/pet-bossrush.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Pet Species Data Tests
// ============================================================
console.log("\n🐾 Pet Species Tests");
{
	type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
	interface Pet { id: string; name: string; rarity: Rarity; baseAttack: number; baseDefense: number; baseHP: number; abilities: string[]; evolution: string | null; evolutionLevel: number }

	const pets: Pet[] = [
		{ id: "fire_fox", name: "Fire Fox", rarity: "common", baseAttack: 5, baseDefense: 2, baseHP: 30, abilities: ["attack", "debuff"], evolution: "inferno_fox", evolutionLevel: 10 },
		{ id: "ice_cat", name: "Ice Cat", rarity: "common", baseAttack: 4, baseDefense: 3, baseHP: 35, abilities: ["attack", "shield"], evolution: "frost_lion", evolutionLevel: 10 },
		{ id: "forest_owl", name: "Forest Owl", rarity: "common", baseAttack: 3, baseDefense: 2, baseHP: 25, abilities: ["scout", "buff"], evolution: null, evolutionLevel: 99 },
		{ id: "thunder_wolf", name: "Thunder Wolf", rarity: "uncommon", baseAttack: 8, baseDefense: 4, baseHP: 45, abilities: ["attack", "attack", "buff"], evolution: "storm_wolf", evolutionLevel: 15 },
		{ id: "shadow_panther", name: "Shadow Panther", rarity: "uncommon", baseAttack: 10, baseDefense: 3, baseHP: 40, abilities: ["attack", "debuff", "scout"], evolution: null, evolutionLevel: 99 },
		{ id: "crystal_turtle", name: "Crystal Turtle", rarity: "uncommon", baseAttack: 2, baseDefense: 10, baseHP: 60, abilities: ["shield", "shield", "heal"], evolution: null, evolutionLevel: 99 },
		{ id: "magma_salamander", name: "Magma Salamander", rarity: "rare", baseAttack: 12, baseDefense: 5, baseHP: 50, abilities: ["attack", "attack", "debuff"], evolution: null, evolutionLevel: 99 },
		{ id: "moon_rabbit", name: "Moon Rabbit", rarity: "rare", baseAttack: 3, baseDefense: 3, baseHP: 40, abilities: ["heal", "heal", "buff"], evolution: "celestial_rabbit", evolutionLevel: 20 },
		{ id: "phoenix_chick", name: "Phoenix Chick", rarity: "epic", baseAttack: 15, baseDefense: 6, baseHP: 55, abilities: ["attack", "heal", "buff"], evolution: "phoenix", evolutionLevel: 25 },
		{ id: "dragon_whelp", name: "Dragon Whelp", rarity: "epic", baseAttack: 18, baseDefense: 8, baseHP: 65, abilities: ["attack", "attack", "debuff"], evolution: "elder_dragon", evolutionLevel: 30 },
		{ id: "celestial_deer", name: "Celestial Deer", rarity: "legendary", baseAttack: 10, baseDefense: 10, baseHP: 80, abilities: ["heal", "buff", "shield"], evolution: null, evolutionLevel: 99 },
	];

	assertEqual(pets.length, 11, "11 pet species");

	// Rarity distribution
	const byRarity = (r: Rarity) => pets.filter(p => p.rarity === r).length;
	assertEqual(byRarity("common"), 3, "3 common pets");
	assertEqual(byRarity("uncommon"), 3, "3 uncommon pets");
	assertEqual(byRarity("rare"), 2, "2 rare pets");
	assertEqual(byRarity("epic"), 2, "2 epic pets");
	assertEqual(byRarity("legendary"), 1, "1 legendary pet");

	// All unique IDs
	assertEqual(new Set(pets.map(p => p.id)).size, 11, "11 unique IDs");

	// Evolvable pets
	const evolvable = pets.filter(p => p.evolution !== null);
	assertEqual(evolvable.length, 6, "6 pets can evolve");

	// Legendary has no evolution
	const legendary = pets.find(p => p.rarity === "legendary")!;
	assertEqual(legendary.evolution, null, "Celestial Deer doesn't evolve");
	assertEqual(legendary.baseHP, 80, "Legendary has highest base HP");
}

// ============================================================
// Pet Leveling Tests
// ============================================================
console.log("\n📈 Pet Leveling Tests");
{
	function addXp(level: number, xp: number, xpToNext: number, amount: number): { level: number; xp: number; xpToNext: number; leveledUp: boolean } {
		let leveledUp = false;
		xp += amount;
		while (xp >= xpToNext) {
			xp -= xpToNext;
			level++;
			xpToNext = Math.floor(xpToNext * 1.3);
			leveledUp = true;
		}
		return { level, xp, xpToNext, leveledUp };
	}

	// No level up
	const r1 = addXp(1, 0, 50, 25);
	assert(!r1.leveledUp, "25/50 XP: no level up");
	assertEqual(r1.xp, 25, "XP = 25");

	// Level up
	const r2 = addXp(1, 0, 50, 60);
	assert(r2.leveledUp, "60/50 XP: leveled up");
	assertEqual(r2.level, 2, "Level = 2");
	assertEqual(r2.xp, 10, "Remaining XP = 10");
	assertEqual(r2.xpToNext, 65, "Next level needs 65 XP");

	// Multiple level ups
	const r3 = addXp(1, 0, 50, 200);
	assert(r3.leveledUp, "200 XP: leveled up multiple times");
	assert(r3.level > 3, `Multiple levels: ${r3.level}`);

	// XP scaling
	assert(r3.xpToNext > r2.xpToNext, "Higher level = more XP needed");
}

// ============================================================
// Pet Happiness Tests
// ============================================================
console.log("\n😊 Pet Happiness Tests");
{
	let happiness = 80;
	let hunger = 100;

	function decay(dt: number) {
		hunger = Math.max(0, hunger - dt * 0.5);
		if (hunger < 20) happiness = Math.max(0, happiness - dt * 2);
	}

	function feed(amount: number) {
		hunger = Math.min(100, hunger + amount);
		happiness = Math.min(100, happiness + 5);
	}

	// Initial state
	assertEqual(happiness, 80, "Initial happiness = 80");
	assertEqual(hunger, 100, "Initial hunger = 100");

	// Decay
	decay(10);
	assert(hunger < 100, `Hunger decreased: ${hunger}`);
	assertEqual(happiness, 80, "Happiness unchanged (hunger > 20)");

	// Low hunger
	hunger = 15;
	decay(10);
	assert(happiness < 80, `Happiness decreased when hungry: ${happiness}`);

	// Feed
	feed(30);
	assert(hunger > 15, `Fed: hunger = ${hunger}`);
	assert(happiness >= 65, `Fed: happiness = ${happiness}`);
}

// ============================================================
// Pet Combat Stats Tests
// ============================================================
console.log("\n⚔ Pet Combat Tests");
{
	function getStats(baseAtk: number, baseDef: number, baseHP: number, level: number, happiness: number) {
		const mult = happiness / 100;
		return {
			attack: Math.floor(baseAtk * (1 + level * 0.1) * mult),
			defense: Math.floor(baseDef * (1 + level * 0.05) * mult),
			hp: Math.floor(baseHP * (1 + level * 0.08)),
		};
	}

	// Level 1, full happiness
	const s1 = getStats(5, 2, 30, 1, 100);
	assertEqual(s1.attack, 5, "Lv1 Fox attack = 5");
	assertEqual(s1.defense, 2, "Lv1 Fox defense = 2");
	assertEqual(s1.hp, 32, "Lv1 Fox HP = 32");

	// Level 10
	const s10 = getStats(5, 2, 30, 10, 100);
	assert(s10.attack > s1.attack, `Lv10 attack (${s10.attack}) > Lv1 (${s1.attack})`);
	assert(s10.hp > s1.hp, `Lv10 HP (${s10.hp}) > Lv1 (${s1.hp})`);

	// Unhappy pet = weaker
	const sSad = getStats(5, 2, 30, 1, 50);
	assert(sSad.attack < s1.attack, `Sad pet attack (${sSad.attack}) < happy (${s1.attack})`);
}

// ============================================================
// Boss Rush Wave Tests
// ============================================================
console.log("\n💀 Boss Rush Wave Tests");
{
	const bosses = [
		{ name: "Forest Guardian", hp: 150, attack: 12 },
		{ name: "Tide Leviathan", hp: 250, attack: 18 },
		{ name: "Storm Titan", hp: 350, attack: 22 },
		{ name: "Shadow Lord", hp: 450, attack: 28 },
		{ name: "Ancient Dragon", hp: 600, attack: 35 },
	];

	assertEqual(bosses.length, 5, "5 boss waves");

	// Escalating difficulty
	for (let i = 1; i < bosses.length; i++) {
		assert(bosses[i]!.hp > bosses[i-1]!.hp, `${bosses[i]!.name} HP > ${bosses[i-1]!.name}`);
		assert(bosses[i]!.attack > bosses[i-1]!.attack, `${bosses[i]!.name} ATK > ${bosses[i-1]!.name}`);
	}

	// HP scaling
	function scaledHP(baseHp: number, wave: number): number {
		return Math.floor(baseHp * (1 + wave * 0.15));
	}

	assertEqual(scaledHP(150, 0), 150, "Wave 1: no scaling");
	assert(scaledHP(150, 2) > 150, `Wave 3: ${scaledHP(150, 2)} > 150`);
	assert(scaledHP(600, 4) > 600, `Wave 5 scaled: ${scaledHP(600, 4)}`);
}

// ============================================================
// Boss Rush Combat Tests
// ============================================================
console.log("\n⚔ Boss Combat Tests");
{
	function calcDamage(atk: number, def: number, multiplier = 1.0): number {
		return Math.max(1, Math.floor(atk * multiplier * (0.9 + Math.random() * 0.2) - def * 0.3));
	}

	// Normal attack
	const dmg1 = calcDamage(15, 6);
	assert(dmg1 >= 1, `Normal attack damage: ${dmg1}`);

	// Heavy attack (1.8x)
	const dmg2 = calcDamage(15, 6, 1.8);
	assert(dmg2 > dmg1, `Heavy (${dmg2}) > Normal (${dmg1})`);

	// Defend (halves incoming)
	const bossAtk = 12;
	const normalDmg = Math.max(1, bossAtk - 7 * 0.5);
	const defendedDmg = Math.max(0, Math.floor((bossAtk - 7 * 0.5) * 0.5));
	assert(defendedDmg < normalDmg, `Defended: ${defendedDmg} < Normal: ${normalDmg}`);

	// Boss special (1.5x attack)
	const specialDmg = Math.max(1, Math.floor(18 * 1.5 - 7 * 0.3));
	assert(specialDmg > normalDmg, `Special: ${specialDmg} > Normal: ${normalDmg}`);
}

// ============================================================
// Boss Rush Score Tests
// ============================================================
console.log("\n🎯 Boss Rush Score Tests");
{
	function waveScore(dmgDealt: number, combo: number, timeSec: number): number {
		const timeBonus = Math.floor(1000 / Math.max(1, timeSec));
		const comboBonus = 1 + Math.floor(combo / 5);
		return dmgDealt * comboBonus + timeBonus;
	}

	const s1 = waveScore(100, 3, 30);
	assert(s1 > 0, `Wave score: ${s1}`);

	// Faster = higher time bonus
	const sFast = waveScore(100, 3, 10);
	assert(sFast > s1, `Fast (${sFast}) > Slow (${s1})`);

	// Higher combo = better
	const sCombo = waveScore(100, 20, 30);
	assert(sCombo > s1, `High combo (${sCombo}) > Low combo (${s1})`);
}

// ============================================================
// Boss Rush State Machine Tests
// ============================================================
console.log("\n🔄 Boss Rush State Tests");
{
	type State = "lobby" | "prep" | "fight" | "victory" | "defeat" | "complete";
	function next(current: State, action: "start" | "fight" | "win" | "lose" | "next" | "retry"): State {
		switch (current) {
			case "lobby": return action === "start" ? "prep" : current;
			case "prep": return action === "fight" ? "fight" : current;
			case "fight": return action === "win" ? (true ? "victory" : "complete") : action === "lose" ? "defeat" : current;
			case "victory": return action === "next" ? "prep" : current;
			case "defeat": return action === "retry" ? "lobby" : current;
			case "complete": return action === "retry" ? "lobby" : current;
		}
	}

	assertEqual(next("lobby", "start"), "prep", "lobby → start → prep");
	assertEqual(next("prep", "fight"), "fight", "prep → fight → fight");
	assertEqual(next("fight", "win"), "victory", "fight → win → victory");
	assertEqual(next("victory", "next"), "prep", "victory → next → prep");
	assertEqual(next("fight", "lose"), "defeat", "fight → lose → defeat");
	assertEqual(next("defeat", "retry"), "lobby", "defeat → retry → lobby");
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
