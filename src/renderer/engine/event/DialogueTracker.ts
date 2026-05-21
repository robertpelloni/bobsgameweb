/**
 * DialogueTracker — Tracks which dialogues have been seen
 * Based on the original game's dialoguesDone system
 */

class DialogueTrackerImpl {
  private completed: Map<number, { timeSet: number }> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('bobsgame_dialogues_done');
      if (saved) {
        const data = JSON.parse(saved);
        for (const [key, val] of Object.entries(data)) {
          this.completed.set(Number(key), val as { timeSet: number });
        }
      }
    } catch { /* ignore */ }
  }

  private saveToStorage(): void {
    try {
      const data: Record<number, { timeSet: number }> = {};
      for (const [key, val] of this.completed) {
        data[key] = val;
      }
      localStorage.setItem('bobsgame_dialogues_done', JSON.stringify(data));
    } catch { /* ignore */ }
  }

  /** Mark a dialogue as completed */
  setDone(dialogueId: number): void {
    this.completed.set(dialogueId, { timeSet: Date.now() });
    this.saveToStorage();
  }

  /** Check if a dialogue has been seen */
  isDone(dialogueId: number): boolean {
    return this.completed.has(dialogueId);
  }

  /** Get all completed dialogue IDs */
  getCompletedIds(): number[] {
    return Array.from(this.completed.keys());
  }

  /** Reset all dialogue state */
  reset(): void {
    this.completed.clear();
    this.saveToStorage();
  }

  /** Serialize for save */
  serialize(): Record<string, { timeSet: number }> {
    const data: Record<string, { timeSet: number }> = {};
    for (const [key, val] of this.completed) {
      data[String(key)] = val;
    }
    return data;
  }

  /** Deserialize from save */
  deserialize(data: Record<string, { timeSet: number }>): void {
    this.completed.clear();
    for (const [key, val] of Object.entries(data)) {
      this.completed.set(Number(key), val);
    }
    this.saveToStorage();
  }
}

export const DialogueTracker = new DialogueTrackerImpl();
