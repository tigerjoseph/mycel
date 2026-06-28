import { ipcMain } from 'electron'
import { registerContactHandlers } from './contacts'
import { registerFolderHandlers } from './folders'
import { registerDocHandlers } from './docs'
import { registerNoteHandlers } from './notes'
import { registerTagHandlers } from './tags'
import { registerSearchHandlers } from './search'
import { registerTouchpointHandlers } from './touchpoints'
import { registerProjectHandlers } from './projects'
import { registerMilestoneHandlers } from './milestones'
import { registerTodoHandlers } from './todos'
import { registerSettingsHandlers } from './settings'
import { registerLinkHandlers } from './links'
import { registerExportHandlers } from './export'
import { registerCorpusHandlers } from './corpus'

/** Register remaining IPC stubs for features not yet implemented */
function registerRemainingStubs(): void {
  // Google Calendar
  ipcMain.handle('gcal:connect', () => {})
  ipcMain.handle('gcal:fetchEvents', () => [])
  ipcMain.handle('gcal:confirmImport', () => {})
  ipcMain.handle('gcal:getUpcoming', () => null)

  // Stripe
  ipcMain.handle('stripe:connect', () => {})
  ipcMain.handle('stripe:confirmMatches', () => {})
  ipcMain.handle('stripe:refreshCache', () => {})
  ipcMain.handle('stripe:getCache', () => null)

  // Import
  ipcMain.handle('import:appleContacts', () => [])
}

export function registerHandlers(): void {
  registerContactHandlers()
  registerFolderHandlers()
  registerDocHandlers()
  registerNoteHandlers()
  registerTagHandlers()
  registerSearchHandlers()
  registerTouchpointHandlers()
  registerProjectHandlers()
  registerMilestoneHandlers()
  registerTodoHandlers()
  registerSettingsHandlers()
  registerLinkHandlers()
  registerExportHandlers()
  registerCorpusHandlers()
  registerRemainingStubs()
}
