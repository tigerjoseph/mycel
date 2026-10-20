/** Telegram inbox: dumps (Corpus) vs Coach (Gemini advisory chat). */
export const TELEGRAM_INBOX_MODES = ['dump', 'coach'] as const
export type TelegramInboxMode = (typeof TELEGRAM_INBOX_MODES)[number]

export function isTelegramInboxMode(value: unknown): value is TelegramInboxMode {
  return typeof value === 'string' && (TELEGRAM_INBOX_MODES as readonly string[]).includes(value)
}

/**
 * Coach chat is short turns — same cheap path as extract: Gemma first.
 * Avoid Gemini 2.5 (access-limited / weak for new traffic). Modern flash-lite
 * only if Gemma fails.
 */
export const COACH_MODELS = ['gemma-3-12b-it', 'gemini-3.5-flash-lite'] as const

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
