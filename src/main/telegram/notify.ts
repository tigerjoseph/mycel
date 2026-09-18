import { BrowserWindow } from 'electron'
import { getTelegramBotToken, getTelegramUserId } from '../settingsStore'
import { sendTelegramMessage } from './api'
import {
  createPrompt,
  getPrompt,
  markPromptSent,
  countOpenPrompts,
  buildStubContextPrompt
} from '../engine/prompts'
import type { NotifyDraftReadyInput, TelegramPrompt } from '@shared/types'

function configured(): Promise<{ token: string; userId: string } | null> {
  return Promise.all([getTelegramBotToken(), getTelegramUserId()]).then(([token, userId]) => {
    if (!token || !userId) return null
    return { token, userId }
  })
}

export async function notifyPromptReady(promptId: string): Promise<TelegramPrompt> {
  const prompt = await getPrompt(promptId)
  if (!prompt) throw new Error('Prompt not found')
  if (prompt.status === 'answered') return prompt
  if (prompt.status === 'sent') return prompt

  const creds = await configured()
  if (!creds) {
    throw new Error('Telegram is disconnected. Add a bot token and allowlisted user id in Settings.')
  }

  const sent = await sendTelegramMessage(creds.token, creds.userId, prompt.text)
  const updated = await markPromptSent(prompt.id, sent ? String(sent.message_id) : null)
  return updated ?? prompt
}

export async function notifyDraftReady(input: NotifyDraftReadyInput): Promise<void> {
  const title = (input.title || '').trim() || 'Untitled draft'
  const creds = await configured()
  if (!creds) {
    throw new Error('Telegram is disconnected. Add a bot token and allowlisted user id in Settings.')
  }
  const line = `A draft is ready in Review: ${title}`
  await sendTelegramMessage(creds.token, creds.userId, line)
}

export async function sendTestNotification(): Promise<void> {
  const creds = await configured()
  if (!creds) {
    throw new Error('Telegram is disconnected. Add a bot token and allowlisted user id in Settings.')
  }
  await sendTelegramMessage(
    creds.token,
    creds.userId,
    'Mycel test: notifications work. No reply needed.'
  )
}

export async function requestContextPrompt(input?: {
  text?: string
  relatedInsightId?: string | null
  relatedDraftId?: string | null
}): Promise<{ prompt: TelegramPrompt; sent: boolean; error: string | null }> {
  const stub = input?.text?.trim()
    ? { text: input.text.trim(), relatedInsightId: input.relatedInsightId ?? null }
    : await buildStubContextPrompt()
  const prompt = await createPrompt({
    text: stub.text,
    relatedInsightId: stub.relatedInsightId,
    relatedDraftId: input?.relatedDraftId ?? null
  })
  try {
    const sent = await notifyPromptReady(prompt.id)
    return { prompt: sent, sent: sent.status === 'sent', error: null }
  } catch (err) {
    return {
      prompt,
      sent: false,
      error: err instanceof Error ? err.message : 'Could not send Telegram prompt'
    }
  }
}

export async function getPendingPromptCount(): Promise<number> {
  return countOpenPrompts()
}

export function broadcastTelegramEvent(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
