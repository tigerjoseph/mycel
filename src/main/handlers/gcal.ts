import { ipcMain } from 'electron'
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGcalConnected
} from '../gcal/auth'
import {
  fetchCalendarEvents,
  fetchTodaysEvents,
  getUpcomingForContact,
  syncCalendarContacts
} from '../gcal/sync'

export function registerGcalHandlers(): void {
  ipcMain.handle('gcal:getStatus', async () => {
    return { connected: await isGcalConnected() }
  })

  ipcMain.handle('gcal:connect', async () => {
    await connectGoogleCalendar()
    try {
      const sync = await syncCalendarContacts()
      return { ok: true as const, sync }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calendar sync failed'
      return { ok: true as const, sync: { created: 0, skipped: 0 }, syncWarning: message }
    }
  })

  ipcMain.handle('gcal:disconnect', async () => {
    await disconnectGoogleCalendar()
  })

  ipcMain.handle('gcal:fetchEvents', async () => {
    return fetchCalendarEvents()
  })

  ipcMain.handle('gcal:fetchToday', async () => {
    return fetchTodaysEvents()
  })

  ipcMain.handle('gcal:syncContacts', async () => {
    return syncCalendarContacts()
  })

  ipcMain.handle('gcal:confirmImport', async () => {
    return syncCalendarContacts()
  })

  ipcMain.handle('gcal:getUpcoming', async (_e, contactId: string) => {
    return getUpcomingForContact(contactId)
  })
}
