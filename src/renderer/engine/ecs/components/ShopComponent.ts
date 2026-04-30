import { Component } from '../Component';

export interface ShopItem {
    itemId: number; // Reference to RPGDatabase.ItemData
    priceOverride?: number;
}

export class ShopComponent extends Component {
    public readonly typeName = 'Shop';
    public inventory: ShopItem[] = [];
    public shopName: string = "Item Shop";
}
