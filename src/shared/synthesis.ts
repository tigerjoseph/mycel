import type { PostChannel } from './types'

export const SYNTHESIS_MAX_DRAFTS = 2
export const SYNTHESIS_MAX_PROMPTS = 1
export const SYNTHESIS_PROMPT_KIND = 'synthesis'

export const DAY_RICH_MEETINGS = 3
export const DAY_RICH_INSIGHTS = 5
export const DAY_RICH_SESSIONS = 4
export const DAY_RICH_SCORE = 10

export const NEWSLETTER_MIN_EVIDENCE = 5
export const NEWSLETTER_MIN_DIVERSITY = 2

export const SYNTHESIS_EOD_HOUR = 18
export const SYNTHESIS_EOD_CHECK_MS = 15 * 60 * 1000

export const SYNTHESIS_BANNED_PHRASES = [
  'game changer',
  'game-changer',
  'in this day and age',
  'delve',
  'leverage',
  "i'm humbled",
  'humbled to',
  'excited to announce',
  'synergy',
  'unlock your',
  'at the end of the day',
  'circle back',
  'move the needle',
  'low-hanging fruit'
] as const

export interface DayRichness {
  meetings: number
  insights: number
  sessions: number
  eligibleThreads: number
  score: number
  rich: boolean
}

export function startOfLocalDay(now = Date.now()): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function localDayKey(now = Date.now()): string {
  const date = new Date(now)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayRichnessScore(input: {
  meetings: number
  insights: number
  sessions: number
  eligibleThreads: number
}): DayRichness {
  const score =
    input.meetings * 3 +
    input.insights * 2 +
    input.sessions +
    (input.eligibleThreads > 0 ? 1 : 0)
  const rich =
    input.meetings >= DAY_RICH_MEETINGS ||
    input.insights >= DAY_RICH_INSIGHTS ||
    input.sessions >= DAY_RICH_SESSIONS ||
    (input.meetings >= 2 && input.insights >= 3) ||
    score >= DAY_RICH_SCORE
  return { ...input, score, rich }
}

export function pickChannel(evidenceCount: number, sourceDiversity: number): PostChannel {
  if (evidenceCount >= NEWSLETTER_MIN_EVIDENCE && sourceDiversity >= NEWSLETTER_MIN_DIVERSITY) {
    return 'newsletter'
  }
  return 'linkedin'
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Drop sentences/paragraphs that contain banned filler. Never rewrite in new claims. */
export function scrubBannedPhrases(html: string): string {
  let next = html
  for (const phrase of SYNTHESIS_BANNED_PHRASES) {
    const re = new RegExp(`<p>\\s*[^<]*${escapeRegExp(phrase)}[^<]*</p>`, 'gi')
    next = next.replace(re, '')
  }
  return next.replace(/(<p>\s*<\/p>)+/g, '').trim()
}

export function formatSynthesisSummary(result: {
  richness: DayRichness
  waitingOnPrompt: boolean
  drafts: { title?: string }[]
  prompts: { text: string; sent: boolean }[]
  skipReason: string | null
}): string {
  const r = result.richness
  const counts = `${r.meetings} meetings · ${r.insights} insights · ${r.sessions} sessions (${r.rich ? 'rich' : 'thin'})`
  if (result.waitingOnPrompt && result.prompts[0]) {
    const sent = result.prompts[0].sent ? 'sent' : 'saved locally'
    return `${counts}. Prompt (${sent}): ${result.prompts[0].text}`
  }
  if (result.drafts.length > 0) {
    const n = result.drafts.length
    return `${counts}. ${n} draft${n === 1 ? '' : 's'} in Review.`
  }
  return `${counts}. ${result.skipReason || 'Nothing passed the bar.'}`
}
