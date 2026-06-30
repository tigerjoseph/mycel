import type { Contact } from '@shared/types'

export function contactFromQuery(query: string): Contact {
  const trimmed = query.trim()
  const now = Date.now()
  if (trimmed.includes('@')) {
    return {
      id: crypto.randomUUID(),
      name: trimmed.split('@')[0] || trimmed,
      metadata: { email: trimmed },
      tags: [],
      lastContactedAt: null,
      createdAt: now,
      updatedAt: now
    }
  }
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    metadata: {},
    tags: [],
    lastContactedAt: null,
    createdAt: now,
    updatedAt: now
  }
}

export function hasExactContactName(contacts: Contact[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return contacts.some((c) => c.name.trim().toLowerCase() === q)
}
