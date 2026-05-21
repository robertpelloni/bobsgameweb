/**
 * FlagManager — Tracks game flags (quest progress, events completed, etc.)
 * Based on the original game's 13 flag system from _Project.txt
 * Flags are persisted in localStorage and synced to server.
 */

export const FLAGS = {
  SAW_KEYNOTE: 0,
  INTRO_SLEPT_IN_BED: 1,
  INTRO_SAT_AT_COMPUTER: 2,
  INTRO_COMPUTER_ON: 3,
  INTRO_ANSWERED_BUZZER: 4,
  INTRO_OPENED_DOOR: 5,
  INTRO_ELEVATOR_AT_TOP: 6,
  INTRO_GOT_COFFEE: 7,
  INTRO_PUT_COFFEE_ON_DESK: 8,
  INTRO_PRESSED_ELEVATOR_BUTTON: 9,
  INTRO_START_ND: 10,
  INTRO_OPENED_ND: 11,
  INTRO_FINISHED_BOBS_GAME: 12,
} as const;

const FLAG_NAMES: Record<number, string> = {
  0: 'sawKeynote',
  1: 'introSleptInBed',
  2: 'introSatAtComputerYet',
  3: 'introComputerOn',
  4: 'introAnsweredBuzzer',
  5: 'introOpenedDoor',
  6: 'introElevatorAtTop',
  7: 'introGotCoffee',
  8: 'introPutCoffeeOnDesk',
  9: 'introPressedElevatorButton',
  10: 'introStartND',
  11: 'introOpenedND',
  12: 'introFinishedBobsGame',
};

class FlagManagerImpl {
  private flags: Map<number, { value: boolean; timeSet: number }> = new Map();
  private loaded = false;

  constructor() {
    this.loadFromStorage();
  }

  /** Load flags from localStorage */
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('bobsgame_flags');
      if (saved) {
        const data = JSON.parse(saved);
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'object' && val !== null) {
            this.flags.set(Number(key), val as { value: boolean; timeSet: number });
          }
        }
      }
      this.loaded = true;
    } catch {
      this.loaded = true;
    }
  }

  /** Save flags to localStorage */
  private saveToStorage(): void {
    try {
      const data: Record<number, { value: boolean; timeSet: number }> = {};
      for (const [key, val] of this.flags) {
        data[key] = val;
      }
      localStorage.setItem('bobsgame_flags', JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }

  /** Set a flag */
  setFlag(flagId: number, value: boolean = true): void {
    this.flags.set(flagId, { value, timeSet: Date.now() });
    this.saveToStorage();
    console.log(`[FlagManager] Set flag ${flagId} (${FLAG_NAMES[flagId] || 'unknown'}) = ${value}`);
  }

  /** Check if a flag is set */
  isFlagSet(flagId: number): boolean {
    return this.flags.get(flagId)?.value ?? false;
  }

  /** Get the time a flag was set */
  getFlagTime(flagId: number): number {
    return this.flags.get(flagId)?.timeSet ?? 0;
  }

  /** Get all set flags */
  getAllSetFlags(): number[] {
    const result: number[] = [];
    for (const [key, val] of this.flags) {
      if (val.value) result.push(key);
    }
    return result;
  }

  /** Get flag name */
  getFlagName(flagId: number): string {
    return FLAG_NAMES[flagId] || `flag_${flagId}`;
  }

  /** Reset all flags */
  reset(): void {
    this.flags.clear();
    this.saveToStorage();
  }

  /** Serialize for save game */
  serialize(): Record<string, { value: boolean; timeSet: number }> {
    const data: Record<string, { value: boolean; timeSet: number }> = {};
    for (const [key, val] of this.flags) {
      data[String(key)] = val;
    }
    return data;
  }

  /** Deserialize from save game */
  deserialize(data: Record<string, { value: boolean; timeSet: number }>): void {
    this.flags.clear();
    for (const [key, val] of Object.entries(data)) {
      this.flags.set(Number(key), val);
    }
    this.saveToStorage();
  }
}

export const FlagManager = new FlagManagerImpl();
