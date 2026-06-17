#ifndef PHYSICS_BRIDGE_H
#define PHYSICS_BRIDGE_H

#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#endif

struct Rect {
    float x, y, w, h;
};

class PhysicsBridge {
public:
    static bool checkCollision(Rect r1, Rect r2);
    static std::vector<int> checkBatchCollisions(Rect r1, std::vector<Rect> others);
};

#endif // PHYSICS_BRIDGE_H
