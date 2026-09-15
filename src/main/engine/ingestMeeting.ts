import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getEmbedder } from './embedder'
import { extractCorpusInsights } from './extractInsights'
import { getGoogleApiKey } from '../settingsStore'
import type {
  Atom,
  CorpusInsight,
  InsightOrigin,
  InsightProvenance,
  Meeting,
  SessionSource,
  WorkSession
} from '@shared/types'

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

export function parseSessionRow(row: Record<string, unknown>): WorkSession {
  const source = ((row.source as string) || (row.kind === 'meeting' ? 'meeting' : 'work')) as SessionSource
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    kind: ((row.kind as string) || 'work') as WorkSession['kind'],
    source,
    meetingId: (row.meeting_id as string | null) ?? null,
    transcriptRef: (row.transcript_ref as string | null) ?? null,
    contactId: (row.contact_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    startedAt: (row.started_at as number | null) ?? null,
    endedAt: (row.ended_at as number | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

export function parseInsightRow(row: Record<string, unknown>): CorpusInsight {
  const provenance = parseJsonObject(row.provenance) as InsightProvenance
  const sessionId = (row.session_id as string | null) ?? provenance.sessionId ?? null
  return {
    id: row.id as string,
    text: (row.text as string) || '',
    soWhat: (row.so_what as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    pillar: (row.pillar as string | null) ?? null,
    origin: ((row.origin as string) || 'manual') as InsightOrigin,
    embedding: parseEmbedding(row.embedding),
    dumpId: (row.dump_id as string | null) ?? null,
    sessionId,
    provenance: {
      ...provenance,
      sessionId: provenance.sessionId ?? sessionId ?? undefined
    },
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

async function embedText(text: string): Promise<string> {
  const embedding = await getEmbedder().embed(text)
  return JSON.stringify(embedding)
}

export async function getSessionByMeetingId(meetingId: string): Promise<WorkSession | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM sessions WHERE meeting_id = ? LIMIT 1',
    args: [meetingId]
  })
  if (result.rows.length === 0) return null
  return parseSessionRow(result.rows[0] as unknown as Record<string, unknown>)
}

/** Create or refresh the meeting session. Transcript stays on `meetings`; we only store a ref. */
export async function ensureMeetingSession(meeting: Meeting): Promise<WorkSession> {
  const db = getDb()
  const now = Date.now()
  const existing = await getSessionByMeetingId(meeting.id)
  const transcriptRef = `meeting:${meeting.id}`

  if (existing) {
    await db.execute({
      sql: `UPDATE sessions
            SET title = ?, kind = 'meeting', source = 'meeting', transcript_ref = ?, updated_at = ?
            WHERE id = ?`,
      args: [meeting.title || existing.title, transcriptRef, now, existing.id]
    })
    return {
      ...existing,
      title: meeting.title || existing.title,
      kind: 'meeting',
      source: 'meeting',
      transcriptRef,
      updatedAt: now
    }
  }

  const id = nanoid()
  await db.execute({
    sql: `INSERT INTO sessions
          (id, title, kind, source, meeting_id, transcript_ref, contact_id, project_id,
           started_at, ended_at, created_at, updated_at)
          VALUES (?, ?, 'meeting', 'meeting', ?, ?, NULL, NULL, ?, NULL, ?, ?)`,
    args: [id, meeting.title || '', meeting.id, transcriptRef, meeting.createdAt, now, now]
  })

  return {
    id,
    title: meeting.title || '',
    kind: 'meeting',
    source: 'meeting',
    meetingId: meeting.id,
    transcriptRef,
    contactId: null,
    projectId: null,
    startedAt: meeting.createdAt,
    endedAt: null,
    createdAt: now,
    updatedAt: now
  }
}

export async function ensureSessionsForExistingMeetings(): Promise<WorkSession[]> {
  const db = getDb()
  const meetings = await db.execute(
    `SELECT m.id, m.title, m.transcript, m.source, m.source_path, m.created_at, m.updated_at
     FROM meetings m
     LEFT JOIN sessions s ON s.meeting_id = m.id
     WHERE s.id IS NULL`
  )
  const created: WorkSession[] = []
  for (const row of meetings.rows) {
    const meeting: Meeting = {
      id: row.id as string,
      title: (row.title as string) || '',
      transcript: (row.transcript as string) || '',
      source: ((row.source as string) || 'import') as Meeting['source'],
      sourcePath: (row.source_path as string | null) ?? null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
    created.push(await ensureMeetingSession(meeting))
  }
  return created
}

async function insertInsight(params: {
  text: string
  soWhat: string | null
  pillar: string | null
  origin: InsightOrigin
  sessionId: string
  meetingId: string
}): Promise<CorpusInsight> {
  const db = getDb()
  const now = Date.now()
  const id = nanoid()
  const provenance: InsightProvenance = {
    sessionId: params.sessionId,
    meetingId: params.meetingId
  }
  const embedding = await embedText(params.text)
  await db.execute({
    sql: `INSERT INTO corpus_insights
          (id, text, so_what, source, pillar, origin, embedding, dump_id, session_id, provenance, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    args: [
      id,
      params.text,
      params.soWhat,
      'meeting',
      params.pillar,
      params.origin,
      embedding,
      params.sessionId,
      JSON.stringify(provenance),
      now,
      now
    ]
  })
  return parseInsightRow({
    id,
    text: params.text,
    so_what: params.soWhat,
    source: 'meeting',
    pillar: params.pillar,
    origin: params.origin,
    embedding,
    dump_id: null,
    session_id: params.sessionId,
    provenance: JSON.stringify(provenance),
    created_at: now,
    updated_at: now
  })
}

/**
 * After the legacy meetings/atoms path: ensure a Session and optionally store Corpus insights.
 * Extract errors are logged; the meeting row is left intact. Never creates a post Doc.
 */
export async function ingestMeetingIntoCorpus(
  meeting: Meeting,
  atoms: Atom[]
): Promise<{ session: WorkSession; insights: CorpusInsight[] }> {
  const session = await ensureMeetingSession(meeting)
  try {
    const apiKey = await getGoogleApiKey()
    const extracted = await extractCorpusInsights(meeting.transcript, { apiKey, atoms })
    if (!extracted || extracted.length === 0) {
      return { session, insights: [] }
    }

    const insights: CorpusInsight[] = []
    for (const item of extracted) {
      insights.push(
        await insertInsight({
          text: item.text,
          soWhat: item.soWhat,
          pillar: item.pillar,
          origin: item.origin,
          sessionId: session.id,
          meetingId: meeting.id
        })
      )
    }
    return { session, insights }
  } catch (err) {
    console.error('Content Engine meeting ingest failed (meeting left intact):', err)
    return { session, insights: [] }
  }
}

export async function deleteSessionForMeeting(meetingId: string): Promise<void> {
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM sessions WHERE meeting_id = ?', args: [meetingId] })
}
