# SUBMODULES

## Sprite and Art Tools
- [aseprite](https://github.com/aseprite/aseprite) - Leading pixel art tool
- [sprite-studio-64](https://github.com/tstamborski/sprite-studio-64)
- [stipple-effect](https://github.com/stipple-effect/stipple-effect)
- [csprite](https://github.com/csprite/csprite)
- [raster-master](https://github.com/RetroNick2020/raster-master)
- [voidsprite](https://github.com/counter185/voidsprite)
- [Pixelorama](https://github.com/Orama-Interactive/Pixelorama)
- [PixiEditor](https://github.com/PixiEditor/PixiEditor)
- [LibreSprite](https://github.com/LibreSprite/LibreSprite)
- [rx](https://github.com/cloudhead/rx)
- [piskel](https://github.com/piskelapp/piskel)

## Tilemap Tools
- [Tile-Studio](https://github.com/Wiering/Tile-Studio)
- [tilemap-studio](https://github.com/Rangi42/tilemap-studio)
- [tilemap-editor](https://github.com/blurymind/tilemap-editor)
- [tactile](https://github.com/albin-johansson/tactile)
- [Simple-Sprite-Tile-2D](https://github.com/wmltogether/Simple-Sprite-Tile-2D)
- [bottled-up-tilemap](https://github.com/Dark-Peace/bottled-up-tilemap)
- [DTile](https://github.com/MagnonGames/DTile)
- [tiled](https://github.com/mapeditor/tiled)
- [OgmoEditor3-CE](https://github.com/Ogmo-Editor-3/OgmoEditor3-CE)

## Voxel and 3D Tools
- [blockbench](https://github.com/JannisX11/blockbench)
- [goxel](https://github.com/guillaumechereau/goxel)

## Other Tools
- [Raylib-Examples](https://github.com/Pakz001/Raylib-Examples)
- [GrowTools](https://github.com/GuckTubeYT/GrowTools)
- [retro-game-editor](https://github.com/haroldo-ok/retro-game-editor)
- [SpeedEd](https://github.com/jval1972/SpeedEd)
- [aseprite-guide](https://github.com/PandaDevOfficial/aseprite-guide)
- [Cytopia](https://github.com/CytopiaTeam/Cytopia)
- [grafx2](https://github.com/miniupnp/grafx2)
- [grafx2-dos](https://github.com/deverac/grafx2-dos)
- [PyxleOS](https://github.com/Dakkra/PyxleOS)

## Game Engine Research & Parity Targets

### Defold
- **Key Features**: Lua scripting, highly performant C++ core, visual GUI editor, component-based scene graph, hot reloading.
- **bgeditor goal**: Match the instant hot-reloading pipeline and efficient component system for 2D.

### Love2D
- **Key Features**: Code-first, extensive module ecosystem, shader support, physics (Box2D).
- **bgeditor goal**: Match the simple, transparent code structure and flexibility.

### Phaser
- **Key Features**: Web-first, massive plugin ecosystem, Scene graph, Arcade Physics / Matter.js.
- **bgeditor goal**: Achieve better performance than Phaser while retaining the web-first accessibility.

### Construct
- **Key Features**: Visual scripting (Event Sheets), no-code logic, timeline animation.
- **bgeditor goal**: Implement equivalent "Event Sheets" in our RPG Event system.

### GameMaker
- **Key Features**: GML (GameMaker Language), drag-and-drop, room editor, tight asset pipeline.
- **bgeditor goal**: Match the all-in-one tightly integrated asset pipeline (sprite editor + room editor).

### RPG Maker
- **Key Features**: Database (items, weapons, actors), map editor with auto-tiles, event system.
- **bgeditor goal**: Our `engine/rpg/event` system must surpass RPG Maker's event branching and database management.
