import { ipcMain } from 'electron'
import { getDb } from '../db'

interface TagCount {
  tag: string
  count: number
}

interface TagEntity {
  id: string
  type: 'contact' | 'doc' | 'note'
  name: string
}

export function registerTagHandlers(): void {
  ipcMain.handle('tags:getAll', async () => {
    const db = getDb()
    const tagMap = new Map<string, number>()

    // Collect tags from contacts
    const contacts = await db.execute('SELECT tags FROM contacts')
    for (const row of contacts.rows) {
      const tags: string[] = JSON.parse((row.tags as string) || '[]')
      for (const tag of tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      }
    }

    // Collect tags from docs
    const docs = await db.execute('SELECT tags FROM docs')
    for (const row of docs.rows) {
      const tags: string[] = JSON.parse((row.tags as string) || '[]')
      for (const tag of tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      }
    }

    // Collect tags from notes
    const notes = await db.execute('SELECT tags FROM notes')
    for (const row of notes.rows) {
      const tags: string[] = JSON.parse((row.tags as string) || '[]')
      for (const tag of tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      }
    }

    const result: TagCount[] = []
    for (const [tag, count] of tagMap) {
      result.push({ tag, count })
    }
    return result.sort((a, b) => b.count - a.count)
  })

  ipcMain.handle('tags:getEntities', async (_e, tag: string) => {
    const db = getDb()
    const entities: TagEntity[] = []

    // Search contacts
    const contacts = await db.execute('SELECT id, name, tags FROM contacts')
    for (const row of contacts.rows) {
      const tags: string[] = JSON.parse((row.tags as string) || '[]')
      if (tags.includes(tag)) {
        entities.push({ id: row.id as string, type: 'contact', name: (row.name as string) || '' })
      }
    }

    // Search docs
    const docs = await db.execute('SELECT id, title, tags FROM docs')
    for (const row of docs.rows) {
      const tags: string[] = JSON.parse((row.tags as string) || '[]')
      if (tags.includes(tag)) {
        entities.push({ id: row.id as string, type: 'doc', name: (row.title as string) || '' })
      }
    }

    // Search notes
    const notes = await db.execute('SELECT id, title, tags FROM notes')
    for (const row of notes.rows) {
      const tags: string[] = JSON.parse((row.tags as string) || '[]')
      if (tags.includes(tag)) {
        entities.push({ id: row.id as string, type: 'note', name: (row.title as string) || '' })
      }
    }

    return entities
  })
}
