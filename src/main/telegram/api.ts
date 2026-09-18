/** Thin Telegram Bot API client. Main-process only; token never logged. */

export interface TelegramUser {
  id: number
}

export interface TelegramChat {
  id: number
  type: string
}

export interface TelegramVoice {
  file_id: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  text?: string
  caption?: string
  voice?: TelegramVoice
  audio?: TelegramVoice
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

interface TelegramApiResponse<T> {
  ok: boolean
  description?: string
  result?: T
}

async function telegramCall<T>(
  token: string,
  method: string,
  params?: Record<string, string | number>,
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url, { signal })
  const body = (await response.json()) as TelegramApiResponse<T>
  if (!body.ok) {
    throw new Error(body.description || `Telegram ${method} failed`)
  }
  return body.result as T
}

export async function getUpdates(
  token: string,
  offset: number,
  timeoutSec: number,
  signal?: AbortSignal
): Promise<TelegramUpdate[]> {
  const result = await telegramCall<TelegramUpdate[]>(
    token,
    'getUpdates',
    {
      offset,
      timeout: timeoutSec,
      allowed_updates: JSON.stringify(['message'])
    },
    signal
  )
  return Array.isArray(result) ? result : []
}

export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  signal?: AbortSignal
): Promise<{ message_id: number } | null> {
  try {
    return await telegramCall<{ message_id: number }>(
      token,
      'sendMessage',
      { chat_id: chatId, text },
      signal
    )
  } catch (err) {
    console.error('Telegram sendMessage failed')
    throw err
  }
}

export async function downloadTelegramFile(
  token: string,
  fileId: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const file = await telegramCall<{ file_path?: string }>(token, 'getFile', { file_id: fileId }, signal)
  const filePath = file.file_path
  if (!filePath) throw new Error('Telegram file path missing')
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, { signal })
  if (!response.ok) throw new Error('Telegram file download failed')
  return new Uint8Array(await response.arrayBuffer())
}

export function messageFromAllowlistedUser(message: TelegramMessage, userId: string): boolean {
  if (message.chat.type !== 'private') return false
  return String(message.from?.id ?? '') === userId && String(message.chat.id) === userId
}

export function messageText(message: TelegramMessage): string {
  return (message.text || message.caption || '').trim()
}

export function messageVoiceId(message: TelegramMessage): string | null {
  return message.voice?.file_id || message.audio?.file_id || null
}
