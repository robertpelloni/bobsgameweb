import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if "import { Tooltip } from '../ui/Tooltip';" not in content:
        content = content.replace('import { ToastManager } from \'../ui/ToastManager\';', 'import { ToastManager } from \'../ui/ToastManager\';\nimport { Tooltip } from \'../ui/Tooltip\';')

    # Add tooltip instance
    if "private tooltip!: Tooltip;" not in content:
        content = re.sub(r'public pixiContainer: Container = new Container\(\);', 'public pixiContainer: Container = new Container();\n  private tooltip!: Tooltip;', content)

    # Initialize tooltip
    if "this.tooltip = new Tooltip" not in content:
        content = re.sub(r'this\.pixiNameInput = new TextInput', 'this.tooltip = new Tooltip(window.innerWidth, window.innerHeight);\n    this.pixiContainer.addChild(this.tooltip.getContainer());\n\n    this.pixiNameInput = new TextInput', content)

    # Helper function for adding tooltips
    if "private addTooltip" not in content:
        content = re.sub(r'private createNew\(\) \{', 'private addTooltip(target: any, text: string) {\n    target.container.on("pointerover", (e: any) => {\n      this.tooltip.show(e.global.x, e.global.y, text);\n    });\n    target.container.on("pointermove", (e: any) => {\n      this.tooltip.updatePosition(e.global.x, e.global.y);\n    });\n    target.container.on("pointerout", () => {\n      this.tooltip.hide();\n    });\n  }\n\n  private createNew() {', content)

    # Add tooltips to elements
    replacements = [
        ('const saveBtn = new Button("Save to Slot 1", { width: 140, height: 30 });', 'const saveBtn = new Button("Save to Slot 1", { width: 140, height: 30 });\n    this.addTooltip(saveBtn, "Save your custom ruleset to Browser Storage Slot 1.");'),
        ('this.pixiNameInput = new TextInput("Enter Game Name", { width: 330, height: 30 });', 'this.pixiNameInput = new TextInput("Enter Game Name", { width: 330, height: 30 });\n    this.addTooltip(this.pixiNameInput, "Name your custom puzzle game. This name is visible when sharing your game.");'),
        ('const txt2SpriteBtn = new Button("Text-to-Sprite", { width: 150, height: 30, backgroundColor: 0x440044 });', 'const txt2SpriteBtn = new Button("Text-to-Sprite", { width: 150, height: 30, backgroundColor: 0x440044 });\n    this.addTooltip(txt2SpriteBtn, "Generate a sprite from a text description using AI.");'),
        ('const txt2TileBtn = new Button("Text-to-Tileset", { width: 150, height: 30, backgroundColor: 0x440044 });', 'const txt2TileBtn = new Button("Text-to-Tileset", { width: 150, height: 30, backgroundColor: 0x440044 });\n    this.addTooltip(txt2TileBtn, "Generate a tile map from a text description using AI.");'),
        ('const addColorBtn = new Button("Add Color", { width: 150, height: 30, backgroundColor: 0x004444 });', 'const addColorBtn = new Button("Add Color", { width: 150, height: 30, backgroundColor: 0x004444 });\n    this.addTooltip(addColorBtn, "Add a new block color to your palette.");'),
        ('const rmColorBtn = new Button("Remove Color", { width: 150, height: 30, backgroundColor: 0x004444 });', 'const rmColorBtn = new Button("Remove Color", { width: 150, height: 30, backgroundColor: 0x004444 });\n    this.addTooltip(rmColorBtn, "Remove the last block color from your palette.");'),
        ('const preset1 = new Button("Classic Drop", { width: 100, height: 30, backgroundColor: 0x000044 });', 'const preset1 = new Button("Classic Drop", { width: 100, height: 30, backgroundColor: 0x000044 });\n    this.addTooltip(preset1, "Load the Classic Drop ruleset (Standard 10x20 grid, 7 tetrominoes).");'),
        ('const preset2 = new Button("Sprint Drop", { width: 100, height: 30, backgroundColor: 0x000044 });', 'const preset2 = new Button("Sprint Drop", { width: 100, height: 30, backgroundColor: 0x000044 });\n    this.addTooltip(preset2, "Load the Sprint Drop ruleset (Fast gravity, no lock delay).");'),
        ('const preset3 = new Button("Cascade", { width: 100, height: 30, backgroundColor: 0x000044 });', 'const preset3 = new Button("Cascade", { width: 100, height: 30, backgroundColor: 0x000044 });\n    this.addTooltip(preset3, "Load the Cascade ruleset (Blocks fall apart when lines clear).");'),
        ('const preset4 = new Button("Zen Garden", { width: 100, height: 30, backgroundColor: 0x000044 });', 'const preset4 = new Button("Zen Garden", { width: 100, height: 30, backgroundColor: 0x000044 });\n    this.addTooltip(preset4, "Load the Zen Garden ruleset (Relaxing gameplay, slow gravity).");'),
        ('const preset5 = new Button("Stack", { width: 100, height: 30, backgroundColor: 0x000044 });', 'const preset5 = new Button("Stack", { width: 100, height: 30, backgroundColor: 0x000044 });\n    this.addTooltip(preset5, "Load the Stack ruleset (Build as high as you can).");'),
        ('const preset6 = new Button("Micro", { width: 100, height: 30, backgroundColor: 0x000044 });', 'const preset6 = new Button("Micro", { width: 100, height: 30, backgroundColor: 0x000044 });\n    this.addTooltip(preset6, "Load the Micro ruleset (Tiny grid, tiny pieces).");'),
        ('const playBtn = new Button("Play", { width: 100, height: 30, backgroundColor: 0x444400 });', 'const playBtn = new Button("Play", { width: 100, height: 30, backgroundColor: 0x444400 });\n    this.addTooltip(playBtn, "Play animation timeline.");'),
        ('const stopBtn = new Button("Stop", { width: 100, height: 30, backgroundColor: 0x444400 });', 'const stopBtn = new Button("Stop", { width: 100, height: 30, backgroundColor: 0x444400 });\n    this.addTooltip(stopBtn, "Stop animation timeline.");'),
        ('const saveBtn2 = new Button("Save 2", { width: 70, height: 30 });', 'const saveBtn2 = new Button("Save 2", { width: 70, height: 30 });\n    this.addTooltip(saveBtn2, "Save your custom ruleset to Browser Storage Slot 2.");'),
        ('const loadBtn2 = new Button("Load 2", { width: 70, height: 30 });', 'const loadBtn2 = new Button("Load 2", { width: 70, height: 30 });\n    this.addTooltip(loadBtn2, "Load custom ruleset from Browser Storage Slot 2.");'),
        ('const saveBtn3 = new Button("Save 3", { width: 70, height: 30 });', 'const saveBtn3 = new Button("Save 3", { width: 70, height: 30 });\n    this.addTooltip(saveBtn3, "Save your custom ruleset to Browser Storage Slot 3.");'),
        ('const loadBtn3 = new Button("Load 3", { width: 70, height: 30 });', 'const loadBtn3 = new Button("Load 3", { width: 70, height: 30 });\n    this.addTooltip(loadBtn3, "Load custom ruleset from Browser Storage Slot 3.");'),
        ('const loadBtn = new Button("Load from Slot 1", { width: 140, height: 30 });', 'const loadBtn = new Button("Load from Slot 1", { width: 140, height: 30 });\n    this.addTooltip(loadBtn, "Load custom ruleset from Browser Storage Slot 1.");'),
    ]

    for search, replace in replacements:
        if replace not in content:
            content = content.replace(search, replace)

    with open(filepath, 'w') as f:
        f.write(content)

update_file('src/renderer/editor/CustomGameEditor.ts')
