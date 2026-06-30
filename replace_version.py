import re
def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # match number like 3.0.33 and bump to 3.0.34
    match = re.search(r'v(\d+)\.(\d+)\.(\d+)', content)
    if match:
        major = match.group(1)
        minor = match.group(2)
        patch = int(match.group(3)) + 1
        new_version = f"v{major}.{minor}.{patch}"
        content = content.replace(match.group(0), new_version)
        print(f"Bumped version to {new_version}")

    with open(filepath, 'w') as f:
        f.write(content)

update_file('VERSION.md')
update_file('package.json')
