import { htmlToMarkdown } from './htmlToMarkdown'
import type { Contact, Doc, Link } from '@shared/types'

export interface CursorExportInput {
  doc: Doc
  linkedContacts?: Contact[]
}

export function buildCursorDraft(doc: Doc): string {
  const title = doc.title.trim()
  const body = htmlToMarkdown(doc.body)
  return title ? `# ${title}\n\n${body}`.trim() : body
}

export function buildCursorContext({ doc, linkedContacts = [] }: CursorExportInput): string {
  const updated = new Date(doc.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const lines = [
    '# Mycel → Cursor',
    '',
    `- **Doc:** ${doc.title.trim() || 'Untitled'}`,
    `- **Updated:** ${updated}`,
    doc.tags.length > 0 ? `- **Tags:** ${doc.tags.join(', ')}` : null,
    '',
    '## Linked people',
    linkedContacts.length > 0
      ? linkedContacts.map((c) => `- ${c.name || 'Unnamed'}`).join('\n')
      : '_None_',
    '',
    '## Instructions',
    '',
    'Expand `draft.md` into a polished long-form essay. Keep the author\'s voice,',
    'strengthen structure and transitions, and preserve factual claims.',
    ''
  ].filter((l) => l !== null)

  return lines.join('\n')
}

export function buildCursorClipboardBundle(input: CursorExportInput): string {
  const draft = buildCursorDraft(input.doc)
  const context = buildCursorContext(input)
  return `${context}\n---\n\n${draft}`
}

export async function resolveLinkedContacts(docId: string): Promise<Contact[]> {
  const links = await window.mycel.getLinks(docId)
  const contactIds = new Set<string>()

  for (const link of links as Link[]) {
    if (link.sourceType === 'contact') contactIds.add(link.sourceId)
    if (link.targetType === 'contact') contactIds.add(link.targetId)
  }

  const contacts = await Promise.all(
    [...contactIds].map((id) => window.mycel.getContact(id))
  )
  return contacts.filter((c): c is Contact => c !== null)
}
