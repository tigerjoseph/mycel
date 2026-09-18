import { nanoid } from 'nanoid'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { getDb } from '../db'
import { getGoogleApiKey } from '../settingsStore'
import { getExtractor, type ExtractedCorpusInsight } from './extractInsights'
import { saveCorpusInsight } from './saveInsight'
import { findSimilarThreadId } from './clusterThreads'
import { parseSessionRow } from './ingestMeeting'
import { readTranscriptFromFile } from './readImportFile'
import {
  insightTextError,
  TELEGRAM_RECENT_SESSION_MS,
  TELEGRAM_VOICE_PLACEHOLDER
} from '@shared/contentEngine'
import type { CorpusInsight, Dump, DumpSource, WorkSession } from '@shared/types'

export type DumpDestination = 'inbox' | 'session' | 'thread' | 'prompt'

export interface IngestDumpInput {
  payload: string
  source?: DumpSource
  telegramMessageId?: string | null
  metadata?: Record<string, unknown>
  voicePath?: string | null
  skipExtract?: boolean
}

export interface IngestDumpResult {
  dump: Dump
  duplicate: boolean
  destination: DumpDestination
  insights: CorpusInsight[]
  sttFailed: boolean
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

export function parseDumpRow(row: Record<string, unknown>): Dump {
  const metadata = parseJsonObject(row.metadata)
  const fromColumn = row.telegram_message_id
  const telegramMessageId =
    (typeof fromColumn === 'string' && fromColumn.trim() ? fromColumn.trim() : null) ??
    (typeof metadata.telegramMessageId === 'string' ? metadata.telegramMessageId : null)
  return {
    id: row.id as string,
    source: ((row.source as string) || 'manual') as DumpSource,
    payload: (row.payload as string) || '',
    metadata,
    telegramMessageId,
    createdAt: row.created_at as number
  }
}

function insightCandidate(text: string): string | null {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  if (!insightTextError(trimmed)) return trimmed
  const parts = trimmed.match(/[^.!?…]+[.!?…]*/g) ?? []
  const slice = parts
    .slice(0, 3)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
  if (slice && !insightTextError(slice)) return slice
  return null
}

async function findDumpByTelegramId(telegramMessageId: string): Promise<Dump | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM dumps WHERE telegram_message_id = ? LIMIT 1',
    args: [telegramMessageId]
  })
  if (result.rows.length === 0) return null
  return parseDumpRow(result.rows[0] as unknown as Record<string, unknown>)
}

