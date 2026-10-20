import { GoogleGenAI } from '@google/genai'
import { YT_CADENCE_MODELS } from '@shared/coach'
import { YT_CADENCE_PROMPT_KIND } from '@shared/contentEngine'
import { getDb } from '../db'
import { getGoogleApiKey } from '../settingsStore'

/** Bare app names / noise — never the content thesis. */
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

function daysAgoLabel(ts: number, now: number): string {
  const days = Math.floor((now - ts) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function todayLabel(now = Date.now()): string {
  return new Date(now).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

async function recentDayContext(): Promise<{
  summaryLines: string[]
  richEnough: boolean
  makeSeed: string
  pipelineLine: string
}> {
  const db = getDb()
  const now = Date.now()
  const since36h = now - 36 * 60 * 60 * 1000
  const since14d = now - 14 * 24 * 60 * 60 * 1000
  const summaryLines: string[] = [`Calendar: ${todayLabel(now)}`]

  // Docs / posts pipeline (what he might ship or already posted)
  const docRows = await db.execute({
    sql: `SELECT title, type, tags, post_meta, updated_at, created_at FROM docs
          WHERE updated_at >= ?
          ORDER BY updated_at DESC
          LIMIT 20`,
    args: [since14d]
  })
  const pipeline: string[] = []
  let lastPublished: string | null = null
  let lastPublishedAt: number | null = null
  for (const row of docRows.rows as {
    title?: string
    type?: string
    tags?: string
    post_meta?: string
    updated_at?: number
  }[]) {
    const title = (row.title || '').replace(/\s+/g, ' ').trim() || 'Untitled'
    const meta = parseJsonObject(row.post_meta)
    const status = typeof meta.status === 'string' ? meta.status : ''
    const channel = typeof meta.channel === 'string' ? meta.channel : ''
    const tagsRaw = row.tags || '[]'
    let tags: string[] = []
    try {
      tags = JSON.parse(typeof tagsRaw === 'string' ? tagsRaw : '[]') as string[]
    } catch {
      tags = []
    }
    const tagHit = tags.some((t) => /youtube|yt|script|film|video/i.test(String(t)))
    const updated = Number(row.updated_at || 0)
    const when = updated ? daysAgoLabel(updated, now) : '?'
    if (status === 'published') {
      if (lastPublishedAt == null || updated > lastPublishedAt) {
        lastPublishedAt = updated
        lastPublished = `“${clip(title, 60)}” (${channel || row.type || 'post'}, ${when})`
      }
    }
    if (status === 'scheduled' || status === 'review' || status === 'draft' || tagHit || row.type === 'post') {
      pipeline.push(
        `${status || row.type || 'doc'}${channel ? `/${channel}` : ''}: “${clip(title, 55)}” · ${when}`
      )
    }
  }
  if (lastPublished) summaryLines.push(`Last published in Mycel: ${lastPublished}`)
  else summaryLines.push('Last published in Mycel: none logged (or Posts unused)')
  if (pipeline.length) {
    summaryLines.push('In motion (docs/posts):')
    for (const p of pipeline.slice(0, 6)) summaryLines.push(`- ${p}`)
  }

  // Dumps — what he said
  const dumpRows = await db.execute({
    sql: `SELECT payload, created_at FROM dumps
          WHERE created_at >= ?
          ORDER BY created_at DESC
          LIMIT 8`,
    args: [since36h]
  })
  const dumps: string[] = []
  for (const row of dumpRows.rows as { payload?: string; created_at?: number }[]) {
    const text = (row.payload || '').replace(/\s+/g, ' ').trim()
    if (text.length < 40) continue
    dumps.push(`${daysAgoLabel(Number(row.created_at || now), now)}: ${clip(text, 260)}`)
  }
  if (dumps.length) {
    summaryLines.push('Recent dumps:')
    for (const d of dumps.slice(0, 4)) summaryLines.push(`- ${d}`)
  }

  // Corpus
  const insightRows = await db.execute(
    `SELECT text, so_what, created_at FROM corpus_insights
     WHERE (duplicate_of IS NULL OR duplicate_of = '')
     ORDER BY created_at DESC
     LIMIT 6`
  )
  const insights: string[] = []
  for (const row of insightRows.rows as {
    text?: string
    so_what?: string | null
    created_at?: number
  }[]) {
    const text = (row.text || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const soWhat = (row.so_what || '').replace(/\s+/g, ' ').trim()
    insights.push(
      `${daysAgoLabel(Number(row.created_at || now), now)}: ${
        soWhat ? `${clip(text, 90)} — ${clip(soWhat, 70)}` : clip(text, 130)
      }`
    )
  }
  if (insights.length) {
    summaryLines.push('Corpus:')
    for (const i of insights.slice(0, 4)) summaryLines.push(`- ${i}`)
  }

  // Capture / windows
  const eventRows = await db.execute({
    sql: `SELECT payload, captured_at FROM activity_events
          WHERE captured_at >= ?
          ORDER BY captured_at DESC
          LIMIT 50`,
    args: [since36h]
  })
  const windowTitles: string[] = []
  for (const row of eventRows.rows) {
    const payload = parseJsonObject(row.payload)
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (!isUsefulTitle(title)) continue
    if (!windowTitles.includes(title)) windowTitles.push(title)
    if (windowTitles.length >= 8) break
  }
  if (windowTitles.length) {
    summaryLines.push('Working on (window titles):')
    for (const t of windowTitles.slice(0, 5)) summaryLines.push(`- ${clip(t, 110)}`)
  }

  const sessionRows = await db.execute({
    sql: `SELECT title, source, started_at, ended_at FROM sessions
          WHERE COALESCE(ended_at, started_at, created_at) >= ?
          ORDER BY COALESCE(ended_at, started_at, created_at) DESC
          LIMIT 10`,
    args: [since36h]
  })
  const sessions: string[] = []
  for (const row of sessionRows.rows as {
    title?: string
    source?: string
    started_at?: number
    ended_at?: number | null
  }[]) {
    const title = (row.title || '').replace(/\s+/g, ' ').trim()
    if (!isUsefulTitle(title)) continue
    const mins =
      row.started_at && row.ended_at
        ? Math.max(1, Math.round((Number(row.ended_at) - Number(row.started_at)) / 60_000))
        : null
    sessions.push([title, mins != null ? `~${mins}m` : ''].filter(Boolean).join(' '))
  }
  if (sessions.length) {
    summaryLines.push('Sessions:')
    for (const s of sessions.slice(0, 4)) summaryLines.push(`- ${s}`)
  }

  const richEnough = dumps.length + insights.length + windowTitles.length + pipeline.length > 0
  if (!richEnough) {
    summaryLines.push(
      '(thin day — pick a weighty AI-video / money / being-seen stake. Do not invent Cursor chores.)'
    )
  }

  const makeSeed =
    dumps[0] || insights[0] || pipeline[0] || windowTitles[0] || sessions[0] || 'live stake unknown'
  const pipelineLine = lastPublished
    ? `Last logged publish: ${lastPublished}`
    : pipeline[0]
      ? `In motion: ${pipeline[0]}`
      : 'No publish/pipeline signal in Mycel'

  return { summaryLines, richEnough, makeSeed, pipelineLine }
}

function heuristicYtPrompt(ctx: Awaited<ReturnType<typeof recentDayContext>>): {
  text: string
  relatedInsightId: string | null
} {
  const stake = clip(ctx.makeSeed, 110)
  const text = [
    `YT — ${todayLabel()}`,
    'ONE reply · not a chat · one voice note covering the questions',
    '',
    `Make today: a long-form video about ${stake}`,
    `Why now: ${ctx.pipelineLine}`,
    '',
    'Yap:',
    '1. What is the real stake for the viewer — not the tool you used?',
    '2. What are you tempted to soften or skip on camera?',
    '3. What one sentence should they leave believing?',
    '',
    '→ talking points + say-this script + AI-editor brief → you film → Cap'
  ].join('\n')
  return { text, relatedInsightId: null }
}

async function llmYtPrompt(
  ctx: Awaited<ReturnType<typeof recentDayContext>>,
  apiKey: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey })
  const evidence = ctx.summaryLines.join('\n')

  const prompt = `You are Tiger Joseph's editorial director for long-form YouTube — not a chatbot, not a productivity coach.

Job of this Telegram ping: decide WHAT he should make content on TODAY, given what he is working on, what is in his Mycel pipeline (drafts/scheduled/published), and recent dumps/corpus. Then ask weighty questions so one voice note fills the video.

Tone: clear, heavy, short. Producer who already chose. Not brainstorming.

This is ONE-SHOT (not conversational). He replies once; system returns a film pack.

Hard bans:
- Bare app names as the video ("Cursor", "Mycel")
- Generic "what were you working on?"
- LinkedIn / carousels / reels
- Inventing files, clients, or publishes not in evidence
- Soft therapy questions

Write EXACTLY this shape (plain text, no markdown fences):

YT — <weekday, mon day>
ONE reply · not a chat · one voice note

Make today: <one decisive video call — title-like, weighty, specific>
Why now: <1–2 lines tying work + pipeline + timing; say if pipeline is empty>
Working on: <concrete signal from evidence, or "thin capture">

Yap:
1. <weighty question that digs the stake>
2. <weighty question — what he'd avoid saying>
3. <weighty question — the leave-believing line / end state>

→ film pack (talking points + script + editor brief) → you film → Cap

Rules:
- "Make today" is a recommendation, not a menu of options.
- Questions serve THAT video only.
- Under 1000 characters.
- Prefer dumps/corpus/pipeline over window titles.

Evidence for today:
${evidence}`

  for (const model of YT_CADENCE_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      const text = (response.text || '').trim()
      if (/Make today:/i.test(text) && /Yap:/i.test(text) && /\n1\.\s+/.test(text)) {
        return text
      }
    } catch (err) {
      console.error('YT cadence prompt LLM failed:', err)
    }
  }
  return null
}

export async function buildYtCadencePrompt(): Promise<{ text: string; relatedInsightId: string | null }> {
  const ctx = await recentDayContext()
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
    '1. Open on the stake (not the tool)',
    '2. The false story the viewer still holds',
    '3. What you saw / lived that breaks it',
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
  const prompt = `Tiger answered a ONE-SHOT editorial YT brief (not a chat).
Produce a FILM PACK for long-form YouTube → Cap/AI edit.

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
- Script = spoken lines for camera.
- Ban tool-worship titles. Stake + viewer shift only.

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
