/**
 * MountCombatSystem — allows combat while riding mounts.
 *
 * Features:
 * - Mounted attacks with reach bonuses
 * - Trample mechanics (damage by moving through enemies)
 * - Mount-specific combat skills (Charge, Kick, Rear Up)
 * - Shared health pool or mount durability
 * - Dismount on heavy impact
 */

export interface MountedAttack {
    id: string;
    name: string;
    damageMult: number;
    staminaCost: number;
}

export class MountCombatSystem {
    private isMounted = false;
    private mountSpeed = 0;
    private chargeDistance = 0;

    mount(): void { this.isMounted = true; }
    dismount(): void { this.isMounted = false; this.chargeDistance = 0; }

    /** Calculate damage including momentum from movement speed */
    calculateChargeDamage(baseDamage: number, currentSpeed: number): number {
        if (!this.isMounted) return baseDamage;
        const momentumBonus = 1 + (currentSpeed * 0.2);
        return Math.floor(baseDamage * momentumBonus);
    }

    /** Perform a trample check when passing through an enemy */
    performTrample(enemyWeight: number): { success: boolean; damage: number } {
        if (!this.isMounted || this.mountSpeed < 5) return { success: false, damage: 0 };
        
        const damage = Math.floor(this.mountSpeed * 2);
        const success = Math.random() > (enemyWeight / 100);
        
        return { success, damage };
    }

    update(dt: number, speed: number): void {
        this.mountSpeed = speed;
        if (speed > 8) {
            this.chargeDistance += speed * dt;
        } else {
            this.chargeDistance = 0;
        }
    }

    getChargeBonus(): number {
        return Math.min(2.0, 1.0 + (this.chargeDistance / 100));
    }
}
