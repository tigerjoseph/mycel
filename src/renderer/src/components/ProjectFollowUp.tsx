import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import type { Contact, Project, Touchpoint } from '@shared/types'
import {
  followUpAccentColor,
  formatLastContacted,
  getEffectiveFollowUp
} from '@shared/followUp'

const MEDIA: { id: Touchpoint['medium']; label: string; icon: string }[] = [
  { id: 'email', label: 'Email', icon: '\u{1F4E7}' },
  { id: 'call', label: 'Call', icon: '\u{1F4DE}' },
  { id: 'dm', label: 'DM', icon: '\u{1F4AC}' },
  { id: 'coffee', label: 'Coffee', icon: '\u{2615}' },
  { id: 'meet', label: 'Meet', icon: '\u{1F91D}' },
  { id: 'letter', label: 'Letter', icon: '\u{2709}\u{FE0F}' }
]

const MEDIUM_LABELS: Record<Touchpoint['medium'], string> = {
  email: 'Email',
  dm: 'DM',
  call: 'Call',
  coffee: 'Coffee',
  meet: 'Meet',
  letter: 'Letter'
}

interface ProjectFollowUpProps {
  project: Project
  contact: Contact | null
  touchpoints: Touchpoint[]
  onTouchpointLogged: () => void
}

export function ProjectFollowUp({
  project,
  contact,
  touchpoints,
  onTouchpointLogged
}: ProjectFollowUpProps): React.JSX.Element {
  const setLogTouchpointOpen = useUIStore((s) => s.setLogTouchpointOpen)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const fetchContacts = useContactsStore((s) => s.fetch)

  const [medium, setMedium] = useState<Touchpoint['medium'] | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const hint = contact
    ? getEffectiveFollowUp(project, contact.lastContactedAt, project.followUpManual)
    : null

  const handleLog = useCallback(async () => {
    if (!contact || !medium || saving) return
    setSaving(true)
    try {
      await window.mycel.logTouchpoint({
        contactId: contact.id,
        medium,
        note: note.trim(),
        createdAt: Date.now()
      })
      setMedium(null)
      setNote('')
      await fetchContacts()
      onTouchpointLogged()
    } finally {
      setSaving(false)
    }
  }, [contact, medium, note, onTouchpointLogged, saving, fetchContacts])

  const openFullLog = (): void => {
    if (!contact) return
    setActiveContactId(contact.id)
    setLogTouchpointOpen(true)
  }

  const recent = [...touchpoints].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)

  return (
    <div style={{ marginBottom: 36 }}>
      {hint && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            marginBottom: 20,
            borderRadius: 10,
            border: `1px solid ${followUpAccentColor(hint.urgency)}`,
            borderLeftWidth: 3,
            background: hint.urgency === 'urgent' ? 'var(--lost-bg)' : 'rgba(180, 83, 9, 0.06)'
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1.2 }} aria-hidden>
            {hint.urgency === 'urgent' ? '!' : '→'}
          </span>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 500,
                color: followUpAccentColor(hint.urgency),
                marginBottom: 2
              }}
            >
              Consider following up
            </div>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.4
              }}
            >
              {hint.reason}
            </div>
          </div>
        </div>
      )}

      <h2
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 12px 0',
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)'
        }}
      >
        Record follow-up
      </h2>

      {contact ? (
        <>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: '0 0 14px 0'
            }}
          >
            {contact.name || 'Contact'} · {formatLastContacted(contact.lastContactedAt)}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {MEDIA.map((m) => {
              const selected = medium === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMedium(selected ? null : m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: selected ? 'var(--surface)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    color: selected ? 'var(--text)' : 'var(--text-muted)',
                    transition: 'border-color 150ms ease, color 150ms ease'
                  }}
                >
                  <span aria-hidden>{m.icon}</span>
                  {m.label}
                </button>
              )
            })}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text)',
              outline: 'none',
              resize: 'vertical',
              marginBottom: 10,
              boxSizing: 'border-box',
              lineHeight: 1.5
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => void handleLog()}
              disabled={!medium || saving}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                background: medium && !saving ? 'var(--text)' : 'var(--border)',
                color: medium && !saving ? 'var(--bg)' : 'var(--text-muted)',
                cursor: medium && !saving ? 'pointer' : 'default',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 500,
                transition: 'background 150ms ease, color 150ms ease'
              }}
            >
              {saving ? 'Saving...' : 'Log follow-up'}
            </button>
            <button
              type="button"
              onClick={openFullLog}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--text-muted)',
                padding: 0,
                transition: 'color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              More options
            </button>
          </div>

          {recent.length > 0 && (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.map((tp) => (
                <p
                  key={tp.id}
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.45
                  }}
                >
                  <span style={{ color: 'var(--text)' }}>{MEDIUM_LABELS[tp.medium]}</span>
                  {tp.note ? ` — ${tp.note}` : ''}
                  <span style={{ opacity: 0.7 }}> · {format(tp.createdAt, 'MMM d')}</span>
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Loading contact...
        </p>
      )}
    </div>
  )
}
