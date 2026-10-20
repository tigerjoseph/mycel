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

## Telegram Coach (opt-in inbox mode) — conversational

**Chat models** (`COACH_MODELS`): `gemma-3-12b-it` → `gemini-3.5-flash-lite`.
Back-and-forth. Not the same list as background jobs.

## Telegram YT cadence (daily 8:00) — NOT a chat

**One-shot interview** (`YT_CADENCE_MODELS`): `gemini-3.5-flash-lite` → `gemma-3-12b-it`.
Morning brief → one yap reply → film pack (talking points + script + editor brief).
Separate model list from Coach on purpose.

## Not v1

Local Gemma ONNX · Gemini for extraction · auto-drafts · Posts surface
