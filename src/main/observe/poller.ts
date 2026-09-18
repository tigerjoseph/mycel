import { BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getCaptureSettings, setCaptureSettings } from '../settingsStore'
import {
  CAPTURE_APP_LABELS,
  CAPTURE_COMPOST_MS,
  CAPTURE_EVENT_TTL_MS,
  CAPTURE_POLL_IDLE_MS,
  CAPTURE_POLL_MS,
  CAPTURE_SESSION_END_DEBOUNCE_MS,
  captureIsActive,
  type CaptureAppId,
  type CaptureSettings
} from '@shared/capture'
import {
  captureSupported,
  detectCursorAgent,
  isMeetingCaptureApp,
  matchCaptureApp,
  sampleFrontmost
} from './frontmost'
import { compostActivityEvents } from './compost'
import { extractOnSessionEnd } from './extractSession'
import type { CaptureStatus } from '@shared/types'

type OpenSession = {
  sessionId: string
  appId: CaptureAppId
  title: string
  lastSeenAt: number
  lastTitle: string
  lastEventAt: number
}

let stopped = true
let loopPromise: Promise<void> | null = null
let endTimer: ReturnType<typeof setTimeout> | null = null
let compostTimer: ReturnType<typeof setInterval> | null = null
let current: OpenSession | null = null
let lastError: string | null = null
let lastAppName: string | null = null
let lastMatchedId: CaptureAppId | null = null

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAppFocused(): boolean {
  return BrowserWindow.getAllWindows().some((win) => !win.isDestroyed() && win.isFocused())
}

