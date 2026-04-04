/**
 * AchievementManager — Console-quality Trophy/Achievement system
 * 
 * Tracks persistent unlock conditions across all game systems:
 * - Puzzle (scores, combos, line clears, speed records)
 * - RPG (quests completed, NPCs talked to, bosses defeated, items collected)
 * - Editor (maps created, games shared, assets drawn)
 * - Social (multiplayer wins, tournaments, Elo milestones)
 * - Meta (total play time, sessions, first boot)
 * 
 * Achievements persist to localStorage and sync to server when connected.
 * Unlock triggers a Toast notification with optional haptic feedback.
 */

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;          // Emoji or asset key
    category: AchievementCategory;
    rarity: AchievementRarity;
    hidden: boolean;       // Hidden until unlocked (spoiler protection)
    condition: AchievementCondition;
    unlockedAt?: number;   // Timestamp
    progress?: number;     // 0-1 for progressive achievements
    maxProgress?: number;  // Target value for progressive achievements
}

export type AchievementCategory = 'puzzle' | 'rpg' | 'editor' | 'social' | 'meta';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementCondition {
    type: 'stat_gte' | 'stat_eq' | 'event' | 'composite';
    stat?: string;
    value?: number;
    event?: string;
    children?: AchievementCondition[];  // For composite (AND)
}

const RARITY_COLORS: Record<AchievementRarity, number> = {
    common:    0xaaaaaa,
    uncommon:  0x00cc44,
    rare:      0x3388ff,
    epic:      0xaa44ff,
    legendary: 0xffaa00
};

const RARITY_LABELS: Record<AchievementRarity, string> = {
    common:    'Common',
    uncommon:  'Uncommon',
    rare:      'Rare',
    epic:      'Epic',
    legendary: 'Legendary'
};

// ─── Achievement Definitions ───────────────────────────────────────

