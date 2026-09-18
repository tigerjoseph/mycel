import { execFile } from 'child_process'
import { promisify } from 'util'
import {
  CAPTURE_CHILD_TIMEOUT_MS,
  CAPTURE_TITLE_MAX,
  MEETING_CAPTURE_APPS,
  type CaptureAppId
} from '@shared/capture'

const execFileAsync = promisify(execFile)

export interface FrontmostSnapshot {
  appName: string
  bundleId: string | null
  windowTitle: string
  urlHost: string | null
  sampledAt: number
}

const BROWSER_NAMES = [
  'google chrome',
  'chrome',
  'chromium',
  'brave browser',
  'brave',
  'safari',
  'microsoft edge',
  'edge',
  'arc',
  'firefox',
  'vivaldi',
  'dia'
]

const BROWSER_SCRIPT_APP: Record<string, string> = {
  'google chrome': 'Google Chrome',
  chrome: 'Google Chrome',
  'brave browser': 'Brave Browser',
  brave: 'Brave Browser',
  safari: 'Safari',
  'microsoft edge': 'Microsoft Edge',
  firefox: 'Firefox'
}

let skipWindowTitleUntil = 0

async function execTimed(file: string, args: string[], timeout = CAPTURE_CHILD_TIMEOUT_MS): Promise<string> {
  const { stdout } = await execFileAsync(file, args, { timeout, maxBuffer: 32 * 1024 })
  return String(stdout || '').trim()
}

function parseLsAppField(blob: string, key: string): string | null {
  const quoted = blob.match(new RegExp(`"${key}"\\s*=\\s*"([^"]*)"`))
  if (quoted?.[1]) return quoted[1]
  const plain = blob.match(new RegExp(`${key}\\s*=\\s*"?([^"\\n]+)"?`))
  return plain?.[1]?.trim() || null
}

function sanitizeTitle(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  if (/(sk-|ghp_|xox[baprs]-|Bearer\s+[A-Za-z0-9]|api[_-]?key)/i.test(trimmed)) return ''
  return trimmed.length > CAPTURE_TITLE_MAX ? `${trimmed.slice(0, CAPTURE_TITLE_MAX - 1)}…` : trimmed
}

function hostFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname) return null
    const path = parsed.pathname.split('/').filter(Boolean)[0] || ''
    return path ? `${parsed.hostname}/${path}` : parsed.hostname
  } catch {
    return null
  }
}

function isBrowserName(name: string): boolean {
  const lower = name.toLowerCase()
  return BROWSER_NAMES.some((item) => lower === item || lower.includes(item))
}

async function darwinAppName(): Promise<{ name: string; bundleId: string | null } | null> {
  try {
    const asn = await execTimed('/usr/bin/lsappinfo', ['front'])
    if (!asn) return null
    const info = await execTimed('/usr/bin/lsappinfo', ['info', '-only', 'name', asn])
    const name = parseLsAppField(info, 'LSDisplayName') || parseLsAppField(info, 'CFBundleName')
    const bundleId = parseLsAppField(info, 'CFBundleIdentifier')
    if (name) return { name, bundleId }
  } catch {
    // fall through
  }
  try {
    const name = await execTimed('/usr/bin/osascript', [
      '-e',
      'tell application "System Events" to get name of first application process whose frontmost is true'
    ])
    if (name) return { name, bundleId: null }
  } catch {
    return null
  }
  return null
}

async function darwinWindowTitle(): Promise<string> {
  if (Date.now() < skipWindowTitleUntil) return ''
  try {
    const title = await execTimed('/usr/bin/osascript', [
      '-e',
      'tell application "System Events" to tell (first application process whose frontmost is true) to if (count of windows) > 0 then get name of window 1 else get ""'
    ])
    return sanitizeTitle(title)
  } catch {
    skipWindowTitleUntil = Date.now() + 10 * 60 * 1000
    return ''
  }
}

async function darwinBrowserUrl(appName: string): Promise<string | null> {
  const key = appName.toLowerCase()
  const scriptApp = BROWSER_SCRIPT_APP[key] || (key.includes('chrome') ? 'Google Chrome' : null)
  if (!scriptApp) return null
  const script =
    scriptApp === 'Safari'
      ? 'tell application "Safari" to if (count of windows) > 0 then get URL of current tab of front window else get ""'
      : scriptApp === 'Firefox'
        ? ''
        : `tell application "${scriptApp}" to if (count of windows) > 0 then get URL of active tab of front window else get ""`
  if (!script) return null
  try {
    const url = await execTimed('/usr/bin/osascript', ['-e', script])
    return url || null
  } catch {
    return null
  }
}

export async function sampleFrontmost(allowlist: CaptureAppId[]): Promise<FrontmostSnapshot | null> {
  if (process.platform !== 'darwin') return null
  const app = await darwinAppName()
  if (!app) return null
  const snapshot: FrontmostSnapshot = {
    appName: app.name,
    bundleId: app.bundleId,
    windowTitle: '',
    urlHost: null,
    sampledAt: Date.now()
  }
  const native = matchCaptureApp(snapshot, allowlist)
  const browser = isBrowserName(app.name)
  const wantBrowser = browser && (allowlist.includes('meet') || allowlist.includes('linkedin'))
  if (!native && !wantBrowser) return snapshot
  if (wantBrowser) {
    const url = await darwinBrowserUrl(app.name)
    snapshot.urlHost = url ? hostFromUrl(url) : null
  }
  snapshot.windowTitle = await darwinWindowTitle()
  return snapshot
}

export function matchCaptureApp(
  snapshot: FrontmostSnapshot,
  allowlist: CaptureAppId[]
): CaptureAppId | null {
  const allowed = new Set(allowlist)
  const name = `${snapshot.appName} ${snapshot.bundleId || ''}`.toLowerCase()
  const title = snapshot.windowTitle.toLowerCase()
  const host = (snapshot.urlHost || '').toLowerCase()

  const native: { id: CaptureAppId; test: () => boolean }[] = [
    { id: 'cursor', test: () => /cursor/.test(name) },
    { id: 'runway', test: () => /runway/.test(name) },
    { id: 'capcut', test: () => /capcut/.test(name) },
    { id: 'finalcut', test: () => /final cut/.test(name) },
    { id: 'premiere', test: () => /premiere/.test(name) },
    { id: 'aftereffects', test: () => /after effects/.test(name) },
    { id: 'resolve', test: () => /davinci|resolve/.test(name) },
    { id: 'zoom', test: () => /(^|\s)zoom(\s|$)|zoom.us|us.zoom/.test(name) },
    { id: 'teams', test: () => /microsoft teams|\.teams|com.microsoft.teams/.test(name) }
  ]
  for (const item of native) {
    if (allowed.has(item.id) && item.test()) return item.id
  }

  const browser = isBrowserName(snapshot.appName)
  if (browser && allowed.has('meet') && (host.includes('meet.google.com') || /\bmeet\b/.test(title))) {
    return 'meet'
  }
  if (browser && allowed.has('linkedin') && (host.includes('linkedin.com') || /linkedin/.test(title))) {
    return 'linkedin'
  }
  return null
}

export function detectCursorAgent(title: string): boolean {
  return /cloud agent/i.test(title) || /cursor agent/i.test(title)
}

export function isMeetingCaptureApp(id: CaptureAppId): boolean {
  return MEETING_CAPTURE_APPS.has(id)
}

export function captureSupported(): boolean {
  return process.platform === 'darwin'
}
