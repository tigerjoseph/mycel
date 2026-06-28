# Mycel — Locked decisions

**Updated:** 2026-06-05

If this contradicts other docs, **this file wins**.

---

## Product

| Decision | Choice |
|----------|--------|
| App name | **Mycel** |
| Nav | **To-Do · People · Create · Corpus** |
| First launch | **To-Do** |
| Relaunch | **Restore last open tab** (`activePage` in electron-store) |
| Default appearance | **bold-light** (Warm/Bold × Light/Dark — see `src/shared/appearance.ts` if present) |
| Create | **Docs · Notes** only |
| Posts (LinkedIn/X) | **Deferred** — no `posts` table, no Posts UI |
| Draft chooser | **Option C** — dialog: new doc vs append to open doc |
| Gemini | User checks **“Generate with Gemini”** — never auto |
| After meeting | Corpus atoms only — **no auto doc** |

### Doc tags

Use existing **`docs.tags` JSON array**: `["newsletter", "draft"]`, `["outline"]`, etc.

---

## Models ([MODELS.md](./MODELS.md))

| Layer | Choice |
|-------|--------|
| ASR | Local Whisper/SenseVoice |
| Extract | Gemma API (automatic) |
| Prose drafts | Gemini API (user opt-in) |
| Transcripts | Keep on `meetings.transcript` (Step 5) |

---

## Ship

| Decision | Choice |
|----------|--------|
| Repo | `github:tigerjoseph/mycel` |
| Publish | `npm run ship` + `GH_TOKEN` (`repo` scope) |
| Arch (personal) | **arm64** default for routine ships |

---

## Open before Step 5 (engine)

1. Recording: native Swift CLI vs MediaRecorder  
2. ASR: port M2C sherpa-onnx vs whisper.cpp  
3. Google Calendar: implement OAuth or remove stubs  
4. Newsletter style guide: repo file vs pinned Doc  

---

## Not v1

Posts UI · auto drafts · calendar UI · clips · LanceDB · Substack API · local Gemma ONNX · CRM auto-touchpoints
