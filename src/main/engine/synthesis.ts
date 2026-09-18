import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getGoogleApiKey, getAppSettings, setAppSettings } from '../settingsStore'
import { listDecoratedThreads } from './clusterThreads'
import { parseInsightRow } from './ingestMeeting'
import {
  createPrompt,
  listAnsweredPromptsSince,
  listOpenPromptsByKind
} from './prompts'
import { getWriter } from './writer'
import { notifyDraftReady, notifyPromptReady } from '../telegram/notify'
import {
  SYNTHESIS_EOD_CHECK_MS,
  SYNTHESIS_EOD_HOUR,
  SYNTHESIS_MAX_DRAFTS,
  SYNTHESIS_MAX_PROMPTS,
  SYNTHESIS_PROMPT_KIND,
  dayRichnessScore,
  localDayKey,
  startOfLocalDay,
  type DayRichness
} from '@shared/synthesis'
import { INSIGHT_INTENTS } from '@shared/contentEngine'
import type {
  CorpusInsight,
  CorpusThread,
  PostIntent,
  PostMeta,
  SynthesisPromptResult,
  SynthesisResult,
  SynthesisStatus,
  TelegramPrompt
} from '@shared/types'

let running = false
let lastResult: SynthesisResult | null = null
let eodTimer: ReturnType<typeof setInterval> | null = null

function emptyRichness(): DayRichness {
  return dayRichnessScore({ meetings: 0, insights: 0, sessions: 0, eligibleThreads: 0 })
}

function snippet(text: string, max = 80): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

function parsePostMeta(value: unknown): PostMeta {
  if (value == null || value === '') return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as PostMeta
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PostMeta
    }
  } catch {
    // ignore
  }
  return {}
}

async function countSince(table: string, column: string, since: number): Promise<number> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM ${table} WHERE ${column} >= ?`,
    args: [since]
  })
  return Number(result.rows[0]?.n ?? 0)
}

async function usedThreadIds(): Promise<Set<string>> {
  const db = getDb()
  const result = await db.execute("SELECT post_meta FROM docs WHERE type = 'post'")
  const ids = new Set<string>()
  for (const row of result.rows) {
    const meta = parsePostMeta(row.post_meta)
    const threadId = (meta.threadId || '').trim()
    if (threadId) ids.add(threadId)
  }
  return ids
}

async function loadTodayInsights(since: number): Promise<CorpusInsight[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM corpus_insights
          WHERE created_at >= ? AND (duplicate_of IS NULL OR duplicate_of = '')
          ORDER BY created_at DESC`,
    args: [since]
  })
  return result.rows.map((row) => parseInsightRow(row as unknown as Record<string, unknown>))
}

