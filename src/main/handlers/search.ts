import { ipcMain } from 'electron'
import { getDb } from '../db'

interface SearchResult {
  id: string
  type: 'contact' | 'doc' | 'note' | 'project' | 'todo' | 'library' | 'atom'
  title: string
  snippet: string
  parentId?: string
}

function snippetAround(haystack: string, query: string): string {
  const idx = haystack.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return ''
  const start = Math.max(0, idx - 40)
  const end = Math.min(haystack.length, idx + query.length + 40)
  return (start > 0 ? '...' : '') + haystack.slice(start, end) + (end < haystack.length ? '...' : '')
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
      results.push({
        id: row.id as string,
        type: 'doc',
        title: (row.title as string) || '',
        snippet: snippetAround(body, query)
      })
    }

    // Search notes by title and body
    const notes = await db.execute({
      sql: 'SELECT id, title, body FROM notes WHERE title LIKE ? OR body LIKE ?',
      args: [pattern, pattern]
    })
    for (const row of notes.rows) {
      const body = (row.body as string) || ''
      results.push({
        id: row.id as string,
        type: 'note',
        title: (row.title as string) || '',
        snippet: snippetAround(body, query)
      })
    }

    // Search projects by name
    const projects = await db.execute({
      sql: 'SELECT id, name FROM projects WHERE name LIKE ?',
      args: [pattern]
    })
    for (const row of projects.rows) {
      results.push({
        id: row.id as string,
        type: 'project',
        title: (row.name as string) || '',
        snippet: ''
      })
    }

    const todos = await db.execute({
      sql: 'SELECT id, text FROM todos WHERE text LIKE ?',
      args: [pattern]
    })
    for (const row of todos.rows) {
      results.push({
        id: row.id as string,
        type: 'todo',
        title: (row.text as string) || '',
        snippet: ''
      })
    }

    // Search Mindspace library items by title, caption, url, tags
    const libraryItems = await db.execute({
      sql: `SELECT id, title, caption, url, tags FROM library_items
            WHERE title LIKE ? OR caption LIKE ? OR url LIKE ? OR tags LIKE ?
            ORDER BY created_at DESC`,
      args: [pattern, pattern, pattern, pattern]
    })
    for (const row of libraryItems.rows) {
      const caption = (row.caption as string) || ''
      const title = (row.title as string)?.trim() || caption.slice(0, 60) || (row.url as string) || 'Untitled'
      results.push({
        id: row.id as string,
        type: 'library',
        title,
        snippet: snippetAround(caption, query)
      })
    }

    // Search Extractions atoms (quotes/insights/actions/frames) by text
    const atoms = await db.execute({
      sql: `SELECT a.id, a.meeting_id, a.text, m.title AS meeting_title FROM atoms a
            LEFT JOIN meetings m ON m.id = a.meeting_id
            WHERE a.text LIKE ?
            ORDER BY a.created_at DESC`,
      args: [pattern]
    })
    for (const row of atoms.rows) {
      const text = (row.text as string) || ''
      results.push({
        id: row.id as string,
        type: 'atom',
        title: text.length > 100 ? `${text.slice(0, 97)}...` : text,
        snippet: (row.meeting_title as string) || '',
        parentId: row.meeting_id as string
      })
    }

    return results
  })
}
