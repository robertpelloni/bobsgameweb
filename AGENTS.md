<!-- [HYPERNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the HyperNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

<!-- [TORMENTNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the TormentNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

# AGENTS.md — Universal Master Agent Governance (`bobsgameweb` / `okgame`)

Welcome Agent! This file is the **single global instruction master file** for all AI coding agents (`CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`).

## Core Directives
1. **Analyze Deeply**: Always analyze the full project state before and during execution, including `HANDOFF.md`, `ROADMAP.md`, `TODO.md`, `VISION.md`, `MEMORY.md`, `STRUCTURAL_MAP.md`, `DEPLOY.md`, `IDEAS.md`, and `CHANGELOG.md`.
2. **Document Everything**: Input information, architectural trade-offs, bug root causes, and runtime verification findings must be documented in comprehensive, FULL extreme detail. Never gitignore `.memory/`, session logs (`.pi/`, `.pi-lens/`, `.jules/`), databases (`*.db`), or non-sensitive documentation.
3. **Comment Heavily**: Comment your code in depth—what it is doing, why, side effects, optimizations, and alternate methods. Consolidate redundant code paths and fragmented UI subpages onto high-value unified surfaces with descriptive labels and tooltips (`Tooltip`).
4. **Single-Source Version Control**: Every build/release milestone gets a new semantic version in `VERSION.md` (which MUST only contain the version string, e.g. `v3.0.36`). `vite.config.ts`, `src/shared/Config.ts`, `src/main/index.ts`, and `server/index.js` (`server/VERSION.md`) dynamically ingest `VERSION.md`. Synchronize `package.json`, `server/package.json`, and `CHANGELOG.md`, then commit and push with the exact version number in the commit message.
5. **Hetzner Live-Only Deployment (No Local Servers) & Binary Safety**: **Do NOT run or configure local servers.** All runtime clients connect exclusively to live Hetzner Cloud (`https://bobsgame.com` and `https://ws.bobsgame.com`), deployed via `./scripts/deploy-with-rollback.sh`. **Never clean or purge built binaries** (`dist/`, `build_output/`, `*.exe`, `*.wasm`) or overwrite live VPS player data (`profiles.json`, `leaderboards.json`). Run heavyweight local compilers (`build.bat`) at **BelowNormal** CPU scheduling priority.
6. **Recursive Submodules**: Keep all linked/referenced projects (`submodules/bobui` → `robertpelloni/bqt`, `submodules/bobui/submodules/juce`, `submodules/bobui/submodules/ultimatepp`) clean, synchronized, and documented in `SUBMODULES_ANALYSIS.md` and `STRUCTURAL_MAP.md`.

## Brain — Agent Memory

This project uses Brain for agent memory management.

**Start here when orienting:** Read `.memory/main.md` for the project roadmap, key decisions, and open problems.
Read `.memory/AGENTS.md` for the full Brain protocol reference.
Tools: `memory_commit`, `memory_branch` (`create`/`switch`/`merge`)
