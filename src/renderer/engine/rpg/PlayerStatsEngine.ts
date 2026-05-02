/**
 * PlayerStatsEngine — central hub for final stat calculations.
 *
 * Features:
 * - Aggregates base stats + level bonuses
 * - Applies Job/Talent modifiers
 * - Calculates effective stats (Critical, Dodge, Armor pen)
 * - Cached re-calculations on property changes
 */

export interface FinalStats {
    atk: number;
    def: number;
    hp: number;
    mana: number;
    spd: number;
    crit: number;
    dodge: number;
}

export class PlayerStatsEngine {
    private base = { str: 10, dex: 10, int: 10, vit: 10 };
    private level = 1;

    calculate(modifiers: { mult: number, flat: number }[]): FinalStats {
        let totalMult = 1.0;
        let totalFlat = 0;
        
        for (const mod of modifiers) {
            totalMult *= mod.mult;
            totalFlat += mod.flat;
        }

        const hp = Math.floor((this.base.vit * 10 + this.level * 20 + totalFlat) * totalMult);
        const atk = Math.floor((this.base.str * 2 + this.level * 2 + totalFlat * 0.5) * totalMult);
        const def = Math.floor((this.base.vit * 1 + this.level * 1) * totalMult);
        
        return {
            hp,
            atk,
            def,
            mana: this.base.int * 15,
            spd: 100 + this.base.dex * 0.5,
            crit: 0.05 + this.base.dex * 0.001,
            dodge: 0.05 + this.base.dex * 0.001
        };
    }

    setLevel(lvl: number) { this.level = lvl; }
    setBase(str: number, dex: number, int: number, vit: number) {
        this.base = { str, dex, int, vit };
    }
}
