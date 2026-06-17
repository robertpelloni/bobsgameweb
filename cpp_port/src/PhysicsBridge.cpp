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

#ifdef __EMSCRIPTEN__
using namespace emscripten;

EMSCRIPTEN_BINDINGS(physics_module) {
    value_object<Rect>("Rect")
        .field("x", &Rect::x)
        .field("y", &Rect::y)
        .field("w", &Rect::w)
        .field("h", &Rect::h);

    register_vector<Rect>("VectorRect");
    register_vector<int>("VectorInt");

    class_<PhysicsBridge>("PhysicsBridge")
        .static_function("checkCollision", &PhysicsBridge::checkCollision)
        .static_function("checkBatchCollisions", &PhysicsBridge::checkBatchCollisions);
}
#endif
