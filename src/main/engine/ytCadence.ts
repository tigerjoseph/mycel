import { GoogleGenAI } from '@google/genai'
import { COACH_MODELS } from '@shared/coach'
import { YT_CADENCE_PROMPT_KIND } from '@shared/contentEngine'
import { getDb } from '../db'
import { getGoogleApiKey } from '../settingsStore'

function clip(text: string, max = 120): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value == null || value === '') return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore
  }
  return {}
}

async function recentWorkContext(): Promise<{
  sessions: string[]
  windowTitles: string[]
  dumps: string[]
  insights: string[]
  summaryLines: string[]
}> {
  const db = getDb()
  const since = Date.now() - 36 * 60 * 60 * 1000

  const sessionRows = await db.execute({
    sql: `SELECT title, source, kind, started_at, ended_at FROM sessions
          WHERE COALESCE(ended_at, started_at, created_at) >= ?
          ORDER BY COALESCE(ended_at, started_at, created_at) DESC
          LIMIT 12`,
    args: [since]
  })
  const sessions: string[] = []
  for (const row of sessionRows.rows as {
    title?: string
    source?: string
    kind?: string
    started_at?: number
    ended_at?: number | null
  }[]) {
    const title = (row.title || '').replace(/\s+/g, ' ').trim()
    if (!title) continue
    const mins =
      row.started_at && row.ended_at
        ? Math.max(1, Math.round((Number(row.ended_at) - Number(row.started_at)) / 60_000))
        : null
    const src = (row.source || row.kind || '').trim()
    sessions.push(
      [title, src ? `(${src})` : '', mins != null ? `~${mins}m` : ''].filter(Boolean).join(' ')
    )
  }

  const eventRows = await db.execute({
    sql: `SELECT payload FROM activity_events
          WHERE captured_at >= ?
          ORDER BY captured_at DESC
          LIMIT 40`,
    args: [since]
  })
  const windowTitles: string[] = []
  for (const row of eventRows.rows) {
    const payload = parseJsonObject(row.payload)
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (title && !windowTitles.includes(title)) windowTitles.push(title)
    if (windowTitles.length >= 10) break
  }

  const dumpRows = await db.execute({
    sql: `SELECT payload FROM dumps
          WHERE created_at >= ?
          ORDER BY created_at DESC
          LIMIT 6`,
    args: [since]
  })
  const dumps: string[] = []
  for (const row of dumpRows.rows as { payload?: string }[]) {
    const text = (row.payload || '').replace(/\s+/g, ' ').trim()
    if (text) dumps.push(clip(text, 220))
  }

  const insightRows = await db.execute(
    `SELECT text, so_what FROM corpus_insights
     WHERE (duplicate_of IS NULL OR duplicate_of = '')
     ORDER BY created_at DESC
     LIMIT 5`
  )
  const insights: string[] = []
  for (const row of insightRows.rows as { text?: string; so_what?: string | null }[]) {
    const text = (row.text || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const soWhat = (row.so_what || '').replace(/\s+/g, ' ').trim()
    insights.push(soWhat ? `${clip(text, 100)} — ${clip(soWhat, 80)}` : clip(text, 140))
  }

  const summaryLines: string[] = []
  if (sessions.length) {
    summaryLines.push('Recent work sessions:')
    for (const s of sessions.slice(0, 6)) summaryLines.push(`- ${s}`)
  }
  if (windowTitles.length) {
    summaryLines.push('Recent window titles:')
    for (const t of windowTitles.slice(0, 6)) summaryLines.push(`- ${clip(t, 100)}`)
  }
  if (dumps.length) {
    summaryLines.push('Recent voice/text dumps:')
    for (const d of dumps.slice(0, 3)) summaryLines.push(`- ${d}`)
  }
  if (insights.length) {
    summaryLines.push('Corpus signals:')
    for (const i of insights.slice(0, 3)) summaryLines.push(`- ${i}`)
  }
  if (summaryLines.length === 0) {
    summaryLines.push('(no recent capture/corpus — ask from first principles: AI video, lived work)')
  }

  return { sessions, windowTitles, dumps, insights, summaryLines }
}

function heuristicYtPrompt(ctx: Awaited<ReturnType<typeof recentWorkContext>>): {
  text: string
  relatedInsightId: string | null
} {
  const seed = ctx.sessions[0] || ctx.windowTitles[0] || ctx.insights[0] || ctx.dumps[0]
  const angle = seed
    ? clip(seed, 90)
    : 'one tension from what you were actually building that a stranger would stay for'
  const seen = clip(ctx.sessions[0] || ctx.windowTitles[0] || 'what you had open yesterday', 70)
  const text = [
    'Long-form YT — today',
    '',
    `I saw you in: ${seen}`,
    `Working angle: ${angle}`,
    '',
    'Yap these (voice note fine — reply to this message):',
    '1. What were you actually trying to make work in that session?',
    '2. What broke / surprised you that the viewer still believes?',
    '3. If this were one YouTube video, what’s the one shift by the end?',
    '',
    'Reply with the yap. You’ll get talking points + a say-this script + an AI-editor brief for after you film.'
  ].join('\n')
  return { text, relatedInsightId: null }
}

async function llmYtPrompt(
  ctx: Awaited<ReturnType<typeof recentWorkContext>>,
  apiKey: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey })
  const evidence = ctx.summaryLines.join('\n')

  const prompt = `You write Tiger Joseph's morning Telegram brief.
He only cares about ONE long-form YouTube video today.

Ground the angle and questions in what he was ACTUALLY working on (sessions, window titles, dumps). Do not invent apps or projects not in the evidence. If evidence is thin, say so and ask from the thinnest real signal.

Write EXACTLY this shape (plain text, no markdown fences):

Long-form YT — today

I saw you in: <one short line from real work>
Working angle: <one filmable line>

Yap these (voice note fine — reply to this message):
1. <question about the real work>
2. <question that breaks a false story>
3. <question that locks the end-state for the viewer>

Reply with the yap. You’ll get talking points + a say-this script + an AI-editor brief for after you film.

Rules:
- Questions he can answer walking, specific to the work signal.
- Under 1000 characters.
- No LinkedIn / carousel / reel pitches.

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
  const ctx = await recentWorkContext()
  const apiKey = await getGoogleApiKey()
  if (apiKey) {
    const llm = await llmYtPrompt(ctx, apiKey)
    if (llm) return { text: llm, relatedInsightId: null }
  }
  return heuristicYtPrompt(ctx)
}

function heuristicPack(yap: string): string {
  return [
    'Talking points',
    '1. Open on the tension in your yap',
    '2. What you were building / saw break',
    '3. The false story the viewer still holds',
    '4. The shift — one clear reframe',
    '5. Close with one concrete move',
    '',
    'Script (say this)',
    `Hook: "${clip(yap, 160)}"`,
    'Then walk problem → break → new frame → close.',
    '',
    'AI editor brief (after you film)',
    '- Keep cold open tight (first 20–30s)',
    '- Cut throat-clears, false starts, long pauses',
    '- Hold on face for the reframe line; b-roll only on process/proof',
    '- End card: one CTA he actually said',
    '',
    `Yap kept: ${clip(yap, 400)}`
  ].join('\n')
}

export async function buildYtOutlineFromYap(yap: string): Promise<string> {
  const trimmed = yap.replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    return 'Empty yap — send another voice note answering the three questions.'
  }

  const apiKey = await getGoogleApiKey()
  if (!apiKey) return heuristicPack(trimmed)

  const ai = new GoogleGenAI({ apiKey })
  const prompt = `Tiger Joseph answered morning YT questions with a voice/text yap.
Produce a FILM PACK he can sit down and record from, then hand to an AI editor.

Plain text only. No markdown fences. Under 1800 characters.

Exact shape:

Talking points — <working title>
1. …
2. …
3. …
4. …
5. … (max 6)

Script (say this)
Hook: "…"
Beat 1: "…"
Beat 2: "…"
Beat 3: "…"
Close: "…"

AI editor brief (after you film)
- Keep: …
- Cut: …
- On-screen / b-roll cues: …
- Energy / pacing: …
- End card / CTA: …

Rules:
- Faithful to his words — no invented clients, metrics, or stories.
- Long-form YouTube only.
- Script lines are spoken English he can read on camera.
- Editor brief assumes Cap / AI edit next — no upload instructions beyond what to keep/cut.

Yap:
---
${trimmed.slice(0, 12_000)}
---`

  for (const model of COACH_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      const text = (response.text || '').trim()
      if (
        text.length > 80 &&
        /talking points/i.test(text) &&
        (/script/i.test(text) || /editor brief/i.test(text))
      ) {
        return text
      }
    } catch (err) {
      console.error('YT film pack LLM failed:', err)
    }
  }

  return heuristicPack(trimmed)
}

export { YT_CADENCE_PROMPT_KIND }
