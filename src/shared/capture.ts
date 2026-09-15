export const CAPTURE_APP_IDS = [
  'cursor',
  'runway',
  'linkedin',
  'capcut',
  'finalcut',
  'premiere',
  'aftereffects',
  'resolve',
  'zoom',
  'meet',
  'teams'
] as const

export type CaptureAppId = (typeof CAPTURE_APP_IDS)[number]

export const CAPTURE_APP_LABELS: Record<CaptureAppId, string> = {
  cursor: 'Cursor',
  runway: 'Runway',
  linkedin: 'LinkedIn (browser)',
  capcut: 'CapCut',
  finalcut: 'Final Cut Pro',
  premiere: 'Adobe Premiere',
  aftereffects: 'Adobe After Effects',
  resolve: 'DaVinci Resolve',
  zoom: 'Zoom',
  meet: 'Google Meet (browser)',
  teams: 'Microsoft Teams'
}

/** Slow sampled poll. Intel i9 must not fan from this. */
export const CAPTURE_POLL_MS = 10_000
export const CAPTURE_POLL_IDLE_MS = 15_000
export const CAPTURE_CHILD_TIMEOUT_MS = 2500
export const CAPTURE_SESSION_END_DEBOUNCE_MS = 60_000
export const CAPTURE_MIN_EXTRACT_MS = 45_000
export const CAPTURE_EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const CAPTURE_COMPOST_MS = 30 * 60 * 1000
export const CAPTURE_TITLE_MAX = 160

export const MEETING_CAPTURE_APPS: ReadonlySet<CaptureAppId> = new Set(['zoom', 'meet', 'teams'])

export interface CaptureSettings {
  enabled: boolean
  allowlist: CaptureAppId[]
}

export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  enabled: false,
  allowlist: ['cursor']
}

export function isCaptureAppId(value: string): value is CaptureAppId {
  return (CAPTURE_APP_IDS as readonly string[]).includes(value)
}

export function normalizeAllowlist(value: unknown): CaptureAppId[] {
  if (!Array.isArray(value)) return [...DEFAULT_CAPTURE_SETTINGS.allowlist]
  const next: CaptureAppId[] = []
  for (const item of value) {
    if (typeof item === 'string' && isCaptureAppId(item) && !next.includes(item)) next.push(item)
  }
  return next
}

export function captureIsActive(settings: CaptureSettings): boolean {
  return settings.enabled && settings.allowlist.length > 0
}
