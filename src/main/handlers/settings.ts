import { app, ipcMain, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { getDb } from '../db'
import { getVoiceImportStatus } from '../engine/readImportFile'
import {
  getAppSettings,
  setAppSettings,
  getTheme,
  setTheme,
  getAppearance,
  setAppearance
} from '../settingsStore'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => getAppSettings())

  ipcMain.handle('settings:set', async (_e, newSettings: Record<string, unknown>) => {
    await setAppSettings(newSettings)
  })

  ipcMain.handle('theme:get', async () => getTheme())

  ipcMain.handle('theme:set', async (_e, theme: string) => {
    await setTheme(theme)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('theme:changed', theme)
    }
  })

  ipcMain.handle('appearance:get', async () => getAppearance())

  ipcMain.handle('appearance:set', async (_e, appearance: string) => {
    await setAppearance(appearance)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('appearance:changed', appearance)
    }
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('app:getDataInfo', async () => {
    const db = getDb()
    const dbPath = join(app.getPath('userData'), 'mycel.db')
    const count = async (table: string): Promise<number> => {
      const r = await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)
      return (r.rows[0]?.n as number) ?? 0
    }
    const [contacts, docs, notes, meetings, projects, todos] = await Promise.all([
      count('contacts'),
      count('docs'),
      count('notes'),
      count('meetings'),
      count('projects'),
      count('todos')
    ])
    return { dbPath, counts: { contacts, docs, notes, meetings, projects, todos } }
  })

  ipcMain.handle('app:openDataFolder', async () => {
    await shell.openPath(app.getPath('userData'))
  })

  ipcMain.handle('app:getVoiceImportStatus', async () => getVoiceImportStatus())
}
