import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

export function registerFolderHandlers(): void {
  ipcMain.handle('folders:getAll', async () => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM folders ORDER BY name')
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at as number
    }))
  })

  ipcMain.handle('folders:create', async (_e, name: string) => {
    const db = getDb()
    const id = nanoid()
    const now = Date.now()

    await db.execute({
      sql: 'INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)',
      args: [id, name, now]
    })

    return { id, name, createdAt: now }
  })

  ipcMain.handle('folders:rename', async (_e, id: string, name: string) => {
    const db = getDb()
    await db.execute({
      sql: 'UPDATE folders SET name = ? WHERE id = ?',
      args: [name, id]
    })
  })

  ipcMain.handle('folders:delete', async (_e, id: string) => {
    const db = getDb()
    // Delete all docs in this folder first
    await db.execute({ sql: 'DELETE FROM docs WHERE folder_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM folders WHERE id = ?', args: [id] })
  })
}
