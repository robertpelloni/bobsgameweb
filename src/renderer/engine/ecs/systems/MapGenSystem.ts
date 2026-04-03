import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { MapGenComponent } from '../components/MapGenComponent';
import { MapData } from '../../../../shared/MapData';

export class MapGenSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const gen = components.get('MapGen') as MapGenComponent;
            if (gen && (gen as any).needsGen) {
                this.generate(gen);
                (gen as any).needsGen = false;
            }
        }
    }

    private generate(gen: MapGenComponent): void {
        console.log(`[MapGenSystem] Generating ${gen.type} with seed ${gen.seed}...`);
        
        // Simple Random Walk Dungeon Algorithm demo
        const map = new MapData(-1, `Generated ${gen.type}`, gen.width, gen.height);
        
        let x = Math.floor(gen.width / 2);
        let y = Math.floor(gen.height / 2);
        
        for (let i = 0; i < 1000; i++) {
            map.setTileIndex(0, x, y, 1); // Floor
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) y++; else y--;
            x = Math.max(0, Math.min(gen.width - 1, x));
            y = Math.max(0, Math.min(gen.height - 1, y));
        }

        (this as any).scene?.onMapGenerated(map);
    }
}
