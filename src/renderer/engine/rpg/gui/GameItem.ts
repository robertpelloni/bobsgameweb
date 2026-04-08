/**
 * GameItem — purchasable game/store item definition.
 *
 * Ported from Java com.bobsgame.client.engine.game.gui.gameStore.GameItem.
 * Represents a buyable item in the game store with pricing and metadata.
 */

export interface GameItemData {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    iconSprite: string;
    previewSprite: string;
    isOwned: boolean;
    isNew: boolean;
    isFeatured: boolean;
    rarity: number; // 0=common, 1=uncommon, 2=rare, 3=legendary
    unlockRequirement: string;
}

export class GameItem {
    id = -1;
    name = '';
    description = '';
    price = 0;
    category = '';
    iconSprite = '';
    previewSprite = '';
    isOwned = false;
    isNew = false;
    isFeatured = false;
    rarity = 0;
    unlockRequirement = '';

    constructor(data?: Partial<GameItemData>) {
        if (data) Object.assign(this, data);
    }

    static fromJSON(data: Record<string, unknown>): GameItem {
        return new GameItem({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? '',
            description: (data.description as string) ?? '',
            price: (data.price as number) ?? 0,
            category: (data.category as string) ?? '',
            iconSprite: (data.iconSprite as string) ?? '',
            previewSprite: (data.previewSprite as string) ?? '',
            isOwned: (data.isOwned as boolean) ?? false,
            isNew: (data.isNew as boolean) ?? false,
            isFeatured: (data.isFeatured as boolean) ?? false,
            rarity: (data.rarity as number) ?? 0,
            unlockRequirement: (data.unlockRequirement as string) ?? '',
        });
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id, name: this.name, description: this.description,
            price: this.price, category: this.category, iconSprite: this.iconSprite,
            previewSprite: this.previewSprite, isOwned: this.isOwned, isNew: this.isNew,
            isFeatured: this.isFeatured, rarity: this.rarity, unlockRequirement: this.unlockRequirement,
        };
    }

    getRarityName(): string {
        return ['Common', 'Uncommon', 'Rare', 'Legendary'][this.rarity] ?? 'Common';
    }

    getRarityColor(): number {
        return [0xffffff, 0x55ff55, 0x5555ff, 0xffaa00][this.rarity] ?? 0xffffff;
    }

    canAfford(money: number): boolean {
        return money >= this.price;
    }
}
