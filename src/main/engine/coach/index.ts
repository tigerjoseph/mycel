import { homedir } from 'os'
import { join } from 'path'
import { COACH_HELP_TEXT, isTelegramInboxMode, type TelegramInboxMode } from '@shared/coach'
import { getAppSettings, getGoogleApiKey } from '../../settingsStore'
import { contextPathReady, loadCoachContext } from './context'
import {
  appendPatternNote,
  appendTurns,
  clearHistory,
  loadHistory,
  loadPatterns
} from './memory'
import { generateCoachReply } from './reply'

export function defaultCoachContextPath(): string {
  return join(homedir(), 'Personal', 'context')
}

export async function getTelegramInboxMode(): Promise<TelegramInboxMode> {
  const settings = await getAppSettings()
  if (isTelegramInboxMode(settings.telegramInboxMode)) return settings.telegramInboxMode
  return 'dump'
}

export async function getCoachContextPath(): Promise<string> {
  const settings = await getAppSettings()
  const raw = settings.coachContextPath
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return defaultCoachContextPath()
}

export async function coachReady(): Promise<{
  ready: boolean
  mode: TelegramInboxMode
  hasApiKey: boolean
  contextPath: string
  contextOk: boolean
}> {
  const mode = await getTelegramInboxMode()
  const hasApiKey = Boolean(await getGoogleApiKey())
  const contextPath = await getCoachContextPath()
  const contextOk = await contextPathReady(contextPath)
  return {
    ready: mode === 'coach' ? hasApiKey && contextOk : hasApiKey && contextOk,
    mode,
    hasApiKey,
    contextPath,
    contextOk
  }
}

export type CoachHandleResult =
  | { kind: 'help'; text: string }
  | { kind: 'cleared'; text: string }
  | { kind: 'dump'; text: string }
  | { kind: 'reply'; text: string }
  | { kind: 'error'; text: string }

/** Slash commands that short-circuit the model. Returns null if this is a normal coach turn. */
export function parseCoachCommand(payload: string): CoachHandleResult | { kind: 'chat'; text: string } | null {
  const trimmed = payload.trim()
  if (!trimmed) return null

  if (/^\/help\b/i.test(trimmed) || /^help$/i.test(trimmed)) {
    return { kind: 'help', text: COACH_HELP_TEXT }
  }
  if (/^\/clear\b/i.test(trimmed)) {
    return { kind: 'cleared', text: 'Chat history cleared.' }
  }

  const dumpMatch = trimmed.match(/^\/dump(?:\s+([\s\S]+))?$/i)
  if (dumpMatch) {
    const body = (dumpMatch[1] || '').trim()
    if (!body) return { kind: 'error', text: 'Usage: /dump <text to save to Corpus>' }
    return { kind: 'dump', text: body }
  }

  // Ignore other bot commands so /start etc. don't burn API
  if (trimmed.startsWith('/') && !trimmed.startsWith('/dump')) {
    return { kind: 'help', text: COACH_HELP_TEXT }
  }

  return { kind: 'chat', text: trimmed }
}

export async function runCoachTurn(userText: string): Promise<CoachHandleResult> {
  const parsed = parseCoachCommand(userText)
  if (!parsed) return { kind: 'error', text: 'Empty message.' }

  if (parsed.kind === 'help') return parsed
  if (parsed.kind === 'dump') return parsed
  if (parsed.kind === 'error') return parsed
  if (parsed.kind === 'cleared') {
    await clearHistory()
    return parsed
  }

  const apiKey = await getGoogleApiKey()
  if (!apiKey) {
    return {
      kind: 'error',
      text: 'Coach needs a Google AI key. Add it in Mycel Settings → Google AI.'
    }
  }

  const contextPath = await getCoachContextPath()
  if (!(await contextPathReady(contextPath))) {
    return {
      kind: 'error',
      text: `Coach context folder missing:\n${contextPath}\nSet “Coach context path” in Mycel Settings → Telegram.`
    }
  }

  try {
    const [{ text: contextBlock }, patternsBlock, history] = await Promise.all([
      loadCoachContext(contextPath),
      loadPatterns(),
      loadHistory()
    ])
    const { reply, pattern } = await generateCoachReply({
      apiKey,
      userText: parsed.text,
      history,
      contextBlock,
      patternsBlock
    })
    const finalReply =
      reply ||
      'I blanked. Say that again in one sentence — what is the real challenge for you right now?'
    await appendTurns(parsed.text, finalReply)
    if (pattern) await appendPatternNote(pattern)
    return { kind: 'reply', text: finalReply }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Coach failed'
    return { kind: 'error', text: `Coach error: ${message}` }
  }
}
