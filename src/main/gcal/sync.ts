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

interface GoogleEvent {
  summary?: string
  start?: { dateTime?: string; date?: string }
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
  const res = await client.request<{ email?: string }>({
    url: 'https://www.googleapis.com/calendar/v3/calendars/primary'
  })
  const data = res.data as { id?: string }
  return typeof data.id === 'string' && data.id.includes('@') ? data.id : null
}

export async function fetchUpcomingAttendees(): Promise<CalendarAttendee[]> {
  const client = await getAuthorizedClient()
  const settings = await getAppSettings()
  const userEmail =
    ((settings.gcalUserEmail as string) || '').toLowerCase() ||
    (await getUserEmail(client))?.toLowerCase() ||
    ''

  const now = new Date()
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const res = await client.request<{ items?: GoogleEvent[] }>({
    url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    params: {
      singleEvents: true,
      orderBy: 'startTime',
      timeMin,
      timeMax,
      maxResults: 250
    }
  })

  const seen = new Set<string>()
  const attendees: CalendarAttendee[] = []

  for (const event of res.data.items ?? []) {
    const eventTitle = event.summary?.trim() || 'Meeting'
    const eventStart = event.start?.dateTime || event.start?.date || ''

    for (const attendee of event.attendees ?? []) {
      const email = attendee.email?.trim().toLowerCase()
      if (!email || attendee.self || attendee.resource) continue
      if (userEmail && email === userEmail) continue
      if (seen.has(email)) continue
      seen.add(email)

      attendees.push({
        email,
        name: attendee.displayName?.trim() || email.split('@')[0] || email,
        eventTitle,
        eventStart
      })
    }
  }

  return attendees
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