async function findOverlappingSession(now: number): Promise<WorkSession | null> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM sessions
          WHERE started_at IS NOT NULL AND started_at <= ?
            AND (ended_at IS NULL OR ended_at >= ?)
          ORDER BY CASE WHEN source = 'meeting' OR kind = 'meeting' THEN 0 ELSE 1 END, started_at DESC
          LIMIT 1`,
    args: [now, now]
  })
  if (result.rows.length === 0) return null
  return parseSessionRow(result.rows[0] as unknown as Record<string, unknown>)
}

async function findRecentMeetingSession(now: number): Promise<WorkSession | null> {
  const db = getDb()
  const cutoff = now - TELEGRAM_RECENT_SESSION_MS
  const result = await db.execute({
    sql: `SELECT * FROM sessions
          WHERE (source = 'meeting' OR kind = 'meeting')
            AND COALESCE(ended_at, started_at, created_at) >= ?
          ORDER BY COALESCE(ended_at, started_at, created_at) DESC
          LIMIT 1`,
    args: [cutoff]
  })
  if (result.rows.length === 0) return null
  return parseSessionRow(result.rows[0] as unknown as Record<string, unknown>)
}

export async function resolveDumpAttach(text: string, now = Date.now()): Promise<{
  destination: DumpDestination
  sessionId: string | null
  threadId: string | null
}> {
  const overlapping = await findOverlappingSession(now)
  if (overlapping) {
    return { destination: 'session', sessionId: overlapping.id, threadId: null }
  }
  const recentMeeting = await findRecentMeetingSession(now)
  if (recentMeeting) {
    return { destination: 'session', sessionId: recentMeeting.id, threadId: null }
  }
  const usable = text.trim() && text !== TELEGRAM_VOICE_PLACEHOLDER
  if (usable) {
    try {
      const threadId = await findSimilarThreadId(text)
      if (threadId) return { destination: 'thread', sessionId: null, threadId }
    } catch (err) {
      console.error('Dump thread match failed:', err)
    }
  }
  return { destination: 'inbox', sessionId: null, threadId: null }
}

async function extractInsightsForDump(params: {
  text: string
  dumpId: string
  sessionId: string | null
  threadId: string | null
}): Promise<CorpusInsight[]> {
  const insights: CorpusInsight[] = []
  const apiKey = await getGoogleApiKey()
  let extracted: ExtractedCorpusInsight[] | null = null
  try {
    extracted = await getExtractor().extract(params.text, { apiKey })
  } catch (err) {
    console.error('Dump insight extract failed:', err)
  }

  const texts: { text: string; soWhat: string | null }[] = []
  if (extracted && extracted.length > 0) {
    for (const item of extracted) {
      texts.push({ text: item.text, soWhat: item.soWhat })
    }
  } else {
    const candidate = insightCandidate(params.text)
    if (candidate) texts.push({ text: candidate, soWhat: null })
  }

  for (const item of texts) {
    try {
      insights.push(
        await saveCorpusInsight({
          text: item.text,
          soWhat: item.soWhat,
          source: 'telegram',
          origin: 'dump',
          dumpId: params.dumpId,
          sessionId: params.sessionId,
          threadId: params.threadId,
          provenance: params.sessionId ? { sessionId: params.sessionId } : {}
        })
      )
    } catch (err) {
      console.error('Dump insight save failed:', err)
    }
  }
  return insights
}

export async function ingestDump(input: IngestDumpInput): Promise<IngestDumpResult> {
  const telegramMessageId = input.telegramMessageId?.trim() || null
  if (telegramMessageId) {
    const existing = await findDumpByTelegramId(telegramMessageId)
    if (existing) {
      const destination = (existing.metadata.destination as DumpDestination) || 'inbox'
      return { dump: existing, duplicate: true, destination, insights: [], sttFailed: Boolean(existing.metadata.sttFailed) }
    }
  }

  let payload = (input.payload || '').trim()
  let sttFailed = Boolean(input.metadata?.sttFailed)
  if (input.voicePath) {
    try {
      const transcribed = await readTranscriptFromFile(input.voicePath)
      const spoken = transcribed.text.trim()
      payload = [payload, spoken].filter(Boolean).join('\n\n').trim()
    } catch (err) {
      console.error('Telegram voice transcription failed:', err)
      sttFailed = true
    }
  }
  if (!payload) payload = sttFailed ? TELEGRAM_VOICE_PLACEHOLDER : ''
  if (!payload) throw new Error('Dump payload is empty')

  const now = Date.now()
  const attach = input.skipExtract
    ? { destination: 'inbox' as const, sessionId: null, threadId: null }
    : await resolveDumpAttach(payload, now)

  const db = getDb()
  const id = nanoid()
  const source = input.source ?? 'telegram'
  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    destination: attach.destination,
    sessionId: attach.sessionId,
    threadId: attach.threadId,
    sttFailed
  }
  if (telegramMessageId) metadata.telegramMessageId = telegramMessageId

  await db.execute({
    sql: `INSERT INTO dumps (id, source, payload, metadata, telegram_message_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, source, payload, JSON.stringify(metadata), telegramMessageId, now]
  })

  let insights: CorpusInsight[] = []
  const attached = attach.destination === 'session' || attach.destination === 'thread'
  if (attached && !sttFailed && payload !== TELEGRAM_VOICE_PLACEHOLDER) {
    insights = await extractInsightsForDump({
      text: payload,
      dumpId: id,
      sessionId: attach.sessionId,
      threadId: attach.threadId
    })
    metadata.insightIds = insights.map((row) => row.id)
    await db.execute({
      sql: 'UPDATE dumps SET metadata = ? WHERE id = ?',
      args: [JSON.stringify(metadata), id]
    })
  }

  const dump = parseDumpRow({
    id,
    source,
    payload,
    metadata: JSON.stringify(metadata),
    telegram_message_id: telegramMessageId,
    created_at: now
  })
  return { dump, duplicate: false, destination: attach.destination, insights, sttFailed }
}

export async function writeTempVoiceFile(bytes: Uint8Array, ext = '.ogg'): Promise<string> {
  const path = join(tmpdir(), `mycel-tg-${nanoid()}${ext}`)
  await writeFile(path, Buffer.from(bytes))
  return path
}

export async function removeTempFile(path: string | null | undefined): Promise<void> {
  if (!path) return
  await unlink(path).catch(() => {})
}
