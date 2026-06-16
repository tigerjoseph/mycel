/** Decode a few common HTML entities after tag stripping. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Convert stored note HTML to plain text for textarea editors. */
export function noteBodyHtmlToPlain(html: string): string {
  if (!html) return ''

  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')

  text = decodeHtmlEntities(text)
  if (text.endsWith('\n')) text = text.slice(0, -1)
  return text
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Preserve blank lines and consecutive spaces when saving from a textarea. */
export function noteBodyPlainToHtml(text: string): string {
  if (!text) return ''

  return text
    .split('\n')
    .map((line) => {
      if (line === '') return '<p><br></p>'
      const content = escapeHtml(line).replace(/ {2,}/g, (spaces) =>
        '&nbsp;'.repeat(spaces.length)
      )
      return `<p>${content}</p>`
    })
    .join('')
}

export function noteBodyHasContent(body: string): boolean {
  return noteBodyHtmlToPlain(body).trim().length > 0
}
