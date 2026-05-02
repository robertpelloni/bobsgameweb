import fs from 'fs';
import path from 'path';

const mapsDir = 'data/maps';
if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });

for (let i = 5; i <= 10; i++) {
  const width = 40;
  const height = 30;
  const row = 'G'.repeat(width);
  const tiles = Array(height).fill(row);

  const mapData = {
    id: i,
    name: `Placeholder Map ${i}`,
    width: width,
    height: height,
    tileSize: 8,
    tiles: tiles,
    legend: {
      G: 'grass'
    },
    entities: [],
    events: []
  };

  fs.writeFileSync(path.join(mapsDir, `map_${i}.json`), JSON.stringify(mapData, null, 2));
  console.log(`Generated data/maps/map_${i}.json`);
}
