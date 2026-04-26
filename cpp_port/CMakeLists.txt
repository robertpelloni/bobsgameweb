cmake_minimum_required(VERSION 3.16)
project(bgeditor VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# This is a scaffolding placeholder for the C++ port of bgeditor
# It will eventually link with bobui (qt6) and Ultimate++
# TODO: Add Qt6 and Ultimate++ integration

add_executable(bgeditor
    src/main.cpp
)