const ALL_ACHIEVEMENTS: Achievement[] = [
    // ── Puzzle ──
    { id: 'first_clear',     name: 'First Blood',         description: 'Clear your first line.',                        icon: '🧱', category: 'puzzle', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'totalLinesCleared', value: 1 } },
    { id: 'clear_100',       name: 'Centurion',           description: 'Clear 100 lines in total.',                     icon: '💯', category: 'puzzle', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'totalLinesCleared', value: 100 }, maxProgress: 100 },
    { id: 'clear_1000',      name: 'Line Lord',           description: 'Clear 1,000 lines in total.',                   icon: '👑', category: 'puzzle', rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'totalLinesCleared', value: 1000 }, maxProgress: 1000 },
    { id: 'clear_10000',     name: 'Puzzle God',          description: 'Clear 10,000 lines in total.',                  icon: '🏛️', category: 'puzzle', rarity: 'legendary', hidden: false, condition: { type: 'stat_gte', stat: 'totalLinesCleared', value: 10000 }, maxProgress: 10000 },
    { id: 'combo_5',         name: 'Combo Starter',       description: 'Achieve a 5x combo.',                           icon: '🔥', category: 'puzzle', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'maxCombo', value: 5 } },
    { id: 'combo_10',        name: 'Combo King',          description: 'Achieve a 10x combo.',                          icon: '💥', category: 'puzzle', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'maxCombo', value: 10 } },
    { id: 'combo_20',        name: 'Chain Reaction',      description: 'Achieve a 20x combo.',                          icon: '⚡', category: 'puzzle', rarity: 'epic',      hidden: false, condition: { type: 'stat_gte', stat: 'maxCombo', value: 20 } },
    { id: 'score_10k',       name: 'Getting Started',     description: 'Score 10,000 points in a single game.',         icon: '⭐', category: 'puzzle', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'highestScore', value: 10000 } },
    { id: 'score_100k',      name: 'Hundred Grand',       description: 'Score 100,000 points in a single game.',        icon: '🌟', category: 'puzzle', rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'highestScore', value: 100000 } },
    { id: 'score_1m',        name: 'Millionaire',         description: 'Score 1,000,000 points in a single game.',      icon: '💎', category: 'puzzle', rarity: 'legendary', hidden: false, condition: { type: 'stat_gte', stat: 'highestScore', value: 1000000 } },
    { id: 'sprint_sub60',    name: 'Speed Demon',         description: 'Complete Sprint (40 lines) in under 60 seconds.', icon: '🏃', category: 'puzzle', rarity: 'rare',    hidden: false, condition: { type: 'stat_gte', stat: 'sprintSub60', value: 1 } },
    { id: 'sprint_sub30',    name: 'Hypersonic',          description: 'Complete Sprint (40 lines) in under 30 seconds.', icon: '🚀', category: 'puzzle', rarity: 'legendary', hidden: true, condition: { type: 'stat_gte', stat: 'sprintSub30', value: 1 } },
    { id: 'hard_drop_100',   name: 'Slam Dunk',           description: 'Hard drop 100 pieces.',                         icon: '⬇️', category: 'puzzle', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'totalHardDrops', value: 100 }, maxProgress: 100 },
    { id: 'tetris_clear',    name: 'Four Wide',           description: 'Clear 4 lines at once.',                        icon: '4️⃣', category: 'puzzle', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'tetrisClears', value: 1 } },
    { id: 'perfect_clear',   name: 'Flawless',            description: 'Achieve a perfect clear (empty board).',        icon: '✨', category: 'puzzle', rarity: 'epic',      hidden: true,  condition: { type: 'stat_gte', stat: 'perfectClears', value: 1 } },

    // ── RPG ──
    { id: 'first_npc',       name: 'Social Butterfly',    description: 'Talk to your first NPC.',                       icon: '💬', category: 'rpg',    rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'npcsInteracted', value: 1 } },
    { id: 'first_battle',    name: 'Warrior\'s Path',     description: 'Win your first battle.',                        icon: '⚔️', category: 'rpg',    rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'battlesWon', value: 1 } },
    { id: 'battles_50',      name: 'Veteran Fighter',     description: 'Win 50 battles.',                               icon: '🛡️', category: 'rpg',    rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'battlesWon', value: 50 }, maxProgress: 50 },
    { id: 'quest_first',     name: 'Adventurer',          description: 'Complete your first quest.',                    icon: '📜', category: 'rpg',    rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'questsCompleted', value: 1 } },
    { id: 'quest_10',        name: 'Hero of the Realm',   description: 'Complete 10 quests.',                           icon: '🏅', category: 'rpg',    rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'questsCompleted', value: 10 }, maxProgress: 10 },
    { id: 'gold_10k',        name: 'Moneybags',           description: 'Accumulate 10,000 gold.',                       icon: '💰', category: 'rpg',    rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'totalGoldEarned', value: 10000 }, maxProgress: 10000 },
    { id: 'teleport_first',  name: 'Dimension Hopper',    description: 'Use a teleporter for the first time.',          icon: '🌀', category: 'rpg',    rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'teleportsUsed', value: 1 } },
    { id: 'skill_unlock',    name: 'Specialization',      description: 'Unlock your first skill.',                      icon: '📖', category: 'rpg',    rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'skillsUnlocked', value: 1 } },

    // ── Editor ──
    { id: 'first_map',       name: 'World Builder',       description: 'Create your first map in the editor.',          icon: '🗺️', category: 'editor', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'mapsCreated', value: 1 } },
    { id: 'first_game',      name: 'Game Designer',       description: 'Create and test a custom puzzle game.',         icon: '🎮', category: 'editor', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'customGamesCreated', value: 1 } },
    { id: 'share_game',      name: 'Publisher',           description: 'Share a custom game via deep link.',            icon: '🔗', category: 'editor', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'gamesShared', value: 1 } },
    { id: 'sprite_drawn',    name: 'Pixel Artist',        description: 'Draw a sprite in the sprite editor.',           icon: '🎨', category: 'editor', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'spritesDrawn', value: 1 } },
    { id: 'first_actor',     name: 'Worldsmith',          description: 'Add your first actor in the world database editor.', icon: '🧬', category: 'editor', rarity: 'common', hidden: false, condition: { type: 'stat_gte', stat: 'actorsCreated', value: 1 } },
    { id: 'ai_sprite',       name: 'Prompt Alchemist',    description: 'Generate an AI NPC sprite.',                    icon: '🤖', category: 'editor', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'aiSpritesGenerated', value: 1 } },
    { id: 'maps_10',         name: 'Cartographer',        description: 'Create 10 maps.',                               icon: '🧭', category: 'editor', rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'mapsCreated', value: 10 }, maxProgress: 10 },

    // ── Social ──
    { id: 'mp_first_win',    name: 'Challenger',          description: 'Win your first multiplayer match.',             icon: '🏆', category: 'social', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'mpWins', value: 1 } },
    { id: 'mp_10_wins',      name: 'Contender',           description: 'Win 10 multiplayer matches.',                   icon: '🥇', category: 'social', rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'mpWins', value: 10 }, maxProgress: 10 },
    { id: 'mp_100_wins',     name: 'Champion',            description: 'Win 100 multiplayer matches.',                  icon: '👊', category: 'social', rarity: 'epic',      hidden: false, condition: { type: 'stat_gte', stat: 'mpWins', value: 100 }, maxProgress: 100 },
    { id: 'elo_1200',        name: 'Rising Star',         description: 'Reach 1200 Elo rating.',                        icon: '📈', category: 'social', rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'currentElo', value: 1200 } },
    { id: 'elo_1500',        name: 'Master',              description: 'Reach 1500 Elo rating.',                        icon: '🎯', category: 'social', rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'currentElo', value: 1500 } },
    { id: 'elo_2000',        name: 'Grandmaster',         description: 'Reach 2000 Elo rating.',                        icon: '🌟', category: 'social', rarity: 'legendary', hidden: true,  condition: { type: 'stat_gte', stat: 'currentElo', value: 2000 } },
    { id: 'tournament_win',  name: 'Tournament Victor',   description: 'Win a tournament.',                             icon: '🏟️', category: 'social', rarity: 'epic',      hidden: false, condition: { type: 'stat_gte', stat: 'tournamentsWon', value: 1 } },
    { id: 'spectate_first',  name: 'Spectator',           description: 'Watch a match in spectator mode.',              icon: '👁️', category: 'social', rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'matchesSpectated', value: 1 } },

    // ── Meta ──
    { id: 'first_boot',      name: 'Welcome!',            description: 'Launch the game for the first time.',           icon: '🎉', category: 'meta',   rarity: 'common',    hidden: false, condition: { type: 'event', event: 'firstBoot' } },
    { id: 'play_1hr',        name: 'Dedicated',           description: 'Play for 1 hour total.',                        icon: '⏰', category: 'meta',   rarity: 'common',    hidden: false, condition: { type: 'stat_gte', stat: 'totalPlayTimeSeconds', value: 3600 }, maxProgress: 3600 },
    { id: 'play_10hr',       name: 'Committed',           description: 'Play for 10 hours total.',                      icon: '⌛', category: 'meta',   rarity: 'uncommon',  hidden: false, condition: { type: 'stat_gte', stat: 'totalPlayTimeSeconds', value: 36000 }, maxProgress: 36000 },
    { id: 'play_100hr',      name: 'Obsessed',            description: 'Play for 100 hours total.',                     icon: '🕰️', category: 'meta',   rarity: 'epic',      hidden: true,  condition: { type: 'stat_gte', stat: 'totalPlayTimeSeconds', value: 360000 }, maxProgress: 360000 },
    { id: 'all_modes',       name: 'Renaissance Gamer',   description: 'Play Marathon, Sprint, Ultra, and Stack mode.', icon: '🎭', category: 'meta',   rarity: 'rare',      hidden: false, condition: { type: 'stat_gte', stat: 'modesPlayed', value: 4 } },
];

