import { htmlToMarkdown } from './htmlToMarkdown'

/** Plain-text newsletter body with paragraph breaks Substack paste handles well. */
function htmlToSubstackPlain(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks: string[] = []

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) return
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (['p', 'h1', 'h2', 'h3', 'blockquote', 'li'].includes(tag)) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) blocks.push(text)
      return
    }

    if (tag === 'br') {
      blocks.push('')
      return
    }

    for (const child of el.childNodes) walk(child)
  }

  walk(doc.body)
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Minimal HTML Substack's editor accepts on paste. */
function htmlToSubstackHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: string[] = []

  const blockTags = new Set(['p', 'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol'])

  for (const child of doc.body.children) {
    const tag = child.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      out.push(`<h2>${child.innerHTML}</h2>`)
    } else if (tag === 'p') {
      out.push(`<p>${child.innerHTML}</p>`)
    } else if (tag === 'blockquote') {
      out.push(`<blockquote>${child.innerHTML}</blockquote>`)
    } else if (blockTags.has(tag)) {
      out.push(child.outerHTML)
    }
  }

  return out.join('')
}

export interface SubstackExport {
  plain: string
  html: string
  markdown: string
}

export function formatForSubstack(title: string, bodyHtml: string): SubstackExport {
  const bodyPlain = htmlToSubstackPlain(bodyHtml)
  const bodyMd = htmlToMarkdown(bodyHtml)
  const titleLine = title.trim()

  const plain = titleLine
    ? `${titleLine}\n\n${bodyPlain}`.trim()
    : bodyPlain

  const html = titleLine
    ? `<h1>${escapeHtml(titleLine)}</h1>${htmlToSubstackHtml(bodyHtml)}`
    : htmlToSubstackHtml(bodyHtml)

  const markdown = titleLine
    ? `# ${titleLine}\n\n${bodyMd}`.trim()
    : bodyMd

  return { plain, html, markdown }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function copyForSubstack(title: string, bodyHtml: string): Promise<void> {
  const { plain, html } = formatForSubstack(title, bodyHtml)
  if (typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([plain], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' })
      })
    ])
    return
  }
  await navigator.clipboard.writeText(plain)
}
