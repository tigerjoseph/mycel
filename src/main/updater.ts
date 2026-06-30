import { autoUpdater } from 'electron-updater'
import { app, BrowserWindow, ipcMain } from 'electron'

export function setupAutoUpdater(): void {
  ipcMain.handle('updates:install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) return { status: 'dev' as const }
    try {
      const result = await autoUpdater.checkForUpdates()
      const latest = result?.updateInfo?.version
      if (latest && latest !== app.getVersion()) {
        return { status: 'available' as const, version: latest }
      }
      return { status: 'current' as const }
    } catch {
      return { status: 'error' as const }
    }
  })

  // Only check for updates in packaged app
  if (process.env.NODE_ENV === 'development') return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.send('update-available')
    }
  })

  autoUpdater.on('update-downloaded', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.send('update-downloaded')
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })

  // Check for updates every 4 hours
  autoUpdater.checkForUpdates()
  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 4 * 60 * 60 * 1000)
}
