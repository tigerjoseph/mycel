import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { normalizeContentStage } from '../../shared/contentScripts'

function parseRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    body: (row.body as string) || '',
    stage: row.stage,
    position: row.position,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function registerContentScriptHandlers(): void {
  ipcMain.handle('contentScripts:getAll', async () => {
    const db = getDb()
    const result = await db.execute(
      'SELECT * FROM content_scripts ORDER BY stage, position ASC, updated_at DESC'
    )
    return result.rows.map((row) => parseRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('contentScripts:get', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({ sql: 'SELECT * FROM content_scripts WHERE id = ?', args: [id] })
    if (result.rows.length === 0) return null
    return parseRow(result.rows[0] as unknown as Record<string, unknown>)
  })

  ipcMain.handle('contentScripts:upsert', async (_e, script: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (script.id as string) || nanoid()
    const title = (script.title as string) || ''
    let body = (script.body as string) || ''
    const stage = normalizeContentStage((script.stage as string) || 'Pre-production')
    const position = (script.position as number) ?? 0
    const projectId = (script.projectId as string | null) ?? null
    const createdAt = (script.createdAt ?? script.created_at ?? now) as number
    const updatedAt = now

    const incomingEmpty = !body.trim()
    if (incomingEmpty && script.id) {
      const existing = await db.execute({ sql: 'SELECT body FROM content_scripts WHERE id = ?', args: [id] })
      if (existing.rows.length > 0) {
        const stored = (existing.rows[0].body as string) || ''
        if (stored.trim()) body = stored
      }
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO content_scripts
        (id, title, body, stage, position, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, title, body, stage, position, projectId, createdAt, updatedAt]
    })

    return parseRow({
      id,
      title,
      body,
      stage,
      position,
      project_id: projectId,
      created_at: createdAt,
      updated_at: updatedAt
    })
  })

  ipcMain.handle('contentScripts:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM content_scripts WHERE id = ?', args: [id] })
  })
}
