import { GoogleGenAI, Type } from '@google/genai'
import { insightTextError, INSIGHT_INTENTS } from '@shared/contentEngine'
import type { Atom, AtomKind, InsightOrigin, PostIntent } from '@shared/types'

const EXTRACT_MODELS = ['gemma-3-12b-it', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

export interface ExtractedCorpusInsight {
  text: string
  soWhat: string | null
  pillar: PostIntent | null
  origin: Extract<InsightOrigin, 'auto' | 'hybrid'>
}

function normalizeIntent(value?: string | null): PostIntent | null {
  const intent = (value || '').trim().toLowerCase()
  if ((INSIGHT_INTENTS as readonly string[]).includes(intent)) return intent as PostIntent
  return null
}

function usableText(text: string): string | null {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  if (insightTextError(trimmed)) return null
  return trimmed
}

function fromAtoms(atoms: Atom[]): ExtractedCorpusInsight[] {
  const worthy: AtomKind[] = ['frame', 'insight']
  const out: ExtractedCorpusInsight[] = []
  for (const atom of atoms) {
    if (!worthy.includes(atom.kind)) continue
    const text = usableText(atom.text)
    if (!text) continue
    out.push({
      text,
      soWhat: null,
      pillar: atom.kind === 'frame' ? 'frame' : 'discover',
      origin: 'hybrid'
    })
    if (out.length >= 2) break
  }
  return out
}

async function extractWithAi(
  transcript: string,
  apiKey: string
): Promise<ExtractedCorpusInsight[] | null> {
  const ai = new GoogleGenAI({ apiKey })
  const prompt = `You distill Corpus insights from a meeting or voice-note transcript.

Return at most 3 insights that are worth teaching, framing, discovering, or entertaining — durable meaning, not logistics, small talk, or a recap of the whole meeting.
Each insight is 1–3 sentences in the speaker's phrasing.
If nothing qualifies, return an empty list. Never invent a LinkedIn post or article.

Transcript:
---
${transcript.slice(0, 80_000)}
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
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    soWhat: { type: Type.STRING },
                    intent: { type: Type.STRING }
                  },
                  required: ['text']
                }
              }
            },
            required: ['insights']
          }
        }
      })

      const raw = response.text?.trim()
      if (!raw) continue

      const parsed = JSON.parse(raw) as {
        insights?: { text?: string; soWhat?: string; intent?: string }[]
      }
      const insights: ExtractedCorpusInsight[] = []
      for (const item of parsed.insights ?? []) {
        const text = usableText(item.text || '')
        if (!text) continue
        insights.push({
          text,
          soWhat: (item.soWhat || '').trim() || null,
          pillar: normalizeIntent(item.intent),
          origin: 'auto'
        })
        if (insights.length >= 3) break
      }

      return insights.length > 0 ? insights : null
    } catch (err) {
      lastError = err
    }
  }

  if (lastError) {
    console.error('Content Engine insight extract failed:', lastError)
  }
  return null
}

/**
 * Optional Content Engine extract. Returns null when nothing is teach/frame/discover-worthy,
 * when there is no key, or when the model fails. Never throws.
 */
export async function extractCorpusInsights(
  transcript: string,
  opts?: { apiKey?: string | null; atoms?: Atom[] }
): Promise<ExtractedCorpusInsight[] | null> {
  try {
    const trimmed = transcript.trim()
    if (trimmed.length < 40) return null

    if (opts?.apiKey) {
      const fromAi = await extractWithAi(trimmed, opts.apiKey)
      if (fromAi && fromAi.length > 0) return fromAi
    }

    const hybrid = fromAtoms(opts?.atoms ?? [])
    return hybrid.length > 0 ? hybrid : null
  } catch (err) {
    console.error('Content Engine insight extract failed:', err)
    return null
  }
}

export interface Extractor {
  extract(
    transcript: string,
    opts?: { apiKey?: string | null; atoms?: Atom[] }
  ): Promise<ExtractedCorpusInsight[] | null>
}

class CorpusExtractor implements Extractor {
  extract(
    transcript: string,
    opts?: { apiKey?: string | null; atoms?: Atom[] }
  ): Promise<ExtractedCorpusInsight[] | null> {
    return extractCorpusInsights(transcript, opts)
  }
}

export function getExtractor(): Extractor {
  return new CorpusExtractor()
}
