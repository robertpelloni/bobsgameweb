/**
 * Tests for Faction War, Artifacts, and World Events.
 * Run: npx tsx src/__tests__/rpg-world.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { FactionWarSystem } from "../renderer/engine/rpg/FactionWarSystem";
import { ArtifactSystem } from "../renderer/engine/rpg/ArtifactSystem";
import { WorldEventSystem } from "../renderer/engine/rpg/WorldEventSystem";

console.log("\n🛡 Faction War Tests");
{
    const fw = new FactionWarSystem();
    assertEqual(fw.getTerritories().find(t => t.id === "border")?.owner, "neutral", "Border is neutral initially");

    fw.contribute("order", "border", 20);
    assertEqual(fw.getTerritories().find(t => t.id === "border")?.owner, "order", "Border flipped to Order");
    
    const buffs = fw.getBuffsForFaction("order");
    assert(buffs.some(b => b.stat === "gold"), "Order now has the Gold buff from Borderlands");
}

console.log("\n💎 Artifact System Tests");
{
    const art = new ArtifactSystem();
    art.discover("sword_1", "Sword of Truth");
    art.equip("sword_1");
    assertEqual(art.getActive()?.name, "Sword of Truth", "Equipped Sword of Truth");

    const res = art.addXp(1000);
    assert(res.leveled, "Artifact leveled up");
    assert(art.getActive()!.level > 1, `Level is now ${art.getActive()!.level}`);
    
    if (art.getActive()!.level >= 10) {
        assert(art.getActive()!.awakened, "Artifact awakened at level 10");
        assert(art.getPower() > 20, "Power significantly increased");
    }
}

console.log("\n🌍 World Event Tests");
{
    const wes = new WorldEventSystem();
    wes.startEvent("invasion", 100, "Defend the gate!");
    assertEqual(wes.getActive()?.status, "active", "Event started");

    const res = wes.contribute("p1", 50);
    assertEqual(res.progress, 0.5, "Event is 50% complete");

    const res2 = wes.contribute("p2", 50);
    assert(res2.completed, "Event completed");
    assertEqual(wes.getActive()?.status, "completed", "Event status is COMPLETED");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
