import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

export function registerMilestoneHandlers(): void {
  ipcMain.handle('milestones:get', async (_e, projectId: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM milestones WHERE project_id = ? ORDER BY position',
      args: [projectId]
    })
    return result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id as string,
      text: row.text,
      done: Boolean(row.done),
      position: row.position,
      createdAt: row.created_at as number
    }))
  })

  ipcMain.handle('milestones:upsert', async (_e, milestone: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (milestone.id as string) || nanoid()
    const projectId = (milestone.projectId ?? milestone.project_id) as string
    const text = (milestone.text as string) || ''
    const done = (milestone.done ?? false) ? 1 : 0
    const position = (milestone.position as number) || 0
    const createdAt = (milestone.createdAt ?? milestone.created_at ?? now) as number

    await db.execute({
      sql: `INSERT OR REPLACE INTO milestones (id, project_id, text, done, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, projectId, text, done, position, createdAt]
    })

    return { id, projectId, text, done: Boolean(done), position, createdAt }
  })

  ipcMain.handle('milestones:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM milestones WHERE id = ?', args: [id] })
  })
}
