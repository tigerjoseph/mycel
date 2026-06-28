# Step 1 — Implementation handoff

**For:** new Cursor chat with workspace root `/Users/test/Projects/mycel`

Read first: [DECISIONS.md](./DECISIONS.md) · [SHIP-PLAN.md](./SHIP-PLAN.md)

---

## Goal

Four-tab shell you open every day. No engine yet. Corpus is placeholder.

---

## Tasks (in order)

### 1. Types + routing

- `src/shared/types.ts` — change `PageId` to `'todo' | 'people' | 'create' | 'corpus'`
- `src/renderer/src/store/ui.ts` — default `activePage: 'todo'`
- `src/renderer/src/hooks/useKeyboard.ts` — update shortcuts

### 2. Pages

| New / changed | Action |
|---------------|--------|
| `src/renderer/src/pages/Todo.tsx` | Lift todo UI from `OutreachQueue.tsx` |
| `src/renderer/src/pages/Create.tsx` | Sub-nav Docs \| Notes; render `Docs` or `Notes` |
| `src/renderer/src/pages/Corpus.tsx` | Placeholder: “Corpus — coming in Step 5” |
| `src/renderer/src/pages/CRM.tsx` | Rename label to People; remove todo section from OutreachQueue usage |

### 3. App shell

- `App.tsx` — `TAB_PAGES`: todo, people, create, corpus
- Keep-alive pattern for Create (Docs + Notes mounted, toggled with CSS)

### 4. TopNav

- Labels: To-Do · People · Create · Corpus

### 5. Persist tab

- `settings:set` / `settings:get` — store `lastPage: PageId`
- On mount: restore `lastPage` if set; else `todo`
- On `setPage`: save `lastPage`

### 6. Lean (same PR)

- Delete unused `LogoShowcase.tsx`, `NoteEditor.tsx` if not imported
- Hide or remove `CRMDashboard` from default CRM view (follow-ups later in Step 3)

### 7. Verify

```bash
npm run typecheck
npm run dev
```

Manual: switch tabs 10×, restart app, confirm last tab restored.

---

## Do NOT in Step 1

- Port M2C / engine / Corpus pipeline
- Posts UI
- Schema migrations for meetings/atoms
- Edit `m2cprivate`

---

## Optional (if time)

- bold-light default in settings (check if `appearance.ts` exists; may need theme work)
- `electron-builder.yml` — arm64-only target for `publish:silicon`
- `test:ship-1` script in package.json

---

## File map (today)

```
src/renderer/src/
  App.tsx              — tab shell
  components/TopNav.tsx
  pages/CRM.tsx        — becomes People
  pages/Docs.tsx
  pages/Notes.tsx
  pages/OutreachQueue.tsx  — todos to extract
  store/ui.ts
src/shared/types.ts  — PageId
src/main/handlers/settings.ts
```
