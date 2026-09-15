import { app, Menu, BrowserWindow } from 'electron'
import { getCaptureSettings } from './settingsStore'
import { captureSupported } from './observe/frontmost'
import { setCaptureEnabled } from './observe/poller'

async function buildTemplate(): Promise<Electron.MenuItemConstructorOptions[]> {
  let captureEnabled = false
  try {
    captureEnabled = (await getCaptureSettings()).enabled
  } catch {
    // settings store may not be ready
  }
  const mac = captureSupported()

  return [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences…',
          accelerator: 'Cmd+,',
          click: (): void => {
            const win = BrowserWindow.getFocusedWindow()
            if (win) {
              win.webContents.send('open-settings')
            }
          }
        },
        {
          label: mac ? 'Capture' : 'Capture (Mac only)',
          type: 'checkbox',
          checked: captureEnabled && mac,
          enabled: mac,
          click: (item): void => {
            void setCaptureEnabled(item.checked)
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ]
}

export function setApplicationMenu(): void {
  void refreshApplicationMenu()
}

export async function refreshApplicationMenu(): Promise<void> {
  const template = await buildTemplate()
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
