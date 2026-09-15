# Mycel — agent contract

Personal CRM + docs + notes. Electron + electron-vite + React 19 + TypeScript + Zustand. Review OS applies: tickets in, PRs out, no chatting.

## Lanes

- Work on a feature branch. Open a PR into `main`.
- **Do not merge. Do not ship.** `./scripts/ship.sh` / `npm run ship` / notarize are human-only on the Mac.
- Merge ≠ release. Users only get a build after ship (GitHub Release + auto-updater).

## Stack (do not reinvent)

- Main: `src/main/` — IPC in `src/main/handlers/`
- Preload: `src/preload/index.ts` → `window.mycel.*`
- Renderer: `src/renderer/src/`
- Shared types: `src/shared/types.ts` and `src/renderer/src/types/electron.d.ts`
- New IPC: all three of preload, `electron.d.ts`, handler
- Inline styles for component-specific UI; `font-heading` (Lora), `font-ui` (Inter)
- Tailwind v4 CSS variables: `--bg`, `--text`, `--accent`, `--surface`, `--border`, `--text-muted`

## Never

- Commit `.env` or Apple/Google secrets
- Force-push `main`
- Drive-by refactors or new product surface the ticket did not ask for

## Cursor Cloud specific instructions

- Install: `npm install` (the committed `package-lock.json` is not in sync with `package.json`, so `npm ci` fails — use `npm install`)
- Check: `npm run typecheck`
- Dev on the human's Mac: `npm run dev` (not `npm start` — that previews an old build)
- No Apple notarize credentials in this VM. Do not run ship.
- Prefer a default over asking. One ticket → one PR. PR body: what / how to try / checks run / did not touch.

### Running the GUI headlessly (Linux/cloud)

The base image already ships Node 22, Xvfb, and the Chromium/Electron shared libs. To exercise the desktop app end-to-end without a Mac:

- Build first: `npm run build`, then launch the built app on a virtual display:
  `Xvfb :99 -screen 0 1480x940x24 & DISPLAY=:99 node_modules/.bin/electron ./out/main/index.js --no-sandbox --disable-gpu`
  (unpackaged + no `ELECTRON_RENDERER_URL` loads `out/renderer/index.html`; dev data lives in `mycel-dev` userData, never real data).
- Drive the UI via the Chrome DevTools Protocol (`--remote-debugging-port=9222 --remote-allow-origins=*`), not synthetic `xdotool` clicks — the window's 1.18 zoom factor and X focus make XTest input unreliable, while CDP `Input.*` events are trusted and hit the real renderer → preload → IPC → libsql path.
- Capture evidence with `ffmpeg -f x11grab -i :99 ...`.
