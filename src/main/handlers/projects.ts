import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:getAll', async () => {
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT p.*, c.name as contact_name
            FROM projects p
            LEFT JOIN contacts c ON p.contact_id = c.id
            ORDER BY p.updated_at DESC`
    })
    return result.rows.map((row) => ({
      id: row.id,
      contactId: row.contact_id as string,
      contactName: row.contact_name as string || '',
      name: row.name,
      stage: row.stage,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }))
  })

  ipcMain.handle('projects:get', async (_e, contactId: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE contact_id = ? ORDER BY updated_at DESC',
      args: [contactId]
    })
    return result.rows.map((row) => ({
      id: row.id,
      contactId: row.contact_id as string,
      name: row.name,
      stage: row.stage,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }))
  })

  ipcMain.handle('projects:getById', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE id = ?',
      args: [id]
    })
    if (result.rows.length === 0) return null
    const row = result.rows[0]
    return {
      id: row.id,
      contactId: row.contact_id as string,
      name: row.name,
      stage: row.stage,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
  })

  ipcMain.handle('projects:upsert', async (_e, project: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (project.id as string) || nanoid()
    const contactId = (project.contactId ?? project.contact_id) as string
    const name = (project.name as string) || ''
    const stage = (project.stage as string) || 'Lead'
    const createdAt = (project.createdAt ?? project.created_at ?? now) as number
    const updatedAt = now

    await db.execute({
      sql: `INSERT OR REPLACE INTO projects (id, contact_id, name, stage, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, contactId, name, stage, createdAt, updatedAt]
    })

    return { id, contactId, name, stage, createdAt, updatedAt }
  })

  ipcMain.handle('projects:delete', async (_e, id: string) => {
    const db = getDb()
    // Delete associated milestones first
    await db.execute({ sql: 'DELETE FROM milestones WHERE project_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] })
  })
}
