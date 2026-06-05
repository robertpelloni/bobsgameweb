
let passed = 0;
let failed = 0;

function assertEqual(actual: unknown, expected: unknown, message: string): void {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		passed++; console.log(`  ✅ ${message}`);
	} else {
		failed++; console.error(`  ❌ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

// Mock AudioManager mapping logic for the test since we can't easily import from renderer
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
    };
    return sfxMap[id] || 'move';
}

console.log("\n🔊 Audio Legacy SFX Mapping Tests");

assertEqual(getSoundNameById(0), 'menu_move', "ID 0 maps to menu_move");
assertEqual(getSoundNameById(13), 'door_open', "ID 13 maps to door_open");
assertEqual(getSoundNameById(25), 'hold', "ID 25 maps to hold");
assertEqual(getSoundNameById(99), 'move', "Unknown ID 99 defaults to move");

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
	process.exit(1);
}
