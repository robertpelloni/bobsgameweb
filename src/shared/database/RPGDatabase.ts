import { AssetData } from '../AssetData';
import { MapData } from '../MapData';

export interface ActorData {
    id: number;
    name: string;
    classId: number;
    initialLevel: number;
    faceName: string;
    characterName: string;
}

export interface SkillData {
    id: number;
    name: string;
    description: string;
    mpCost: number;
    tpCost: number;
}

export interface ItemData {
    id: number;
    name: string;
    description: string;
    price: number;
    consumable: boolean;
}

export class RPGDatabase {
    public actors: ActorData[] = [];
    public skills: SkillData[] = [];
    public items: ItemData[] = [];
    public weapons: any[] = [];
    public armors: any[] = [];
    public enemies: any[] = [];
    public troops: any[] = [];
    public states: any[] = [];
    
    public maps: MapData[] = [];
    public assets: AssetData[] = [];
}
