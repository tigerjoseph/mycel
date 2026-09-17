import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { saveCorpusInsight } from './saveInsight'
import { ingestDump, parseDumpRow } from './ingestDump'
import { DAYTIME_PROMPT_KIND, insightTextError } from '@shared/contentEngine'
import type { Dump, TelegramPrompt, TelegramPromptStatus } from '@shared/types'

function optionalText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

export function parsePromptRow(row: Record<string, unknown>): TelegramPrompt {
  return {
    id: row.id as string,
    text: (row.text as string) || '',
    relatedInsightId: (row.related_insight_id as string | null) ?? null,
    relatedDraftId: (row.related_draft_id as string | null) ?? null,
    telegramMessageId: (row.telegram_message_id as string | null) ?? null,
    status: ((row.status as string) || 'pending') as TelegramPromptStatus,
    kind: ((row.kind as string) || 'manual').trim() || 'manual',
    answerText: (row.answer_text as string | null) ?? null,
    answerDumpId: (row.answer_dump_id as string | null) ?? null,
    createdAt: row.created_at as number,
    sentAt: (row.sent_at as number | null) ?? null,
    answeredAt: (row.answered_at as number | null) ?? null
  }
}

export async function createPrompt(input: {
  text: string
  relatedInsightId?: string | null
  relatedDraftId?: string | null
  kind?: string | null
}): Promise<TelegramPrompt> {
  const text = input.text.trim()
  if (!text) throw new Error('Prompt text is empty')
  const db = getDb()
  const now = Date.now()
  const id = nanoid()
  const kind = (input.kind || 'manual').trim() || 'manual'
  await db.execute({
    sql: `INSERT INTO telegram_prompts
          (id, text, related_insight_id, related_draft_id, telegram_message_id, status, kind, created_at)
          VALUES (?, ?, ?, ?, NULL, 'pending', ?, ?)`,
    args: [id, text, optionalText(input.relatedInsightId), optionalText(input.relatedDraftId), kind, now]
  })
  return parsePromptRow({
    id,
    text,
    related_insight_id: optionalText(input.relatedInsightId),
    related_draft_id: optionalText(input.relatedDraftId),
    telegram_message_id: null,
    status: 'pending',
    kind,
    answer_text: null,
    answer_dump_id: null,
    created_at: now,
    sent_at: null,
    answered_at: null
  })
}

export async function getPrompt(id: string): Promise<TelegramPrompt | null> {
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM telegram_prompts WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null
  return parsePromptRow(result.rows[0] as unknown as Record<string, unknown>)
}

export async function listPrompts(): Promise<TelegramPrompt[]> {
  const db = getDb()
  const result = await db.execute('SELECT * FROM telegram_prompts ORDER BY created_at DESC')
  return result.rows.map((row) => parsePromptRow(row as unknown as Record<string, unknown>))
}

export async function countPromptsSince(kind: string, since: number): Promise<number> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM telegram_prompts WHERE kind = ? AND created_at >= ?`,
    args: [kind, since]
  })
  return Number(result.rows[0]?.n ?? 0)
}

export async function countOpenPrompts(): Promise<number> {
  const db = getDb()
  const result = await db.execute(
    "SELECT COUNT(*) AS n FROM telegram_prompts WHERE status IN ('pending', 'sent')"
  )
  return Number(result.rows[0]?.n ?? 0)
}

export async function listOpenPromptsByKind(kind: string): Promise<TelegramPrompt[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM telegram_prompts
          WHERE kind = ? AND status IN ('pending', 'sent')
          ORDER BY created_at ASC`,
    args: [kind]
  })
  return result.rows.map((row) => parsePromptRow(row as unknown as Record<string, unknown>))
}

