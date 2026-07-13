import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import { TagPicker } from '../components/TagPicker'
import {
  formatUsdCompact,
  sumClosedValueCents,
  sumProjectValueCents,
  PIPELINE_STAGES
} from '@shared/money'
import type { Touchpoint, Project } from '@shared/types'
import { getStageBadgeColors } from '@shared/stages'

const CORE_FIELDS = ['email', 'company', 'role', 'phone'] as const

const FIELD_LABELS: Record<(typeof CORE_FIELDS)[number], string> = {
  email: 'Email',
  company: 'Company',
  role: 'Role',
  phone: 'Phone'
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text-muted)',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4
}

export function ContactDetail(): React.JSX.Element {
  const activeContactId = useUIStore((s) => s.activeContactId)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const setLogTouchpointOpen = useUIStore((s) => s.setLogTouchpointOpen)

  const contacts = useContactsStore((s) => s.contacts)
  const upsert = useContactsStore((s) => s.upsert)
  const remove = useContactsStore((s) => s.remove)

  const contact = contacts.find((c) => c.id === activeContactId) ?? null

  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(contact?.name ?? '')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNameValue(contact?.name ?? '')
  }, [contact?.name])

  useEffect(() => {
    if (!activeContactId) return
    window.mycel.getTouchpoints(activeContactId).then(setTouchpoints).catch(() => {})
    window.mycel.getProjects(activeContactId).then(setProjects).catch(() => {})
  }, [activeContactId])

  useEffect(() => {
    if (contact && !contact.name) {
      setEditingName(true)
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [contact])

  const saveName = useCallback(async () => {
    if (!contact) return
    setEditingName(false)
    if (nameValue !== contact.name) {
      await upsert({ ...contact, name: nameValue, updatedAt: Date.now() })
    }
  }, [contact, nameValue, upsert])

  const saveMetadataField = useCallback(
    async (key: string, value: string) => {
      if (!contact) return
      await upsert({
        ...contact,
        metadata: { ...contact.metadata, [key]: value },
        updatedAt: Date.now()
      })
    },
    [contact, upsert]
  )

  const handleNewProject = async (): Promise<void> => {
    if (!activeContactId) return
    const project = await window.mycel.upsertProject({
      id: crypto.randomUUID(),
      contactId: activeContactId,
      name: '',
      stage: 'Lead',
      valueCents: null,
      closedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    setProjects((prev) => [...prev, project])
    setActiveProjectId(project.id)
  }

  if (!contact) {
    return (
      <motion.div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '32px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320
        }}
        {...fadeUp}
      >
        <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-muted)' }}>
          Contact not found
        </span>
      </motion.div>
    )
  }

  const customFields = Object.entries(contact.metadata ?? {}).filter(
    ([key]) => !CORE_FIELDS.includes(key as (typeof CORE_FIELDS)[number])
  )
  const recentTouchpoints = [...touchpoints].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
  const closedCents = sumClosedValueCents(projects, 'total')
  const pipelineCents = sumProjectValueCents(projects, PIPELINE_STAGES)

  return (
    <motion.div
      style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}
      {...fadeUp}
    >
      <button
        onClick={() => setActiveContactId(null)}
        style={{
          ...linkBtn,
          fontSize: 13,
          padding: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <ArrowLeft size={14} />
        Contacts
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName() }}
            placeholder="Contact name"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text)',
              background: 'none',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              width: '100%',
              lineHeight: 1.2
            }}
          />
        ) : (
          <h1
            onClick={() => {
              setEditingName(true)
              setTimeout(() => nameInputRef.current?.focus(), 50)
            }}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              cursor: 'text',
              lineHeight: 1.2
            }}
          >
            {contact.name || 'Untitled'}
          </h1>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, paddingTop: 6 }}>
          <button onClick={() => setLogTouchpointOpen(true)} style={linkBtn}>
            Log
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('Delete this contact?')) return
              await remove(contact.id)
              setActiveContactId(null)
            }}
            style={{ ...linkBtn, padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#C0392B' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            aria-label="Delete contact"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {(closedCents > 0 || pipelineCents > 0) && (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          {closedCents > 0 && <span>{formatUsdCompact(closedCents)} closed</span>}
          {closedCents > 0 && pipelineCents > 0 && <span> · </span>}
          {pipelineCents > 0 && <span>{formatUsdCompact(pipelineCents)} pipeline</span>}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {CORE_FIELDS.filter((key) => {
          const v = contact.metadata?.[key] ?? ''
          if (key === 'email' || key === 'company') return true
          return Boolean(v)
        }).map((key) => (
          <FieldRow
            key={key}
            label={FIELD_LABELS[key]}
            value={contact.metadata?.[key] ?? ''}
            onSave={(v) => saveMetadataField(key, v)}
          />
        ))}
        {customFields.map(([key, value]) => (
          <FieldRow key={key} label={key} value={value} onSave={(v) => saveMetadataField(key, v)} />
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <TagPicker
          tags={contact.tags}
          normalize={false}
          onChange={async (tags) => {
            await upsert({ ...contact, tags, updatedAt: Date.now() })
          }}
        />
      </div>

      <section style={{ marginBottom: 28 }}>
        {projects.map((project) => {
          const stageBadge = getStageBadgeColors(project.stage)
          return (
          <button
            key={project.id}
            onClick={() => setActiveProjectId(project.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '11px 0',
              width: '100%',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text)' }}>
              {project.name || 'Untitled project'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: stageBadge.color,
                  background: stageBadge.background,
                  border: `1px solid ${stageBadge.border}`,
                  borderRadius: 6,
                  padding: '1px 7px'
                }}
              >
                {project.stage}
              </span>
              {project.valueCents ? (
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatUsdCompact(project.valueCents)}
                </span>
              ) : null}
            </span>
          </button>
          )
        })}
        <button
          onClick={() => void handleNewProject()}
          style={{ ...linkBtn, fontSize: 13, marginTop: projects.length > 0 ? 10 : 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Plus size={13} />
          new project
        </button>
      </section>

      {recentTouchpoints.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          {recentTouchpoints.map((tp) => (
            <p
              key={tp.id}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                color: 'var(--text-muted)',
                margin: '0 0 6px',
                lineHeight: 1.5
              }}
            >
              {tp.note || tp.medium}
              <span style={{ opacity: 0.7 }}> · {format(tp.createdAt, 'MMM d')}</span>
            </p>
          ))}
        </section>
      )}
    </motion.div>
  )
}

function FieldRow({
  label,
  value,
  onSave
}: {
  label: string
  value: string
  onSave: (v: string) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  useEffect(() => {
    setVal(value)
  }, [value])

  const commit = (): void => {
    setEditing(false)
    if (val !== value) onSave(val)
  }

  if (!value && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          ...linkBtn,
          fontSize: 13,
          textAlign: 'left',
          color: 'var(--text-muted)',
          opacity: 0.7
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
      >
        + {label.toLowerCase()}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minHeight: 22 }}>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
          placeholder={label}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            color: 'var(--text)',
            background: 'none',
            border: 'none',
            outline: 'none',
            padding: 0,
            width: '100%'
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            color: 'var(--text)',
            cursor: 'text',
            lineHeight: 1.4
          }}
        >
          {value}
        </span>
      )}
    </div>
  )
}
