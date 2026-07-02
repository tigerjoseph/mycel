import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

function parseEnvFile(path: string): void {
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function loadEnvIfPresent(path: string): boolean {
  if (!existsSync(path)) return false
  try {
    parseEnvFile(path)
    return true
  } catch {
    return false
  }
}

/** Safe before app.ready — project .env only. */
export function loadProjectEnvEarly(): void {
  loadEnvIfPresent(join(process.cwd(), '.env'))
}

/** After app.ready — also checks userData .env (for shipped app). */
export function loadProjectEnvUserData(): void {
  loadEnvIfPresent(join(app.getPath('userData'), '.env'))
  try {
    loadEnvIfPresent(join(app.getAppPath(), '.env'))
  } catch {
    // ignore when app path unavailable
  }
}

export function getGoogleOAuthClientSecret(): string | null {
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  return secret || null
}
