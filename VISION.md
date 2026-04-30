# VISION

The ultimate goal of this project is to create the "omni-engine": a 2D/3D game engine and editor that encompasses 100% feature parity with and surpasses all major 2D engines (Defold, Love2D, Phaser, Construct, GameMaker, RPG Maker).
It must be cross-platform (Web, Desktop, Mobile), supporting 30-player multiplayer, leaderboards, and extensive in-game custom editing.
The editor (`bgeditor`) will integrate features from 30+ open-source sprite, tilemap, and voxel editors into a single unified application (ported to C++ with Qt6 and to Web).
Extensive use of generative AI will allow for seamless generation of sprites, 3D models, and animations from text or image prompts.
The code must be meticulously documented, heavily commented, fully represented in the UI, and insanely great.


### Cross-Platform UI Paradigm
The bgeditor interface completely decouples from browser DOM mechanics. By abstracting the interface into native canvas objects (PIXI.js on Web/Electron, Qt6 on C++), the editor guarantees identical rendering, layout, and event handling across Web, Desktop, and Mobile.
