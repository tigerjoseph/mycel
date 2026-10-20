import { readFile, access } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'
import { COACH_CONTEXT_CHAR_BUDGET } from '@shared/coach'

/** Relative to coachContextPath (Personal/context). Order = priority. */
const CONTEXT_FILES: { rel: string; maxChars: number }[] = [
  { rel: 'keeper-phenomena.md', maxChars: 8_000 },
  { rel: 'advisor-brief.md', maxChars: 6_000 },
  { rel: 'types/decisions-open.md', maxChars: 4_000 },
  { rel: 'types/offers.md', maxChars: 4_000 },
  { rel: 'foundational-profile.md', maxChars: 5_000 },
  { rel: 'astrology-chart.md', maxChars: 6_000 },
  { rel: 'framework.md', maxChars: 4_000 },
  { rel: 'types/projects.md', maxChars: 4_000 },
  { rel: 'context-log.md', maxChars: 5_000 }
]

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK)
    return true
  } catch {
    return false
  }
}

function clip(text: string, maxChars: number): string {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}\n…[truncated]`
}

export async function loadCoachContext(contextPath: string): Promise<{
  text: string
  loaded: string[]
  missing: string[]
}> {
  const loaded: string[] = []
  const missing: string[] = []
  const parts: string[] = []
  let used = 0

  for (const file of CONTEXT_FILES) {
    if (used >= COACH_CONTEXT_CHAR_BUDGET) break
    const full = join(contextPath, file.rel)
    if (!(await exists(full))) {
      missing.push(file.rel)
      continue
    }
    try {
      const raw = await readFile(full, 'utf8')
      const room = Math.min(file.maxChars, COACH_CONTEXT_CHAR_BUDGET - used)
      const body = clip(raw, room)
      if (!body) continue
      parts.push(`### ${file.rel}\n${body}`)
      loaded.push(file.rel)
      used += body.length
    } catch {
      missing.push(file.rel)
    }
  }

  return {
    text: parts.join('\n\n'),
    loaded,
    missing
  }
}

export async function contextPathReady(contextPath: string): Promise<boolean> {
  if (!contextPath.trim()) return false
  return exists(contextPath)
}
