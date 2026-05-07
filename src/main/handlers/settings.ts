import { app, ipcMain, BrowserWindow } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null

async function getStore(): Promise<any> {
  if (!store) {
    const mod = await import('electron-store')
    const Store = mod.default
    store = new Store({
      name: 'mycel-settings',
      defaults: {
        theme: 'light',
        settings: {}
      }
    })
  }
  return store
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => {
    const s = await getStore()
    return s.get('settings', {})
  })

  ipcMain.handle('settings:set', async (_e, newSettings: Record<string, unknown>) => {
    const s = await getStore()
    const current = (s.get('settings') || {}) as Record<string, unknown>
    s.set('settings', { ...current, ...newSettings })
  })

  ipcMain.handle('theme:get', async () => {
    const s = await getStore()
    return s.get('theme', 'light')
  })

  ipcMain.handle('theme:set', async (_e, theme: string) => {
    const s = await getStore()
    s.set('theme', theme)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('theme:changed', theme)
    }
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())
}
