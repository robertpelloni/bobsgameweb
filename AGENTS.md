# AGENTS.md

Welcome Agent!

## Directives
1. **Analyze Deeply**: Always analyze the full project state, including `HANDOFF.md`, `ROADMAP.md`, `TODO.md`, `VISION.md`, and `CHANGELOG.md`.
2. **Document Everything**: Input information and your findings must be documented in comprehensive, FULL extreme detail.
3. **Comment Heavily**: Comment your code in depth—what it's doing, why, side effects, optimizations, alternate methods.
4. **Version Control**: Every build should have a new version number. Update `VERSION.md` (which should only contain the version string). Update `CHANGELOG.md`. Commit and push with the version number in the commit message.
5. **Autonomy**: Do not stop. Do whatever research needs to be done. Keep going until all planned features are 100% implemented.
6. **Submodules**: Ensure all linked/referenced projects are added as submodules and their features are documented and assimilated.

## Brain — Agent Memory

This project uses Brain for agent memory management.

**Start here when orienting:** Read `.memory/main.md` for the project roadmap, key decisions, and open problems.
Read `.memory/AGENTS.md` for the full Brain protocol reference.
Tools: memory_commit, memory_branch (create/switch/merge)
