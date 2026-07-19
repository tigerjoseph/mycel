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
    const tx = await db.transaction('write')
    try {
      const docs = await tx.execute({
        sql: 'SELECT * FROM docs WHERE folder_id = ?',
        args: [id]
      })
      const now = Date.now()
      for (const row of docs.rows) {
        await tx.execute({
          sql: `INSERT INTO doc_versions
                (id, doc_id, title, body, type, folder_id, icon, cover_image,
                 is_template, is_favorite, favorite_order, tags, created_at,
                 document_updated_at, saved_at, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            nanoid(), row.id as string, row.title as string, row.body as string,
            row.type as string, row.folder_id as string | null, row.icon as string | null,
            row.cover_image as string | null, row.is_template as number,
            row.is_favorite as number, row.favorite_order as number | null,
            row.tags as string, row.created_at as number, row.updated_at as number,
            now, 'delete'
          ]
        })
      }
      await tx.execute({ sql: 'DELETE FROM docs WHERE folder_id = ?', args: [id] })
      await tx.execute({ sql: 'DELETE FROM folders WHERE id = ?', args: [id] })
      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    } finally {
      tx.close()
    }
  })
}
