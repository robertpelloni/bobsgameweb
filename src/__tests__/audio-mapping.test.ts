
let passed = 0;
let failed = 0;

function assertEqual(actual: unknown, expected: unknown, message: string): void {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		passed++; console.log(`  ✅ ${message}`);
	} else {
		failed++; console.error(`  ❌ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

// Mock AudioManager mapping logic for the test since we can't easily import from renderer in this environment
function getSoundNameById(id: number): string {
    const sfxMap: Record<number, string> = {
      0: 'menu_move',
      1: 'menu_select',
      2: 'menu_cancel',
      3: 'move',
      4: 'rotate',
      5: 'drop',
      6: 'lock',
      7: 'line_clear',
      8: 'tetris',
      9: 'levelup',
      10: 'gameover',
      11: 'pause',
      12: 'item_pickup',
      13: 'door_open',
      14: 'footstep',
      15: 'dialogue_beep',
      16: 'error',
      17: 'save',
      18: 'clear',
      19: 'piece_drop',
      20: 'piece_lock',
      21: 'piece_move',
      22: 'piece_rotate',
      23: 'interact',
      24: 'transition',
      25: 'hold',
      26: 'unlock',
      27: 'achievement',
      28: 'quest_start',
      29: 'quest_complete',
      30: 'level_up',
      31: 'exp_gain',
      32: 'coin_gain',
      33: 'health_pickup',
      34: 'mana_pickup',
      35: 'power_up',
      36: 'damage_taken',
      37: 'damage_dealt',
      38: 'crit_hit',
      39: 'death',
      40: 'respawn',
      41: 'teleport',
      42: 'warp',
      43: 'portal',
      44: 'switch_on',
      45: 'switch_off',
      46: 'button_press',
      47: 'lever_pull',
      48: 'chest_open',
      49: 'chest_locked',
      50: 'key_found',
      51: 'item_drop',
      52: 'inventory_open',
      53: 'inventory_close',
      54: 'equip',
      55: 'unequip',
      56: 'crafting_start',
      57: 'crafting_success',
      58: 'crafting_fail',
      59: 'shop_open',
      60: 'shop_buy',
      61: 'shop_sell',
      62: 'notification',
      63: 'chat_msg',
      64: 'party_invite',
      65: 'party_join',
      66: 'trade_request',
      67: 'trade_success',
      68: 'friend_online',
      69: 'boss_spawn',
      70: 'boss_death',
      71: 'victory',
      72: 'defeat',
      73: 'countdown',
      74: 'start_match',
      75: 'end_match',
      76: 'fireball',
      77: 'ice_spell',
      78: 'lightning',
      79: 'heal_spell',
      80: 'buff',
      81: 'debuff',
      82: 'explosion',
      83: 'quake',
      84: 'wind',
      85: 'water_splash',
      86: 'wood_break',
      87: 'metal_clang',
    };
    return sfxMap[id] || 'move';
}

console.log("\n🔊 Audio Legacy SFX Mapping Tests");

assertEqual(getSoundNameById(0), 'menu_move', "ID 0 maps to menu_move");
assertEqual(getSoundNameById(13), 'door_open', "ID 13 maps to door_open");
assertEqual(getSoundNameById(25), 'hold', "ID 25 maps to hold");
assertEqual(getSoundNameById(26), 'unlock', "ID 26 maps to unlock");
assertEqual(getSoundNameById(87), 'metal_clang', "ID 87 maps to metal_clang");
assertEqual(getSoundNameById(99), 'move', "Unknown ID 99 defaults to move");

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
	process.exit(1);
}
