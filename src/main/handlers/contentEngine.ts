import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getEmbedder } from '../engine/embedder'
import {
  ensureSessionsForExistingMeetings,
  parseInsightRow,
  parseSessionRow
} from '../engine/ingestMeeting'
import { insightTextError } from '@shared/contentEngine'
import type {
  CorpusThread,
  CorpusThreadStatus,
  CreateDumpInput,
  CreateInsightInput,
  CreateSessionInput,
  Dump,
  DumpSource,
  InsightListFilter,
  InsightProvenance,
  SessionSource,
  UpdateInsightInput,
  UpdateSessionInput
} from '@shared/types'

const THREAD_STATUSES = new Set<CorpusThreadStatus>(['emerging', 'active', 'pinned', 'muted'])

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

function optionalText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function parseThreadRow(row: Record<string, unknown>): CorpusThread {
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    meaning: (row.meaning as string) || '',
    centroidEmbedding: parseEmbedding(row.centroid_embedding),
    meaningScore: Number(row.meaning_score ?? 0),
    status: ((row.status as string) || 'emerging') as CorpusThreadStatus,
    evidenceCount: Number(row.evidence_count ?? 0),
    sourceDiversity: Number(row.source_diversity ?? 0),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

function parseDumpRow(row: Record<string, unknown>): Dump {
  return {
    id: row.id as string,
    source: ((row.source as string) || 'manual') as DumpSource,
    payload: (row.payload as string) || '',
    metadata: parseJsonObject(row.metadata),
    createdAt: row.created_at as number
  }
}

async function embedText(text: string): Promise<string> {
  const embedding = await getEmbedder().embed(text)
  return JSON.stringify(embedding)
}

export function registerContentEngineHandlers(): void {
  ipcMain.handle('insights:getAll', async (_e, filter?: InsightListFilter) => {
    const db = getDb()
    const result = filter?.sessionId
      ? await db.execute({
          sql: 'SELECT * FROM corpus_insights WHERE session_id = ? ORDER BY created_at DESC',
          args: [filter.sessionId]
        })
      : await db.execute('SELECT * FROM corpus_insights ORDER BY created_at DESC')
    return result.rows.map((row) => parseInsightRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('insights:create', async (_e, input: CreateInsightInput) => {
    const text = (input?.text || '').trim()
    const error = insightTextError(text)
    if (error) throw new Error(error)

    const db = getDb()
    const now = Date.now()
    const id = nanoid()
    const origin = input.origin ?? 'manual'
    const soWhat = optionalText(input.soWhat)
    const source = optionalText(input.source)
    const pillar = optionalText(input.pillar)
    const dumpId = optionalText(input.dumpId)
    const sessionId = optionalText(input.sessionId)
    const provenance: InsightProvenance = {
      ...(input.provenance ?? {}),
      sessionId: input.provenance?.sessionId ?? sessionId ?? undefined
    }
    const embedding = await embedText(text)

    await db.execute({
      sql: `INSERT INTO corpus_insights
            (id, text, so_what, source, pillar, origin, embedding, dump_id, session_id, provenance, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, text, soWhat, source, pillar, origin, embedding, dumpId, sessionId,
        JSON.stringify(provenance), now, now
      ]
    })

    return parseInsightRow({
      id,
      text,
      so_what: soWhat,
      source,
      pillar,
      origin,
      embedding,
      dump_id: dumpId,
      session_id: sessionId,
      provenance: JSON.stringify(provenance),
      created_at: now,
      updated_at: now
    })
  })

  ipcMain.handle('insights:update', async (_e, id: string, patch: UpdateInsightInput) => {
    if (!id) throw new Error('Insight id is required')
    const db = getDb()
    const existing = await db.execute({
      sql: 'SELECT * FROM corpus_insights WHERE id = ?',
      args: [id]
    })
    if (existing.rows.length === 0) throw new Error('Insight not found')
    const row = existing.rows[0] as unknown as Record<string, unknown>

    const nextText =
      patch.text !== undefined ? String(patch.text).trim() : ((row.text as string) || '')
    if (patch.text !== undefined) {
      const error = insightTextError(nextText)
      if (error) throw new Error(error)
    }

    const soWhat =
      patch.soWhat !== undefined ? optionalText(patch.soWhat) : ((row.so_what as string | null) ?? null)
    const source =
      patch.source !== undefined ? optionalText(patch.source) : ((row.source as string | null) ?? null)
    const pillar =
      patch.pillar !== undefined ? optionalText(patch.pillar) : ((row.pillar as string | null) ?? null)
    const embedding =
      patch.text !== undefined ? await embedText(nextText) : ((row.embedding as string | null) ?? null)
    const now = Date.now()

    await db.execute({
      sql: `UPDATE corpus_insights
            SET text = ?, so_what = ?, source = ?, pillar = ?, embedding = ?, updated_at = ?
            WHERE id = ?`,
      args: [nextText, soWhat, source, pillar, embedding, now, id]
    })

    return parseInsightRow({
      ...row,
      text: nextText,
      so_what: soWhat,
      source,
      pillar,
      embedding,
      updated_at: now
    })
  })

  ipcMain.handle('threads:getAll', async () => {
    const db = getDb()
    const result = await db.execute(
      `SELECT * FROM corpus_threads
       ORDER BY CASE status
         WHEN 'pinned' THEN 0
         WHEN 'active' THEN 1
         WHEN 'emerging' THEN 2
         ELSE 3
       END, updated_at DESC`
    )
    return result.rows.map((row) => parseThreadRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('threads:setStatus', async (_e, id: string, status: CorpusThreadStatus) => {
    if (!id) throw new Error('Thread id is required')
    if (!THREAD_STATUSES.has(status)) throw new Error('Invalid thread status')
    const db = getDb()
    const now = Date.now()
    const result = await db.execute({
      sql: 'UPDATE corpus_threads SET status = ?, updated_at = ? WHERE id = ?',
      args: [status, now, id]
    })
    if (result.rowsAffected === 0) throw new Error('Thread not found')
    const row = await db.execute({ sql: 'SELECT * FROM corpus_threads WHERE id = ?', args: [id] })
    return parseThreadRow(row.rows[0] as unknown as Record<string, unknown>)
  })

  ipcMain.handle('dumps:getAll', async () => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM dumps ORDER BY created_at DESC')
    return result.rows.map((row) => parseDumpRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('dumps:create', async (_e, input: CreateDumpInput) => {
    const payload = (input?.payload || '').trim()
    if (!payload) throw new Error('Dump payload is empty')
    const db = getDb()
    const now = Date.now()
    const id = nanoid()
    const source = input.source ?? 'manual'
    const metadata = JSON.stringify(input.metadata ?? {})
    await db.execute({
      sql: `INSERT INTO dumps (id, source, payload, metadata, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, source, payload, metadata, now]
    })
    return parseDumpRow({
      id,
      source,
      payload,
      metadata,
      created_at: now
    })
  })

  ipcMain.handle('sessions:getAll', async () => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC')
    return result.rows.map((row) => parseSessionRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('sessions:create', async (_e, input: CreateSessionInput) => {
    const db = getDb()
    const now = Date.now()
    const id = nanoid()
    const title = (input?.title || '').trim()
    const kind = input?.kind ?? 'work'
    const contactId = optionalText(input?.contactId)
    const projectId = optionalText(input?.projectId)
    const startedAt = input?.startedAt ?? now
    const endedAt = input?.endedAt ?? null
    const source: SessionSource = input?.source ?? (kind === 'meeting' ? 'meeting' : 'work')
    const meetingId = optionalText(input?.meetingId)
    const transcriptRef = optionalText(input?.transcriptRef) ?? (meetingId ? `meeting:${meetingId}` : null)
    await db.execute({
      sql: `INSERT INTO sessions
            (id, title, kind, source, meeting_id, transcript_ref, contact_id, project_id,
             started_at, ended_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, title, kind, source, meetingId, transcriptRef, contactId, projectId,
        startedAt, endedAt, now, now
      ]
    })
    return parseSessionRow({
      id,
      title,
      kind,
      source,
      meeting_id: meetingId,
      transcript_ref: transcriptRef,
      contact_id: contactId,
      project_id: projectId,
      started_at: startedAt,
      ended_at: endedAt,
      created_at: now,
      updated_at: now
    })
  })

  ipcMain.handle('sessions:update', async (_e, id: string, patch: UpdateSessionInput) => {
    if (!id) throw new Error('Session id is required')
    const db = getDb()
    const existing = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [id] })
    if (existing.rows.length === 0) throw new Error('Session not found')
    const row = existing.rows[0] as unknown as Record<string, unknown>
    const title = patch.title !== undefined ? String(patch.title).trim() : ((row.title as string) || '')
    const contactId =
      patch.contactId !== undefined ? optionalText(patch.contactId) : ((row.contact_id as string | null) ?? null)
    const projectId =
      patch.projectId !== undefined ? optionalText(patch.projectId) : ((row.project_id as string | null) ?? null)
    const now = Date.now()
    await db.execute({
      sql: 'UPDATE sessions SET title = ?, contact_id = ?, project_id = ?, updated_at = ? WHERE id = ?',
      args: [title, contactId, projectId, now, id]
    })
    return parseSessionRow({
      ...row,
      title,
      contact_id: contactId,
      project_id: projectId,
      updated_at: now
    })
  })

  ipcMain.handle('sessions:ensureForMeetings', async () => {
    await ensureSessionsForExistingMeetings()
    const db = getDb()
    const result = await db.execute(
      "SELECT * FROM sessions WHERE source = 'meeting' OR kind = 'meeting' ORDER BY created_at DESC"
    )
    return result.rows.map((row) => parseSessionRow(row as unknown as Record<string, unknown>))
  })
}
