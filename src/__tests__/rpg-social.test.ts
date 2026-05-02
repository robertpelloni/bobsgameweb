/**
 * Tests for Marriage, Auction House, and Titles.
 * Run: npx tsx src/__tests__/rpg-social.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { MarriageSystem } from "../renderer/engine/rpg/MarriageSystem";
import { AuctionHouseSystem } from "../renderer/engine/rpg/AuctionHouseSystem";
import { TitleSystem } from "../renderer/engine/rpg/TitleSystem";

console.log("\n💍 Marriage System Tests");
{
    const ms = new MarriageSystem();
    ms.propose("p1", "p2");
    assert(ms.accept("p2"), "Proposal accepted");
    assert(ms.isMarried("p1"), "p1 is married");
    assert(ms.isMarried("p2"), "p2 is married");

    const buff = ms.getBondBuff("p1", true);
    assert(buff.expMult > 1.0, "Spouse nearby provides EXP buff");

    ms.divorce("p1");
    assert(!ms.isMarried("p1"), "p1 is divorced");
    assert(!ms.isMarried("p2"), "p2 is also divorced");
}

console.log("\n⚖ Auction House Tests");
{
    const ah = new AuctionHouseSystem();
    const id = ah.list("s1", "item_1", 100, 24);
    assertEqual(ah.getListings().length, 1, "Listing created");

    const res = ah.buyout(id, "b1");
    assert(res.success, "Buyout successful");
    assertEqual(res.netGold, 95, "Net gold = 95 (5% tax)");
    assertEqual(ah.getListings().length, 0, "Listing removed after sale");
}

console.log("\n🎖 Title System Tests");
{
    const ts = new TitleSystem();
    assertEqual(ts.getFormattedName("Bob"), "Bob", "No title initially");

    ts.unlock("slayer");
    ts.equip("slayer");
    assertEqual(ts.getFormattedName("Bob"), "Dragon Slayer Bob", "Equipped title correctly");
    assertEqual(ts.getActiveBonus()?.stat, "atk", "Title provides ATK bonus");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
