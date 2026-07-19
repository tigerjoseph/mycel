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

function parseDocVersionRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    versionId: row.id,
    docId: row.doc_id,
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
    updatedAt: row.document_updated_at as number,
    savedAt: row.saved_at as number,
    reason: row.reason as string
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
    const expectedUpdatedAt = (doc.expectedUpdatedAt ?? doc.expected_updated_at) as number | undefined
    const updatedAt = now
    const tx = await db.transaction('write')
    let createdAt = (doc.createdAt ?? doc.created_at ?? now) as number

    try {
      const existingResult = await tx.execute({
        sql: 'SELECT * FROM docs WHERE id = ?',
        args: [id]
      })
      const existing = existingResult.rows[0] as unknown as Record<string, unknown> | undefined

      if (
        existing &&
        expectedUpdatedAt !== undefined &&
        Number(existing.updated_at) !== Number(expectedUpdatedAt)
      ) {
        throw new Error('DOC_SAVE_CONFLICT')
      }

      if (existing) {
        createdAt = existing.created_at as number
        if (existing.title !== title || existing.body !== body) {
          const recentVersion = await tx.execute({
            sql: `SELECT saved_at FROM doc_versions
                  WHERE doc_id = ? AND reason = 'save'
                  ORDER BY saved_at DESC LIMIT 1`,
            args: [id]
          })
          const lastSavedAt = Number(recentVersion.rows[0]?.saved_at ?? 0)
          if (now - lastSavedAt >= 5 * 60 * 1000) {
            await tx.execute({
              sql: `INSERT INTO doc_versions
                    (id, doc_id, title, body, type, folder_id, icon, cover_image,
                     is_template, is_favorite, favorite_order, tags, created_at,
                     document_updated_at, saved_at, reason)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                nanoid(), existing.id as string, existing.title as string, existing.body as string,
                existing.type as string, existing.folder_id as string | null,
                existing.icon as string | null, existing.cover_image as string | null,
                existing.is_template as number, existing.is_favorite as number,
                existing.favorite_order as number | null, existing.tags as string,
                existing.created_at as number, existing.updated_at as number, now, 'save'
              ]
            })
          }
        }
      }

      await tx.execute({
        sql: `INSERT INTO docs
              (id, title, body, type, folder_id, icon, cover_image, is_template,
               is_favorite, favorite_order, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                body = excluded.body,
                type = excluded.type,
                folder_id = excluded.folder_id,
                icon = excluded.icon,
                cover_image = excluded.cover_image,
                is_template = excluded.is_template,
                is_favorite = excluded.is_favorite,
                favorite_order = excluded.favorite_order,
                tags = excluded.tags,
                updated_at = excluded.updated_at`,
        args: [
          id, title, body, type, folderId, icon, coverImage, isTemplate,
          isFavorite, favoriteOrder, tags, createdAt, updatedAt
        ]
      })
      await tx.execute({
        sql: `DELETE FROM doc_versions
              WHERE doc_id = ? AND id NOT IN (
                SELECT id FROM doc_versions
                WHERE doc_id = ?
                ORDER BY saved_at DESC
                LIMIT 100
              )`,
        args: [id, id]
      })
      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    } finally {
      tx.close()
    }

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
    const tx = await db.transaction('write')
    try {
      const result = await tx.execute({ sql: 'SELECT * FROM docs WHERE id = ?', args: [id] })
      const existing = result.rows[0] as unknown as Record<string, unknown> | undefined
      if (existing) {
        const now = Date.now()
        await tx.execute({
          sql: `INSERT INTO doc_versions
                (id, doc_id, title, body, type, folder_id, icon, cover_image,
                 is_template, is_favorite, favorite_order, tags, created_at,
                 document_updated_at, saved_at, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            nanoid(), existing.id as string, existing.title as string, existing.body as string,
            existing.type as string, existing.folder_id as string | null,
            existing.icon as string | null, existing.cover_image as string | null,
            existing.is_template as number, existing.is_favorite as number,
            existing.favorite_order as number | null, existing.tags as string,
            existing.created_at as number, existing.updated_at as number, now, 'delete'
          ]
        })
      }
      await tx.execute({ sql: 'DELETE FROM docs WHERE id = ?', args: [id] })
      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    } finally {
      tx.close()
    }
  })

  ipcMain.handle('docs:getVersions', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT * FROM doc_versions
            WHERE doc_id = ?
            ORDER BY saved_at DESC
            LIMIT 100`,
      args: [id]
    })
    return result.rows.map((row) =>
      parseDocVersionRow(row as unknown as Record<string, unknown>)
    )
  })

  ipcMain.handle('docs:getDeleted', async () => {
    const db = getDb()
    const result = await db.execute(
      `SELECT versions.*
       FROM doc_versions AS versions
       WHERE versions.reason = 'delete'
         AND NOT EXISTS (
           SELECT 1 FROM docs WHERE docs.id = versions.doc_id
         )
         AND versions.saved_at = (
           SELECT MAX(latest.saved_at)
           FROM doc_versions AS latest
           WHERE latest.doc_id = versions.doc_id
             AND latest.reason = 'delete'
         )
       ORDER BY versions.saved_at DESC
       LIMIT 50`
    )
    return result.rows.map((row) =>
      parseDocVersionRow(row as unknown as Record<string, unknown>)
    )
  })

  ipcMain.handle('docs:restoreVersion', async (_e, versionId: string) => {
    const db = getDb()
    const tx = await db.transaction('write')
    try {
      const versionResult = await tx.execute({
        sql: 'SELECT * FROM doc_versions WHERE id = ?',
        args: [versionId]
      })
      const version = versionResult.rows[0] as unknown as Record<string, unknown> | undefined
      if (!version) throw new Error('DOC_VERSION_NOT_FOUND')

      const currentResult = await tx.execute({
        sql: 'SELECT * FROM docs WHERE id = ?',
        args: [version.doc_id as string]
      })
      const current = currentResult.rows[0] as unknown as Record<string, unknown> | undefined
      const now = Date.now()
      if (current) {
        await tx.execute({
          sql: `INSERT INTO doc_versions
                (id, doc_id, title, body, type, folder_id, icon, cover_image,
                 is_template, is_favorite, favorite_order, tags, created_at,
                 document_updated_at, saved_at, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            nanoid(), current.id as string, current.title as string, current.body as string,
            current.type as string, current.folder_id as string | null,
            current.icon as string | null, current.cover_image as string | null,
            current.is_template as number, current.is_favorite as number,
            current.favorite_order as number | null, current.tags as string,
            current.created_at as number, current.updated_at as number, now, 'restore'
          ]
        })
      }

      const restored = await tx.execute({
        sql: `INSERT INTO docs
              (id, title, body, type, folder_id, icon, cover_image, is_template,
               is_favorite, favorite_order, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                body = excluded.body,
                type = excluded.type,
                folder_id = excluded.folder_id,
                icon = excluded.icon,
                cover_image = excluded.cover_image,
                is_template = excluded.is_template,
                is_favorite = excluded.is_favorite,
                favorite_order = excluded.favorite_order,
                tags = excluded.tags,
                updated_at = excluded.updated_at
              RETURNING *`,
        args: [
          version.doc_id as string, version.title as string, version.body as string,
          version.type as string, version.folder_id as string | null,
          version.icon as string | null, version.cover_image as string | null,
          version.is_template as number, version.is_favorite as number,
          version.favorite_order as number | null, version.tags as string,
          version.created_at as number, now
        ]
      })
      await tx.commit()
      return parseDocRow(restored.rows[0] as unknown as Record<string, unknown>)
    } catch (error) {
      await tx.rollback()
      throw error
    } finally {
      tx.close()
    }
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
