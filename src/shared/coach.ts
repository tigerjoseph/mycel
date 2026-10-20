/** Telegram inbox: dumps (Corpus) vs Coach (Gemini advisory chat). */
export const TELEGRAM_INBOX_MODES = ['dump', 'coach'] as const
export type TelegramInboxMode = (typeof TELEGRAM_INBOX_MODES)[number]

export function isTelegramInboxMode(value: unknown): value is TelegramInboxMode {
  return typeof value === 'string' && (TELEGRAM_INBOX_MODES as readonly string[]).includes(value)
}

/** Models for coach replies — conversational, not extraction. */
export const COACH_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const

/** Soft cap on Personal context loaded into the system prompt. */
export const COACH_CONTEXT_CHAR_BUDGET = 36_000

/** Keep recent turns for multi-message Telegram threads. */
export const COACH_HISTORY_MAX_TURNS = 24

/** Telegram hard limit is 4096; leave headroom. */
export const TELEGRAM_MESSAGE_MAX_CHARS = 3900

export const COACH_HELP_TEXT = `Coach mode (Mycel).

Plain messages → coaching reply (needs Google AI key + context folder).
/dump <text> — save to Corpus instead
/clear — wipe this chat thread
/help — this message

Mycel must be running. Structure enforcement, not content drafting.`
