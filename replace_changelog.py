import re
from datetime import datetime

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    today = datetime.now().strftime('%Y-%m-%d')
    new_entry = f"""## [3.0.12] - {today}
### Added
- Hooked WebGPU particle demo into main menu
- Added `getFFTData` to `AudioManager` for audio reactive components
- Added tooltips to UI elements in `CustomGameEditor` to better explain functionality and guide the user through the custom ruleset creation process.

"""
    # Insert at the beginning of the changelog just after the header
    content = re.sub(r'(# Changelog\n.*?\n)', r'\1' + new_entry, content, 1)

    with open(filepath, 'w') as f:
        f.write(content)

update_file('CHANGELOG.md')
