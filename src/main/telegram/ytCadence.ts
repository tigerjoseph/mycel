import { YT_CADENCE_CHECK_MS, YT_CADENCE_HOUR, YT_CADENCE_PROMPT_KIND } from '@shared/contentEngine'
import { startOfLocalDay } from '@shared/synthesis'
import { buildYtCadencePrompt } from '../engine/ytCadence'
import { createPrompt } from '../engine/prompts'
import { getAppSettings, getTelegramBotToken, getTelegramUserId, setAppSettings } from '../settingsStore'
import { notifyPromptReady } from './notify'

let timer: ReturnType<typeof setInterval> | null = null

function localDayKey(now = Date.now()): string {
  const d = new Date(now)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function sendYtCadence(options: { force: boolean; now?: number }): Promise<{
  sent: boolean
  reason?: string
  promptId?: string
}> {
  const now = options.now ?? Date.now()
  const settings = await getAppSettings()
  if (!options.force && settings.telegramYtCadenceEnabled === false) {
    return { sent: false, reason: 'disabled' }
  }

  const token = await getTelegramBotToken()
  const userId = await getTelegramUserId()
  if (!token || !userId) return { sent: false, reason: 'telegram_not_configured' }

  if (!options.force) {
    const hour = new Date(now).getHours()
    if (hour < YT_CADENCE_HOUR) return { sent: false, reason: 'before_hour' }
    // Send in the 8 o'clock hour only (catch-up if app opens mid-hour)
    if (hour > YT_CADENCE_HOUR) {
      const lastDay = typeof settings.telegramYtCadenceLastDay === 'string' ? settings.telegramYtCadenceLastDay : ''
      if (lastDay === localDayKey(now)) return { sent: false, reason: 'already_sent' }
      // Missed the 8am window for today — do not spam later
      return { sent: false, reason: 'missed_window' }
    }
    const lastDay = typeof settings.telegramYtCadenceLastDay === 'string' ? settings.telegramYtCadenceLastDay : ''
    if (lastDay === localDayKey(now)) return { sent: false, reason: 'already_sent' }
  }

  const stub = await buildYtCadencePrompt()
  const prompt = await createPrompt({
    text: stub.text,
    relatedInsightId: stub.relatedInsightId,
    kind: YT_CADENCE_PROMPT_KIND
  })
  await notifyPromptReady(prompt.id)
  await setAppSettings({
    telegramYtCadenceLastDay: localDayKey(now),
    telegramYtCadenceLastAt: now
  })
  return { sent: true, promptId: prompt.id }
}

async function maybeSendYtCadence(now = Date.now()): Promise<void> {
  try {
    // Avoid colliding with an open prompt from synthesis/daytime
    const { countOpenPrompts } = await import('../engine/prompts')
    if ((await countOpenPrompts()) > 0) return
    await sendYtCadence({ force: false, now })
  } catch (err) {
    console.error('YT cadence Telegram failed:', err)
  }
}

/** Force-send today's long-form YT yap brief (Settings → Test ping). */
export async function sendYtCadenceTestPing(): Promise<{ ok: true; promptId: string }> {
  const result = await sendYtCadence({ force: true })
  if (!result.sent || !result.promptId) {
    throw new Error(
      result.reason === 'telegram_not_configured'
        ? 'Telegram is disconnected. Add bot token and user id in Settings.'
        : 'Could not send YT cadence ping'
    )
  }
  return { ok: true, promptId: result.promptId }
}

export function startYtCadence(): void {
  if (timer) return
  timer = setInterval(() => {
    void maybeSendYtCadence()
  }, YT_CADENCE_CHECK_MS)
  timer.unref?.()
  // If we launch during the 8am hour, try once
  void maybeSendYtCadence()
}

export function stopYtCadence(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

export function restartYtCadence(): void {
  stopYtCadence()
  startYtCadence()
}

/** Next local 8:00 after `now` (for status copy). */
export function nextYtCadenceAt(now = Date.now()): number {
  const d = new Date(now)
  const next = new Date(d)
  next.setSeconds(0, 0)
  next.setMinutes(0)
  next.setHours(YT_CADENCE_HOUR)
  if (next.getTime() <= now) {
    next.setDate(next.getDate() + 1)
  }
  // If already sent today and still before/at window logic — still show tomorrow 8am
  return next.getTime()
}

export function ytCadenceDayStart(now = Date.now()): number {
  return startOfLocalDay(now)
}
