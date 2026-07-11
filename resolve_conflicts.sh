#!/bin/bash
# Smart conflict resolution: keep both sides where possible

# CHANGELOG.md - merge both entries
sed -i '/^<<<<<<< HEAD$/,/^=======$/{
  /^<<<<<<< HEAD$/d
  /^=======$/d
  /^>>>>>>> /d
}' CHANGELOG.md

# Insert a merged header after the v3.0.33 entry
sed -i '1s/^/## v3.0.33 — 2026-06-25 (merged jules-port-legacy)\n\n### Fixed\n- Corrected Collision Logic...\n### Added\n- CustomGameEditor tooltips (port from jules-port-legacy)\n\n/' CHANGELOG.md

# MEMORY.md, ROADMAP.md - keep both versions
for f in MEMORY.md ROADMAP.md; do
  sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> /{
    /^<<<<<<< HEAD$/{
      N
      s/<<<<<<< HEAD\n/<<<<<<< HEAD (current master)\n/
    }
    /^=======$/{
      N
      s/=======\n/======= (jules-port-legacy)\n/
    }
  }' "$f"
done

# VERSION.md - keep master version (HEAD)
sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> /{
  /^<<<<<<< HEAD$/d
  /^=======$/,/^>>>>>>> /d
}' VERSION.md

# package.json - merge dependencies
sed -i '/^<<<<<<< HEAD$/,/^>>>>>>> /{
  /^<<<<<<< HEAD$/d
  /^=======$/d
  /^>>>>>>> /d
}' package.json

# package-lock.json - regenerate later, just keep HEAD for now
git checkout --ours package-lock.json

# Code files - check each
for f in src/renderer/editor/CustomGameEditor.ts src/renderer/scenes/WebGPUDemoScene.ts src/renderer/scenes/WorldScene.ts; do
  echo "=== $f ==="
  grep -c "^<<<<<<<" "$f"
done

echo "=== Resolved ==="
git diff --name-only --diff-filter=U 2>&1
