import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

export function registerTouchpointHandlers(): void {
  ipcMain.handle('touchpoints:get', async (_e, contactId: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM touchpoints WHERE contact_id = ? ORDER BY created_at DESC',
      args: [contactId]
    })
    return result.rows.map((row) => ({
      id: row.id,
      contactId: row.contact_id as string,
      medium: row.medium,
      note: row.note,
      createdAt: row.created_at as number
    }))
  })

  ipcMain.handle('touchpoints:log', async (_e, touchpoint: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (touchpoint.id as string) || nanoid()
    const contactId = (touchpoint.contactId ?? touchpoint.contact_id) as string
    const medium = touchpoint.medium as string
    const note = (touchpoint.note as string) || ''
    const createdAt = (touchpoint.createdAt ?? touchpoint.created_at ?? now) as number

    await db.execute({
      sql: 'INSERT INTO touchpoints (id, contact_id, medium, note, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, contactId, medium, note, createdAt]
    })

    // Also update the contact's last_contacted_at
    await db.execute({
      sql: 'UPDATE contacts SET last_contacted_at = ? WHERE id = ?',
      args: [createdAt, contactId]
    })

    return { id, contactId, medium, note, createdAt }
  })
}
