/**
 * Tests for CardGame, Bounties, and Talents.
 * Run: npx tsx src/__tests__/rpg-mechanics.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { CardGameSystem } from "../renderer/engine/rpg/CardGameSystem";
import { BountySystem } from "../renderer/engine/rpg/BountySystem";
import { TalentSystem } from "../renderer/engine/rpg/TalentSystem";

console.log("\n🃏 Card Game Tests");
{
    const ccg = new CardGameSystem();
    let state = ccg.initGame();
    assertEqual(state.playerHP, 20, "Starting HP = 20");
    assertEqual(state.playerHand.length, 3, "Hand size = 3");

    // Play a card (if enough mana)
    state = ccg.playCard(state, 0);
    assertEqual(state.playerHand.length, 2, "Hand size = 2 after play");
    assert(state.playerBoard.length > 0 || state.opponentHP < 20, "Card played successfully");

    state = ccg.endTurn(state);
    assert(!state.isPlayerTurn, "Turn ended");
}

console.log("\n🎯 Bounty System Tests");
{
    const bs = new BountySystem();
    bs.generateDailyBounties();
    assertEqual(bs.getActiveBounties().length, 3, "3 daily bounties");

    const res = bs.completeBounty("b1");
    assert(res.success, "Bounty completed");
    assert(bs.getRank() >= 1, "Hunter rank valid");
}

console.log("\n⚡ Talent System Tests");
{
    const ts = new TalentSystem();
    ts.addPoints(10);
    assertEqual(ts.getPoints(), 10, "Added 10 talent points");

    const ok = ts.invest("str", "might");
    assert(ok, "Invested in Brute Might");
    assertEqual(ts.getPoints(), 9, "Remaining points = 9");

    // Prereq check
    const locked = ts.invest("str", "cleave");
    assert(!locked, "Cleave locked (requires Might max rank)");

    // Max rank check
    for(let i=0; i<4; i++) ts.invest("str", "might");
    const ok2 = ts.invest("str", "cleave");
    assert(ok2, "Cleave unlocked after Might maxed");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
