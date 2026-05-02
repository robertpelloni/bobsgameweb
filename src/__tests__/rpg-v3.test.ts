/**
 * Tests for World Boss, Capes, and Stats Engine.
 * Run: npx tsx src/__tests__/rpg-v3.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { WorldBossSystem } from "../renderer/engine/rpg/WorldBossSystem";
import { CapeSystem } from "../renderer/engine/rpg/CapeSystem";
import { PlayerStatsEngine } from "../renderer/engine/rpg/PlayerStatsEngine";

console.log("\n👹 World Boss Tests");
{
    const wbs = new WorldBossSystem();
    wbs.spawn("hydra", "Ancient Hydra", 10000);
    assertEqual(wbs.getBoss()?.status, "active", "Boss spawned and active");

    wbs.recordDamage("p1", 1000);
    wbs.recordDamage("p2", 2000);
    assertEqual(wbs.getBoss()?.currentHP, 7000, "HP reduced correctly");

    const leaderboard = wbs.getLeaderboard();
    assertEqual(leaderboard[0]?.playerId, "p2", "p2 is leading correctly");
    assertEqual(leaderboard[0]?.rewards[0], "legendary_chest", "First place gets legendary reward");

    wbs.recordDamage("p3", 8000);
    assertEqual(wbs.getBoss()?.status, "defeated", "Boss defeated");
}

console.log("\n🧣 Cape System Tests");
{
    const cs = new CapeSystem();
    cs.unlock("hero");
    cs.equip("hero");
    assertEqual(cs.getEquipped()?.name, "Hero's Mantle", "Equipped hero cape");
    
    const points = cs.getPhysicsPoints(0.1, 10);
    assertEqual(points.length, 3, "Cape physics has 3 segments");
    assert(points[2]!.x < 0, "Cape flows backward with velocity");
}

console.log("\n📊 Stats Engine Tests");
{
    const pse = new PlayerStatsEngine();
    pse.setLevel(10);
    pse.setBase(20, 15, 10, 25);
    
    const stats = pse.calculate([{ mult: 1.1, flat: 0 }]); // 10% buff
    assert(stats.hp > 400, `Calculated HP (${stats.hp}) > 400`);
    assert(stats.crit > 0.06, `Calculated crit (${stats.crit}) > 6%`);
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
