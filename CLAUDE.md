# Mycel — Project Directives

## Ship Workflow

```bash
GH_TOKEN=github_pat_... npm run ship
```

- Typechecks, builds universal DMG, notarizes with Apple, uploads to GitHub Releases
- Auto-updater checks `tigerjoseph/mycel` releases via `electron-updater`
- `npm run publish:intel` / `npm run publish:silicon` for single-arch builds

## Architecture

- **Electron** + electron-vite + React 19 + TypeScript + Zustand
- **Main process**: `src/main/index.ts` — IPC handlers in `src/main/handlers/`
- **Preload**: `src/preload/index.ts` — exposes `window.mycel.*` API
- **Renderer**: `src/renderer/src/` — pages, components, store, styles
- **Types**: `src/shared/types.ts` (shared), `src/renderer/src/types/electron.d.ts` (window.mycel)
- **Rich text**: TipTap v3 with 18 extensions
- **Animations**: motion/react (framer-motion v12), spring transitions
- **DB**: libsql (local SQLite)
- **Styling**: Tailwind v4 via Vite plugin, CSS variables for theming (`--bg`, `--text`, `--accent`, `--surface`, `--border`, `--text-muted`)

## Conventions

- Inline styles preferred over className for component-specific styling
- Font classes: `font-heading` (Lora), `font-ui` (Inter)
- IPC pattern: preload exposes method → `ipcRenderer.invoke` → main handler via `ipcMain.handle`
- Add new IPC methods to all 3 places: `src/preload/index.ts`, `src/renderer/src/types/electron.d.ts`, `src/main/handlers/`
- Context menus: custom React popups with spring animation (not native OS menus)
- Hover states: inline `onMouseEnter`/`onMouseLeave` style changes

## Build & Publish

- `npm run dev` — local dev
- `npm run build:mac` — universal DMG (no publish)
- `npm run ship` — typecheck + build + notarize + publish to GitHub Releases
- Notarization: `scripts/notarize.js` (afterSign hook), requires `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` env vars
- GitHub publish requires `GH_TOKEN` env var

## Key Files

| File | Purpose |
|------|---------|
| `electron-builder.yml` | Build config, notarization, GitHub publish |
| `src/main/updater.ts` | Auto-updater setup, checks every 4h |
| `src/renderer/src/App.tsx` | Root component, page routing, update banner |
| `src/renderer/src/store/ui.ts` | UI state (active page, breadcrumbs, modals) |
| `src/shared/types.ts` | Shared TypeScript types |
| `build/icon.icns` | Dock icon (mushroom logo) |
