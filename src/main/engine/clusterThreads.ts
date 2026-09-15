import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getEmbedder } from './embedder'
import {
  CLUSTER_SIMILARITY,
  CLUSTER_WINDOW_MS,
  DEDUP_SIMILARITY,
  averageEmbedding,
  clusterSimilarity,
  heuristicPatternTitle,
  insightSourceKey,
  isEligibleForDraft,
  isPatternSurfaced,
  meaningScore,
  sameCalendarDay
} from '@shared/contentEngine'
import type { CorpusInsight, CorpusThread, CorpusThreadStatus } from '@shared/types'
import { parseInsightRow } from './ingestMeeting'

function parseEmbedding(value: unknown): number[] | null {
  if (value == null || value === '') return null
  try {
    const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value
    if (!Array.isArray(parsed)) return null
    const nums = parsed.map(Number).filter((n) => Number.isFinite(n))
    return nums.length > 0 ? nums : null
  } catch {
    return null
  }
}

type ThreadRow = {
  id: string
  title: string
  meaning: string
  centroid: number[] | null
  meaningScore: number
  status: CorpusThreadStatus
  evidenceCount: number
  sourceDiversity: number
  titledOnce: boolean
  createdAt: number
  updatedAt: number
}

function parseThreadBase(row: Record<string, unknown>): ThreadRow {
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    meaning: (row.meaning as string) || '',
    centroid: parseEmbedding(row.centroid_embedding),
    meaningScore: Number(row.meaning_score ?? 0),
    status: ((row.status as string) || 'emerging') as CorpusThreadStatus,
    evidenceCount: Number(row.evidence_count ?? 0),
    sourceDiversity: Number(row.source_diversity ?? 0),
    titledOnce: Number(row.titled_once) !== 0,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

function majorityPillar(insights: CorpusInsight[]): string | null {
  const counts = new Map<string, number>()
  for (const insight of insights) {
    const pillar = insight.pillar?.trim().toLowerCase()
    if (!pillar) continue
    counts.set(pillar, (counts.get(pillar) ?? 0) + 1)
  }
  if (counts.size === 0) return null
  let best: string | null = null
  let bestN = 0
  for (const [pillar, n] of counts) {
    if (n > bestN) {
      best = pillar
      bestN = n
    }
  }
  return best
}

function softMetadataAgree(insight: CorpusInsight, members: CorpusInsight[]): boolean {
  const pillar = insight.pillar?.trim().toLowerCase()
  if (!pillar) return true
  const majority = majorityPillar(members)
  if (!majority) return true
  return pillar === majority
}

async function loadRecentInsights(excludeId?: string): Promise<CorpusInsight[]> {
  const db = getDb()
  const cutoff = Date.now() - CLUSTER_WINDOW_MS
  const result = excludeId
    ? await db.execute({
        sql: `SELECT * FROM corpus_insights
              WHERE created_at >= ? AND id != ? AND (duplicate_of IS NULL OR duplicate_of = '')
              ORDER BY created_at DESC`,
        args: [cutoff, excludeId]
      })
    : await db.execute({
        sql: `SELECT * FROM corpus_insights
              WHERE created_at >= ? AND (duplicate_of IS NULL OR duplicate_of = '')
              ORDER BY created_at DESC`,
        args: [cutoff]
      })
  return result.rows.map((row) => parseInsightRow(row as unknown as Record<string, unknown>))
}

async function loadThread(id: string): Promise<ThreadRow | null> {
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM corpus_threads WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null
  return parseThreadBase(result.rows[0] as unknown as Record<string, unknown>)
}

async function loadThreadMembers(threadId: string): Promise<CorpusInsight[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM corpus_insights
          WHERE thread_id = ? AND (duplicate_of IS NULL OR duplicate_of = '')
          ORDER BY created_at ASC`,
    args: [threadId]
  })
  return result.rows.map((row) => parseInsightRow(row as unknown as Record<string, unknown>))
}

export function decorateThread(row: ThreadRow, insights: CorpusInsight[]): CorpusThread {
  const evidenceCount = insights.length
  const sourceDiversity = new Set(insights.map((insight) => insightSourceKey(insight))).size
  const newest = insights.reduce((max, insight) => Math.max(max, insight.createdAt), row.createdAt)
  const surfaced = isPatternSurfaced(evidenceCount, sourceDiversity)
  const score = meaningScore({
    evidenceCount,
    sourceDiversity,
    newestCreatedAt: newest,
    pinned: row.status === 'pinned'
  })
  return {
    id: row.id,
    title: row.title,
    meaning: row.meaning,
    centroidEmbedding: row.centroid,
    meaningScore: score,
    status: row.status,
    evidenceCount,
    sourceDiversity,
    surfaced,
    eligibleForDraft: isEligibleForDraft(row.status, surfaced),
    insights,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export async function findNearDuplicate(
  embedding: number[],
  createdAt: number,
  text: string,
  excludeId?: string
): Promise<CorpusInsight | null> {
  const recent = await loadRecentInsights(excludeId)
  let best: CorpusInsight | null = null
  let bestScore = DEDUP_SIMILARITY
  for (const insight of recent) {
    if (!sameCalendarDay(insight.createdAt, createdAt)) continue
    const score = clusterSimilarity(embedding, insight.embedding, text, insight.text)
    if (score >= bestScore) {
      best = insight
      bestScore = score
    }
  }
  return best
}

async function createSingleton(insight: CorpusInsight): Promise<string> {
  const db = getDb()
  const now = Date.now()
  const id = nanoid()
  const centroid = insight.embedding ? JSON.stringify(insight.embedding) : null
  await db.execute({
    sql: `INSERT INTO corpus_threads
          (id, title, meaning, centroid_embedding, meaning_score, status, evidence_count,
           source_diversity, titled_once, created_at, updated_at)
          VALUES (?, '', ?, ?, ?, 'emerging', 1, 1, 0, ?, ?)`,
    args: [id, insight.text, centroid, meaningScore({
      evidenceCount: 1,
      sourceDiversity: 1,
      newestCreatedAt: insight.createdAt,
      pinned: false,
      now
    }), now, now]
  })
  await db.execute({
    sql: 'UPDATE corpus_insights SET thread_id = ? WHERE id = ?',
    args: [id, insight.id]
  })
  return id
}

export async function recomputeThread(threadId: string): Promise<void> {
  const db = getDb()
  const thread = await loadThread(threadId)
  if (!thread) return
  const members = await loadThreadMembers(threadId)
  const now = Date.now()
  if (members.length === 0) {
    await db.execute({ sql: 'DELETE FROM corpus_threads WHERE id = ?', args: [threadId] })
    return
  }

  const keys = new Set(members.map((m) => insightSourceKey(m)))
  const evidenceCount = members.length
  const sourceDiversity = keys.size
  const newest = members.reduce((max, m) => Math.max(max, m.createdAt), 0)
  const surfaced = isPatternSurfaced(evidenceCount, sourceDiversity)
  const pinned = thread.status === 'pinned'
  const muted = thread.status === 'muted'
  let status: CorpusThreadStatus = thread.status
  if (!pinned && !muted) {
    status = surfaced ? 'active' : 'emerging'
  }
  const score = meaningScore({
    evidenceCount,
    sourceDiversity,
    newestCreatedAt: newest,
    pinned,
    now
  })
  const vectors = members.map((m) => m.embedding).filter((v): v is number[] => Array.isArray(v) && v.length > 0)
  const centroid = averageEmbedding(vectors)
  const wasSurfaced = isPatternSurfaced(thread.evidenceCount, thread.sourceDiversity)
  const firstSurface = surfaced && !wasSurfaced && !thread.titledOnce
  const title =
    firstSurface && !thread.title.trim()
      ? heuristicPatternTitle(members[0]?.text || thread.meaning)
      : thread.title
  const titledOnce = thread.titledOnce || firstSurface ? 1 : 0

  await db.execute({
    sql: `UPDATE corpus_threads
          SET title = ?, centroid_embedding = ?, meaning_score = ?, status = ?,
              evidence_count = ?, source_diversity = ?, titled_once = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      title,
      centroid ? JSON.stringify(centroid) : null,
      score,
      status,
      evidenceCount,
      sourceDiversity,
      titledOnce,
      now,
      threadId
    ]
  })
}

