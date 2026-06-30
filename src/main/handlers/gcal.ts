import { ipcMain } from 'electron'
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGcalConnected
} from '../gcal/auth'
import { fetchUpcomingAttendees, syncCalendarContacts } from '../gcal/sync'

export function registerGcalHandlers(): void {
  ipcMain.handle('gcal:getStatus', async () => {
    return { connected: await isGcalConnected() }
  })

  ipcMain.handle('gcal:connect', async () => {
    await connectGoogleCalendar()
    const result = await syncCalendarContacts()
    return result
  })

  ipcMain.handle('gcal:disconnect', async () => {
    await disconnectGoogleCalendar()
  })

  ipcMain.handle('gcal:fetchEvents', async () => {
    const attendees = await fetchUpcomingAttendees()
    return attendees
  })

  ipcMain.handle('gcal:syncContacts', async () => {
    return syncCalendarContacts()
  })

  ipcMain.handle('gcal:confirmImport', async () => {
    return syncCalendarContacts()
  })

  ipcMain.handle('gcal:getUpcoming', async (_e, contactId: string) => {
    const attendees = await fetchUpcomingAttendees()
    const { getDb } = await import('../db')
    const db = getDb()
    const contact = await db.execute({ sql: 'SELECT * FROM contacts WHERE id = ?', args: [contactId] })
    if (contact.rows.length === 0) return null
    const meta = JSON.parse((contact.rows[0].metadata as string) || '{}') as Record<string, string>
    const email = meta.email?.toLowerCase()
    if (!email) return null
    return attendees.find((a) => a.email === email) ?? null
  })
}
