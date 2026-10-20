import { GoogleGenAI } from '@google/genai'
import { COACH_MODELS } from '@shared/coach'
import type { CoachTurn } from './memory'
import { buildCoachSystemPrompt } from './systemPrompt'

function stripPatternsLine(text: string): { reply: string; pattern: string | null } {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n')
  let pattern: string | null = null
  const kept: string[] = []
  for (const line of lines) {
    const match = line.match(/^PATTERNS:\s*(.+)\s*$/i)
    if (match) {
      pattern = match[1].trim()
      continue
    }
    kept.push(line)
  }
  return { reply: kept.join('\n').trim(), pattern }
}

export async function generateCoachReply(input: {
  apiKey: string
  userText: string
  history: CoachTurn[]
  contextBlock: string
  patternsBlock: string
}): Promise<{ reply: string; pattern: string | null }> {
  const systemInstruction = buildCoachSystemPrompt(input.contextBlock, input.patternsBlock)
  const contents = [
    ...input.history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }]
    })),
    { role: 'user' as const, parts: [{ text: input.userText }] }
  ]

  const ai = new GoogleGenAI({ apiKey: input.apiKey })
  let lastError: unknown
  for (const model of COACH_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction
        }
      })
      const raw = (response.text || '').trim()
      if (!raw) continue
      return stripPatternsLine(raw)
    } catch (err) {
      lastError = err
      console.error('Coach Gemini failed:', err)
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Coach model failed'
  throw new Error(message)
}
