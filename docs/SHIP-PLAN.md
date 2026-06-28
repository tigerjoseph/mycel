# Mycel Ship Plan — 5 Steps

**Bar:** Steps 1–4 = daily driver (Docs, Notes, People, export). Step 5 = Corpus + capture.

---

## Step 1 — Shell + ship pipeline ← **YOU ARE HERE**

### Build

| Area | Work |
|------|------|
| **Nav** | `To-Do · People · Create · Corpus` (replace `crm · docs · notes`) |
| **To-Do** | New page — promote todos from `OutreachQueue.tsx` |
| **Create** | Wrapper page: sub-nav **Docs \| Notes** (move existing pages) |
| **Corpus** | Placeholder empty state |
| **Session** | Persist `activePage` in settings; first launch = `todo` |
| **Lean** | Delete orphans: `LogoShowcase`, `NoteEditor` (if unused), trim `CRMDashboard` from default CRM |
| **Keyboard** | Update `useKeyboard.ts` for new `PageId`s |
| **Ship** | arm64 default; verify `npm run ship` + update banner |

### Exit criteria

- [ ] Opens to To-Do (first launch)
- [ ] Restores last tab on relaunch
- [ ] Docs ↔ Notes keep-alive (no unmount flash)
- [ ] Corpus tab visible (placeholder ok)
- [ ] `npm run typecheck` passes
- [ ] DMG publishes to GitHub; update banner works

### Current codebase (pre-Step-1)

- `PageId`: `'crm' | 'docs' | 'notes'` in `src/shared/types.ts`
- `TopNav`: CRM / Docs / Notes labels
- `App.tsx`: keep-alive for three tabs
- Todos: in `OutreachQueue.tsx` inside CRM
- Updater: `src/main/updater.ts` + banner in `App.tsx`
- **No** `docs/` existed until 2026-06-05 handoff

---

## Step 2 — Create parity

- Autosave flush on blur / tab switch
- Command palette: docs + notes + todos
- Shared `TagPicker` on docs, notes, contacts
- Copy markdown in doc menu
- Notes list perf (`body_preview` optional)

**Exit:** one week without Google Docs / Apple Notes.

---

## Step 3 — People parity

- CRM minus KPI dashboard → **Follow-ups** list
- Implement `links` handlers (contact ↔ doc)
- Global tag search

**Exit:** log calls in People for 2 weeks.

---

## Step 4 — Export lane

- Copy for Substack (`substackExport.ts`)
- Cursor Tier 1–2: copy context, open in Cursor, export bundle
- `useCopyFeedback()` toast

**Exit:** one newsletter via Substack paste; one Cursor export.

---

## Step 5 — Listen lane (engine)

**Decide first:** recording path, ASR stack, calendar stubs.

- Schema: `meetings`, `atoms`, `doc_attachments`
- Whisper → Gemma API → Corpus
- Corpus UI + **New doc from selection** chooser
- Port to `src/main/engine/` — **not** full M2C import

See [MODELS.md](./MODELS.md), [CREATE-FLOW.md](./CREATE-FLOW.md).

**Exit:** meeting → corpus → doc → export; 4-week dogfood.

---

## Lean cuts ([reference])

- Remove dead deps: `@tanstack/react-table`, `react-sparklines`, `@tiptap/extension-mention` (if unused)
- arm64-only routine ship
- One shared TipTap extensions module (Step 2)

---

## Tests to add

```json
"test:ship-1": "npm run typecheck"
```

Expand per step as handlers grow.