export async function attachInsightToThread(insightId: string): Promise<void> {
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM corpus_insights WHERE id = ?', args: [insightId] })
  if (result.rows.length === 0) return
  const insight = parseInsightRow(result.rows[0] as unknown as Record<string, unknown>)
  try {
    const fresh = await getEmbedder().embed(insight.text)
    insight.embedding = fresh
    await db.execute({
      sql: 'UPDATE corpus_insights SET embedding = ? WHERE id = ?',
      args: [JSON.stringify(fresh), insight.id]
    })
  } catch (err) {
    console.error('Re-embed for cluster failed:', err)
  }
  if (!insight.embedding || insight.embedding.length === 0) return
  const embedding = insight.embedding
  if (insight.threadId) {
    await recomputeThread(insight.threadId)
    return
  }

  const cutoff = Date.now() - CLUSTER_WINDOW_MS
  const threadRows = await db.execute({
    sql: `SELECT * FROM corpus_threads WHERE updated_at >= ? OR created_at >= ?`,
    args: [cutoff, cutoff]
  })
  const threads = threadRows.rows.map((row) => parseThreadBase(row as unknown as Record<string, unknown>))

  let best: ThreadRow | null = null
  let bestScore = CLUSTER_SIMILARITY
  for (const thread of threads) {
    const members = await loadThreadMembers(thread.id)
    if (members.length === 0) continue
    if (!softMetadataAgree(insight, members)) continue
    const score = members.reduce((max, member) => {
      return Math.max(
        max,
        clusterSimilarity(embedding, member.embedding, insight.text, member.text)
      )
    }, 0)
    if (score < bestScore) continue
    best = thread
    bestScore = score
  }

  if (best) {
    await db.execute({
      sql: 'UPDATE corpus_insights SET thread_id = ? WHERE id = ?',
      args: [best.id, insight.id]
    })
    await recomputeThread(best.id)
    return
  }

  const threadId = await createSingleton(insight)
  await recomputeThread(threadId)
}

