import { mkdir, readFile, writeFile } from 'fs/promises'
import { COACH_HISTORY_MAX_TURNS } from '@shared/coach'
import { coachDataDir, coachHistoryPath, coachPatternsPath } from './paths'

export type CoachRole = 'user' | 'model'

export interface CoachTurn {
  role: CoachRole
  text: string
  at: number
}

interface HistoryFile {
  turns: CoachTurn[]
}

async function ensureDir(): Promise<void> {
  await mkdir(coachDataDir(), { recursive: true })
}

export async function loadHistory(): Promise<CoachTurn[]> {
  try {
    const raw = await readFile(coachHistoryPath(), 'utf8')
    const parsed = JSON.parse(raw) as HistoryFile
    if (!Array.isArray(parsed.turns)) return []
    return parsed.turns.filter(
      (t) =>
        t &&
        (t.role === 'user' || t.role === 'model') &&
        typeof t.text === 'string' &&
        typeof t.at === 'number'
    )
  } catch {
    return []
  }
}

export async function appendTurns(userText: string, modelText: string): Promise<void> {
  await ensureDir()
  const turns = await loadHistory()
  const now = Date.now()
  turns.push({ role: 'user', text: userText, at: now })
  turns.push({ role: 'model', text: modelText, at: now + 1 })
  const next = turns.slice(-COACH_HISTORY_MAX_TURNS)
  await writeFile(coachHistoryPath(), JSON.stringify({ turns: next }, null, 2), 'utf8')
}

export async function clearHistory(): Promise<void> {
  await ensureDir()
  await writeFile(coachHistoryPath(), JSON.stringify({ turns: [] }, null, 2), 'utf8')
}

export async function loadPatterns(): Promise<string> {
  try {
    return (await readFile(coachPatternsPath(), 'utf8')).trim()
  } catch {
    return ''
  }
}

/** Append a short pattern note when the model emits a PATTERNS: block (optional). */
export async function appendPatternNote(note: string): Promise<void> {
  const trimmed = note.replace(/\s+/g, ' ').trim()
  if (!trimmed) return
  await ensureDir()
  const prev = await loadPatterns()
  const line = `- ${new Date().toISOString().slice(0, 10)} — ${trimmed}`
  const next = prev ? `${prev}\n${line}` : `# Coach patterns\n\n${line}`
  await writeFile(coachPatternsPath(), `${next}\n`, 'utf8')
}
