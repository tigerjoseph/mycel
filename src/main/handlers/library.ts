import { app, ipcMain, shell } from 'electron'
import { rm } from 'fs/promises'
import { join } from 'path'
import { getDb } from '../db'
import { parseLibraryRow, saveLibraryItem } from '../library/saveItem'
import { getLibraryToken, LIBRARY_PORT } from '../library/server'
import type { SaveLibraryPayload } from '../library/types'
import { libraryItemDir, enrichLibraryItem } from '../library/paths'

function extensionFolderPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'extension')
    : join(app.getAppPath(), 'extension')
}

function withMediaUrls(item: Record<string, unknown>): Record<string, unknown> {
  return enrichLibraryItem(item)
}

export function registerLibraryHandlers(): void {
  ipcMain.handle('library:getAll', async (_e, filterTags?: string[]) => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM library_items ORDER BY created_at DESC')
    let rows = result.rows.map((row) =>
      withMediaUrls(parseLibraryRow(row as unknown as Record<string, unknown>))
    )

    if (filterTags && filterTags.length > 0) {
      rows = rows.filter((item) => {
        const tags = item.tags as string[]
        return filterTags.every((tag) => tags.includes(tag))
      })
    }

    return rows
  })

  ipcMain.handle('library:get', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({ sql: 'SELECT * FROM library_items WHERE id = ?', args: [id] })
    if (result.rows.length === 0) return null
    return withMediaUrls(parseLibraryRow(result.rows[0] as unknown as Record<string, unknown>))
  })

  ipcMain.handle('library:save', async (_e, payload: SaveLibraryPayload) => {
    return withMediaUrls(await saveLibraryItem(payload))
  })

  ipcMain.handle('library:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM library_items WHERE id = ?', args: [id] })
    await rm(libraryItemDir(id), { recursive: true, force: true })
  })

  ipcMain.handle('library:getExtensionInfo', async () => {
    const token = await getLibraryToken()
    return { port: LIBRARY_PORT, token }
  })

  ipcMain.handle('library:openUrl', async (_e, url: string) => {
    if (url?.trim()) await shell.openExternal(url)
  })

  ipcMain.handle('library:openExtensionFolder', async () => {
    await shell.openPath(extensionFolderPath())
  })
}
