/**
 * Regression test: ShopScene must assign its ShopConfig in the constructor.
 *
 * Bug: `shopConfig` was declared (`private shopConfig!: ShopConfig`) but
 * never assigned, so refreshUI()/buyItem() crashed with
 * "Cannot read properties of undefined (reading 'inventory')" for every
 * caller — the dashboard Shop & Trading entry and in-world shops alike.
 * Observed live on prod (2026-11-13) before the fix.
 *
 * Run with: npx tsx src/__tests__/shop-config.test.ts
 */
import { ShopScene } from "../renderer/scenes/ShopScene";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
	if (condition) { passed++; console.log(`  PASS ${message}`); }
	else { failed++; console.error(`  FAIL ${message}`); }
}

// Minimal Pixi Application stand-in: ShopScene's constructor only stores it.
const fakeApp = {} as never;

const scene = new ShopScene({
	name: "shop",
	app: fakeApp,
	gold: 250,
	inventory: ["health_potion"],
});

const cfg = (scene as unknown as { shopConfig?: { gold: number; inventory: string[] } }).shopConfig;
assert(cfg !== undefined, "shopConfig is assigned by the constructor");
assert(cfg?.gold === 250, "shopConfig.gold carries the constructor value");
assert(Array.isArray(cfg?.inventory) && cfg.inventory.includes("health_potion"),
	"shopConfig.inventory is readable (the exact read that used to crash)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
