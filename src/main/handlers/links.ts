import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

function parseLinkRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    targetId: row.target_id,
    targetType: row.target_type,
    createdAt: row.created_at
  }
}

export function registerLinkHandlers(): void {
  ipcMain.handle('links:get', async (_e, entityId: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM links WHERE source_id = ? OR target_id = ? ORDER BY created_at DESC',
      args: [entityId, entityId]
    })
    return result.rows.map((row) => parseLinkRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('links:upsert', async (_e, link: Record<string, unknown>) => {
    const db = getDb()
    const id = (link.id as string) || nanoid()
    const sourceId = link.sourceId as string
    const sourceType = link.sourceType as string
    const targetId = link.targetId as string
    const targetType = link.targetType as string
    const createdAt = (link.createdAt ?? link.created_at ?? Date.now()) as number

    const existing = await db.execute({
      sql: `SELECT id FROM links
            WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)`,
      args: [sourceId, targetId, targetId, sourceId]
    })
    if (existing.rows.length > 0) {
      return parseLinkRow(existing.rows[0] as unknown as Record<string, unknown>)
    }

    await db.execute({
      sql: `INSERT INTO links (id, source_id, source_type, target_id, target_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, sourceId, sourceType, targetId, targetType, createdAt]
    })

    return { id, sourceId, sourceType, targetId, targetType, createdAt }
  })

  ipcMain.handle('links:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM links WHERE id = ?', args: [id] })
  })
}
