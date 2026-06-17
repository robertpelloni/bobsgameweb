#include "PhysicsBridge.h"

bool PhysicsBridge::checkCollision(Rect r1, Rect r2) {
    return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
    );
}

#ifdef __EMSCRIPTEN__
using namespace emscripten;

EMSCRIPTEN_BINDINGS(physics_module) {
    value_object<Rect>("Rect")
        .field("x", &Rect::x)
        .field("y", &Rect::y)
        .field("w", &Rect::w)
        .field("h", &Rect::h);

    class_<PhysicsBridge>("PhysicsBridge")
        .static_function("checkCollision", &PhysicsBridge::checkCollision);
}
#endif
