import { app } from 'electron'
import { join } from 'path'

export function coachDataDir(): string {
  return join(app.getPath('userData'), 'coach')
}

export function coachHistoryPath(): string {
  return join(coachDataDir(), 'history.json')
}

export function coachPatternsPath(): string {
  return join(coachDataDir(), 'patterns.md')
}
