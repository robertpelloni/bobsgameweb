/**
 * Tests for Mounted Combat, Siege Engines, and Naval systems.
 * Run: npx tsx src/__tests__/rpg-advanced.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { MountCombatSystem } from "../renderer/engine/rpg/MountCombatSystem";
import { SiegeEngineSystem } from "../renderer/engine/rpg/SiegeEngineSystem";
import { NavalSystem } from "../renderer/engine/rpg/NavalSystem";

console.log("\n🏇 Mounted Combat Tests");
{
    const mcs = new MountCombatSystem();
    mcs.mount();
    
    const dmg1 = mcs.calculateChargeDamage(10, 0);
    assertEqual(dmg1, 10, "No speed = no bonus");

    const dmg2 = mcs.calculateChargeDamage(10, 10);
    assert(dmg2 > 10, `Charge damage (${dmg2}) > base (10)`);

    mcs.update(5, 10); // Move at speed 10 for 5s
    assert(mcs.getChargeBonus() > 1.0, "Charge distance accumulated");
}

console.log("\n🎯 Siege Engine Tests");
{
    const ses = new SiegeEngineSystem();
    const w = ses.construct("trebuchet");
    assertEqual(w.type, "trebuchet", "Trebuchet constructed");

    const failFire = ses.fire(w.id, 1000);
    assert(!failFire.hit, "Cannot fire while packed");

    ses.deploy(w.id);
    const hit = ses.fire(w.id, 1000);
    assert(hit.hit, "Fire successful after deploy");
    assertEqual(hit.damage, 200, "Trebuchet deals 200 damage");
    assertEqual(hit.targetRemaining, 800, "Target health reduced correctly");
}

console.log("\n🚢 Naval System Tests");
{
    const naval = new NavalSystem();
    const ship = naval.purchaseShip("The Voyager", "sloop");
    assertEqual(ship.name, "The Voyager", "Sloop purchased");

    const speed1 = naval.calculateSpeed(0); // Assuming 0 is wind direction
    assert(speed1 > 0, `Ship is moving: ${speed1}`);

    const damageRes = naval.takeDamage(1000, 0);
    assert(damageRes.sunk, "Ship sunk after fatal hull damage");
    assertEqual(naval.getShip(), null, "Current ship cleared after sinking");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
