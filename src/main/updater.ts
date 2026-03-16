import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

export function setupAutoUpdater(): void {
  ipcMain.handle('updates:install', () => {
    autoUpdater.quitAndInstall()
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
