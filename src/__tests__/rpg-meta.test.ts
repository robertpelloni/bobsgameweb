/**
 * Tests for Party, Dungeon, and Housing.
 * Run: npx tsx src/__tests__/rpg-meta.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { PartySystem } from "../renderer/engine/rpg/PartySystem";
import { DungeonSystem } from "../renderer/engine/rpg/DungeonSystem";
import { HousingSystem } from "../renderer/engine/rpg/HousingSystem";

console.log("\n👥 Party System Tests");
{
    const party = new PartySystem();
    party.create("p1", "Leader");
    assertEqual(party.getSize(), 1, "Initial size = 1");
    assertEqual(party.getLeaderId(), "p1", "Leader is p1");

    party.addMember("p2", "Member", 5);
    assertEqual(party.getSize(), 2, "Size = 2 after join");

    // XP distribution
    const dist = party.distributeXp(100);
    assertEqual(dist.get("p1"), 50, "p1 gets 50 XP (even)");
    assertEqual(dist.get("p2"), 50, "p2 gets 50 XP (even)");

    // Formation bonus
    const bonus = party.getFormationBonus();
    assert(bonus.atk > 1.0, "Party provides ATK bonus");

    // Leader inheritance
    party.removeMember("p1");
    assertEqual(party.getLeaderId(), "p2", "p2 inherited leadership");
    assertEqual(party.getSize(), 1, "Size back to 1");
}

console.log("\n🏰 Dungeon System Tests");
{
    const dungeon = new DungeonSystem();
    dungeon.generateFloor(1, 5);
    assertEqual(dungeon.getFloor(), 1, "On floor 1");
    assertEqual(dungeon.getCurrentRoom()?.type, "entrance", "Start at entrance");

    const ok = dungeon.moveToRoom(1);
    assert(ok, "Moved to room 1");
    assertEqual(dungeon.getCurrentRoom()?.id, 1, "In room 1");

    const res = dungeon.clearRoom();
    assert(res.rewardXp > 0, "Gained XP from clearing room");
    assert(dungeon.getCurrentRoom()?.cleared, "Room marked as cleared");

    const blocked = dungeon.moveToRoom(4); // Not connected to room 1
    assert(!blocked, "Cannot jump to room 4 (not connected)");
}

console.log("\n🏠 Housing System Tests");
{
    const housing = new HousingSystem();
    const id = housing.purchase("p1", "cottage");
    assert(id.startsWith("house_"), "Purchased cottage");

    const ok = housing.placeFurniture(id, "chair_oak", 10, 20);
    assert(ok, "Placed chair");
    assertEqual(housing.getHouse(id)?.furniture.length, 1, "Furniture count = 1");

    const bonus = housing.getRestBonus(id);
    assert(bonus > 1.1, `Rest bonus for cottage + furniture: ${bonus}`);

    const manorId = housing.purchase("p1", "manor");
    assert(housing.getRestBonus(manorId) > bonus, "Manor rest bonus > cottage bonus");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
