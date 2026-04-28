cmake_minimum_required(VERSION 3.16)
project(bgeditor VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

# Find Qt6 Components
find_package(Qt6 COMPONENTS Core Gui Widgets REQUIRED)

# This is a scaffolding placeholder for the C++ port of bgeditor
# It will eventually link with bobui (qt6) and Ultimate++

add_executable(bgeditor
    src/main.cpp
)

target_link_libraries(bgeditor PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets)
