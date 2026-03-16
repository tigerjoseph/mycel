import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

function parseContactRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    metadata: JSON.parse((row.metadata as string) || '{}'),
    tags: JSON.parse((row.tags as string) || '[]'),
    lastContactedAt: row.last_contacted_at as number | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

export function registerContactHandlers(): void {
  ipcMain.handle('contacts:getAll', async () => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM contacts ORDER BY updated_at DESC')
    return result.rows.map((row) => parseContactRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('contacts:get', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({ sql: 'SELECT * FROM contacts WHERE id = ?', args: [id] })
    if (result.rows.length === 0) return null
    return parseContactRow(result.rows[0] as unknown as Record<string, unknown>)
  })

  ipcMain.handle('contacts:upsert', async (_e, contact: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (contact.id as string) || nanoid()
    const name = (contact.name as string) || ''
    const metadata = JSON.stringify(contact.metadata || {})
    const tags = JSON.stringify(contact.tags || [])
    const lastContactedAt = (contact.lastContactedAt ?? contact.last_contacted_at ?? null) as number | null
    const createdAt = (contact.createdAt ?? contact.created_at ?? now) as number
    const updatedAt = now

    await db.execute({
      sql: `INSERT OR REPLACE INTO contacts (id, name, metadata, tags, last_contacted_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, metadata, tags, lastContactedAt, createdAt, updatedAt]
    })

    return { id, name, metadata: contact.metadata || {}, tags: contact.tags || [], lastContactedAt, createdAt, updatedAt }
  })

  ipcMain.handle('contacts:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM contacts WHERE id = ?', args: [id] })
  })
}
