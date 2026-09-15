import { ipcMain } from 'electron'
import { getCaptureSettings, setCaptureSettings } from '../settingsStore'
import {
  getCaptureStatus,
  restartCaptureObserver,
  setCaptureEnabled
} from '../observe/poller'
import { normalizeAllowlist } from '@shared/capture'
import type { CaptureAppId } from '@shared/capture'

export function registerCaptureHandlers(): void {
  ipcMain.handle('capture:getStatus', async () => getCaptureStatus())

  ipcMain.handle('capture:getSettings', async () => getCaptureSettings())

  ipcMain.handle(
    'capture:setSettings',
    async (_e, patch: { enabled?: boolean; allowlist?: CaptureAppId[] }) => {
      const next = await setCaptureSettings({
        enabled: patch?.enabled,
        allowlist: patch?.allowlist ? normalizeAllowlist(patch.allowlist) : undefined
      })
      await restartCaptureObserver()
      return next
    }
  )

  ipcMain.handle('capture:setEnabled', async (_e, enabled: boolean) => {
    return setCaptureEnabled(Boolean(enabled))
  })
}