export async function listAnsweredPromptsSince(kind: string, since: number): Promise<TelegramPrompt[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM telegram_prompts
          WHERE kind = ? AND status = 'answered' AND COALESCE(answered_at, 0) >= ?
          ORDER BY answered_at ASC`,
    args: [kind, since]
  })
  return result.rows.map((row) => parsePromptRow(row as unknown as Record<string, unknown>))
}

export async function getLatestSentPrompt(): Promise<TelegramPrompt | null> {
  const db = getDb()
  const result = await db.execute(
    `SELECT * FROM telegram_prompts
     WHERE status = 'sent'
     ORDER BY COALESCE(sent_at, created_at) ASC
     LIMIT 1`
  )
  if (result.rows.length === 0) return null
  return parsePromptRow(result.rows[0] as unknown as Record<string, unknown>)
}

export async function markPromptSent(id: string, telegramMessageId: string | null): Promise<TelegramPrompt | null> {
  const db = getDb()
  const now = Date.now()
  await db.execute({
    sql: `UPDATE telegram_prompts
          SET status = 'sent', telegram_message_id = ?, sent_at = ?
          WHERE id = ? AND status = 'pending'`,
    args: [telegramMessageId, now, id]
  })
  return getPrompt(id)
}

export async function answerPrompt(
  prompt: TelegramPrompt,
  input: { text: string; telegramMessageId?: string | null }
): Promise<{ prompt: TelegramPrompt; dump: Dump }> {
  const text = input.text.trim()
  if (!text) throw new Error('Prompt reply is empty')

  const ingested = await ingestDump({
    payload: text,
    source: 'telegram',
    telegramMessageId: input.telegramMessageId ?? null,
    metadata: { destination: 'prompt', promptId: prompt.id },
    skipExtract: true
  })

  if (prompt.relatedInsightId) {
    const db = getDb()
    const existing = await db.execute({
      sql: 'SELECT so_what FROM corpus_insights WHERE id = ?',
      args: [prompt.relatedInsightId]
    })
    if (existing.rows.length > 0) {
      const previous = optionalText(existing.rows[0]?.so_what)
      const soWhat = previous && previous !== text ? `${previous}\n${text}` : text
      await db.execute({
        sql: 'UPDATE corpus_insights SET so_what = ?, updated_at = ? WHERE id = ?',
        args: [soWhat, Date.now(), prompt.relatedInsightId]
      })
    }
  } else {
    try {
      await saveCorpusInsight({
        text,
        origin: 'dump',
        source: 'telegram',
        dumpId: ingested.dump.id,
        soWhat: text
      })
    } catch {
      // Reply may be longer than 3 sentences; dump is enough.
    }
  }

  if (prompt.kind === DAYTIME_PROMPT_KIND && !insightTextError(text)) {
    await persistStandalonePost(text).catch((err) => {
      console.error('Daytime reply draft failed:', err)
    })
  }

  const db = getDb()
  const now = Date.now()
  await db.execute({
    sql: `UPDATE telegram_prompts
          SET status = 'answered', answer_text = ?, answer_dump_id = ?, answered_at = ?
          WHERE id = ?`,
    args: [text, ingested.dump.id, now, prompt.id]
  })

  const metadata = {
    ...ingested.dump.metadata,
    destination: 'prompt',
    promptId: prompt.id
  }
  await db.execute({
    sql: 'UPDATE dumps SET metadata = ? WHERE id = ?',
    args: [JSON.stringify(metadata), ingested.dump.id]
  })

  const updated = await getPrompt(prompt.id)
  return {
    prompt: updated ?? { ...prompt, status: 'answered', answerText: text, answerDumpId: ingested.dump.id, answeredAt: now },
    dump: parseDumpRow({
      id: ingested.dump.id,
      source: ingested.dump.source,
      payload: ingested.dump.payload,
      metadata: JSON.stringify(metadata),
      telegram_message_id: ingested.dump.telegramMessageId,
      created_at: ingested.dump.createdAt
    })
  }
}

export async function buildStubContextPrompt(): Promise<{ text: string; relatedInsightId: string | null }> {
  return buildDaytimePrompt()
}

export async function buildDaytimePrompt(): Promise<{ text: string; relatedInsightId: string | null }> {
  const db = getDb()
  const insight = await db.execute(
    `SELECT id, text, so_what FROM corpus_insights
     WHERE (duplicate_of IS NULL OR duplicate_of = '')
     ORDER BY created_at DESC
     LIMIT 1`
  )
  const row = insight.rows[0] as { id?: string; text?: string; so_what?: string | null } | undefined
  const insightText = (row?.text || '').replace(/\s+/g, ' ').trim()
  const soWhat = optionalText(row?.so_what)
  if (insightText && !soWhat) {
    const snippet = clip(insightText)
    return {
      text: `“${snippet}” is still mostly story. One line you'd actually post?`,
      relatedInsightId: (row?.id as string) ?? null
    }
  }
  if (insightText) {
    const snippet = clip(insightText)
    return {
      text: `Could “${snippet}” stand alone as a post, or what's the sharper version?`,
      relatedInsightId: (row?.id as string) ?? null
    }
  }

  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000
  const session = await db.execute({
    sql: `SELECT title FROM sessions
          WHERE COALESCE(ended_at, started_at, created_at) >= ?
          ORDER BY COALESCE(ended_at, started_at, created_at) DESC
          LIMIT 1`,
    args: [fourHoursAgo]
  })
  const title = optionalText(session.rows[0]?.title)
  if (title) {
    return {
      text: `You were in “${clip(title, 60)}”. One sentence from that that could stand as a post?`,
      relatedInsightId: null
    }
  }

  return {
    text: 'One concrete line from the last couple hours that could stand as a post — not a recap.',
    relatedInsightId: null
  }
}

function clip(text: string, max = 80): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function persistStandalonePost(text: string): Promise<void> {
  const db = getDb()
  const now = Date.now()
  const id = nanoid()
  const title = clip(text, 72)
  const html = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`
  const postMeta = {
    status: 'draft',
    channel: 'linkedin',
    source: 'telegram'
  }
  await db.execute({
    sql: `INSERT INTO docs
          (id, title, body, type, folder_id, icon, cover_image, is_template,
           is_favorite, favorite_order, tags, post_meta, created_at, updated_at)
          VALUES (?, ?, ?, 'post', NULL, NULL, NULL, 0, 0, NULL, '[]', ?, ?, ?)`,
    args: [id, title, html, JSON.stringify(postMeta), now, now]
  })
}
