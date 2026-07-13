import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { loadProjectEnvEarly, loadProjectEnvUserData } from './loadEnv'

loadProjectEnvEarly()

// Dev builds resolve to the same userData folder as the shipped app on case-insensitive
// volumes (mycel ↔ Mycel). Use a separate folder so npm run dev never touches real data.
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'mycel-dev'))
}

import { setApplicationMenu } from './menu'
import { setupContextMenu } from './contextMenu'
import { initDb } from './db'
import { registerHandlers } from './handlers'
import { setupAutoUpdater } from './updater'
import { isGcalConnected } from './gcal/auth'
import { syncCalendarContacts } from './gcal/sync'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 17 },
    backgroundColor: '#F6F3EE',
    vibrancy: undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
      backgroundThrottling: true
    }
  })

  setupContextMenu(mainWindow.webContents)

  mainWindow.on('ready-to-show', () => {
    const session = mainWindow?.webContents.session
    session?.setSpellCheckerEnabled(true)
    const locale = app.getLocale().replace('_', '-')
    session?.setSpellCheckerLanguages(
      locale ? [locale, 'en-US'] : ['en-US']
    )
    mainWindow?.webContents.setZoomFactor(1.18)
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  loadProjectEnvUserData()
  app.setAppUserModelId('com.mycel.app')

  setApplicationMenu()
  await initDb()
  registerHandlers()
  if (await isGcalConnected()) {
    void syncCalendarContacts().catch(() => {})
  }
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Settings opens as in-app modal (works in fullscreen; child windows do not)
ipcMain.handle('settings:openWindow', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('open-settings')
    mainWindow.focus()
  }
})

export { mainWindow }
