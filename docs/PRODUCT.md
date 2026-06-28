# Mycel — Product summary

## Principle

**Content is downstream of articulated thought.**

```
Speak/meet → Corpus (insights) → Docs/Notes → Export (Substack, Cursor)
```

## Four tabs

| Tab | Purpose |
|-----|---------|
| **To-Do** | Default landing — focus for today |
| **People** | CRM (trimmed — follow-ups, not KPI dashboard) |
| **Create** | Docs + Notes |
| **Corpus** | Atoms from speech (Step 5; placeholder in Step 1) |

## Meeting flow

1. Record → transcribe → **Gemma → Corpus** (automatic)
2. You select best moments → **New doc from selection** (chooser)
3. Edit doc → export

**Not automatic:** new doc, CRM touchpoint, publish.

## Create

- **Docs** — newsletters, outlines, long-form (TipTap)
- **Notes** — fragments, meeting frames
- **Posts** — deferred

## Cut list

No calendar UI · no clips tab · no LanceDB · no auto CRM · no Posts UI · no `ship_drafts` table

## Repo layout

- **This repo (`mycel`):** Electron shell, libsql, UI, ship
- **`m2cprivate`:** engine reference only — narrow port in Step 5 to `src/main/engine/`
