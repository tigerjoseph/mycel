/** Basic HTML → Markdown for TipTap doc export (copy to clipboard). */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return walkNodes(doc.body).trim()
}

function walkNodes(node: Node, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map((n) => walkNodes(n, listDepth)).join('')

  switch (tag) {
    case 'h1': return `# ${children.trim()}\n\n`
    case 'h2': return `## ${children.trim()}\n\n`
    case 'h3': return `### ${children.trim()}\n\n`
    case 'p': return `${children.trim()}\n\n`
    case 'strong':
    case 'b': return `**${children}**`
    case 'em':
    case 'i': return `*${children}*`
    case 'u': return children
    case 's':
    case 'del': return `~~${children}~~`
    case 'code': return el.parentElement?.tagName.toLowerCase() === 'pre' ? children : `\`${children}\``
    case 'pre': return `\`\`\`\n${children.trim()}\n\`\`\`\n\n`
    case 'blockquote': return children.split('\n').filter(Boolean).map((l) => `> ${l}`).join('\n') + '\n\n'
    case 'hr': return '---\n\n'
    case 'br': return '\n'
    case 'a': {
      const href = el.getAttribute('href')
      return href ? `[${children}](${href})` : children
    }
    case 'ul': return renderList(el, false, listDepth) + '\n'
    case 'ol': return renderList(el, true, listDepth) + '\n'
    case 'li': return children
    case 'img': {
      const alt = el.getAttribute('alt') ?? ''
      const src = el.getAttribute('src') ?? ''
      return `![${alt}](${src})`
    }
    default: return children
  }
}

function renderList(el: HTMLElement, ordered: boolean, depth: number): string {
  const indent = '  '.repeat(depth)
  const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li')
  return items.map((li, i) => {
    const prefix = ordered ? `${i + 1}. ` : '- '
    const nested = Array.from(li.children)
      .filter((c) => ['ul', 'ol'].includes(c.tagName.toLowerCase()))
      .map((n) => walkNodes(n, depth + 1))
      .join('')
    const text = Array.from(li.childNodes)
      .filter((n) => n.nodeType !== Node.ELEMENT_NODE || !['ul', 'ol'].includes((n as HTMLElement).tagName.toLowerCase()))
      .map((n) => walkNodes(n, depth))
      .join('')
      .trim()
    return `${indent}${prefix}${text}${nested ? '\n' + nested.trimEnd() : ''}`
  }).join('\n') + '\n'
}
