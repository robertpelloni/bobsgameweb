#ifndef PHYSICS_BRIDGE_H
#define PHYSICS_BRIDGE_H

#include <vector>
#include <cmath>
#include <queue>
#include <unordered_set>
#include <algorithm>

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#endif

struct Rect {
    float x, y, w, h;
};

struct PathTile {
    int x, y;
};

struct PathNode {
    int x, y;
    float costFromStart;
    float heuristicCost;
    float totalCost;
    int parentIdx; // Index in the flat storage

    bool operator>(const PathNode& other) const {
        return totalCost > other.totalCost;
    }
};

class PhysicsBridge {
public:
    static bool checkCollision(Rect r1, Rect r2);
    static std::vector<int> checkBatchCollisions(Rect r1, std::vector<Rect> others);

    // A* Pathfinding
    static std::vector<PathTile> findPath(
        int startX, int startY,
        int endX, int endY,
        int mapWidth, int mapHeight,
        const std::vector<int>& blockedTiles, // 1 for blocked, 0 for walkable
        bool allowDiagonal
    );

private:
    static float getHeuristic(int x, int y, int endX, int endY, bool allowDiagonal) {
        int dx = std::abs(x - endX);
        int dy = std::abs(y - endY);
        if (allowDiagonal) {
            return (float)std::max(dx, dy) + (std::sqrt(2.0f) - 1.0f) * (float)std::min(dx, dy);
        }
        return (float)(dx + dy);
    }
};

#endif // PHYSICS_BRIDGE_H
