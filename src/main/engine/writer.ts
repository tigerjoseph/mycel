import { GoogleGenAI } from '@google/genai'
import { pickChannel, scrubBannedPhrases } from '@shared/synthesis'
import { INSIGHT_INTENTS } from '@shared/contentEngine'
import type { CorpusInsight, CorpusThread, PostChannel, PostIntent } from '@shared/types'

const PROSE_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']

export interface DraftEvidence {
  thread: CorpusThread
  answers: string[]
}

export interface WrittenDraft {
  title: string
  html: string
  channel: PostChannel
  intent: PostIntent | null
  usedLlm: boolean
}

export interface Writer {
  write(evidence: DraftEvidence): Promise<WrittenDraft | null>
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function majorityIntent(insights: CorpusInsight[]): PostIntent | null {
  const counts = new Map<PostIntent, number>()
  for (const insight of insights) {
    const pillar = (insight.pillar || '').trim().toLowerCase()
    if ((INSIGHT_INTENTS as readonly string[]).includes(pillar)) {
      const intent = pillar as PostIntent
      counts.set(intent, (counts.get(intent) ?? 0) + 1)
    }
  }
  let best: PostIntent | null = null
  let bestN = 0
  for (const [intent, n] of counts) {
    if (n > bestN) {
      best = intent
      bestN = n
    }
  }
  return best
}

function draftTitle(thread: CorpusThread): string {
  const titled = thread.title.replace(/\s+/g, ' ').trim()
  if (titled && titled !== 'Untitled pattern') return titled
  const first = thread.insights[0]?.text.replace(/\s+/g, ' ').trim() || ''
  if (!first) return 'Untitled draft'
  const words = first.split(' ')
  const slice = words.slice(0, 8).join(' ')
  return words.length > 8 ? `${slice}…` : slice
}

function evidenceLines(evidence: DraftEvidence): string[] {
  const lines: string[] = []
  for (const insight of evidence.thread.insights) {
    const text = insight.text.replace(/\s+/g, ' ').trim()
    if (text) lines.push(text)
    const soWhat = (insight.soWhat || '').replace(/\s+/g, ' ').trim()
    if (soWhat && soWhat !== text) lines.push(soWhat)
  }
  for (const answer of evidence.answers) {
    const text = answer.replace(/\s+/g, ' ').trim()
    if (text) lines.push(text)
  }
  return lines
}

function canStitchWithoutInventing(lines: string[]): boolean {
  const joined = lines.join(' ')
  if (joined.length >= 160) return true
  if (lines.length >= 2 && joined.length >= 80) return true
  return false
}

function stitchHtml(title: string, channel: PostChannel, lines: string[]): string {
  const parts: string[] = [`<h1>${escapeHtml(title)}</h1>`]
  if (channel === 'newsletter') {
    const mid = Math.max(1, Math.ceil(lines.length / 2))
    parts.push('<h2>What keeps showing up</h2>')
    for (const line of lines.slice(0, mid)) {
      parts.push(`<p>${escapeHtml(line)}</p>`)
    }
    if (lines.length > mid) {
      parts.push('<h2>Why it matters</h2>')
      for (const line of lines.slice(mid)) {
        parts.push(`<p>${escapeHtml(line)}</p>`)
      }
    }
  } else {
    for (const line of lines) {
      parts.push(`<p>${escapeHtml(line)}</p>`)
    }
  }
  return parts.join('')
}

export class HeuristicWriter implements Writer {
  async write(evidence: DraftEvidence): Promise<WrittenDraft | null> {
    const lines = evidenceLines(evidence)
    if (!canStitchWithoutInventing(lines)) return null
    const channel = pickChannel(evidence.thread.evidenceCount, evidence.thread.sourceDiversity)
    const title = draftTitle(evidence.thread)
    const html = scrubBannedPhrases(stitchHtml(title, channel, lines))
    if (!html.includes('<p>')) return null
    return {
      title,
      html,
      channel,
      intent: majorityIntent(evidence.thread.insights),
      usedLlm: false
    }
  }
}

function parseGeneratedHtml(raw: string): string | null {
  let html = raw.trim()
  if (!html || html.toUpperCase() === 'EMPTY') return null
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '')
  if (!html.includes('<p>') && !html.includes('<h1>')) return null
  return html
}

export class GeminiWriter implements Writer {
  constructor(
    private apiKey: string,
    private fallback: Writer = new HeuristicWriter()
  ) {}

  async write(evidence: DraftEvidence): Promise<WrittenDraft | null> {
    const lines = evidenceLines(evidence)
    if (lines.length === 0) return this.fallback.write(evidence)

    const channel = pickChannel(evidence.thread.evidenceCount, evidence.thread.sourceDiversity)
    const title = draftTitle(evidence.thread)
    const kind = channel === 'newsletter' ? 'newsletter essay' : 'LinkedIn post'
    const bullets = evidence.thread.insights
      .map((insight, i) => {
        const soWhat = (insight.soWhat || '').trim()
        return `${i + 1}. ${insight.text}${soWhat ? `\n   soWhat: ${soWhat}` : ''}`
      })
      .join('\n')
    const answers =
      evidence.answers.length > 0
        ? `\nHuman follow-ups (treat as given so-what / context, do not embellish):\n${evidence.answers.map((a) => `- ${a}`).join('\n')}`
        : ''

    const prompt = `Assemble a near-complete ${kind} from Corpus evidence only.

Rules:
- Keep the author's phrasing and claims. Never invent meaning, anecdotes, metrics, lessons, or a so-what that is not in the evidence.
- Do not turn a meeting recap into a post. Synthesize the thread.
- If the evidence is too thin to write without fabricating, return EMPTY.
- HTML only: <h1>, <h2>, <p>, <ul>, <li>, <strong>, <em>. No markdown fences.
- Default length: LinkedIn is a few tight paragraphs; newsletter may use two short sections.

Suggested title: ${title}

Evidence:
${bullets}
${answers}`

    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    for (const model of PROSE_MODELS) {
      try {
        const response = await ai.models.generateContent({ model, contents: prompt })
        const parsed = parseGeneratedHtml(response.text || '')
        if (!parsed) continue
        const html = scrubBannedPhrases(parsed)
        if (!html.includes('<p>') && !html.includes('<h1>')) continue
        return {
          title,
          html,
          channel,
          intent: majorityIntent(evidence.thread.insights),
          usedLlm: true
        }
      } catch (err) {
        console.error('Content Engine writer failed:', err)
      }
    }

    return this.fallback.write(evidence)
  }
}

export function getWriter(apiKey: string | null): Writer {
  if (apiKey) return new GeminiWriter(apiKey)
  return new HeuristicWriter()
}
