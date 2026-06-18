/**
 * Omni-Engine GameWorker
 * 
 * Offloads heavy pathfinding and logic from the main thread.
 */
import { WasmPhysicsBridge } from './physics/WasmPhysicsBridge';

interface Point { x: number, y: number }

const wasmBridge = WasmPhysicsBridge.getInstance();
wasmBridge.init();

self.onmessage = (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'findPath':
            const { start, end, grid, width, height } = data;

            // Try Wasm pathfinding first
            const wasmPath = wasmBridge.findPath(
                start.x, start.y,
                end.x, end.y,
                width, height,
                Array.from(grid),
                true
            );

            if (wasmPath && wasmPath.length > 0) {
                self.postMessage({ type: 'pathResult', data: { entityId: data.entityId, path: wasmPath } });
            } else {
                // Fallback to JS A*
                const path = findPath(start, end, grid, width, height);
                self.postMessage({ type: 'pathResult', data: { entityId: data.entityId, path } });
            }
            break;
    }
};

/**
 * Simple A* Implementation for grid pathfinding (JS Fallback)
 */
function findPath(start: Point, end: Point, grid: Int32Array, width: number, height: number): Point[] {
    const openSet: Point[] = [start];
    const cameFrom = new Map<string, Point>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const key = (p: Point) => `${p.x},${p.y}`;
    gScore.set(key(start), 0);
    fScore.set(key(start), heuristic(start, end));

    while (openSet.length > 0) {
        let current = openSet.reduce((a, b) => fScore.get(key(a))! < fScore.get(key(b))! ? a : b);
        
        if (current.x === end.x && current.y === end.y) {
            return reconstructPath(cameFrom, current);
        }

        openSet.splice(openSet.indexOf(current), 1);

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const neighbor of neighbors) {
            if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) continue;
            // Check if grid is walkable (0 is walkable in our demo)
            if (grid[neighbor.y * width + neighbor.x] !== 0) continue;

            const tentativeGScore = gScore.get(key(current))! + 1;
            if (tentativeGScore < (gScore.get(key(neighbor)) ?? Infinity)) {
                cameFrom.set(key(neighbor), current);
                gScore.set(key(neighbor), tentativeGScore);
                fScore.set(key(neighbor), tentativeGScore + heuristic(neighbor, end));
                if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return [];
}

function heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(cameFrom: Map<string, Point>, current: Point): Point[] {
    const path = [current];
    const key = (p: Point) => `${p.x},${p.y}`;
    while (cameFrom.has(key(current))) {
        current = cameFrom.get(key(current))!;
        path.unshift(current);
    }
    return path;
}
