import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

function parseDocRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    folderId: row.folder_id as string | null,
    icon: row.icon,
    coverImage: row.cover_image as string | null,
    isTemplate: Boolean(row.is_template),
    isFavorite: Boolean(row.is_favorite),
    favoriteOrder: row.favorite_order as number | null,
    tags: JSON.parse((row.tags as string) || '[]'),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

export function registerDocHandlers(): void {
  ipcMain.handle('docs:getAll', async (_e, folderId?: string) => {
    const db = getDb()
    let result
    if (folderId) {
      result = await db.execute({
        sql: 'SELECT * FROM docs WHERE folder_id = ? ORDER BY updated_at DESC',
        args: [folderId]
      })
    } else {
      result = await db.execute('SELECT * FROM docs ORDER BY updated_at DESC')
    }
    return result.rows.map((row) => parseDocRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('docs:get', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({ sql: 'SELECT * FROM docs WHERE id = ?', args: [id] })
    if (result.rows.length === 0) return null
    return parseDocRow(result.rows[0] as unknown as Record<string, unknown>)
  })

  ipcMain.handle('docs:upsert', async (_e, doc: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (doc.id as string) || nanoid()
    const title = (doc.title as string) || ''
    const body = (doc.body as string) || ''
    const type = (doc.type as string) || 'doc'
    const folderId = (doc.folderId ?? doc.folder_id ?? null) as string | null
    const icon = (doc.icon as string) ?? null
    const coverImage = (doc.coverImage ?? doc.cover_image ?? null) as string | null
    const isTemplate = (doc.isTemplate ?? doc.is_template) ? 1 : 0
    const isFavorite = (doc.isFavorite ?? doc.is_favorite) ? 1 : 0
    const favoriteOrder = (doc.favoriteOrder ?? doc.favorite_order ?? null) as number | null
    const tags = JSON.stringify(doc.tags || [])
    const createdAt = (doc.createdAt ?? doc.created_at ?? now) as number
    const updatedAt = now

    await db.execute({
      sql: `INSERT OR REPLACE INTO docs
            (id, title, body, type, folder_id, icon, cover_image, is_template, is_favorite, favorite_order, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, title, body, type, folderId, icon, coverImage, isTemplate, isFavorite, favoriteOrder, tags, createdAt, updatedAt]
    })

    return {
      id, title, body, type,
      folderId, icon, coverImage,
      isTemplate: Boolean(isTemplate), isFavorite: Boolean(isFavorite),
      favoriteOrder,
      tags: doc.tags || [], createdAt, updatedAt
    }
  })

  ipcMain.handle('docs:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM docs WHERE id = ?', args: [id] })
  })

  ipcMain.handle('docs:getFavorites', async () => {
    const db = getDb()
    const result = await db.execute(
      'SELECT * FROM docs WHERE is_favorite = 1 ORDER BY favorite_order'
    )
    return result.rows.map((row) => parseDocRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('docs:setFavorite', async (_e, id: string, isFavorite: boolean) => {
    const db = getDb()
    await db.execute({
      sql: 'UPDATE docs SET is_favorite = ? WHERE id = ?',
      args: [isFavorite ? 1 : 0, id]
    })
  })

  ipcMain.handle(
    'docs:reorderFavorites',
    async (_e, orderedIds: string[]) => {
      const db = getDb()
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute({
          sql: 'UPDATE docs SET favorite_order = ? WHERE id = ?',
          args: [i, orderedIds[i]]
        })
      }
    }
  )
}
