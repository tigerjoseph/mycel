import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { getAuthorizedClient } from './auth'
import { getAppSettings, setAppSettings } from '../settingsStore'

const AUTO_WIN_STAGE = 'Active' // only promote Active deals — Leads stay untouched

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

/**
 * When Stripe is connected and a future Calendar meeting includes a CRM contact
 * who has an Active deal, mark that deal Won (once per event+contact).
 */
export async function autoWinDealsFromCalendarMeetings(): Promise<number> {
  const settings = await getAppSettings()
  const stripeKey =
    typeof settings.stripeApiKey === 'string' ? settings.stripeApiKey.trim() : ''
  if (!stripeKey) return 0

  const client = await getAuthorizedClient()
  const userEmail =
    ((settings.gcalUserEmail as string) || '').toLowerCase() ||
    (await getUserEmail(client))?.toLowerCase() ||
    ''

  const now = Date.now()
  const timeMin = new Date(now).toISOString()
  const timeMax = new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString()

  const res = await client.request<{ items?: GoogleEvent[] }>({
    url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    params: {
      singleEvents: true,
      orderBy: 'startTime',
      timeMin,
      timeMax,
      maxResults: 100
    }
  })

  const processedRaw = settings.gcalAutoWonKeys
  const processed = new Set(
    Array.isArray(processedRaw)
      ? processedRaw.filter((k): k is string => typeof k === 'string')
      : []
  )

  const db = getDb()
  let wonCount = 0

  for (const event of res.data.items ?? []) {
    const eventTitle = event.summary?.trim() || 'Meeting'
    const eventStart = event.start?.dateTime || event.start?.date || ''
    if (!eventStart) continue

    for (const attendee of event.attendees ?? []) {
      const email = attendee.email?.trim().toLowerCase()
      if (!email || attendee.self || attendee.resource) continue
      if (userEmail && email === userEmail) continue

      const key = `${email}|${eventStart}|${eventTitle}`
      if (processed.has(key)) continue

      const contact = await findContactByEmail(email)
      if (!contact) continue

      const projects = await db.execute({
        sql: `SELECT * FROM projects
              WHERE contact_id = ? AND stage = ?
              ORDER BY updated_at DESC`,
        args: [contact.id, AUTO_WIN_STAGE]
      })
      if (projects.rows.length === 0) continue

      // Ambiguous: multiple Active deals for one contact — skip
      if (projects.rows.length > 1) continue

      const project = projects.rows[0] as Record<string, unknown>
      const projectId = project.id as string
      const closedPrior = project.closed_at
      const closedAt =
        typeof closedPrior === 'number' && Number.isFinite(closedPrior)
          ? closedPrior
          : now

      await db.execute({
        sql: `UPDATE projects
              SET stage = 'Won', closed_at = ?, stage_changed_at = ?, updated_at = ?
              WHERE id = ? AND stage = ?`,
        args: [closedAt, now, now, projectId, AUTO_WIN_STAGE]
      })

      // Leave a trail on the contact timeline
      try {
        await db.execute({
          sql: `INSERT INTO touchpoints (id, contact_id, medium, note, created_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            nanoid(),
            contact.id,
            'meet',
            `Auto-won from Calendar: ${eventTitle}`,
            now
          ]
        })
      } catch {
        // Deal win still counts if touchpoint insert fails
      }

      processed.add(key)
      wonCount++
    }
  }

  if (wonCount > 0) {
    const trimmed = [...processed]
    if (trimmed.length > 400) trimmed.splice(0, trimmed.length - 400)
    await setAppSettings({ gcalAutoWonKeys: trimmed })
  }

  return wonCount
}

export async function syncCalendarContacts(): Promise<{
  created: number
  skipped: number
  attendees: CalendarAttendee[]
  autoWon?: number
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

  let autoWon = 0
  try {
    autoWon = await autoWinDealsFromCalendarMeetings()
  } catch (err) {
    console.error('[gcal] auto-win from calendar failed:', err)
  }

  return { created, skipped, attendees: pending, autoWon }
}
