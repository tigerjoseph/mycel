import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getAuthorizedClient } from './auth'
import { getAppSettings } from '../settingsStore'

export interface CalendarAttendee {
  email: string
  name: string
  eventTitle: string
  eventStart: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  htmlLink?: string
  attendees: { email: string; name: string; self?: boolean }[]
}

interface GoogleEvent {
  id?: string
  summary?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: { email?: string; displayName?: string; self?: boolean; resource?: boolean }[]
}

function parseContactRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    metadata: JSON.parse((row.metadata as string) || '{}') as Record<string, string>,
    tags: JSON.parse((row.tags as string) || '[]') as string[]
  }
}

async function findContactByEmail(email: string): Promise<ReturnType<typeof parseContactRow> | null> {
  const db = getDb()
  const result = await db.execute('SELECT * FROM contacts')
  const normalized = email.toLowerCase()
  for (const row of result.rows) {
    const contact = parseContactRow(row as unknown as Record<string, unknown>)
    if (contact.metadata.email?.toLowerCase() === normalized) return contact
  }
  return null
}

async function getUserEmail(client: Awaited<ReturnType<typeof getAuthorizedClient>>): Promise<string | null> {
  const res = await client.request<{ id?: string }>({
    url: 'https://www.googleapis.com/calendar/v3/calendars/primary'
  })
  return typeof res.data.id === 'string' && res.data.id.includes('@') ? res.data.id : null
}

function mapGoogleEvent(event: GoogleEvent): CalendarEvent | null {
  const start = event.start?.dateTime || event.start?.date
  if (!start) return null
  const end = event.end?.dateTime || event.end?.date || start
  const allDay = Boolean(event.start?.date && !event.start?.dateTime)

  return {
    id: event.id || `${start}-${event.summary || 'event'}`,
    title: event.summary?.trim() || 'Meeting',
    start,
    end,
    allDay,
    htmlLink: event.htmlLink,
    attendees: (event.attendees ?? [])
      .filter((a) => a.email && !a.resource)
      .map((a) => ({
        email: a.email!.trim().toLowerCase(),
        name: a.displayName?.trim() || a.email!.split('@')[0] || a.email!,
        self: Boolean(a.self)
      }))
  }
}

export async function fetchCalendarEvents(opts?: {
  timeMin?: Date
  timeMax?: Date
  maxResults?: number
}): Promise<CalendarEvent[]> {
  const client = await getAuthorizedClient()
  const now = new Date()
  const timeMin = (opts?.timeMin ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString()
  const timeMax = (opts?.timeMax ?? new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)).toISOString()

  const res = await client.request<{ items?: GoogleEvent[] }>({
    url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    params: {
      singleEvents: true,
      orderBy: 'startTime',
      timeMin,
      timeMax,
      maxResults: opts?.maxResults ?? 250
    }
  })

  return (res.data.items ?? [])
    .map(mapGoogleEvent)
    .filter((e): e is CalendarEvent => e !== null)
}

export async function fetchUpcomingAttendees(): Promise<CalendarAttendee[]> {
  const settings = await getAppSettings()
  const client = await getAuthorizedClient()
  const userEmail =
    ((settings.gcalUserEmail as string) || '').toLowerCase() ||
    (await getUserEmail(client))?.toLowerCase() ||
    ''

  const events = await fetchCalendarEvents()
  const seen = new Set<string>()
  const attendees: CalendarAttendee[] = []

  for (const event of events) {
    for (const attendee of event.attendees) {
      if (!attendee.email || attendee.self) continue
      if (userEmail && attendee.email === userEmail) continue
      if (seen.has(attendee.email)) continue
      seen.add(attendee.email)

      attendees.push({
        email: attendee.email,
        name: attendee.name,
        eventTitle: event.title,
        eventStart: event.start
      })
    }
  }

  return attendees
}

export async function getUpcomingForContact(contactId: string): Promise<CalendarEvent | null> {
  const db = getDb()
  const contact = await db.execute({ sql: 'SELECT * FROM contacts WHERE id = ?', args: [contactId] })
  if (contact.rows.length === 0) return null

  const meta = JSON.parse((contact.rows[0].metadata as string) || '{}') as Record<string, string>
  const email = meta.email?.toLowerCase()
  if (!email) return null

  const now = Date.now()
  const events = await fetchCalendarEvents({
    timeMin: new Date(now - 60 * 60 * 1000),
    timeMax: new Date(now + 60 * 24 * 60 * 60 * 1000)
  })

  for (const event of events) {
    if (event.attendees.some((a) => a.email === email)) return event
  }
  return null
}

function eventStartMs(start: string, allDay: boolean): number {
  if (allDay) {
    // Google all-day dates are YYYY-MM-DD (date-only); treat as local midnight.
    const [y, m, d] = start.split('-').map(Number)
    if (y && m && d) return new Date(y, m - 1, d).getTime()
  }
  return new Date(start).getTime()
}

export async function fetchTodaysEvents(): Promise<CalendarEvent[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const events = await fetchCalendarEvents({ timeMin: start, timeMax: end, maxResults: 50 })
  return events.filter((e) => {
    const t = eventStartMs(e.start, e.allDay)
    return t >= start.getTime() && t < end.getTime()
  })
}

export async function syncCalendarContacts(): Promise<{
  created: number
  skipped: number
  attendees: CalendarAttendee[]
}> {
  const db = getDb()
  const pending = await fetchUpcomingAttendees()
  let created = 0
  let skipped = 0
  const now = Date.now()

  for (const attendee of pending) {
    const existing = await findContactByEmail(attendee.email)
    if (existing) {
      skipped++
      continue
    }

    await db.execute({
      sql: `INSERT INTO contacts (id, name, metadata, tags, last_contacted_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nanoid(),
        attendee.name,
        JSON.stringify({ email: attendee.email }),
        JSON.stringify(['calendar']),
        null,
        now,
        now
      ]
    })
    created++
  }

  return { created, skipped, attendees: pending }
}
