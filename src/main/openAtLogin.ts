import { app } from 'electron'
import { getAppSettings } from './settingsStore'

export function openAtLoginEnabled(settings: Record<string, unknown>): boolean {
  return settings.openAtLogin !== false
}

export async function applyOpenAtLogin(): Promise<void> {
  if (process.platform !== 'darwin') return
  if (!app.isPackaged) return
  const settings = await getAppSettings()
  app.setLoginItemSettings({
    openAtLogin: openAtLoginEnabled(settings),
    openAsHidden: false
  })
}
