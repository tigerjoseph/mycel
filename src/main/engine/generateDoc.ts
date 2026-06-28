import { GoogleGenAI } from '@google/genai'
import type { Atom, CorpusDocType } from '@shared/types'

const PROSE_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function atomsToDocHtml(atoms: Atom[], title?: string): string {
  const parts: string[] = []
  if (title?.trim()) {
    parts.push(`<h1>${escapeHtml(title.trim())}</h1>`)
  }
  parts.push('<ul>')
  for (const atom of atoms) {
    parts.push(`<li><p>${escapeHtml(atom.text)}</p></li>`)
  }
  parts.push('</ul>')
  return parts.join('')
}

export async function generateProseFromAtoms(
  atoms: Atom[],
  docType: CorpusDocType,
  apiKey: string,
  title?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey })
  const bulletList = atoms.map((a, i) => `${i + 1}. [${a.kind}] ${a.text}`).join('\n')
  const kind = docType === 'newsletter' ? 'newsletter essay' : 'structured outline'

  const prompt = `Turn these thought atoms into a ${kind}. Keep the author's voice and claims.
Use HTML only: <h1>, <h2>, <p>, <ul>, <li>, <strong>, <em>. No markdown fences.

${title ? `Title: ${title}\n` : ''}
Atoms:
${bulletList}`

  let lastError: unknown
  for (const model of PROSE_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      const html = response.text?.trim()
      if (html) return html
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('Prose generation failed')
}