export async function measureDayRichness(now = Date.now()): Promise<{
  richness: DayRichness
  threads: CorpusThread[]
  used: Set<string>
}> {
  const since = startOfLocalDay(now)
  const used = await usedThreadIds()
  const all = await listDecoratedThreads()
  const eligible = all.filter((thread) => thread.eligibleForDraft && !used.has(thread.id))
  const db = getDb()
  const insightCount = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM corpus_insights
          WHERE created_at >= ? AND (duplicate_of IS NULL OR duplicate_of = '')`,
    args: [since]
  })
  const [meetings, sessions] = await Promise.all([
    countSince('meetings', 'created_at', since),
    countSince('sessions', 'created_at', since)
  ])
  return {
    richness: dayRichnessScore({
      meetings,
      insights: Number(insightCount.rows[0]?.n ?? 0),
      sessions,
      eligibleThreads: eligible.length
    }),
    threads: eligible,
    used
  }
}

function pickPromptTarget(
  threads: CorpusThread[],
  todayInsights: CorpusInsight[]
): { text: string; relatedInsightId: string | null } | null {
  const thread = threads[0] ?? null
  if (thread) {
    const missingSoWhat = thread.insights.find((insight) => !(insight.soWhat || '').trim())
    if (missingSoWhat) {
      return {
        text: `“${snippet(missingSoWhat.text)}” is in “${snippet(thread.title, 48)}”. What's the so-what you'd actually teach — why does this matter?`,
        relatedInsightId: missingSoWhat.id
      }
    }
    const first = thread.insights[0]
    return {
      text: `“${snippet(thread.title, 48)}” has ${thread.evidenceCount} notes. What's the missing context or the why that isn't on the page yet?`,
      relatedInsightId: first?.id ?? null
    }
  }

  const insight = todayInsights.find((row) => !(row.soWhat || '').trim()) ?? todayInsights[0]
  if (!insight) return null
  return {
    text: `“${snippet(insight.text)}” reads thin. What's the why / so-what you'd stand behind?`,
    relatedInsightId: insight.id
  }
}

async function failSoftNotifyPrompt(promptId: string): Promise<{ sent: boolean; error: string | null }> {
  try {
    const sent = await notifyPromptReady(promptId)
    return { sent: sent.status === 'sent', error: null }
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'Could not send Telegram prompt'
    }
  }
}

async function failSoftNotifyDraft(title: string, docId: string): Promise<void> {
  try {
    await notifyDraftReady({ title, docId })
  } catch (err) {
    console.error('Content Engine draft notify failed:', err)
  }
}

function asIntent(value: string | null | undefined): PostIntent | null {
  const intent = (value || '').trim().toLowerCase()
  if ((INSIGHT_INTENTS as readonly string[]).includes(intent)) return intent as PostIntent
  return null
}

async function persistReviewPost(input: {
  title: string
  html: string
  channel: PostMeta['channel']
  threadId: string
  insightIds: string[]
  intent: PostIntent | null
}): Promise<{ id: string; title: string }> {
  const db = getDb()
  const now = Date.now()
  const id = nanoid()
  const postMeta: PostMeta = {
    status: 'review',
    channel: input.channel,
    source: 'synthesis',
    threadId: input.threadId,
    insightIds: input.insightIds,
    intent: input.intent ?? undefined
  }
  await db.execute({
    sql: `INSERT INTO docs
          (id, title, body, type, folder_id, icon, cover_image, is_template,
           is_favorite, favorite_order, tags, post_meta, created_at, updated_at)
          VALUES (?, ?, ?, 'post', NULL, NULL, NULL, 0, 0, NULL, '[]', ?, ?, ?)`,
    args: [id, input.title, input.html, JSON.stringify(postMeta), now, now]
  })
  return { id, title: input.title }
}

function candidateThreads(
  eligible: CorpusThread[],
  answered: TelegramPrompt[],
  allThreads: CorpusThread[],
  used: Set<string>
): CorpusThread[] {
  const picked: CorpusThread[] = []
  const seen = new Set<string>()

  const push = (thread: CorpusThread | undefined | null): void => {
    if (!thread || seen.has(thread.id) || used.has(thread.id) || thread.status === 'muted') return
    seen.add(thread.id)
    picked.push(thread)
  }

  for (const thread of eligible) push(thread)

  for (const prompt of answered) {
    const insightId = prompt.relatedInsightId
    if (!insightId) continue
    const match = allThreads.find((thread) => thread.insights.some((insight) => insight.id === insightId))
    push(match ?? null)
  }

  picked.sort((a, b) => b.meaningScore - a.meaningScore)
  return picked.slice(0, SYNTHESIS_MAX_DRAFTS)
}

function answersForThread(thread: CorpusThread, answered: TelegramPrompt[]): string[] {
  const insightIds = new Set(thread.insights.map((insight) => insight.id))
  return answered
    .filter((prompt) => prompt.relatedInsightId && insightIds.has(prompt.relatedInsightId))
    .map((prompt) => (prompt.answerText || '').trim())
    .filter(Boolean)
}

function makeResult(partial: Omit<SynthesisResult, 'ranAt'> & { ranAt?: number }): SynthesisResult {
  return { ...partial, ranAt: partial.ranAt ?? Date.now() }
}

export async function runSynthesis(now = Date.now()): Promise<SynthesisResult> {
  if (running) {
    return (
      lastResult ??
      makeResult({
        richness: emptyRichness(),
        skipped: true,
        skipReason: 'Synthesis already running.',
        waitingOnPrompt: false,
        usedLlm: false,
        drafts: [],
        prompts: []
      })
    )
  }

  running = true
  try {
    const since = startOfLocalDay(now)
    const { richness, threads: eligible, used } = await measureDayRichness(now)
    const open = await listOpenPromptsByKind(SYNTHESIS_PROMPT_KIND)
    const answered = await listAnsweredPromptsSince(SYNTHESIS_PROMPT_KIND, since)
    const todayInsights = await loadTodayInsights(since)

    if (!richness.rich && open.length > 0) {
      lastResult = makeResult({
        richness,
        skipped: true,
        skipReason: 'Waiting on a specific prompt before drafting.',
        waitingOnPrompt: true,
        usedLlm: false,
        drafts: [],
        prompts: open.map((prompt) => ({
          promptId: prompt.id,
          text: prompt.text,
          sent: prompt.status === 'sent',
          error: null
        }))
      })
      await setAppSettings({ synthesisLastRunAt: lastResult.ranAt })
      return lastResult
    }

    if (!richness.rich && answered.length === 0) {
      if (open.length >= SYNTHESIS_MAX_PROMPTS) {
        lastResult = makeResult({
          richness,
          skipped: true,
          skipReason: 'Waiting on a specific prompt before drafting.',
          waitingOnPrompt: true,
          usedLlm: false,
          drafts: [],
          prompts: open.slice(0, SYNTHESIS_MAX_PROMPTS).map((prompt) => ({
            promptId: prompt.id,
            text: prompt.text,
            sent: prompt.status === 'sent',
            error: null
          }))
        })
        await setAppSettings({ synthesisLastRunAt: lastResult.ranAt })
        return lastResult
      }

      const target = pickPromptTarget(eligible, todayInsights)
      if (!target) {
        lastResult = makeResult({
          richness,
          skipped: true,
          skipReason: 'Nothing passed the bar.',
          waitingOnPrompt: false,
          usedLlm: false,
          drafts: [],
          prompts: []
        })
        await setAppSettings({ synthesisLastRunAt: lastResult.ranAt })
        return lastResult
      }

      const prompt = await createPrompt({
        text: target.text,
        relatedInsightId: target.relatedInsightId,
        kind: SYNTHESIS_PROMPT_KIND
      })
      const notify = await failSoftNotifyPrompt(prompt.id)
      const queued: SynthesisPromptResult = {
        promptId: prompt.id,
        text: prompt.text,
        sent: notify.sent,
        error: notify.error
      }
      lastResult = makeResult({
        richness,
        skipped: true,
        skipReason: 'Thin day — asked for missing why/so-what before drafting.',
        waitingOnPrompt: true,
        usedLlm: false,
        drafts: [],
        prompts: [queued]
      })
      await setAppSettings({ synthesisLastRunAt: lastResult.ranAt })
      return lastResult
    }

    const allThreads = await listDecoratedThreads()
    const candidates = candidateThreads(eligible, answered, allThreads, used)
    if (candidates.length === 0) {
      lastResult = makeResult({
        richness,
        skipped: true,
        skipReason: 'Nothing passed the bar.',
        waitingOnPrompt: false,
        usedLlm: false,
        drafts: [],
        prompts: []
      })
      await setAppSettings({ synthesisLastRunAt: lastResult.ranAt })
      return lastResult
    }

    const apiKey = await getGoogleApiKey()
    const writer = getWriter(apiKey)
    let usedLlm = false
    const drafts: SynthesisResult['drafts'] = []

    for (const thread of candidates) {
      try {
        const written = await writer.write({
          thread,
          answers: answersForThread(thread, answered)
        })
        if (!written) continue
        usedLlm = usedLlm || written.usedLlm
        const saved = await persistReviewPost({
          title: written.title,
          html: written.html,
          channel: written.channel,
          threadId: thread.id,
          insightIds: thread.insights.map((insight) => insight.id),
          intent: written.intent ?? asIntent(thread.insights[0]?.pillar)
        })
        drafts.push({
          docId: saved.id,
          title: saved.title,
          channel: written.channel,
          threadId: thread.id
        })
        await failSoftNotifyDraft(saved.title, saved.id)
      } catch (err) {
        console.error('Content Engine synthesis draft failed:', err)
      }
    }

    lastResult = makeResult({
      richness,
      skipped: drafts.length === 0,
      skipReason:
        drafts.length === 0
          ? apiKey
            ? 'Nothing passed the bar.'
            : 'Not enough quoted material to stitch without a Google key.'
          : null,
      waitingOnPrompt: false,
      usedLlm,
      drafts,
      prompts: []
    })
    await setAppSettings({
      synthesisLastRunAt: lastResult.ranAt,
      synthesisLastEodKey: localDayKey(now)
    })
    return lastResult
  } catch (err) {
    console.error('Content Engine synthesis failed:', err)
    lastResult = makeResult({
      richness: emptyRichness(),
      skipped: true,
      skipReason: err instanceof Error ? err.message : 'Synthesis failed.',
      waitingOnPrompt: false,
      usedLlm: false,
      drafts: [],
      prompts: []
    })
    return lastResult
  } finally {
    running = false
  }
}

export async function getSynthesisStatus(): Promise<SynthesisStatus> {
  const settings = await getAppSettings()
  let richness = emptyRichness()
  try {
    richness = (await measureDayRichness()).richness
  } catch {
    // db may not be ready in tests
  }
  const open = await listOpenPromptsByKind(SYNTHESIS_PROMPT_KIND).catch(() => [])
  const lastRunAt =
    typeof settings.synthesisLastRunAt === 'number' ? settings.synthesisLastRunAt : lastResult?.ranAt ?? null
  return {
    richness,
    eodEnabled: settings.synthesisEodEnabled !== false,
    lastRunAt,
    lastResult,
    openSynthesisPromptCount: open.length
  }
}

async function maybeRunEod(): Promise<void> {
  try {
    const settings = await getAppSettings()
    if (settings.synthesisEodEnabled === false) return
    const now = Date.now()
    const date = new Date(now)
    if (date.getHours() < SYNTHESIS_EOD_HOUR) return
    const today = localDayKey(now)
    if (settings.synthesisLastEodKey === today) return
    await runSynthesis(now)
    await setAppSettings({ synthesisLastEodKey: today })
  } catch (err) {
    console.error('Content Engine end-of-day synthesis failed:', err)
  }
}

export function startSynthesisScheduler(): void {
  if (eodTimer) return
  eodTimer = setInterval(() => {
    void maybeRunEod()
  }, SYNTHESIS_EOD_CHECK_MS)
  void maybeRunEod()
}

export function stopSynthesisScheduler(): void {
  if (eodTimer) {
    clearInterval(eodTimer)
    eodTimer = null
  }
}

export function restartSynthesisScheduler(): void {
  stopSynthesisScheduler()
  startSynthesisScheduler()
}
