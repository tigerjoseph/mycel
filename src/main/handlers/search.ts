import { ipcMain } from 'electron'
import { getDb } from '../db'

interface SearchResult {
  id: string
  type: 'contact' | 'doc' | 'note'
  title: string
  snippet: string
}

export function registerSearchHandlers(): void {
  ipcMain.handle('search:query', async (_e, query: string) => {
    if (!query || !query.trim()) return []

    const db = getDb()
    const pattern = `%${query}%`
    const results: SearchResult[] = []

    // Search contacts by name
    const contacts = await db.execute({
      sql: 'SELECT id, name FROM contacts WHERE name LIKE ?',
      args: [pattern]
    })
    for (const row of contacts.rows) {
      results.push({
        id: row.id as string,
        type: 'contact',
        title: (row.name as string) || '',
        snippet: ''
      })
    }

    // Search docs by title and body
    const docs = await db.execute({
      sql: 'SELECT id, title, body FROM docs WHERE title LIKE ? OR body LIKE ?',
      args: [pattern, pattern]
    })
    for (const row of docs.rows) {
      const body = (row.body as string) || ''
      const idx = body.toLowerCase().indexOf(query.toLowerCase())
      let snippet = ''
      if (idx >= 0) {
        const start = Math.max(0, idx - 40)
        const end = Math.min(body.length, idx + query.length + 40)
        snippet = (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '')
      }
      results.push({
        id: row.id as string,
        type: 'doc',
        title: (row.title as string) || '',
        snippet
      })
    }

    // Search notes by title and body
    const notes = await db.execute({
      sql: 'SELECT id, title, body FROM notes WHERE title LIKE ? OR body LIKE ?',
      args: [pattern, pattern]
    })
    for (const row of notes.rows) {
      const body = (row.body as string) || ''
      const idx = body.toLowerCase().indexOf(query.toLowerCase())
      let snippet = ''
      if (idx >= 0) {
        const start = Math.max(0, idx - 40)
        const end = Math.min(body.length, idx + query.length + 40)
        snippet = (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '')
      }
      results.push({
        id: row.id as string,
        type: 'note',
        title: (row.title as string) || '',
        snippet
      })
    }

    return results
  })
}