// ─── Stats Tracker ─────────────────────────────────────────────────

export interface PlayerStats {
    [key: string]: number;
}

export interface AchievementSnapshot {
    version: string;
    stats: PlayerStats;
    unlockedIds: string[];
}

const STORAGE_KEY_STATS = 'bg_player_stats';
const STORAGE_KEY_UNLOCKS = 'bg_achievements_unlocked';

// ─── Manager Singleton ─────────────────────────────────────────────

export type AchievementUnlockCallback = (achievement: Achievement) => void;

class AchievementManagerClass {
    private stats: PlayerStats = {};
    private unlockedIds: Set<string> = new Set();
    private onUnlockCallbacks: AchievementUnlockCallback[] = [];
    private initialized: boolean = false;

    public init(): void {
        if (this.initialized) return;
        this.initialized = true;

        // Load persisted stats
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STATS);
            if (raw) this.stats = JSON.parse(raw);
        } catch { /* fresh start */ }

        // Load persisted unlocks
        try {
            const raw = localStorage.getItem(STORAGE_KEY_UNLOCKS);
            if (raw) {
                const arr: string[] = JSON.parse(raw);
                arr.forEach(id => this.unlockedIds.add(id));
            }
        } catch { /* fresh start */ }

        // Fire first boot if never seen
        if (!this.unlockedIds.has('first_boot')) {
            this.fireEvent('firstBoot');
        }

        console.log(`[Achievements] Initialized: ${this.unlockedIds.size}/${ALL_ACHIEVEMENTS.length} unlocked, tracking ${Object.keys(this.stats).length} stats`);
    }

    public onUnlock(cb: AchievementUnlockCallback): void {
        this.onUnlockCallbacks.push(cb);
    }

    public removeOnUnlock(cb: AchievementUnlockCallback): void {
        this.onUnlockCallbacks = this.onUnlockCallbacks.filter(c => c !== cb);
    }

    /** Increment a stat by a delta (default 1) */
    public incrementStat(stat: string, delta: number = 1): void {
        this.stats[stat] = (this.stats[stat] || 0) + delta;
        this.persistStats();
        this.checkAll();
    }

    /** Set a stat to an absolute value (useful for "highest score" type stats) */
    public setStat(stat: string, value: number): void {
        this.stats[stat] = value;
        this.persistStats();
        this.checkAll();
    }

    /** Set stat only if new value is higher (high-water mark) */
    public setStatMax(stat: string, value: number): void {
        if (value > (this.stats[stat] || 0)) {
            this.stats[stat] = value;
            this.persistStats();
            this.checkAll();
        }
    }

    /** Fire a named event (for event-type conditions) */
    public fireEvent(event: string): void {
        this.stats[`_event_${event}`] = 1;
        this.persistStats();
        this.checkAll();
    }

    public getStat(stat: string): number {
        return this.stats[stat] || 0;
    }

    public getAll(): Achievement[] {
        return ALL_ACHIEVEMENTS.map(a => ({
            ...a,
            unlockedAt: this.getUnlockTime(a.id),
            progress: this.getProgress(a)
        }));
    }

    public getUnlocked(): Achievement[] {
        return this.getAll().filter(a => this.unlockedIds.has(a.id));
    }

    public getLocked(): Achievement[] {
        return this.getAll().filter(a => !this.unlockedIds.has(a.id));
    }

    public isUnlocked(id: string): boolean {
        return this.unlockedIds.has(id);
    }

    public getProgress(achievement: Achievement): number {
        if (this.unlockedIds.has(achievement.id)) return 1.0;
        const cond = achievement.condition;
        if (cond.type === 'stat_gte' && cond.stat && cond.value) {
            const current = this.stats[cond.stat] || 0;
            return Math.min(1.0, current / cond.value);
        }
        return 0;
    }

    public getCompletionPercent(): number {
        return ALL_ACHIEVEMENTS.length > 0 
            ? (this.unlockedIds.size / ALL_ACHIEVEMENTS.length) * 100 
            : 0;
    }

    public exportSnapshot(): AchievementSnapshot {
        return {
            version: '2.1.5',
            stats: { ...this.stats },
            unlockedIds: [...this.unlockedIds]
        };
    }

    public mergeSnapshot(snapshot: Partial<AchievementSnapshot> | null | undefined): void {
        if (!snapshot) return;

        const incomingStats = snapshot.stats || {};
        for (const [key, value] of Object.entries(incomingStats)) {
            if (typeof value !== 'number') continue;
            this.stats[key] = Math.max(this.stats[key] || 0, value);
        }

        for (const id of snapshot.unlockedIds || []) {
            this.unlockedIds.add(id);
        }

        this.persistStats();
        this.persistUnlocks();
        this.checkAll();
    }

    public getRarityColor(rarity: AchievementRarity): number {
        return RARITY_COLORS[rarity];
    }

    public getRarityLabel(rarity: AchievementRarity): string {
        return RARITY_LABELS[rarity];
    }

    // ── Internal ──

    private checkAll(): void {
        for (const achievement of ALL_ACHIEVEMENTS) {
            if (this.unlockedIds.has(achievement.id)) continue;
            if (this.checkCondition(achievement.condition)) {
                this.unlock(achievement);
            }
        }
    }

    private checkCondition(cond: AchievementCondition): boolean {
        switch (cond.type) {
            case 'stat_gte':
                return (this.stats[cond.stat!] || 0) >= (cond.value || 0);
            case 'stat_eq':
                return (this.stats[cond.stat!] || 0) === (cond.value || 0);
            case 'event':
                return !!this.stats[`_event_${cond.event}`];
            case 'composite':
                return (cond.children || []).every(c => this.checkCondition(c));
            default:
                return false;
        }
    }

    private unlock(achievement: Achievement): void {
        this.unlockedIds.add(achievement.id);
        achievement.unlockedAt = Date.now();
        this.persistUnlocks();

        console.log(`[Achievement] 🏆 UNLOCKED: "${achievement.name}" — ${achievement.description}`);
        
        for (const cb of this.onUnlockCallbacks) {
            try { cb(achievement); } catch (e) { console.error('[Achievement] Callback error:', e); }
        }
    }

    private getUnlockTime(id: string): number | undefined {
        // We don't persist timestamps yet, just presence
        return this.unlockedIds.has(id) ? 1 : undefined;
    }

    private persistStats(): void {
        try { localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(this.stats)); } catch { /* quota */ }
    }

    private persistUnlocks(): void {
        try { localStorage.setItem(STORAGE_KEY_UNLOCKS, JSON.stringify([...this.unlockedIds])); } catch { /* quota */ }
    }
}

export const AchievementManager = new AchievementManagerClass();