async function writeEvent(kind: string, payload: Record<string, unknown>): Promise<void> {
  const db = getDb()
  const now = Date.now()
  await db.execute({
    sql: `INSERT INTO activity_events (id, kind, payload, captured_at, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [nanoid(), kind, JSON.stringify(payload), now, now + CAPTURE_EVENT_TTL_MS, now]
  })
}

async function startSession(appId: CaptureAppId, snapshotTitle: string, appName: string): Promise<void> {
  const db = getDb()
  const now = Date.now()
  const id = nanoid()
  const agent = detectCursorAgent(snapshotTitle)
  const title = agent
    ? `${CAPTURE_APP_LABELS[appId]} — Cloud Agent`
    : snapshotTitle
      ? `${CAPTURE_APP_LABELS[appId]} — ${snapshotTitle}`
      : CAPTURE_APP_LABELS[appId]
  const kind = isMeetingCaptureApp(appId) ? 'meeting' : 'work'
  await db.execute({
    sql: `INSERT INTO sessions
          (id, title, kind, source, meeting_id, transcript_ref, contact_id, project_id,
           started_at, ended_at, created_at, updated_at)
          VALUES (?, ?, ?, 'observer', NULL, ?, NULL, NULL, ?, NULL, ?, ?)`,
    args: [id, title.slice(0, 180), kind, `observer:${appId}`, now, now, now]
  })
  current = {
    sessionId: id,
    appId,
    title,
    lastSeenAt: now,
    lastTitle: snapshotTitle,
    lastEventAt: now
  }
  await writeEvent('capture_start', {
    sessionId: id,
    appId,
    appName,
    title: snapshotTitle,
    cursorAgent: agent
  })
  broadcast('capture:changed', getCaptureRuntime())
}

async function endSession(reason: string): Promise<void> {
  if (!current) return
  const ending = current
  current = null
  const db = getDb()
  const now = Date.now()
  await db.execute({
    sql: 'UPDATE sessions SET ended_at = ?, updated_at = ? WHERE id = ? AND ended_at IS NULL',
    args: [now, now, ending.sessionId]
  })
  await writeEvent('capture_end', {
    sessionId: ending.sessionId,
    appId: ending.appId,
    reason
  })
  broadcast('capture:changed', getCaptureRuntime())
  void extractOnSessionEnd(ending.sessionId, ending.appId).catch((err) => {
    console.error('Capture extract failed:', err)
  })
}

function scheduleEnd(reason: string): void {
  if (!current || endTimer) return
  endTimer = setTimeout(() => {
    endTimer = null
    void endSession(reason).catch((err) => {
      console.error('Capture session end failed:', err)
    })
  }, CAPTURE_SESSION_END_DEBOUNCE_MS)
}

function cancelScheduledEnd(): void {
  if (!endTimer) return
  clearTimeout(endTimer)
  endTimer = null
}

async function onMatch(appId: CaptureAppId, snapshot: { appName: string; windowTitle: string }): Promise<void> {
  cancelScheduledEnd()
  lastMatchedId = appId
  const now = Date.now()
  if (current && current.appId !== appId) {
    await endSession('switch')
  }
  if (!current) {
    await startSession(appId, snapshot.windowTitle, snapshot.appName)
    return
  }
  current.lastSeenAt = now
  const titleChanged = snapshot.windowTitle && snapshot.windowTitle !== current.lastTitle
  const quiet = now - current.lastEventAt > 2 * 60 * 1000
  if (titleChanged || (detectCursorAgent(snapshot.windowTitle) && quiet)) {
    current.lastTitle = snapshot.windowTitle
    current.lastEventAt = now
    await writeEvent('capture_title', {
      sessionId: current.sessionId,
      appId,
      appName: snapshot.appName,
      title: snapshot.windowTitle,
      cursorAgent: detectCursorAgent(snapshot.windowTitle)
    })
  }
}

async function tick(settings: CaptureSettings): Promise<void> {
  const snapshot = await sampleFrontmost(settings.allowlist)
  lastAppName = snapshot?.appName ?? null
  if (!snapshot) {
    lastMatchedId = null
    scheduleEnd('no_frontmost')
    return
  }
  const matched = matchCaptureApp(snapshot, settings.allowlist)
  if (!matched) {
    lastMatchedId = null
    scheduleEnd('away')
    return
  }
  await onMatch(matched, snapshot)
}

async function runLoop(): Promise<void> {
  while (!stopped) {
    const settings = await getCaptureSettings()
    if (!captureSupported() || !captureIsActive(settings)) {
      await sleep(5000)
      continue
    }
    try {
      await tick(settings)
      lastError = null
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Capture poll failed'
      console.error('Capture poll failed')
    }
    const wait = isAppFocused() ? CAPTURE_POLL_MS : CAPTURE_POLL_IDLE_MS
    await sleep(wait)
  }
}

export function getCaptureRuntime(): CaptureStatus {
  const running = !stopped && loopPromise !== null && captureSupported()
  return {
    enabled: false,
    running,
    supported: captureSupported(),
    allowlist: [],
    lastAppName,
    lastMatchedId,
    currentSessionId: current?.sessionId ?? null,
    currentSessionTitle: current?.title ?? null,
    lastError
  }
}

export async function getCaptureStatus(): Promise<CaptureStatus> {
  const settings = await getCaptureSettings()
  const runtime = getCaptureRuntime()
  return {
    ...runtime,
    enabled: settings.enabled,
    running: runtime.running && captureIsActive(settings),
    allowlist: settings.allowlist
  }
}

function startCompost(): void {
  if (compostTimer) return
  void compostActivityEvents().catch(() => {})
  compostTimer = setInterval(() => {
    void compostActivityEvents().catch(() => {})
  }, CAPTURE_COMPOST_MS)
  compostTimer.unref?.()
}

function stopCompost(): void {
  if (!compostTimer) return
  clearInterval(compostTimer)
  compostTimer = null
}

export function startCaptureObserver(): void {
  void compostActivityEvents().catch(() => {})
  void getCaptureSettings().then((settings) => {
    if (!captureSupported() || !captureIsActive(settings)) return
    if (loopPromise) return
    stopped = false
    startCompost()
    loopPromise = runLoop().finally(() => {
      loopPromise = null
    })
  })
}

export async function stopCaptureObserver(opts?: { endSession?: boolean }): Promise<void> {
  stopped = true
  cancelScheduledEnd()
  stopCompost()
  if (opts?.endSession && current) {
    await endSession('stop').catch(() => {})
  }
  const running = loopPromise
  if (running) await running.catch(() => {})
}

export async function restartCaptureObserver(): Promise<void> {
  const settings = await getCaptureSettings()
  if (!captureIsActive(settings) || !captureSupported()) {
    await stopCaptureObserver({ endSession: true })
    void compostActivityEvents().catch(() => {})
    void import('../menu').then((mod) => mod.refreshApplicationMenu()).catch(() => {})
    broadcast('capture:changed', await getCaptureStatus())
    return
  }
  if (!loopPromise) {
    stopped = false
    startCompost()
    loopPromise = runLoop().finally(() => {
      loopPromise = null
    })
  }
  void import('../menu').then((mod) => mod.refreshApplicationMenu()).catch(() => {})
  broadcast('capture:changed', await getCaptureStatus())
}

export async function setCaptureEnabled(enabled: boolean): Promise<CaptureSettings> {
  const current = await getCaptureSettings()
  const next = await setCaptureSettings({
    enabled,
    allowlist: current.allowlist.length > 0 ? current.allowlist : ['cursor']
  })
  await restartCaptureObserver()
  return next
}
