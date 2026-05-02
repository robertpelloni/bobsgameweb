/**
 * Tests for StatusEffectSystem — status effects, DoT, HoT, stat mods, stacking.
 *
 * Run with: npx tsx src/__tests__/status-effects.test.ts
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
// Inline minimal StatusEffectSystem for testing
// ============================================================

type StatusEffectType = "poison" | "burn" | "freeze" | "stun" | "regen" | "shield" | "haste" | "curse" | "blessing" | "bleed";

interface StatusEffect {
	type: StatusEffectType;
	duration: number;
	potency: number;
	stacks: number;
}

interface StatusEffectResult {
	type: StatusEffectType;
	damage: number;
	healing: number;
	expired: boolean;
}

interface StatModifiers { attack: number; defense: number; speed: number; luck: number }

const EFFECT_CONFIG: Record<StatusEffectType, {
	damagePerTurn: boolean; healPerTurn: boolean;
	statMod: Partial<StatModifiers>; canStack: boolean; maxStacks: number;
}> = {
	poison:   { damagePerTurn: true,  healPerTurn: false, statMod: {}, canStack: false, maxStacks: 1 },
	burn:     { damagePerTurn: true,  healPerTurn: false, statMod: { defense: -0.2 }, canStack: false, maxStacks: 1 },
	freeze:   { damagePerTurn: false, healPerTurn: false, statMod: { speed: -1 }, canStack: false, maxStacks: 1 },
	stun:     { damagePerTurn: false, healPerTurn: false, statMod: { speed: -1 }, canStack: false, maxStacks: 1 },
	regen:    { damagePerTurn: false, healPerTurn: true,  statMod: {}, canStack: false, maxStacks: 1 },
	shield:   { damagePerTurn: false, healPerTurn: false, statMod: { defense: 0.3 }, canStack: false, maxStacks: 1 },
	haste:    { damagePerTurn: false, healPerTurn: false, statMod: { speed: 0.5 }, canStack: false, maxStacks: 1 },
	curse:    { damagePerTurn: false, healPerTurn: false, statMod: { attack: -0.3, luck: -0.2 }, canStack: false, maxStacks: 1 },
	blessing: { damagePerTurn: false, healPerTurn: false, statMod: { attack: 0.2, defense: 0.2 }, canStack: false, maxStacks: 1 },
	bleed:    { damagePerTurn: true,  healPerTurn: false, statMod: {}, canStack: true, maxStacks: 5 },
};

class TestSystem {
	private effects: Map<string, StatusEffect[]> = new Map();
	private turn = 0;

	apply(id: string, type: StatusEffectType, duration = 3, potency = 5, stacks = 1): void {
		let list = this.effects.get(id);
		if (!list) { list = []; this.effects.set(id, list); }
		const config = EFFECT_CONFIG[type];
		const existing = list.find(e => e.type === type);
		if (existing) {
			if (config.canStack) existing.stacks = Math.min(existing.stacks + stacks, config.maxStacks);
			existing.duration = Math.max(existing.duration, duration);
			return;
		}
		list.push({ type, duration, potency, stacks });
	}

	processTurn(id: string): StatusEffectResult[] {
		this.turn++;
		const list = this.effects.get(id);
		if (!list) return [];
		const results: StatusEffectResult[] = [];
		for (let i = list.length - 1; i >= 0; i--) {
			const eff = list[i]!;
			const cfg = EFFECT_CONFIG[eff.type];
			const res: StatusEffectResult = { type: eff.type, damage: 0, healing: 0, expired: false };
			if (cfg.damagePerTurn) res.damage = eff.potency * eff.stacks;
			if (cfg.healPerTurn) res.healing = eff.potency;
			eff.duration--;
			if (eff.duration <= 0) { res.expired = true; list.splice(i, 1); }
			results.push(res);
		}
		if (list.length === 0) this.effects.delete(id);
		return results;
	}

	hasEffect(id: string, type: StatusEffectType): boolean {
		return this.effects.get(id)?.some(e => e.type === type) ?? false;
	}

	getEffects(id: string): StatusEffect[] { return this.effects.get(id) ?? []; }

	getStatMods(id: string): StatModifiers {
		const mods: StatModifiers = { attack: 0, defense: 0, speed: 0, luck: 0 };
		for (const eff of this.getEffects(id)) {
			const cfg = EFFECT_CONFIG[eff.type];
			if (cfg.statMod.attack) mods.attack += cfg.statMod.attack;
			if (cfg.statMod.defense) mods.defense += cfg.statMod.defense;
			if (cfg.statMod.speed) mods.speed += cfg.statMod.speed;
			if (cfg.statMod.luck) mods.luck += cfg.statMod.luck;
		}
		return mods;
	}

	clear(id: string): void { this.effects.delete(id); }
	getTurn(): number { return this.turn; }
}

// ============================================================
// Apply & Duration Tests
// ============================================================

console.log("\n💊 Status Effect Apply Tests");

{
	const sys = new TestSystem();

	sys.apply("player", "poison", 3, 5);
	assert(sys.hasEffect("player", "poison"), "Poison applied to player");
	assertEqual(sys.getEffects("player").length, 1, "1 effect active");

	// Apply different effect
	sys.apply("player", "shield", 2, 10);
	assertEqual(sys.getEffects("player").length, 2, "2 effects active");
	assert(sys.hasEffect("player", "shield"), "Shield applied");

	// Apply to different entity
	sys.apply("enemy", "burn", 4, 8);
	assert(sys.hasEffect("enemy", "burn"), "Burn applied to enemy");
	assert(!sys.hasEffect("enemy", "poison"), "Enemy has no poison");
}

// ============================================================
// Duration & Expiration Tests
// ============================================================

console.log("\n⏱ Duration & Expiration Tests");

{
	const sys = new TestSystem();

	sys.apply("player", "poison", 3, 5);

	// Turn 1
	const r1 = sys.processTurn("player");
	assertEqual(r1.length, 1, "Turn 1: 1 result");
	assertEqual(r1[0]!.damage, 5, "Turn 1: 5 poison damage");
	assert(!r1[0]!.expired, "Turn 1: not expired");

	// Turn 2
	const r2 = sys.processTurn("player");
	assert(!r2[0]!.expired, "Turn 2: not expired");

	// Turn 3
	const r3 = sys.processTurn("player");
	assert(r3[0]!.expired, "Turn 3: expired");
	assert(!sys.hasEffect("player", "poison"), "Poison expired and removed");
}

// ============================================================
// DoT Tests (Poison, Burn, Bleed)
// ============================================================

console.log("\n☠ Damage Over Time Tests");

{
	const sys = new TestSystem();

	// Poison
	sys.apply("player", "poison", 2, 10);
	const pr = sys.processTurn("player");
	assertEqual(pr[0]!.damage, 10, "Poison: 10 damage per turn");
	assertEqual(pr[0]!.healing, 0, "Poison: no healing");

	// Burn
	sys.apply("enemy", "burn", 2, 7);
	const br = sys.processTurn("enemy");
	assertEqual(br[0]!.damage, 7, "Burn: 7 damage per turn");

	// Bleed (stackable)
	sys.apply("enemy", "bleed", 3, 3, 1);
	sys.apply("enemy", "bleed", 3, 3, 1); // stack
	sys.apply("enemy", "bleed", 3, 3, 1); // stack
	const bleeds = sys.getEffects("enemy").filter(e => e.type === "bleed");
	assertEqual(bleeds.length, 1, "Bleed: only 1 bleed entry (stacked)");
	assertEqual(bleeds[0]!.stacks, 3, "Bleed: 3 stacks");
	const blr = sys.processTurn("enemy");
	const bleedResult = blr.find(r => r.type === "bleed")!;
	assertEqual(bleedResult.damage, 9, "Bleed: 3 stacks × 3 potency = 9 damage");
}

// ============================================================
// HoT Tests (Regen)
// ============================================================

console.log("\n💚 Healing Over Time Tests");

{
	const sys = new TestSystem();

	sys.apply("player", "regen", 4, 15);
	const r = sys.processTurn("player");
	assertEqual(r[0]!.healing, 15, "Regen: 15 healing per turn");
	assertEqual(r[0]!.damage, 0, "Regen: no damage");
	assert(!r[0]!.expired, "Regen: still active after 1 turn");

	// 3 more turns
	sys.processTurn("player");
	sys.processTurn("player");
	const r4 = sys.processTurn("player");
	assert(r4[0]!.expired, "Regen: expired after 4 turns");
}

// ============================================================
// Stacking Tests
// ============================================================

console.log("\n📚 Stacking Tests");

{
	const sys = new TestSystem();

	// Poison doesn't stack — refresh duration
	sys.apply("player", "poison", 2, 5);
	sys.apply("player", "poison", 4, 8); // higher potency, longer duration
	const poison = sys.getEffects("player")[0]!;
	assertEqual(sys.getEffects("player").length, 1, "Poison: not duplicated");
	assertEqual(poison.potency, 5, "Poison: potency unchanged (non-stacking)");
	assertEqual(poison.duration, 4, "Poison: duration refreshed to 4");

	// Bleed stacks up to 5
	sys.apply("player", "bleed", 3, 2, 1);
	sys.apply("player", "bleed", 3, 2, 1);
	sys.apply("player", "bleed", 3, 2, 1);
	sys.apply("player", "bleed", 3, 2, 1);
	sys.apply("player", "bleed", 3, 2, 1);
	sys.apply("player", "bleed", 3, 2, 1); // 6th stack, capped at 5
	const bleed = sys.getEffects("player").find(e => e.type === "bleed")!;
	assertEqual(bleed.stacks, 5, "Bleed: capped at 5 stacks");
}

// ============================================================
// Stat Modifier Tests
// ============================================================

console.log("\n⚔ Stat Modifier Tests");

{
	const sys = new TestSystem();

	// No effects = neutral
	const base = sys.getStatMods("player");
	assertEqual(base.attack, 0, "Base attack = 0");
	assertEqual(base.defense, 0, "Base defense = 0");

	// Shield boosts defense
	sys.apply("player", "shield", 3, 10);
	const shieldMods = sys.getStatMods("player");
	assertEqual(shieldMods.defense, 0.3, "Shield: +0.3 defense");

	// Curse reduces attack + luck
	sys.apply("player", "curse", 3, 5);
	const curseMods = sys.getStatMods("player");
	assertEqual(curseMods.attack, -0.3, "Curse: -0.3 attack");
	assertEqual(curseMods.luck, -0.2, "Curse: -0.2 luck");

	// Blessing boosts attack + defense
	sys.apply("ally", "blessing", 3, 10);
	const blessMods = sys.getStatMods("ally");
	assertEqual(blessMods.attack, 0.2, "Blessing: +0.2 attack");
	assertEqual(blessMods.defense, 0.2, "Blessing: +0.2 defense");

	// Multiple effects stack
	sys.apply("ally", "haste", 3, 5);
	const comboMods = sys.getStatMods("ally");
	assertEqual(comboMods.attack, 0.2, "Blessing + Haste: attack still +0.2");
	assertEqual(comboMods.speed, 0.5, "Haste: speed +0.5");

	// After effects expire
	sys.processTurn("ally");
	sys.processTurn("ally");
	sys.processTurn("ally");
	const afterMods = sys.getStatMods("ally");
	assertEqual(afterMods.attack, 0, "After expiry: attack back to 0");
	assertEqual(afterMods.speed, 0, "After expiry: speed back to 0");
}

// ============================================================
// Multi-Entity Tests
// ============================================================

console.log("\n👥 Multi-Entity Tests");

{
	const sys = new TestSystem();

	sys.apply("player", "poison", 2, 5);
	sys.apply("enemy", "burn", 2, 8);
	sys.apply("ally", "regen", 3, 10);

	assertEqual(sys.getEffects("player").length, 1, "Player has 1 effect");
	assertEqual(sys.getEffects("enemy").length, 1, "Enemy has 1 effect");
	assertEqual(sys.getEffects("ally").length, 1, "Ally has 1 effect");

	// Clear one
	sys.clear("enemy");
	assertEqual(sys.getEffects("enemy").length, 0, "Enemy effects cleared");
	assert(sys.hasEffect("player", "poison"), "Player still has poison");
}

// ============================================================
// Effect Type Coverage Tests
// ============================================================

console.log("\n📋 Effect Type Coverage Tests");

{
	const types: StatusEffectType[] = ["poison", "burn", "freeze", "stun", "regen", "shield", "haste", "curse", "blessing", "bleed"];
	assertEqual(types.length, 10, "10 status effect types defined");

	for (const type of types) {
		const config = EFFECT_CONFIG[type];
		assert(!!config, `${type} has config`);
		assert(typeof config.damagePerTurn === "boolean", `${type} has damagePerTurn`);
		assert(typeof config.canStack === "boolean", `${type} has canStack`);
	}

	// DoT effects
	const dotTypes = types.filter(t => EFFECT_CONFIG[t].damagePerTurn);
	assertEqual(dotTypes.length, 3, "3 DoT types: poison, burn, bleed");
	assert(dotTypes.includes("poison"), "Poison is DoT");
	assert(dotTypes.includes("burn"), "Burn is DoT");
	assert(dotTypes.includes("bleed"), "Bleed is DoT");

	// HoT effects
	const hotTypes = types.filter(t => EFFECT_CONFIG[t].healPerTurn);
	assertEqual(hotTypes.length, 1, "1 HoT type: regen");

	// Stackable effects
	const stackable = types.filter(t => EFFECT_CONFIG[t].canStack);
	assertEqual(stackable.length, 1, "1 stackable type: bleed");
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
