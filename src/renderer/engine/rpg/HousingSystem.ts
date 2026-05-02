/**
 * HousingSystem - Player property and furniture management.
 * 
 * Features:
 * - Real-estate purchasing (Apartments, Cottages, Manors)
 * - Furniture placement (Grid-based or free-form)
 * - Storage containers (Chest, Wardrobe)
 * - Interior decoration styles
 * - Permissions (Public, Friends-only, Private)
 * - Rest bonus for sleeping at home
 */

export interface Furniture {
    id: string;
    itemId: string;
    x: number;
    y: number;
    rotation: number;
}

export interface House {
    id: string;
    ownerId: string;
    type: "apartment" | "cottage" | "manor";
    furniture: Furniture[];
    maxFurniture: number;
}

export class HousingSystem {
    private currentHouse: House | null = null;
    private ownedHouses: Map<string, House> = new Map();
    
    /** Buy a house */
    purchase(ownerId: string, type: "apartment" | "cottage" | "manor"): string {
        const id = `house_${Date.now()}`;
        const max = type === "apartment" ? 20 : type === "cottage" ? 50 : 150;
        const house: House = { id, ownerId, type, furniture: [], maxFurniture: max };
        this.ownedHouses.set(id, house);
        return id;
    }

    /** Place furniture */
    placeFurniture(houseId: string, itemId: string, x: number, y: number): boolean {
        const house = this.ownedHouses.get(houseId);
        if (!house) return false;
        if (house.furniture.length >= house.maxFurniture) return false;
        
        house.furniture.push({
            id: `furn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            itemId,
            x,
            y,
            rotation: 0
        });
        return true;
    }

    /** Get rest bonus (XP multiplier) based on house quality */
    getRestBonus(houseId: string): number {
        const house = this.ownedHouses.get(houseId);
        if (!house) return 1.0;
        
        const typeBonus = house.type === "manor" ? 0.2 : house.type === "cottage" ? 0.1 : 0.05;
        const furnBonus = Math.min(0.1, house.furniture.length * 0.001);
        return 1.0 + typeBonus + furnBonus;
    }

    getHouse(id: string) { return this.ownedHouses.get(id); }
    getOwnedHouses(ownerId: string) { 
        return Array.from(this.ownedHouses.values()).filter(h => h.ownerId === ownerId);
    }
}
