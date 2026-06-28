# Create — draft flow

## Automatic (never creates docs)

```
audio → Whisper → Gemma API → atoms in Corpus (+ transcript kept)
```

## Manual (you choose)

```
Corpus → select atoms → "New doc from selection…"
  → Chooser:
      ○ New document
      ○ Append to open document
      Type: Newsletter | Outline
      [ ] Generate with Gemini
  → Doc in Create → you edit → Copy for Substack / Cursor export
```

**Posts (LinkedIn/X):** deferred. Copy atoms or use a Note until Posts UI exists.

## Models

| Task | Model |
|------|-------|
| Atoms | Gemma API (auto) |
| Writing prompts | Gemma API (button in Corpus) |
| Newsletter / outline body | Gemini API (checkbox in chooser) |
