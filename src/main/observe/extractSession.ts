import { getDb } from '../db'
import { getGoogleApiKey } from '../settingsStore'
import { extractCorpusInsights } from '../engine/extractInsights'
import { saveCorpusInsight } from '../engine/saveInsight'
import { CAPTURE_MIN_EXTRACT_MS } from '@shared/capture'
import type { CaptureAppId } from '@shared/capture'

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

export async function extractOnSessionEnd(sessionId: string, appId: CaptureAppId): Promise<void> {
  const db = getDb()
  const session = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [sessionId] })
  if (session.rows.length === 0) return
  const row = session.rows[0] as unknown as Record<string, unknown>
  const startedAt = Number(row.started_at ?? 0)
  const endedAt = Number(row.ended_at ?? Date.now())
  if (!startedAt || endedAt - startedAt < CAPTURE_MIN_EXTRACT_MS) return

  const events = await db.execute({
    sql: `SELECT payload FROM activity_events
          WHERE json_extract(payload, '$.sessionId') = ?
          ORDER BY captured_at ASC
          LIMIT 40`,
    args: [sessionId]
  })
  const titles: string[] = []
  let cursorAgent = false
  for (const event of events.rows) {
    const payload = parseJsonObject(event.payload)
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (title && !titles.includes(title)) titles.push(title)
    if (payload.cursorAgent === true) cursorAgent = true
  }

  const lines = [
    `Work session in ${appId}.`,
    cursorAgent ? 'Cursor Cloud Agent UI was visible (title signal only).' : '',
    titles.length > 0 ? `Window titles: ${titles.slice(0, 8).join('; ')}.` : ''
  ].filter(Boolean)
  const blob = lines.join(' ')
  if (blob.length < 40) return

  const apiKey = await getGoogleApiKey()
  let extracted: Awaited<ReturnType<typeof extractCorpusInsights>> = null
  try {
    extracted = await extractCorpusInsights(blob, { apiKey })
  } catch (err) {
    console.error('Capture session extract failed:', err)
  }
  if (!extracted || extracted.length === 0) return

  for (const item of extracted) {
    try {
      await saveCorpusInsight({
        text: item.text,
        soWhat: item.soWhat,
        pillar: item.pillar,
        origin: 'session',
        source: appId,
        sessionId,
        provenance: { sessionId }
      })
    } catch (err) {
      console.error('Capture insight save failed:', err)
    }
  }
}
