export const INSIGHT_MIN_SENTENCES = 1
export const INSIGHT_MAX_SENTENCES = 3

/** Count sentences in a short insight. A fragment without punctuation counts as one. */
export function countSentences(text: string): number {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 0
  const parts = trimmed.match(/[^.!?…]+[.!?…]*/g)
  if (!parts) return 0
  return parts.filter((part) => part.trim().length > 0).length
}

export function insightTextError(text: string): string | null {
  const count = countSentences(text)
  if (count < INSIGHT_MIN_SENTENCES) return 'Write 1–3 sentences.'
  if (count > INSIGHT_MAX_SENTENCES) return 'Keep it to 3 sentences.'
  return null
}

export const POST_STATUSES = ['draft', 'review', 'scheduled', 'published'] as const
export const CORPUS_THREAD_STATUSES = ['emerging', 'active', 'pinned', 'muted'] as const
export const MEETING_INSIGHT_ORIGINS = ['auto', 'hybrid', 'session'] as const
export const INSIGHT_INTENTS = ['teach', 'entertain', 'discover', 'frame'] as const

export function isMeetingInsightOrigin(origin: string): boolean {
  return (MEETING_INSIGHT_ORIGINS as readonly string[]).includes(origin)
}
