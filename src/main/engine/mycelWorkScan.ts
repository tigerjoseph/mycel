import { getDb } from '../db'
import { getAppSettings, getGoogleApiKey, setAppSettings } from '../settingsStore'
import { getExtractor } from './extractInsights'
import { saveCorpusInsight } from './saveInsight'

const SCAN_INTERVAL_MS = 30 * 60 * 1000
const MAX_ITEMS_PER_TICK = 6
const MIN_BODY_CHARS = 80
const MAX_BODY_CHARS = 12_000

let timer: ReturnType<typeof setInterval> | null = null
let running = false

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

type ScanCursor = Record<string, number>

function readCursors(settings: Record<string, unknown>): ScanCursor {
  const raw = settings.mycelWorkScanCursors
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ScanCursor = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
  }
  return out
}

async function scanDocs(
  cursors: ScanCursor,
  apiKey: string | null,
  budget: number
): Promise<number> {
  if (budget <= 0) return 0
  const db = getDb()
  const result = await db.execute(
    `SELECT id, title, body, updated_at FROM docs
     WHERE type = 'doc'
     ORDER BY updated_at DESC
     LIMIT 40`
  )
  let created = 0
  for (const row of result.rows) {
    if (created >= budget) break
    const id = row.id as string
    const updatedAt = Number(row.updated_at ?? 0)
    const key = `doc:${id}`
    if (cursors[key] && cursors[key] >= updatedAt) continue

    const title = ((row.title as string) || '').trim()
    const body = stripHtml((row.body as string) || '')
    if (body.length < MIN_BODY_CHARS) {
      cursors[key] = updatedAt
      continue
    }

    const blob = `${title ? `Doc: ${title}\n\n` : ''}${body.slice(0, MAX_BODY_CHARS)}`
    let extracted
    try {
      extracted = await getExtractor().extract(blob, { apiKey })
    } catch (err) {
      console.error('[mycel-scan] doc extract failed:', err)
      continue
    }
    if (!extracted || extracted.length === 0) {
      cursors[key] = updatedAt
      continue
    }

    for (const item of extracted.slice(0, 2)) {
      try {
        await saveCorpusInsight({
          text: item.text,
          soWhat: item.soWhat,
          pillar: item.pillar,
          origin: 'auto',
          source: title ? `mycel:doc:${title}` : 'mycel:doc'
        })
        created++
      } catch (err) {
        console.error('[mycel-scan] doc insight save failed:', err)
      }
    }
    cursors[key] = updatedAt
  }
  return created
}

async function scanNotes(
  cursors: ScanCursor,
  apiKey: string | null,
  budget: number
): Promise<number> {
  if (budget <= 0) return 0
  const db = getDb()
  const result = await db.execute(
    `SELECT id, title, body, updated_at FROM notes
     ORDER BY updated_at DESC
     LIMIT 40`
  )
  let created = 0
  for (const row of result.rows) {
    if (created >= budget) break
    const id = row.id as string
    const updatedAt = Number(row.updated_at ?? 0)
    const key = `note:${id}`
    if (cursors[key] && cursors[key] >= updatedAt) continue

    const title = ((row.title as string) || '').trim()
    const body = stripHtml((row.body as string) || '')
    if (body.length < MIN_BODY_CHARS) {
      cursors[key] = updatedAt
      continue
    }

    const blob = `${title ? `Note: ${title}\n\n` : ''}${body.slice(0, MAX_BODY_CHARS)}`
    let extracted
    try {
      extracted = await getExtractor().extract(blob, { apiKey })
    } catch (err) {
      console.error('[mycel-scan] note extract failed:', err)
      continue
    }
    if (!extracted || extracted.length === 0) {
      cursors[key] = updatedAt
      continue
    }

    for (const item of extracted.slice(0, 2)) {
      try {
        await saveCorpusInsight({
          text: item.text,
          soWhat: item.soWhat,
          pillar: item.pillar,
          origin: 'auto',
          source: title ? `mycel:note:${title}` : 'mycel:note'
        })
        created++
      } catch (err) {
        console.error('[mycel-scan] note insight save failed:', err)
      }
    }
    cursors[key] = updatedAt
  }
  return created
}

export async function runMycelWorkScan(): Promise<{ scanned: boolean; created: number }> {
  if (running) return { scanned: false, created: 0 }
  running = true
  try {
    const settings = await getAppSettings()
    if (settings.mycelWorkScanEnabled === false) return { scanned: false, created: 0 }

    const apiKey = await getGoogleApiKey()
    const cursors = readCursors(settings)
    const beforeKeys = Object.keys(cursors).length

    const fromDocs = await scanDocs(cursors, apiKey, MAX_ITEMS_PER_TICK)
    const fromNotes = await scanNotes(
      cursors,
      apiKey,
      Math.max(0, MAX_ITEMS_PER_TICK - fromDocs)
    )

    // Trim cursor map
    const entries = Object.entries(cursors).sort((a, b) => b[1] - a[1])
    const trimmed = Object.fromEntries(entries.slice(0, 300))

    await setAppSettings({
      mycelWorkScanCursors: trimmed,
      mycelWorkScanLastAt: Date.now()
    })

    const created = fromDocs + fromNotes
    if (created > 0 || Object.keys(trimmed).length !== beforeKeys) {
      console.log(`[mycel-scan] created=${created} cursors=${Object.keys(trimmed).length}`)
    }
    return { scanned: true, created }
  } catch (err) {
    console.error('[mycel-scan] failed:', err)
    return { scanned: false, created: 0 }
  } finally {
    running = false
  }
}

export function startMycelWorkScan(): void {
  if (timer) return
  // First pass a few minutes after launch so boot stays light
  setTimeout(() => {
    void runMycelWorkScan()
  }, 3 * 60 * 1000)
  timer = setInterval(() => {
    void runMycelWorkScan()
  }, SCAN_INTERVAL_MS)
}

export function stopMycelWorkScan(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