export async function attachUnclusteredInsights(): Promise<void> {
  const db = getDb()
  const result = await db.execute(
    `SELECT id FROM corpus_insights
     WHERE (thread_id IS NULL OR thread_id = '')
       AND (duplicate_of IS NULL OR duplicate_of = '')
     ORDER BY created_at ASC`
  )
  for (const row of result.rows) {
    try {
      await attachInsightToThread(row.id as string)
    } catch (err) {
      console.error('Cluster attach failed:', err)
    }
  }
}

export async function applyThreadStatus(
  threadId: string,
  status: CorpusThreadStatus
): Promise<CorpusThread | null> {
  const db = getDb()
  const existing = await loadThread(threadId)
  if (!existing) return null
  const now = Date.now()
  await db.execute({
    sql: 'UPDATE corpus_threads SET status = ?, updated_at = ? WHERE id = ?',
    args: [status, now, threadId]
  })
  await recomputeThread(threadId)
  // recompute may override active/emerging but must honor pinned/muted
  if (status === 'pinned' || status === 'muted') {
    const members = await loadThreadMembers(threadId)
    const newest = members.reduce((max, m) => Math.max(max, m.createdAt), existing.createdAt)
    const evidenceCount = members.length
    const sourceDiversity = new Set(members.map((m) => insightSourceKey(m))).size
    const score = meaningScore({
      evidenceCount,
      sourceDiversity,
      newestCreatedAt: newest,
      pinned: status === 'pinned',
      now
    })
    await db.execute({
      sql: 'UPDATE corpus_threads SET status = ?, meaning_score = ?, updated_at = ? WHERE id = ?',
      args: [status, score, now, threadId]
    })
  } else if (status === 'active' || status === 'emerging') {
    const after = await loadThread(threadId)
    if (after && (after.status === 'pinned' || after.status === 'muted')) {
      await db.execute({
        sql: 'UPDATE corpus_threads SET status = ?, updated_at = ? WHERE id = ?',
        args: [status, now, threadId]
      })
    }
  }
  return loadDecoratedThread(threadId)
}

export async function loadDecoratedThread(threadId: string): Promise<CorpusThread | null> {
  const thread = await loadThread(threadId)
  if (!thread) return null
  const insights = await loadThreadMembers(threadId)
  return decorateThread(thread, insights)
}

export async function listDecoratedThreads(): Promise<CorpusThread[]> {
  await attachUnclusteredInsights()
  const db = getDb()
  const result = await db.execute('SELECT * FROM corpus_threads')
  const threads: CorpusThread[] = []
  for (const row of result.rows) {
    const base = parseThreadBase(row as unknown as Record<string, unknown>)
    const insights = await loadThreadMembers(base.id)
    threads.push(decorateThread(base, insights))
  }
  threads.sort((a, b) => {
    const rank = (s: CorpusThreadStatus): number =>
      s === 'pinned' ? 0 : s === 'active' ? 1 : s === 'emerging' ? 2 : 3
    const ra = rank(a.status)
    const rb = rank(b.status)
    if (ra !== rb) return ra - rb
    return b.meaningScore - a.meaningScore
  })
  return threads
}
