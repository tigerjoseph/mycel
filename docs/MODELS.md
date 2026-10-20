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

Short chat replies: **`gemini-2.5-flash-lite`** first, then `gemini-2.0-flash` if lite fails.
Not prose-draft models — keep coach traffic cheap.

## Not v1

Local Gemma ONNX · Gemini for extraction · auto-drafts · Posts surface
