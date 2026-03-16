import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

export function registerTodoHandlers(): void {
  ipcMain.handle('todos:get', async () => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM todos ORDER BY position',
      args: []
    })
    return result.rows.map((row) => ({
      id: row.id,
      text: row.text,
      done: Boolean(row.done),
      position: row.position,
      createdAt: row.created_at as number
    }))
  })

  ipcMain.handle('todos:upsert', async (_e, todo: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (todo.id as string) || nanoid()
    const text = (todo.text as string) || ''
    const done = (todo.done ?? false) ? 1 : 0
    const position = (todo.position as number) || 0
    const createdAt = (todo.createdAt ?? todo.created_at ?? now) as number

    await db.execute({
      sql: `INSERT OR REPLACE INTO todos (id, text, done, position, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, text, done, position, createdAt]
    })

    return { id, text, done: Boolean(done), position, createdAt }
  })

  ipcMain.handle('todos:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [id] })
  })
}
