import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getEmbedder } from './embedder'
import { attachInsightToThread, findNearDuplicate, recomputeThread } from './clusterThreads'
import { parseInsightRow } from './ingestMeeting'
import { insightTextError } from '@shared/contentEngine'
import type { CorpusInsight, CreateInsightInput } from '@shared/types'

function optionalText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

export type SaveInsightInput = CreateInsightInput & { threadId?: string | null }

export async function saveCorpusInsight(input: SaveInsightInput): Promise<CorpusInsight> {
  const text = (input?.text || '').trim()
  const error = insightTextError(text)
  if (error) throw new Error(error)

  const db = getDb()
  const now = Date.now()
  const origin = input.origin ?? 'manual'
  const soWhat = optionalText(input.soWhat)
  const source = optionalText(input.source)
  const pillar = optionalText(input.pillar)
  const dumpId = optionalText(input.dumpId)
  const sessionId = optionalText(input.sessionId)
  const forcedThreadId = optionalText(input.threadId)
  const provenance = {
    ...(input.provenance ?? {}),
    sessionId: input.provenance?.sessionId ?? sessionId ?? undefined
  }
  const embeddingVec = await getEmbedder().embed(text)
  const dup = await findNearDuplicate(embeddingVec, now, text)
  if (dup) {
    try {
      if (forcedThreadId && dup.threadId !== forcedThreadId) {
        const previous = dup.threadId
        await db.execute({
          sql: 'UPDATE corpus_insights SET thread_id = ?, dump_id = COALESCE(dump_id, ?) WHERE id = ?',
          args: [forcedThreadId, dumpId, dup.id]
        })
        if (previous) await recomputeThread(previous)
        await recomputeThread(forcedThreadId)
      } else {
        await attachInsightToThread(dup.id)
      }
    } catch (err) {
      console.error('Content Engine cluster attach failed:', err)
    }
    const existing = await db.execute({ sql: 'SELECT * FROM corpus_insights WHERE id = ?', args: [dup.id] })
    return parseInsightRow(existing.rows[0] as unknown as Record<string, unknown>)
  }

  const id = nanoid()
  const embedding = JSON.stringify(embeddingVec)
  await db.execute({
    sql: `INSERT INTO corpus_insights
          (id, text, so_what, source, pillar, origin, embedding, dump_id, session_id, thread_id, provenance, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, text, soWhat, source, pillar, origin, embedding, dumpId, sessionId, forcedThreadId,
      JSON.stringify(provenance), now, now
    ]
  })

  try {
    if (forcedThreadId) {
      await recomputeThread(forcedThreadId)
    } else {
      await attachInsightToThread(id)
    }
  } catch (err) {
    console.error('Content Engine cluster attach failed:', err)
  }

  const saved = await db.execute({ sql: 'SELECT * FROM corpus_insights WHERE id = ?', args: [id] })
  return parseInsightRow(saved.rows[0] as unknown as Record<string, unknown>)
}
