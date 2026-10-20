# Models

**Hear:** Whisper/SenseVoice (local)  
**Extract / structure:** Gemma API (free tier, automatic)  
**Publishable prose:** Gemini API (user checks box in chooser)  
**Transcripts:** kept on `meetings.transcript` (Step 5)

One Google AI Studio key → same `@google/genai` client for Gemma + Gemini.

## Gemma API (automatic)

Atom extraction, meeting frame, title, authority tip + writing **prompts** (not the article).

## Gemini API (on demand)

Newsletter draft, outline fill, doc section expand — only when user opts in.

## Telegram Coach (opt-in inbox mode)

Short chat replies: **`gemma-3-12b-it`** first (same free-tier path as extract), then
`gemini-3.5-flash-lite` if Gemma fails. Not Gemini 2.5 / prose-draft models.

## Telegram YT cadence (daily 8:00)

Same model stack as Coach. Grounds questions in recent Capture sessions / dumps / corpus.
Yap reply → talking points + spoken script + AI-editor brief. Long-form YouTube only.

## Not v1

Local Gemma ONNX · Gemini for extraction · auto-drafts · Posts surface
