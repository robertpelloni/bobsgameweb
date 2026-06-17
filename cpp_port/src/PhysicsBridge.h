#ifndef PHYSICS_BRIDGE_H
#define PHYSICS_BRIDGE_H

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#endif

struct Rect {
    float x, y, w, h;
};

class PhysicsBridge {
public:
    static bool checkCollision(Rect r1, Rect r2);
};

#endif // PHYSICS_BRIDGE_H
