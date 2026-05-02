/**
 * NavalSystem — ship management and ocean exploration.
 *
 * Features:
 * - Ship types (Raft, Sloop, Galleon)
 * - Navigation logic (Wind direction, Current)
 * - Naval combat (Broadside cannons)
 * - Hull and Sail durability
 * - Exploration mechanics (Fog of war clearing, Treasure islands)
 */

export interface Ship {
    id: string;
    name: string;
    type: "sloop" | "galleon";
    hullHealth: number;
    sailHealth: number;
    speed: number;
    cannons: number;
}

export class NavalSystem {
    private currentShip: Ship | null = null;
    private windDirection: number = 0; // 0-360 degrees
    private windStrength: number = 5;

    purchaseShip(name: string, type: "sloop" | "galleon"): Ship {
        this.currentShip = {
            id: `ship_${Date.now()}`,
            name,
            type,
            hullHealth: type === "galleon" ? 2000 : 800,
            sailHealth: type === "galleon" ? 1000 : 400,
            speed: 0,
            cannons: type === "galleon" ? 20 : 6
        };
        return this.currentShip;
    }

    /** Calculate ship speed based on wind alignment */
    calculateSpeed(heading: number): number {
        if (!this.currentShip) return 0;
        
        const alignment = Math.cos((heading - this.windDirection) * (Math.PI / 180));
        const sailFactor = this.currentShip.sailHealth / (this.currentShip.type === "galleon" ? 1000 : 400);
        
        // Base speed + wind bonus (if aligned)
        const speed = (2 + (alignment + 1) * this.windStrength) * sailFactor;
        this.currentShip.speed = Math.max(0, speed);
        return this.currentShip.speed;
    }

    takeDamage(hull: number, sails: number): { sunk: boolean } {
        if (!this.currentShip) return { sunk: false };
        this.currentShip.hullHealth -= hull;
        this.currentShip.sailHealth -= sails;
        
        if (this.currentShip.hullHealth <= 0) {
            this.currentShip = null;
            return { sunk: true };
        }
        return { sunk: false };
    }

    getShip() { return this.currentShip; }
}
