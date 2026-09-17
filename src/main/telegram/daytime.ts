import {
  DAYTIME_CHECK_MS,
  DAYTIME_END_HOUR,
  DAYTIME_MAX_PER_DAY,
  DAYTIME_MIN_GAP_MS,
  DAYTIME_PROMPT_KIND,
  DAYTIME_START_HOUR
} from '@shared/contentEngine'
import { startOfLocalDay } from '@shared/synthesis'
import { getAppSettings, getTelegramBotToken, getTelegramUserId, setAppSettings } from '../settingsStore'
import { buildDaytimePrompt, countOpenPrompts, countPromptsSince, createPrompt } from '../engine/prompts'
import { notifyPromptReady } from './notify'

let timer: ReturnType<typeof setInterval> | null = null
let lastAttemptAt = 0

async function maybeSendDaytimePrompt(now = Date.now()): Promise<void> {
  try {
    const settings = await getAppSettings()
    if (settings.telegramDaytimeEnabled === false) return

    const token = await getTelegramBotToken()
    const userId = await getTelegramUserId()
    if (!token || !userId) return

    const hour = new Date(now).getHours()
    if (hour < DAYTIME_START_HOUR || hour >= DAYTIME_END_HOUR) return

    if (now - lastAttemptAt < 60_000) return
    lastAttemptAt = now

    if ((await countOpenPrompts()) > 0) return

    const sentToday = await countPromptsSince(DAYTIME_PROMPT_KIND, startOfLocalDay(now))
    if (sentToday >= DAYTIME_MAX_PER_DAY) return

    const lastAt = typeof settings.telegramDaytimeLastAt === 'number' ? settings.telegramDaytimeLastAt : 0
    if (lastAt > 0 && now - lastAt < DAYTIME_MIN_GAP_MS) return

    const stub = await buildDaytimePrompt()
    const prompt = await createPrompt({
      text: stub.text,
      relatedInsightId: stub.relatedInsightId,
      kind: DAYTIME_PROMPT_KIND
    })
    await notifyPromptReady(prompt.id)
    await setAppSettings({ telegramDaytimeLastAt: now })
  } catch (err) {
    console.error('Daytime Telegram prompt failed:', err)
  }
}

export function startDaytimePrompts(): void {
  if (timer) return
  timer = setInterval(() => {
    void maybeSendDaytimePrompt()
  }, DAYTIME_CHECK_MS)
  timer.unref?.()
  void maybeSendDaytimePrompt()
}

export function stopDaytimePrompts(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

export function restartDaytimePrompts(): void {
  stopDaytimePrompts()
  startDaytimePrompts()
}
