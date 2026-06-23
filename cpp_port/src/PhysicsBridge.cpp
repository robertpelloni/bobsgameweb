#include "PhysicsBridge.h"

bool PhysicsBridge::checkCollision(Rect r1, Rect r2) {
    return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
    );
}

std::vector<int> PhysicsBridge::checkBatchCollisions(Rect r1, std::vector<Rect> others) {
    std::vector<int> results;
    for (size_t i = 0; i < others.size(); ++i) {
        if (checkCollision(r1, others[i])) {
            results.push_back(static_cast<int>(i));
        }
    }
    return results;
}

std::vector<PathTile> PhysicsBridge::findPath(
    int startX, int startY,
    int endX, int endY,
    int mapWidth, int mapHeight,
    const std::vector<int>& blockedTiles,
    bool allowDiagonal
) {
    if (startX < 0 || startY < 0 || startX >= mapWidth || startY >= mapHeight) return {};
    if (endX < 0 || endY < 0 || endX >= mapWidth || endY >= mapHeight) return {};
    if (blockedTiles[startY * mapWidth + startX]) return {};
    if (blockedTiles[endY * mapWidth + endX]) return {};

    std::priority_queue<PathNode, std::vector<PathNode>, std::greater<PathNode>> openSet;
    std::vector<float> gScore(mapWidth * mapHeight, INFINITY);
    std::vector<int> parentMap(mapWidth * mapHeight, -1);

    gScore[startY * mapWidth + startX] = 0;
    openSet.push({startX, startY, 0, getHeuristic(startX, startY, endX, endY, allowDiagonal), getHeuristic(startX, startY, endX, endY, allowDiagonal), -1});

    int dx[] = {-1, 1, 0, 0, -1, 1, -1, 1};
    int dy[] = {0, 0, -1, 1, -1, -1, 1, 1};
    int numNeighbors = allowDiagonal ? 8 : 4;

    int iterations = 0;
    int maxIterations = mapWidth * mapHeight;

    while (!openSet.empty() && iterations < maxIterations) {
        iterations++;
        PathNode current = openSet.top();
        openSet.pop();

        if (current.x == endX && current.y == endY) {
            std::vector<PathTile> path;
            int currIdx = endY * mapWidth + endX;
            while (currIdx != -1) {
                path.push_back({currIdx % mapWidth, currIdx / mapWidth});
                currIdx = parentMap[currIdx];
            }
            std::reverse(path.begin(), path.end());
            return path;
        }

        if (current.costFromStart > gScore[current.y * mapWidth + current.x]) continue;

        for (int i = 0; i < numNeighbors; ++i) {
            int nx = current.x + dx[i];
            int ny = current.y + dy[i];

            if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue;
            if (blockedTiles[ny * mapWidth + nx]) continue;

            // Diagonal check: don't cut corners
            if (i >= 4) {
                if (blockedTiles[current.y * mapWidth + nx] || blockedTiles[ny * mapWidth + current.x]) continue;
            }

            float weight = (i < 4) ? 1.0f : std::sqrt(2.0f);
            float tentativeGScore = current.costFromStart + weight;

            if (tentativeGScore < gScore[ny * mapWidth + nx]) {
                parentMap[ny * mapWidth + nx] = current.y * mapWidth + current.x;
                gScore[ny * mapWidth + nx] = tentativeGScore;
                float h = getHeuristic(nx, ny, endX, endY, allowDiagonal);
                openSet.push({nx, ny, tentativeGScore, h, tentativeGScore + h, -1});
            }
        }
    }

    return {};
}

#ifdef __EMSCRIPTEN__
using namespace emscripten;

EMSCRIPTEN_BINDINGS(physics_module) {
    value_object<Rect>("Rect")
        .field("x", &Rect::x)
        .field("y", &Rect::y)
        .field("w", &Rect::w)
        .field("h", &Rect::h);

    value_object<PathTile>("PathTile")
        .field("x", &PathTile::x)
        .field("y", &PathTile::y);

    register_vector<Rect>("VectorRect");
    register_vector<int>("VectorInt");
    register_vector<PathTile>("VectorPathTile");

    class_<PhysicsBridge>("PhysicsBridge")
        .static_function("checkCollision", &PhysicsBridge::checkCollision)
        .static_function("checkBatchCollisions", &PhysicsBridge::checkBatchCollisions)
        .static_function("findPath", &PhysicsBridge::findPath);
}
#endif
