import { GoogleGenAI } from '@google/genai'
import { YT_CADENCE_MODELS } from '@shared/coach'
import { YT_CADENCE_PROMPT_KIND } from '@shared/contentEngine'
import { getDb } from '../db'
import { getGoogleApiKey } from '../settingsStore'

/** Bare app names / noise — never use as the "I saw you in" line alone. */
const USELESS_TITLES = new Set([
  'cursor',
  'mycel',
  'electron',
  'finder',
  'terminal',
  'iterm',
  'iterm2',
  'chrome',
  'safari',
  'slack',
  'messages',
  'mail',
  'notes'
])

function clip(text: string, max = 120): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

function isUsefulTitle(title: string): boolean {
  const t = title.replace(/\s+/g, ' ').trim()
  if (t.length < 4) return false
  if (USELESS_TITLES.has(t.toLowerCase())) return false
  // "Cursor — feat/foo" ok; bare product name not
  if (/^(cursor|mycel|chrome|safari)(\s*[—\-–|].*)?$/i.test(t) && t.length < 18) {
    return /[—\-–|/]/.test(t) && t.length >= 18
  }
  return true
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
  richEnough: boolean
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
    if (!isUsefulTitle(title)) continue
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
          LIMIT 50`,
    args: [since]
  })
  const windowTitles: string[] = []
  for (const row of eventRows.rows) {
    const payload = parseJsonObject(row.payload)
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (!isUsefulTitle(title)) continue
    if (!windowTitles.includes(title)) windowTitles.push(title)
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
    if (text.length >= 40) dumps.push(clip(text, 280))
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
  if (dumps.length) {
    summaryLines.push('Recent dumps (highest signal):')
    for (const d of dumps.slice(0, 3)) summaryLines.push(`- ${d}`)
  }
  if (insights.length) {
    summaryLines.push('Corpus signals:')
    for (const i of insights.slice(0, 4)) summaryLines.push(`- ${i}`)
  }
  if (windowTitles.length) {
    summaryLines.push('Window titles (substance only):')
    for (const t of windowTitles.slice(0, 6)) summaryLines.push(`- ${clip(t, 110)}`)
  }
  if (sessions.length) {
    summaryLines.push('Work sessions:')
    for (const s of sessions.slice(0, 5)) summaryLines.push(`- ${s}`)
  }

  const richEnough = dumps.length > 0 || insights.length > 0 || windowTitles.length > 0
  if (!richEnough) {
    summaryLines.push(
      '(thin capture — do NOT invent a Cursor/Mycel story. Ask one sharp question about what he is avoiding saying on camera about AI video / money / the work.)'
    )
  }

  return { sessions, windowTitles, dumps, insights, summaryLines, richEnough }
}

function bestSeenLine(ctx: Awaited<ReturnType<typeof recentWorkContext>>): string {
  return (
    ctx.dumps[0] ||
    ctx.insights[0] ||
    ctx.windowTitles[0] ||
    ctx.sessions[0] ||
    'not enough capture yet — answer from what is live in your body about the work'
  )
}

function heuristicYtPrompt(ctx: Awaited<ReturnType<typeof recentWorkContext>>): {
  text: string
  relatedInsightId: string | null
} {
  const seen = clip(bestSeenLine(ctx), 100)
  const text = [
    'Long-form YT — today',
    'Mode: ONE reply (not a chat). Voice-note answers to all three, then stop.',
    '',
    ctx.richEnough ? `Signal: ${seen}` : 'Signal: thin — no useful Capture/corpus yet.',
    '',
    'Answer in one voice note:',
    '1. Name the concrete thing (file, offer, conversation, bug) — not “Cursor”.',
    '2. What false story would a viewer still believe about that?',
    '3. What single sentence should they leave believing?',
    '',
    'I send back: talking points + say-this script + AI-editor brief. Then you film.'
  ].join('\n')
  return { text, relatedInsightId: null }
}

async function llmYtPrompt(
  ctx: Awaited<ReturnType<typeof recentWorkContext>>,
  apiKey: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey })
  const evidence = ctx.summaryLines.join('\n')

  const prompt = `Write Tiger Joseph's morning Telegram YT brief.

This is NOT a conversation. It is a ONE-SHOT interview: he replies once (usually a voice note covering all questions), then you (the system) return a film pack. Say that clearly in the message.

He only ships long-form YouTube.

Hard bans:
- Never use bare app names as the story ("Cursor", "Mycel", "Chrome").
- Never ask generic "what were you trying to make work?"
- Never pitch LinkedIn, carousels, or reels.
- Do not invent projects, clients, or files absent from evidence.
- If evidence is thin, admit it and ask about the tension he is avoiding on camera (AI video / money / being seen) — still specific, not therapy.

Write EXACTLY this shape (plain text, no markdown fences):

Long-form YT — today
Mode: ONE reply (not a chat). Cover all questions in one voice note.

Signal: <one concrete line from dumps/insights/titles — or "thin capture">
Angle: <a filmable stake a stranger would stay for — not a category>

1. <specific question>
2. <specific question>
3. <specific question>

Then you get talking points + say-this script + AI-editor brief → you film → Cap edits.

Rules for questions:
- Sound like a sharp producer, not a productivity coach.
- Reference a real noun from evidence when possible (filename, phrase, offer, person).
- Under 900 characters total.

Evidence:
${evidence}`

  for (const model of YT_CADENCE_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      const text = (response.text || '').trim()
      if (/Mode:\s*ONE reply/i.test(text) && /\n1\.\s+/.test(text) && /\n2\.\s+/.test(text)) {
        return text
      }
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
    '1. Open on the concrete stake (not the tool)',
    '2. The false story the viewer still holds',
    '3. What you saw / built that breaks it',
    '4. The one-sentence shift',
    '5. Close with one move',
    '',
    'Script (say this)',
    `Hook: "${clip(yap, 160)}"`,
    'Then: problem → break → reframe → close.',
    '',
    'AI editor brief (after you film)',
    '- Keep cold open tight (first 20–30s)',
    '- Cut false starts, throat-clears, long pauses',
    '- Face on the reframe; b-roll only on proof/process',
    '- End on the CTA he actually said',
    '',
    `Yap kept: ${clip(yap, 400)}`
  ].join('\n')
}

export async function buildYtOutlineFromYap(yap: string): Promise<string> {
  const trimmed = yap.replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    return 'Empty yap — one voice note covering all three questions.'
  }

  const apiKey = await getGoogleApiKey()
  if (!apiKey) return heuristicPack(trimmed)

  const ai = new GoogleGenAI({ apiKey })
  const prompt = `Tiger Joseph answered a ONE-SHOT morning YT interview (not a chat).
Produce a FILM PACK for long-form YouTube → then Cap/AI edit.

Plain text. No markdown fences. Under 1800 characters.

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
- Faithful to his words. No invented clients/metrics.
- Script = spoken lines he can read on camera.
- Ban tool-worship titles ("How I use Cursor"). Stake + viewer shift only.

Yap:
---
${trimmed.slice(0, 12_000)}
---`

  for (const model of YT_CADENCE_MODELS) {
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
