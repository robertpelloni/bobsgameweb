# TODO

- [ ] Add submodules for 30+ sprite editors and tools.
- [ ] Evaluate missing features comparing okgame to Phaser, Defold, Love2D, Construct, GameMaker, RPGMaker.
- [ ] Implement generative AI integrations for sprites/animations.
- [ ] Port bgeditor to C++ using qt6.
- [ ] Document all submodules comprehensively.
- [ ] Refactor C++ project (if applicable/present) to be clean with Ultimate++ toolkit.

## `bgeditor` Omni-Engine Porting & Expansion
- [ ] Read and assimilate the data structure and UI flow from `src/renderer/editor/CustomGameEditor.ts`.
- [x] Abstract the DOM-based UI generation in `CustomGameEditor.ts` into our custom `ui/` component framework (Label, Button, Panel, Dropdown, Checkbox) for true cross-platform parity without CSS/HTML dependencies.
- [ ] Remove completely all hidden HTML DOM inputs and fully rewire CustomGameEditor state.
- [x] Implement generative AI tool panels (Text-to-Sprite, Text-to-Tileset) directly within the editor layout.
- [ ] Hook up Generative AI tools to an actual LLM inference API.
- [ ] Connect the visual "Event Sheet" editor directly to the `engine/rpg/event/` data structures.
- [ ] Implement a full timeline view for cinematic and sprite animations (referencing Aseprite and Construct).
- [ ] C++ Qt6 port: Scaffold the C++ project directory and link `bobui` for compiling the same data abstractions.
