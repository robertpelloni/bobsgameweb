## Memory

- When transforming massive files with identical repetitive blocks (like `CustomGameEditor.ts` which has multiple `this.pixiContainer.addChild(actionPanel.container)` blocks because of how it was generated or duplicated), broad search-and-replace scripts (like using `sed`) can inadvertently mess up syntax and cause strict TypeScript compilation errors (`tsc --noEmit`).
- Using `replace` in Node.js instead of `replace(/.../g)` helps target only the first occurrence, reducing the likelihood of blowing up other methods and throwing redeclaration errors.
- Always check what the previous agent checked in via `git log -1 --stat`, otherwise `git checkout -- file` will reset back to a state that might contain things you thought you authored!
- The PIXI UI port is successfully bridging HTML forms directly into PIXI by setting `display: none` to the CSS class `custom-game-editor`. This preserves the DOM nodes so the remaining unported code (`querySelector`) doesn't explode and we incrementally move the UI over seamlessly.


## Recent Learnings (v2.2.6)
- **PIXI UI Migration Complete**: All forms, inputs, settings, and toggles within `CustomGameEditor.ts` have been ported from HTML DOM overlays to native PIXI components (`Panel`, `TextInput`, `Button`, `Dropdown`, `Checkbox`). The legacy DOM elements are kept alive but hidden via CSS (`display: none`) and synchronized via event listeners to avoid breaking TypeScript strict mode compilation until the state logic is fully decoupled.
- **Generative AI Hooks**: `GenerativeAIManager.ts` now utilizes standard JS `fetch()` for API calls against a local/simulated endpoint (`http://localhost:8080/api/generate`), seamlessly falling back to `setTimeout` mocks when the server is unresponsive.
- **Git Safety**: Using global `sed` scripts on massive TypeScript files can accidentally destroy logic (e.g. wiping out `return;` statements). Targeted Node.js string replacement scripts (`code.replace()`) are vastly superior for safe, automated file manipulation.


## Recent Learnings (v2.2.7)
- **C++ Qt6 port integration**: Successfully mirrored the web PIXI layouts inside `MainWindow.cpp`, bridging the conceptual design pattern of U++ into the raw Qt6 port.
- **EventSheetEditor data structures**: Replaced the UI string mocks with actual instantiated `BobEvent` and `EventCommand` objects, parsing `EventParameter` fields dynamically into the PIXI hierarchy.
