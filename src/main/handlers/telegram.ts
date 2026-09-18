import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getTelegramBotToken, getTelegramUserId } from '../settingsStore'
import { ingestDump } from '../engine/ingestDump'
import { listPrompts } from '../engine/prompts'
import { getTelegramRuntime, restartTelegramPolling } from '../telegram/poller'
import {
  getPendingPromptCount,
  notifyDraftReady,
  notifyPromptReady,
  requestContextPrompt,
  sendTestNotification
} from '../telegram/notify'
import type { IngestTestDumpInput, NotifyDraftReadyInput, RequestContextInput } from '@shared/types'

export function registerTelegramHandlers(): void {
  ipcMain.handle('telegram:getStatus', async () => {
    const token = await getTelegramBotToken()
    const userId = await getTelegramUserId()
    const runtime = getTelegramRuntime()
    const pendingPromptCount = await getPendingPromptCount()
    const tokenConfigured = Boolean(token)
    const userIdConfigured = Boolean(userId)
    return {
      configured: tokenConfigured && userIdConfigured,
      tokenConfigured,
      userIdConfigured,
      polling: runtime.polling && tokenConfigured && userIdConfigured,
      lastError: runtime.lastError,
      lastOkAt: runtime.lastOkAt,
      pendingPromptCount
    }
  })

  ipcMain.handle('telegram:getPrompts', async () => listPrompts())

  ipcMain.handle('telegram:restart', async () => {
    await restartTelegramPolling()
    return { ok: true }
  })

  ipcMain.handle('telegram:sendTestNotification', async () => {
    await sendTestNotification()
    return { ok: true }
  })

  ipcMain.handle('telegram:notifyPromptReady', async (_e, promptId: string) => {
    if (!promptId) throw new Error('Prompt id is required')
    return notifyPromptReady(promptId)
  })

  ipcMain.handle('telegram:notifyDraftReady', async (_e, input: NotifyDraftReadyInput) => {
    await notifyDraftReady(input ?? { title: 'Untitled draft' })
    return { ok: true }
  })

  ipcMain.handle('telegram:requestContext', async (_e, input?: RequestContextInput) => {
    return requestContextPrompt(input)
  })

  ipcMain.handle('telegram:ingestTestDump', async (_e, input: IngestTestDumpInput) => {
    const text = (input?.text || '').trim()
    if (!text) throw new Error('Dump text is empty')
    const result = await ingestDump({
      payload: text,
      source: 'telegram',
      telegramMessageId: `local:${nanoid()}`,
      metadata: { localTest: true, kind: 'text' }
    })
    return result.dump
  })
}
