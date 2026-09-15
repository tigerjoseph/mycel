export const INSIGHT_MIN_SENTENCES = 1
export const INSIGHT_MAX_SENTENCES = 3

/** Count sentences in a short insight. A fragment without punctuation counts as one. */
export function countSentences(text: string): number {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 0
  const parts = trimmed.match(/[^.!?…]+[.!?…]*/g)
  if (!parts) return 0
  return parts.filter((part) => part.trim().length > 0).length
}

export function insightTextError(text: string): string | null {
  const count = countSentences(text)
  if (count < INSIGHT_MIN_SENTENCES) return 'Write 1–3 sentences.'
  if (count > INSIGHT_MAX_SENTENCES) return 'Keep it to 3 sentences.'
  return null
}

export const POST_STATUSES = ['draft', 'review', 'scheduled', 'published'] as const
export const CORPUS_THREAD_STATUSES = ['emerging', 'active', 'pinned', 'muted'] as const
export const MEETING_INSIGHT_ORIGINS = ['auto', 'hybrid', 'session'] as const
export const INSIGHT_INTENTS = ['teach', 'entertain', 'discover', 'frame'] as const

export function isMeetingInsightOrigin(origin: string): boolean {
  return (MEETING_INSIGHT_ORIGINS as readonly string[]).includes(origin)
}

/** 90-day window for clustering. All local is also acceptable; this keeps v1 bounded. */
export const CLUSTER_WINDOW_MS = 90 * 24 * 60 * 60 * 1000
/** Blend of cosine + token Jaccard. Stub hash collisions cannot pass without lexical overlap. */
export const CLUSTER_SIMILARITY = 0.48
export const DEDUP_SIMILARITY = 0.94

export const PATTERN_MIN_EVIDENCE = 3
export const PATTERN_MIN_EVIDENCE_DIVERSE = 2
export const PATTERN_MIN_DIVERSITY = 2

export const MEANING_WEIGHT_EVIDENCE = 1
export const MEANING_WEIGHT_DIVERSITY = 1.5
export const MEANING_WEIGHT_RECENCY = 1
export const MEANING_PIN_BONUS = 2

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS

const CONTENT_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'this', 'that', 'as',
  'if', 'then', 'than', 'so', 'not', 'no', 'do', 'does', 'did', 'have', 'has', 'had',
  'you', 'your', 'we', 'our', 'they', 'their', 'i', 'me', 'my', 'he', 'she', 'his', 'her',
  'about', 'into', 'over', 'after', 'before'
])

/** Content tokens for stub embeddings and lexical Jaccard. */
export function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !CONTENT_STOPWORDS.has(token))
}

export function tokenJaccard(a: string, b: string): number {
  const left = new Set(contentTokens(a))
  const right = new Set(contentTokens(b))
  if (left.size === 0 && right.size === 0) return 1
  if (left.size === 0 || right.size === 0) return 0
  let inter = 0
  for (const token of left) {
    if (right.has(token)) inter++
  }
  return inter / (left.size + right.size - inter)
}

export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Stub-safe similarity: hash cosine can collide, so zero Jaccard caps the score
 * and related paraphrases still pass via token overlap.
 */
export function clusterSimilarity(
  embeddingA: number[] | null | undefined,
  embeddingB: number[] | null | undefined,
  textA: string,
  textB: string
): number {
  const jac = tokenJaccard(textA, textB)
  const cos = cosineSimilarity(embeddingA, embeddingB)
  if (jac <= 0) return Math.min(cos, 0.3)
  return 0.4 * cos + 0.6 * jac
}

export function sameCalendarDay(a: number, b: number): boolean {
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10)
}

export function insightSourceKey(insight: {
  origin: string
  source?: string | null
  sessionId?: string | null
}): string {
  if (insight.sessionId) return `session:${insight.sessionId}`
  if (insight.source && insight.source.trim()) return `source:${insight.source.trim().toLowerCase()}`
  if (isMeetingInsightOrigin(insight.origin)) return 'origin:meeting'
  return `origin:${insight.origin || 'manual'}`
}

export function isPatternSurfaced(evidenceCount: number, sourceDiversity: number): boolean {
  return (
    evidenceCount >= PATTERN_MIN_EVIDENCE ||
    (evidenceCount >= PATTERN_MIN_EVIDENCE_DIVERSE && sourceDiversity >= PATTERN_MIN_DIVERSITY)
  )
}

export function recencyBoost(newestCreatedAt: number, now = Date.now()): number {
  const age = Math.max(0, now - newestCreatedAt)
  if (age <= WEEK_MS) return 1
  if (age <= MONTH_MS) return 0.6
  if (age <= CLUSTER_WINDOW_MS) return 0.3
  return 0.1
}

export function meaningScore(input: {
  evidenceCount: number
  sourceDiversity: number
  newestCreatedAt: number
  pinned: boolean
  now?: number
}): number {
  const recency = recencyBoost(input.newestCreatedAt, input.now)
  const pin = input.pinned ? MEANING_PIN_BONUS : 0
  return (
    input.evidenceCount * MEANING_WEIGHT_EVIDENCE +
    input.sourceDiversity * MEANING_WEIGHT_DIVERSITY +
    recency * MEANING_WEIGHT_RECENCY +
    pin
  )
}

export function isEligibleForDraft(status: string, surfaced: boolean): boolean {
  return surfaced && status !== 'muted'
}

export function heuristicPatternTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'Untitled pattern'
  const words = cleaned.split(' ')
  const slice = words.slice(0, 8).join(' ')
  const titled = words.length > 8 ? `${slice}…` : slice
  return titled.length > 72 ? `${titled.slice(0, 69)}…` : titled
}

export function averageEmbedding(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null
  const dim = vectors[0].length
  if (dim === 0 || vectors.some((v) => v.length !== dim)) return vectors[0] ?? null
  const acc = new Array<number>(dim).fill(0)
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) acc[i] += vec[i]
  }
  const avg = acc.map((n) => n / vectors.length)
  let mag = 0
  for (const n of avg) mag += n * n
  mag = Math.sqrt(mag) || 1
  return avg.map((n) => n / mag)
}
