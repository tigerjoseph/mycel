import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

function parseNoteRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: JSON.parse((row.tags as string) || '[]'),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

export function registerNoteHandlers(): void {
  ipcMain.handle('notes:getAll', async (_e, filterTags?: string[]) => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM notes ORDER BY created_at DESC')
    let rows = result.rows.map((row) => parseNoteRow(row as unknown as Record<string, unknown>))

    // If filterTags provided, keep only notes that have ALL of the filter tags (AND logic)
    if (filterTags && filterTags.length > 0) {
      rows = rows.filter((note) => {
        const noteTags = note.tags as string[]
        return filterTags.every((tag) => noteTags.includes(tag))
      })
    }

    return rows
  })

  ipcMain.handle('notes:get', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] })
    if (result.rows.length === 0) return null
    return parseNoteRow(result.rows[0] as unknown as Record<string, unknown>)
  })

  ipcMain.handle('notes:upsert', async (_e, note: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (note.id as string) || nanoid()
    const title = (note.title as string) || ''
    const body = (note.body as string) || ''
    const tags = JSON.stringify(note.tags || [])
    const createdAt = (note.createdAt ?? note.created_at ?? now) as number
    const updatedAt = now

    await db.execute({
      sql: `INSERT OR REPLACE INTO notes (id, title, body, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, title, body, tags, createdAt, updatedAt]
    })

    return {
      id, title, body,
      tags: note.tags || [],
      createdAt, updatedAt
    }
  })

  ipcMain.handle('notes:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] })
  })
}
