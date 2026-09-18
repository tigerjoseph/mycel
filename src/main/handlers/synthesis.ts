import { ipcMain } from 'electron'
import { getSynthesisStatus, runSynthesis } from '../engine/synthesis'

export function registerSynthesisHandlers(): void {
  ipcMain.handle('synthesis:run', async () => runSynthesis())
  ipcMain.handle('synthesis:getStatus', async () => getSynthesisStatus())
}
