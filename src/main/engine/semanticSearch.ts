import { getDb } from '../db'
import { getEmbedder } from './embedder'
import { clusterSimilarity, isPatternSurfaced } from '@shared/contentEngine'
import { parseInsightRow } from './ingestMeeting'
import { listDecoratedThreads } from './clusterThreads'
import type { CorpusSearchHit } from '@shared/types'

const MAX_HITS = 24

export async function searchCorpusSemantic(query: string): Promise<CorpusSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const queryEmbedding = await getEmbedder().embed(q)
  const db = getDb()
  const insightRows = await db.execute(
    `SELECT * FROM corpus_insights
     WHERE (duplicate_of IS NULL OR duplicate_of = '')
     ORDER BY created_at DESC
     LIMIT 400`
  )
  const insights = insightRows.rows.map((row) =>
    parseInsightRow(row as unknown as Record<string, unknown>)
  )
  const threads = await listDecoratedThreads()

  const hits: CorpusSearchHit[] = []

  for (const insight of insights) {
    const score = clusterSimilarity(queryEmbedding, insight.embedding, q, insight.text)
    if (score < 0.22) continue
    hits.push({
      kind: 'insight',
      id: insight.id,
      title: insight.text.length > 96 ? `${insight.text.slice(0, 93)}…` : insight.text,
      snippet: insight.soWhat || insight.source || insight.pillar || insight.origin,
      score,
      meta: insight.lifecycle
    })
  }

  for (const thread of threads) {
    const listed =
      thread.surfaced ||
      thread.status === 'pinned' ||
      thread.status === 'muted' ||
      (thread.status === 'emerging' && thread.evidenceCount >= 2)
    if (!listed && !isPatternSurfaced(thread.evidenceCount, thread.sourceDiversity)) continue

    const blob = `${thread.title}\n${thread.meaning}\n${thread.insights
      .slice(0, 4)
      .map((i) => i.text)
      .join('\n')}`
    const threadEmbed = thread.centroidEmbedding
    const score = clusterSimilarity(queryEmbedding, threadEmbed, q, blob)
    if (score < 0.2) continue
    hits.push({
      kind: 'pattern',
      id: thread.id,
      title: thread.title || 'Untitled pattern',
      snippet: thread.meaning || `${thread.evidenceCount} insights`,
      score,
      meta: thread.status
    })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, MAX_HITS)
}
