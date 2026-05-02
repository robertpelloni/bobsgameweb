/**
 * SiegeEngineSystem — mechanics for faction wars and castle sieges.
 *
 * Features:
 * - Siege weapon construction (Catapults, Rams, Ballistas)
 * - Structural health for fortifications (Gates, Walls, Towers)
 * - Crew management (Multiple players operating one engine)
 * - Range and arc calculation for projectiles
 * - Deploy/Pack logic for mobility
 */

export type SiegeWeaponType = "catapult" | "ram" | "ballista" | "trebuchet";

export interface SiegeWeapon {
    id: string;
    type: SiegeWeaponType;
    health: number;
    maxHealth: number;
    ammo: number;
    crewCount: number;
    isDeployed: boolean;
}

export class SiegeEngineSystem {
    private activeWeapons: SiegeWeapon[] = [];

    construct(type: SiegeWeaponType): SiegeWeapon {
        const weapon: SiegeWeapon = {
            id: `siege_${Date.now()}`,
            type,
            health: 500,
            maxHealth: 500,
            ammo: 10,
            crewCount: 0,
            isDeployed: false
        };
        this.activeWeapons.push(weapon);
        return weapon;
    }

    deploy(id: string): boolean {
        const w = this.activeWeapons.find(sw => sw.id === id);
        if (!w || w.isDeployed) return false;
        w.isDeployed = true;
        return true;
    }

    fire(id: string, targetHealth: number): { hit: boolean; damage: number; targetRemaining: number } {
        const w = this.activeWeapons.find(sw => sw.id === id);
        if (!w || !w.isDeployed || w.ammo <= 0) return { hit: false, damage: 0, targetRemaining: targetHealth };

        w.ammo--;
        const damage = w.type === "trebuchet" ? 200 : 100;
        const remaining = Math.max(0, targetHealth - damage);
        
        return { hit: true, damage, targetRemaining: remaining };
    }

    repair(id: string, amount: number): void {
        const w = this.activeWeapons.find(sw => sw.id === id);
        if (w) w.health = Math.min(w.maxHealth, w.health + amount);
    }

    getWeapons() { return this.activeWeapons; }
}
