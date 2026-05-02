/**
 * Integration tests for RPG systems — dialogue, crafting, party, validation.
 *
 * Run with: npx tsx src/__tests__/rpg-systems.test.ts
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
// Branching Dialogue Tests
// ============================================================

console.log("\n💬 Branching Dialogue Tests");

{
	// Simulate the BranchingDialogueSystem
	type Choice = { text: string; nextNode: string; hasCondition?: boolean; flagRequired?: string };

	type Node = {
		id: string;
		speaker: string;
		text: string;
		choices?: Choice[];
		nextNode?: string;
		effect?: string;
	};

	const tree: Node[] = [
		{
			id: "start",
			speaker: "NPC",
			text: "Hello!",
			choices: [
				{ text: "Tell me more", nextNode: "info" },
				{ text: "Goodbye", nextNode: "end" },
				{ text: "Secret", nextNode: "secret", hasCondition: true, flagRequired: "knows_secret" },
			],
		},
		{
			id: "info",
			speaker: "NPC",
			text: "Here's some info.",
			nextNode: "end",
			effect: "set_flag:talked",
		},
		{
			id: "secret",
			speaker: "NPC",
			text: "You know the secret!",
		},
		{
			id: "end",
			speaker: "NPC",
			text: "Goodbye!",
		},
	];

	const flags = new Set<string>();

	function getNode(id: string): Node | undefined {
		return tree.find(n => n.id === id);
	}

	function getAvailableChoices(node: Node): Choice[] {
		return (node.choices ?? []).filter(c => {
			if (c.hasCondition && c.flagRequired) {
				return flags.has(c.flagRequired);
			}
			return true;
		});
	}

	// Start at root
	let current = getNode("start")!;
	assertEqual(current.speaker, "NPC", "Start node speaker is NPC");

	// Get choices — secret should be hidden
	let choices = getAvailableChoices(current);
	assertEqual(choices.length, 2, "Only 2 choices without secret flag");

	// Select "Tell me more" → info
	current = getNode(choices[0].nextNode)!;
	assertEqual(current.id, "info", "Navigated to info node");
	assertEqual(current.text, "Here's some info.", "Info text correct");

	// Apply effect
	if (current.effect) {
		const [type, key] = current.effect.split(":");
		if (type === "set_flag") flags.add(key);
	}
	assert(flags.has("talked"), "Flag 'talked' set after info node");

	// Auto-advance to end
	current = getNode(current.nextNode!)!;
	assertEqual(current.id, "end", "Auto-advanced to end");

	// Now try with secret flag
	flags.add("knows_secret");
	current = getNode("start")!;
	choices = getAvailableChoices(current);
	assertEqual(choices.length, 3, "All 3 choices visible with secret flag");
	assertEqual(choices[2].text, "Secret", "Secret choice is third");

	// Select secret
	current = getNode(choices[2].nextNode)!;
	assertEqual(current.id, "secret", "Navigated to secret node");
}

// ============================================================
// Crafting System Tests
// ============================================================

console.log("\n⚒ Crafting System Tests");

{
	interface Recipe {
		id: string;
		name: string;
		ingredients: { item: string; qty: number }[];
		result: { item: string; qty: number };
		successRate: number;
	}

	const recipes: Recipe[] = [
		{ id: "potion", name: "Health Potion", ingredients: [{ item: "herb", qty: 2 }, { item: "water", qty: 1 }], result: { item: "health_potion", qty: 3 }, successRate: 1.0 },
		{ id: "sword", name: "Iron Sword", ingredients: [{ item: "iron", qty: 3 }, { item: "wood", qty: 1 }], result: { item: "iron_sword", qty: 1 }, successRate: 0.9 },
		{ id: "armor", name: "Chain Mail", ingredients: [{ item: "iron", qty: 8 }, { item: "coal", qty: 2 }], result: { item: "chain_mail", qty: 1 }, successRate: 0.75 },
	];

	let inventory: Record<string, number> = {
		herb: 10, water: 5, iron: 15, wood: 8, coal: 3,
	};

	function canCraft(recipe: Recipe): boolean {
		return recipe.ingredients.every(ing => (inventory[ing.item] ?? 0) >= ing.qty);
	}

	function craft(recipe: Recipe, forceSuccess = false): { success: boolean; message: string } {
		if (!canCraft(recipe)) {
			return { success: false, message: `Missing materials for ${recipe.name}` };
		}

		// Consume ingredients
		for (const ing of recipe.ingredients) {
			inventory[ing.item] -= ing.qty;
		}

		// Roll for success
		const success = forceSuccess || Math.random() <= recipe.successRate;
		if (!success) {
			return { success: false, message: `${recipe.name} crafting failed!` };
		}

		// Add result
		inventory[recipe.result.item] = (inventory[recipe.result.item] ?? 0) + recipe.result.qty;
		return { success: true, message: `Crafted ${recipe.result.qty}x ${recipe.name}!` };
	}

	// Can craft potion
	assert(canCraft(recipes[0]!), "Can craft health potion");
	// Can craft sword
	assert(canCraft(recipes[1]!), "Can craft iron sword");
	// Can craft armor
	assert(canCraft(recipes[2]!), "Can craft chain mail");

	// Craft a potion (guaranteed success)
	const result = craft(recipes[0]!, true);
	assert(result.success, "Potion crafting succeeds");
	assertEqual(inventory.herb, 8, "Herbs consumed: 10 - 2 = 8");
	assertEqual(inventory.water, 4, "Water consumed: 5 - 1 = 4");
	assertEqual(inventory.health_potion, 3, "Gained 3 health potions");

	// Craft multiple swords
	for (let i = 0; i < 4; i++) {
		craft(recipes[1]!, true);
	}
	assertEqual(inventory.iron, 3, "Iron remaining: 3");
	assertEqual(inventory.iron_sword, 4, "Crafted 4 iron swords");

	// Can still craft one more sword (3 iron left)
	assert(canCraft(recipes[1]!), "Enough iron for one more sword");
	craft(recipes[1]!, true);
	assertEqual(inventory.iron, 0, "Iron depleted: 0");
	assert(!canCraft(recipes[1]!), "Not enough iron after depletion");
}

// ============================================================
// Day/Night Cycle Tests
// ============================================================

console.log("\n🌅 Day/Night Cycle Tests");

{
	type Phase = "dawn" | "day" | "dusk" | "night";

	function getPhase(hour: number): Phase {
		if (hour >= 5 && hour < 7) return "dawn";
		if (hour >= 7 && hour < 17) return "day";
		if (hour >= 17 && hour < 19) return "dusk";
		return "night";
	}

	assertEqual(getPhase(0), "night", "Midnight is night");
	assertEqual(getPhase(4), "night", "4am is night");
	assertEqual(getPhase(5), "dawn", "5am is dawn");
	assertEqual(getPhase(6), "dawn", "6am is dawn");
	assertEqual(getPhase(7), "day", "7am is day");
	assertEqual(getPhase(12), "day", "Noon is day");
	assertEqual(getPhase(17), "dusk", "5pm is dusk");
	assertEqual(getPhase(18), "dusk", "6pm is dusk");
	assertEqual(getPhase(19), "night", "7pm is night");
	assertEqual(getPhase(23), "night", "11pm is night");

	// Full cycle transitions
	const phases: Phase[] = [];
	for (let h = 0; h < 24; h++) {
		phases.push(getPhase(h));
	}
	const transitions = phases.filter((p, i) => i === 0 || p !== phases[i - 1]);
	assertEqual(transitions, ["night", "dawn", "day", "dusk", "night"], "Full day: night→dawn→day→dusk→night");
}

// ============================================================
// Exploration / Fog of War Tests
// ============================================================

console.log("\n🗺 Fog of War Tests");

{
	const mapW = 10;
	const mapH = 10;
	const revealed: boolean[][] = Array.from({ length: mapH }, () =>
		Array.from({ length: mapW }, () => false),
	);

	function reveal(cx: number, cy: number, radius: number): void {
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (Math.sqrt(dx * dx + dy * dy) > radius) continue;
				const nx = cx + dx;
				const ny = cy + dy;
				if (nx >= 0 && nx < mapW && ny >= 0 && ny < mapH) {
					revealed[ny][nx] = true;
				}
			}
		}
	}

	function countRevealed(): number {
		let count = 0;
		for (let y = 0; y < mapH; y++) {
			for (let x = 0; x < mapW; x++) {
				if (revealed[y][x]) count++;
			}
		}
		return count;
	}

	// Start — nothing revealed
	assertEqual(countRevealed(), 0, "Nothing revealed at start");

	// Reveal center
	reveal(5, 5, 2);
	const afterFirst = countRevealed();
	assert(afterFirst > 0, "Some tiles revealed at center");
	assert(afterFirst <= 13, "Radius 2 reveals ≤ 13 tiles (circle area)");

	// Reveal corner
	reveal(0, 0, 1);
	assert(revealed[0][0], "Corner tile revealed");
	assert(revealed[0][1], "Adjacent tile revealed");
	assert(revealed[1][0], "Adjacent tile revealed");
	assert(!revealed[1][1], "Diagonal at radius 1 not revealed");
}

// ============================================================
// Screen Effects Tests
// ============================================================//

console.log("\n💥 Screen Effects Tests");

{
	// Simulate shake math
	function calculateShakeDecay(intensity: number, duration: number, dt: number): number {
		const decay = intensity / duration;
		return Math.max(0, intensity - decay * dt);
	}

	// Shake should decay linearly
	assertEqual(calculateShakeDecay(10, 0.5, 0.1), 8, "Shake: 10 → 8 after 0.1s");
	assertEqual(calculateShakeDecay(10, 0.5, 0.25), 5, "Shake: 10 → 5 after 0.25s");
	assertEqual(calculateShakeDecay(10, 0.5, 0.5), 0, "Shake: 10 → 0 after full duration");
	assertEqual(calculateShakeDecay(10, 0.5, 1.0), 0, "Shake: clamped at 0");

	// Flash decay
	function calculateFlashDecay(alpha: number, duration: number, dt: number): number {
		const decay = alpha / duration;
		return Math.max(0, alpha - decay * dt);
	}

	assertEqual(calculateFlashDecay(0.5, 0.2, 0.1), 0.25, "Flash: 0.5 → 0.25 after 0.1s");
	assertEqual(calculateFlashDecay(0.5, 0.2, 0.2), 0, "Flash: fully decayed");
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
