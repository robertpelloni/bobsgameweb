import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We want to add Tooltip to imports
    if "import { Tooltip } from '../ui/Tooltip';" not in content:
        content = content.replace('import { ToastManager } from \'../ui/ToastManager\';', 'import { ToastManager } from \'../ui/ToastManager\';\nimport { Tooltip } from \'../ui/Tooltip\';')

    # We want to add tooltip to Buttons
    # The Button component doesn't take tooltip in options natively based on standard pixi UI.
    # Actually wait, let's look at the Button constructor to see if it supports tooltip.

    with open(filepath, 'w') as f:
        f.write(content)

update_file('src/renderer/editor/CustomGameEditor.ts')
