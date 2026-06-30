import type { Editor } from '@tiptap/core'

const PLACEHOLDER_MARK = '⟳'

export function insertAudioPlaceholder(editor: Editor): void {
  editor
    .chain()
    .focus()
    .insertContent(`<p><em>${PLACEHOLDER_MARK} Transcribing voice note…</em></p>`)
    .run()
}

export function updateAudioPlaceholder(editor: Editor, label: string): void {
  const range = findPlaceholderRange(editor)
  if (!range) return
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContentAt(range.from, `<p><em>${PLACEHOLDER_MARK} ${label}</em></p>`)
    .run()
}

export function replaceAudioPlaceholder(editor: Editor, html: string | null): void {
  const range = findPlaceholderRange(editor)
  if (!range) {
    if (html) editor.chain().focus().insertContent(html).run()
    return
  }
  const chain = editor.chain().focus().deleteRange(range)
  if (html) chain.insertContentAt(range.from, html)
  chain.run()
}

export function progressLabel(stage: string): string {
  switch (stage) {
    case 'transcribing':
      return 'Transcribing voice note…'
    case 'extracting':
      return 'Extracting insights…'
    case 'inserting':
      return 'Inserting atoms…'
    default:
      return 'Processing…'
  }
}

function findPlaceholderRange(editor: Editor): { from: number; to: number } | null {
  const { doc } = editor.state
  let from = -1
  let to = -1
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return undefined
    if (node.textContent.includes(PLACEHOLDER_MARK)) {
      from = pos
      to = pos + node.nodeSize
      return false
    }
    return undefined
  })
  return from >= 0 ? { from, to } : null
}
