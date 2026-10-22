# bobsgameweb — "okgame", the bob's game puzzle engine (TypeScript/PixiJS)

This repo (package name `okgame`, version 3.0.33) is the modern web re-implementation of **bob's game**: a puzzle game engine being rebuilt in TypeScript on PixiJS, restoring the legacy Java engine (v8830) into a form that runs in the browser, in Electron on desktop, and via Capacitor on mobile.

> **Alpha software under construction.** Backwards compatibility is not guaranteed; expect breaking changes and bugs.

## What's here

- **Engine & game client** — Vite + TypeScript + PixiJS (`src/`), with Howler for audio
- **AI proxy server** — `server/ai_proxy.js` (Express), a small backend the client talks to
- **Desktop** — Electron + electron-builder
- **Mobile** — Capacitor
- **Deployment** — scripted deploy to the Hetzner nginx host with automatic rollback (`scripts/deploy-with-rollback.sh`); the live site is [bobsgame.com](https://bobsgame.com)

This repo is also a git submodule of [`robertpelloni/bg`](https://github.com/robertpelloni/bg), the umbrella workspace for all bob's game engines (C++, Java, and this one). The C++ engine lives in `bg`/`okgame`; the original Java engine is [`robertpelloni/bobsgameonlinejava`](https://github.com/robertpelloni/bobsgameonlinejava).

## Commands

```bash
npm install

npm run dev             # Vite dev server
npm run dev:electron    # Vite + Electron together
npm run server          # AI proxy server only

npm run build           # tsc && vite build
npm run build:electron  # production Electron build
npm run preview

npm run lint            # ESLint over src
npm run typecheck       # tsc --noEmit

npm run deploy:hetzner  # deploy with rollback (see DEPLOY docs in repo)
```

Deploy configuration is via environment (`FRONTEND_HOST`, `FRONTEND_USER`, `BACKEND_URL`, `FRONTEND_URL`) — see the previous README text and `DEPLOY.md`-style notes in the repo history for the full invocation.

## Docs in this repo

`VISION.md` (foundational concepts), `ROADMAP.md` (structural milestones), `TODO.md` (immediate tasks), `MEMORY.md` (architectural observations), `CHANGELOG.md` (version/recovery history).

## License

SEE LICENSE in package.json — all rights reserved unless a license file in the repo says otherwise.
