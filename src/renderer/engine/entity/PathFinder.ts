/**
 * PathFinder — A* pathfinding on a tile grid.
 *
 * Ported from okgame C++ Engine/Engine/entity/PathFinder.
 * Finds the shortest path between two tile coordinates, respecting tile blocking.
 */

export interface PathTile {
    x: number;
    y: number;
}

export interface TileDataProvider {
    isBlocked(tileX: number, tileY: number): boolean;
    getTileCost(fromX: number, fromY: number, toX: number, toY: number): number;
}

class PathNode {
    x: number;
    y: number;
    costFromStart = 0;
    heuristicCost = 0;
    totalCost = 0;
    depth = 0;
    parent: PathNode | null = null;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setParent(parent: PathNode): number {
        this.parent = parent;
        this.depth = parent.depth + 1;
        return this.depth;
    }
}

export class TilePath {
    private tiles: PathTile[] = [];

    getLength(): number {
        return this.tiles.length;
    }

    getTileForIndex(index: number): PathTile | undefined {
        return this.tiles[index];
    }

    getTileXForIndex(index: number): number {
        return this.tiles[index]?.x ?? 0;
    }

    getTileYForIndex(index: number): number {
        return this.tiles[index]?.y ?? 0;
    }

    addTileToEnd(x: number, y: number): void {
        this.tiles.push({ x, y });
    }

    addTileToBeginning(x: number, y: number): void {
        this.tiles.unshift({ x, y });
    }

    contains(tileX: number, tileY: number): boolean {
        return this.tiles.some(t => t.x === tileX && t.y === tileY);
    }

    /** Iterate over all tiles. */
    [Symbol.iterator](): Iterator<PathTile> {
        let i = 0;
        return {
            next: () => {
                if (i < this.tiles.length) {
                    return { value: this.tiles[i++]!, done: false };
                }
                return { value: undefined, done: true } as IteratorResult<PathTile>;
            },
        };
    }
}

export class PathFinder {
    private tileData: TileDataProvider;
    private maxSearchDistance: number;
    private allowDiagonal: boolean;
    private mapWidth: number;
    private mapHeight: number;

    constructor(
        tileData: TileDataProvider,
        mapWidth: number,
        mapHeight: number,
        maxSearchDistance = 100,
        allowDiagonal = true,
    ) {
        this.tileData = tileData;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.maxSearchDistance = maxSearchDistance;
        this.allowDiagonal = allowDiagonal;
    }

    findPath(startX: number, startY: number, endX: number, endY: number): TilePath | null {
        // Early out: start is blocked
        if (this.tileData.isBlocked(startX, startY)) return null;
        if (this.tileData.isBlocked(endX, endY)) return null;

        const openSet: PathNode[] = [];
        const closedSet = new Set<number>();

        const startNode = new PathNode(startX, startY);
        startNode.heuristicCost = this.getHeuristicCost(startX, startY, endX, endY);
        startNode.totalCost = startNode.heuristicCost;
        openSet.push(startNode);

        const key = (x: number, y: number) => y * this.mapWidth + x;

        const maxIterations = this.maxSearchDistance * 4;
        let iterations = 0;

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Find lowest cost node in open set
            let lowestIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i]!.totalCost < openSet[lowestIdx]!.totalCost) {
                    lowestIdx = i;
                }
            }

            const current = openSet[lowestIdx]!;

            // Found the target
            if (current.x === endX && current.y === endY) {
                return this.buildPath(current);
            }

            // Move current from open to closed
            openSet.splice(lowestIdx, 1);
            closedSet.add(key(current.x, current.y));

            // Search neighbors
            const neighbors = this.allowDiagonal
                ? [
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                    { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
                    { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
                ]
                : [
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                ];

            for (const { dx, dy } of neighbors) {
                const nx = current.x + dx;
                const ny = current.y + dy;

                // Bounds check
                if (nx < 0 || ny < 0 || nx >= this.mapWidth || ny >= this.mapHeight) continue;

                // Blocked check
                if (this.tileData.isBlocked(nx, ny)) continue;

                // Already visited
                if (closedSet.has(key(nx, ny))) continue;

                // Diagonal movement: check that we can pass through both adjacent tiles
                if (dx !== 0 && dy !== 0) {
                    if (this.tileData.isBlocked(current.x + dx, current.y) ||
                        this.tileData.isBlocked(current.x, current.y + dy)) {
                        continue;
                    }
                }

                const moveCost = this.tileData.getTileCost(current.x, current.y, nx, ny);
                const newCost = current.costFromStart + moveCost;

                // Check if already in open set with lower cost
                const existingIdx = openSet.findIndex(n => n.x === nx && n.y === ny);
                if (existingIdx !== -1) {
                    const existing = openSet[existingIdx]!;
                    if (newCost < existing.costFromStart) {
                        existing.costFromStart = newCost;
                        existing.totalCost = newCost + existing.heuristicCost;
                        existing.setParent(current);
                    }
                } else {
                    const neighbor = new PathNode(nx, ny);
                    neighbor.setParent(current);
                    neighbor.costFromStart = newCost;
                    neighbor.heuristicCost = this.getHeuristicCost(nx, ny, endX, endY);
                    neighbor.totalCost = newCost + neighbor.heuristicCost;
                    openSet.push(neighbor);
                }
            }
        }

        return null; // No path found
    }

    private buildPath(endNode: PathNode): TilePath {
        const path = new TilePath();
        let node: PathNode | null = endNode;
        while (node) {
            path.addTileToBeginning(node.x, node.y);
            node = node.parent;
        }
        return path;
    }

    private getHeuristicCost(x: number, y: number, endX: number, endY: number): number {
        const dx = Math.abs(x - endX);
        const dy = Math.abs(y - endY);
        // Octile distance for diagonal movement
        if (this.allowDiagonal) {
            return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
        }
        return dx + dy;
    }
}
