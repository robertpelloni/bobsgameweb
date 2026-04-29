## Memory

- When transforming massive files with identical repetitive blocks (like `CustomGameEditor.ts` which has multiple `this.pixiContainer.addChild(actionPanel.container)` blocks because of how it was generated or duplicated), broad search-and-replace scripts (like using `sed`) can inadvertently mess up syntax and cause strict TypeScript compilation errors (`tsc --noEmit`).
- Using `replace` in Node.js instead of `replace(/.../g)` helps target only the first occurrence, reducing the likelihood of blowing up other methods and throwing redeclaration errors.
- Always check what the previous agent checked in via `git log -1 --stat`, otherwise `git checkout -- file` will reset back to a state that might contain things you thought you authored!
- The PIXI UI port is successfully bridging HTML forms directly into PIXI by setting `display: none` to the CSS class `custom-game-editor`. This preserves the DOM nodes so the remaining unported code (`querySelector`) doesn't explode and we incrementally move the UI over seamlessly.
