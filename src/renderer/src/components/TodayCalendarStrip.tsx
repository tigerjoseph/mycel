import { useEffect, useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Calendar } from 'lucide-react'

type DayEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  attendees: { email: string; name: string; self?: boolean }[]
}

function formatEventTime(ev: DayEvent): string {
  if (ev.allDay) return 'All day'
  const d = parseISO(ev.start)
  if (!isValid(d)) return ''
  return format(d, 'h:mm a')
}

/** Today's Google Calendar events — shown above daily notes when connected. */
export function TodayCalendarStrip(): React.JSX.Element | null {
  const [events, setEvents] = useState<DayEvent[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await window.mycel.gcalGetStatus()
        if (!status.connected) {
          if (!cancelled) setEvents([])
          return
        }
        const today = await window.mycel.gcalFetchToday()
        if (!cancelled) setEvents(today)
      } catch {
        if (!cancelled) setEvents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!events || events.length === 0) return null

  return (
    <div
      style={{
        marginBottom: 20,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}
      >
        <Calendar size={12} />
        Today on calendar
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.slice(0, 6).map((ev) => {
          const people = ev.attendees.filter((a) => !a.self).slice(0, 3)
          return (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                fontFamily: 'var(--font-ui)',
                fontSize: 13
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 64,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 12,
                  color: 'var(--text-muted)'
                }}
              >
                {formatEventTime(ev)}
              </span>
              <span style={{ color: 'var(--text)', fontWeight: 500, minWidth: 0 }}>
                {ev.title}
                {people.length > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                    {' '}
                    · {people.map((p) => p.name).join(', ')}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
