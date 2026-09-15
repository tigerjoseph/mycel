import { BrowserWindow } from 'electron'
import {
  TELEGRAM_POLL_FOCUSED_SEC,
  TELEGRAM_POLL_IDLE_SEC,
  TELEGRAM_SAVED_REPLY,
  TELEGRAM_VOICE_PLACEHOLDER
} from '@shared/contentEngine'
import {
  getTelegramBotToken,
  getTelegramUserId,
  getTelegramUpdateOffset,
  setTelegramUpdateOffset
} from '../settingsStore'
import { readTranscriptFromFile } from '../engine/readImportFile'
import { ingestDump, removeTempFile, writeTempVoiceFile } from '../engine/ingestDump'
import { answerPrompt, getLatestSentPrompt } from '../engine/prompts'
import { runSynthesis } from '../engine/synthesis'
import {
  downloadTelegramFile,
  getUpdates,
  messageFromAllowlistedUser,
  messageText,
  messageVoiceId,
  sendTelegramMessage,
  type TelegramMessage
} from './api'
import { broadcastTelegramEvent } from './notify'

let stopped = true
let loopPromise: Promise<void> | null = null
let abort: AbortController | null = null
let lastError: string | null = null
let lastOkAt: number | null = null
let errorBackoffMs = 4000

function isAppFocused(): boolean {
  return BrowserWindow.getAllWindows().some((win) => !win.isDestroyed() && win.isFocused())
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

async function transcribeMessage(token: string, message: TelegramMessage): Promise<{
  text: string
  sttFailed: boolean
}> {
  const caption = messageText(message)
  const voiceId = messageVoiceId(message)
  if (!voiceId) return { text: caption, sttFailed: false }

  let voicePath: string | null = null
  try {
    const bytes = await downloadTelegramFile(token, voiceId)
    voicePath = await writeTempVoiceFile(bytes)
    const spoken = (await readTranscriptFromFile(voicePath)).text.trim()
    const text = [caption, spoken].filter(Boolean).join('\n\n').trim()
    return { text, sttFailed: !text }
  } catch (err) {
    console.error('Telegram voice transcription failed:', err)
    return { text: caption, sttFailed: !caption }
  } finally {
    await removeTempFile(voicePath)
  }
}

async function processMessage(token: string, userId: string, message: TelegramMessage): Promise<void> {
  if (!messageFromAllowlistedUser(message, userId)) return

  const telegramMessageId = String(message.message_id)
  const hasVoice = Boolean(messageVoiceId(message))
  const transcribed = await transcribeMessage(token, message)
  const payload = transcribed.text || (transcribed.sttFailed ? TELEGRAM_VOICE_PLACEHOLDER : '')
  if (!payload) return

  const pending = await getLatestSentPrompt()
  if (pending && payload !== TELEGRAM_VOICE_PLACEHOLDER) {
    const answered = await answerPrompt(pending, { text: payload, telegramMessageId })
    broadcastTelegramEvent('telegram:dumpReceived', answered.dump)
    if (answered.prompt.kind === 'synthesis') {
      void runSynthesis().catch((err) => {
        console.error('Content Engine synthesis after prompt failed:', err)
      })
    }
    return
  }

  const result = await ingestDump({
    payload,
    source: 'telegram',
    telegramMessageId,
    metadata: {
      chatId: message.chat.id,
      kind: hasVoice ? 'voice' : 'text',
      sttFailed: transcribed.sttFailed
    }
  })
  if (result.duplicate) return
  try {
    await sendTelegramMessage(token, userId, TELEGRAM_SAVED_REPLY)
  } catch {
    // dump already saved
  }
  broadcastTelegramEvent('telegram:dumpReceived', result.dump)
}

async function runLoop(): Promise<void> {
  while (!stopped) {
    const token = await getTelegramBotToken()
    const userId = await getTelegramUserId()
    if (!token || !userId) {
      await sleep(8000, abort?.signal)
      continue
    }

    const timeout = isAppFocused() ? TELEGRAM_POLL_FOCUSED_SEC : TELEGRAM_POLL_IDLE_SEC
    try {
      const offset = await getTelegramUpdateOffset()
      const updates = await getUpdates(token, offset, timeout, abort?.signal)
      if (stopped) return
      for (const update of updates) {
        if (stopped) return
        try {
          if (update.message) await processMessage(token, userId, update.message)
        } catch (err) {
          console.error('Telegram update failed:', err)
        }
        await setTelegramUpdateOffset(update.update_id + 1)
      }
      lastError = null
      lastOkAt = Date.now()
      errorBackoffMs = 4000
    } catch (err) {
      if (stopped || abort?.signal.aborted) return
      lastError = err instanceof Error ? err.message : 'Telegram poll failed'
      console.error('Telegram poll error')
      await sleep(errorBackoffMs, abort?.signal)
      errorBackoffMs = Math.min(errorBackoffMs * 2, 60_000)
    }
  }
}

export function getTelegramRuntime(): { polling: boolean; lastError: string | null; lastOkAt: number | null } {
  return {
    polling: !stopped && loopPromise !== null,
    lastError,
    lastOkAt
  }
}

export function startTelegramPolling(): void {
  if (loopPromise) return
  stopped = false
  abort = new AbortController()
  loopPromise = runLoop().finally(() => {
    loopPromise = null
  })
}

export async function stopTelegramPolling(): Promise<void> {
  stopped = true
  abort?.abort()
  abort = null
  const running = loopPromise
  if (running) await running.catch(() => {})
}

export async function restartTelegramPolling(): Promise<void> {
  await stopTelegramPolling()
  startTelegramPolling()
}
