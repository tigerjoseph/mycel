import { GoogleGenAI, Type } from '@google/genai'
import type { AtomKind } from '@shared/types'

export interface ExtractedAtom {
  text: string
  kind: AtomKind
}

const EXTRACT_MODELS = ['gemma-3-12b-it', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

function paragraphFallback(transcript: string): ExtractedAtom[] {
  const chunks = transcript
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 24)

  if (chunks.length === 0) {
    const single = transcript.replace(/\s+/g, ' ').trim()
    return single ? [{ text: single, kind: 'insight' }] : []
  }

  return chunks.map((text, i) => ({
    text,
    kind: (i === 0 ? 'frame' : 'insight') as AtomKind
  }))
}

async function extractWithAi(transcript: string, apiKey: string): Promise<ExtractedAtom[]> {
  const ai = new GoogleGenAI({ apiKey })
  const prompt = `You extract publishable thought atoms from a voice note or meeting transcript.

Return 5–20 distinct atoms. Each atom is one clear idea, quote, or action — not a summary of the whole transcript.
Prefer the speaker's phrasing. Skip filler and small talk.

Transcript:
---
${transcript.slice(0, 120_000)}
---`

  let lastError: unknown
  for (const model of EXTRACT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                kind: { type: Type.STRING }
              },
              required: ['text', 'kind']
            }
          }
        }
      })

      const raw = response.text?.trim()
      if (!raw) continue

      const parsed = JSON.parse(raw) as { text?: string; kind?: string }[]
      const atoms = parsed
        .map((item) => ({
          text: (item.text || '').trim(),
          kind: normalizeKind(item.kind)
        }))
        .filter((a) => a.text.length >= 12)

      if (atoms.length > 0) return atoms
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('Atom extraction failed')
}

function normalizeKind(kind?: string): AtomKind {
  if (kind === 'quote' || kind === 'action' || kind === 'frame' || kind === 'insight') {
    return kind
  }
  return 'insight'
}

export async function extractAtoms(
  transcript: string,
  apiKey?: string | null
): Promise<ExtractedAtom[]> {
  const trimmed = transcript.trim()
  if (!trimmed) return []

  if (apiKey) {
    try {
      return await extractWithAi(trimmed, apiKey)
    } catch {
      // fall through to paragraphs
    }
  }

  return paragraphFallback(trimmed)
}
