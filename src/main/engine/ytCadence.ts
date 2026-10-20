import { GoogleGenAI } from '@google/genai'
import { YT_CADENCE_PROMPT_KIND } from '@shared/contentEngine'
import { getDb } from '../db'
import { getGoogleApiKey } from '../settingsStore'
import { COACH_MODELS } from '@shared/coach'

function clip(text: string, max = 120): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

async function recentInsightSnippets(limit = 5): Promise<string[]> {
  const db = getDb()
  const result = await db.execute(
    `SELECT text, so_what FROM corpus_insights
     WHERE (duplicate_of IS NULL OR duplicate_of = '')
     ORDER BY created_at DESC
     LIMIT ?`
  )
  const out: string[] = []
  for (const row of result.rows as { text?: string; so_what?: string | null }[]) {
    const text = (row.text || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const soWhat = (row.so_what || '').replace(/\s+/g, ' ').trim()
    out.push(soWhat ? `${clip(text, 100)} — ${clip(soWhat, 80)}` : clip(text, 140))
    if (out.length >= limit) break
  }
  return out
}

function heuristicYtPrompt(insights: string[]): { text: string; relatedInsightId: string | null } {
  const seed = insights[0]
  const angle = seed
    ? clip(seed, 90)
    : 'one tension you’ve been sitting with that a stranger on YouTube would stay for'
  const text = [
    'Long-form YT — today',
    '',
    `Working angle: ${angle}`,
    '',
    'Yap these (voice note fine — reply to this message):',
    '1. What is the real problem the viewer thinks they have?',
    '2. What have you seen that breaks their current story?',
    '3. What should they do / see differently by the end of the video?',
    '',
    'I’ll turn your yap into a long-form outline (hook → spine → close). No brand kit yet — raw is fine.'
  ].join('\n')
  return { text, relatedInsightId: null }
}

async function llmYtPrompt(insights: string[], apiKey: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey })
  const evidence =
    insights.length > 0
      ? insights.map((line, i) => `${i + 1}. ${line}`).join('\n')
      : '(no recent corpus — invent from first principles for Tiger: AI video, quiet operators, lived cash)'

  const prompt = `You write a short Telegram morning brief for Tiger Joseph.
Goal: one long-form YouTube video today — not LinkedIn, not carousels, not reels.

From the evidence, pick ONE working angle and write EXACTLY this shape (plain text, no markdown fences):

Long-form YT — today

Working angle: <one line>

Yap these (voice note fine — reply to this message):
1. <question>
2. <question>
3. <question>

I’ll turn your yap into a long-form outline (hook → spine → close). No brand kit yet — raw is fine.

Rules:
- Questions pull a voice dump he can answer walking.
- Angle must be specific enough to film, not a category.
- Under 900 characters total.

Evidence:
${evidence}`

  for (const model of COACH_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      const text = (response.text || '').trim()
      if (text.includes('Yap these') && text.includes('Working angle')) return text
    } catch (err) {
      console.error('YT cadence prompt LLM failed:', err)
    }
  }
  return null
}

export async function buildYtCadencePrompt(): Promise<{ text: string; relatedInsightId: string | null }> {
  const insights = await recentInsightSnippets(5)
  const apiKey = await getGoogleApiKey()
  if (apiKey) {
    const llm = await llmYtPrompt(insights, apiKey)
    if (llm) return { text: llm, relatedInsightId: null }
  }
  return heuristicYtPrompt(insights)
}

export async function buildYtOutlineFromYap(yap: string): Promise<string> {
  const trimmed = yap.replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    return 'Empty yap — send another voice note with the three answers.'
  }

  const apiKey = await getGoogleApiKey()
  if (!apiKey) {
    return [
      'YT outline (no Google key — raw scaffold):',
      '',
      'Hook: open on the tension in your yap',
      'Spine: problem → break → new frame',
      'Close: one concrete move for the viewer',
      '',
      `Your yap (kept): ${clip(trimmed, 400)}`
    ].join('\n')
  }

  const ai = new GoogleGenAI({ apiKey })
  const prompt = `Turn this voice-dump into a long-form YouTube outline for Tiger Joseph.
Plain text only. No markdown fences. Under 1200 characters.

Shape:
YT outline — <working title>

Hook (first 30s): …
Spine:
- …
- …
- …
Close: …
B-roll / proof notes: … (optional, short)

Rules:
- Stay faithful to his words. Do not invent client stories or metrics.
- Long-form YT only — not a short or carousel.
- Tight, filmable.

Yap:
---
${trimmed.slice(0, 12_000)}
---`

  for (const model of COACH_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      const text = (response.text || '').trim()
      if (text.length > 40) return text
    } catch (err) {
      console.error('YT outline LLM failed:', err)
    }
  }

  return [
    'YT outline (model blanked — scaffold):',
    '',
    'Hook: name the tension in the first line of your yap',
    'Spine: problem → break → new frame',
    'Close: one move',
    '',
    clip(trimmed, 500)
  ].join('\n')
}

export { YT_CADENCE_PROMPT_KIND }
