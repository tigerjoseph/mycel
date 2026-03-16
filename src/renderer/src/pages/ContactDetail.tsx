import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { Plus, X, ArrowLeft, Trash2 } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import type { Contact, Touchpoint, Project } from '@shared/types'

const MEDIUM_ICONS: Record<string, string> = {
  email: '\u{1F4E7}',
  dm: '\u{1F4AC}',
  call: '\u{1F4DE}',
  coffee: '\u{2615}',
  meet: '\u{1F91D}',
  letter: '\u{2709}\u{FE0F}'
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

  // Inline add-field state
  const [addingField, setAddingField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const fieldInputRef = useRef<HTMLInputElement>(null)

  // Inline add-tag state
  const [addingTag, setAddingTag] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Sync name when contact changes
  useEffect(() => {
    setNameValue(contact?.name ?? '')
  }, [contact?.name])

  // Fetch touchpoints and projects
  useEffect(() => {
    if (!activeContactId) return
    window.mycel.getTouchpoints(activeContactId).then(setTouchpoints).catch(() => {})
    window.mycel.getProjects(activeContactId).then(setProjects).catch(() => {})
  }, [activeContactId])

  // Auto-focus name input for new (empty-name) contacts
  useEffect(() => {
    if (contact && !contact.name) {
      setEditingName(true)
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [contact])

  const handleBack = (): void => {
    setActiveContactId(null)
  }

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
      const updated: Contact = {
        ...contact,
        metadata: { ...contact.metadata, [key]: value },
        updatedAt: Date.now()
      }
      await upsert(updated)
    },
    [contact, upsert]
  )

  const commitNewField = useCallback(async () => {
    const key = newFieldName.trim()
    setAddingField(false)
    setNewFieldName('')
    if (!key || !contact) return
    const updated: Contact = {
      ...contact,
      metadata: { ...contact.metadata, [key]: '' },
      updatedAt: Date.now()
    }
    await upsert(updated)
  }, [contact, upsert, newFieldName])

  const commitNewTag = useCallback(async () => {
    const tag = newTagValue.trim()
    setAddingTag(false)
    setNewTagValue('')
    if (!tag || !contact) return
    if (contact.tags.includes(tag)) return
    const updated: Contact = {
      ...contact,
      tags: [...contact.tags, tag],
      updatedAt: Date.now()
    }
    await upsert(updated)
  }, [contact, upsert, newTagValue])

  const removeTag = useCallback(
    async (tag: string) => {
      if (!contact) return
      const updated: Contact = {
        ...contact,
        tags: contact.tags.filter((t) => t !== tag),
        updatedAt: Date.now()
      }
      await upsert(updated)
    },
    [contact, upsert]
  )

  const handleProjectClick = (project: Project): void => {
    setActiveProjectId(project.id)
  }

  const handleNewProject = async (): Promise<void> => {
    if (!activeContactId) return
    const project = await window.mycel.upsertProject({
      id: crypto.randomUUID(),
      contactId: activeContactId,
      name: '',
      stage: 'Lead',
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
        <span style={{ fontFamily: 'Lora, serif', color: 'var(--text-muted)' }}>
          Contact not found
        </span>
      </motion.div>
    )
  }

  const metadataEntries = Object.entries(contact.metadata ?? {})

  return (
    <motion.div
      style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}
      {...fadeUp}
    >
      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 0 20px 0',
          transition: 'color 150ms ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <ArrowLeft size={14} />
        Contacts
      </button>

      {/* Header row: name + log button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        {/* Editable name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
            }}
            placeholder="Contact name"
            style={{
              fontFamily: 'Lora, serif',
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
              fontFamily: 'Lora, serif',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setLogTouchpointOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 0 0 16px',
              flexShrink: 0,
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={13} />
            log
          </button>

          <button
            onClick={async () => {
              if (!window.confirm('Delete this contact?')) return
              await remove(contact.id)
              setActiveContactId(null)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px 0 0 16px',
              flexShrink: 0,
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#C0392B' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Metadata fields */}
      {metadataEntries.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {metadataEntries.map(([key, value]) => (
            <MetadataRow
              key={key}
              label={key}
              value={value}
              onSave={(v) => saveMetadataField(key, v)}
            />
          ))}
        </div>
      )}

      {/* Inline add-field */}
      {addingField ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, paddingBottom: 20 }}>
          <input
            ref={fieldInputRef}
            autoFocus
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onBlur={commitNewField}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNewField()
              if (e.key === 'Escape') { setAddingField(false); setNewFieldName('') }
            }}
            placeholder="Field name"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text)',
              background: 'none',
              border: 'none',
              outline: 'none',
              padding: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              minWidth: 80
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setAddingField(true)
            setTimeout(() => fieldInputRef.current?.focus(), 50)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-muted)',
            padding: '0 0 20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'color 150ms ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Plus size={12} />
          add field
        </button>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {contact.tags.map((tag) => (
          <span
            key={tag}
            onClick={() => removeTag(tag)}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              color: 'var(--accent)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '3px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'opacity 150ms ease'
            }}
          >
            {tag}
            <X size={10} style={{ opacity: 0.5 }} />
          </span>
        ))}

        {/* Inline add-tag */}
        {addingTag ? (
          <input
            ref={tagInputRef}
            autoFocus
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            onBlur={commitNewTag}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNewTag()
              if (e.key === 'Escape') { setAddingTag(false); setNewTagValue('') }
            }}
            placeholder="tag name"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              color: 'var(--text)',
              background: 'none',
              border: '1px dashed var(--border)',
              borderRadius: 12,
              padding: '3px 10px',
              outline: 'none',
              minWidth: 60,
              maxWidth: 120
            }}
          />
        ) : (
          <button
            onClick={() => {
              setAddingTag(true)
              setTimeout(() => tagInputRef.current?.focus(), 50)
            }}
            style={{
              background: 'none',
              border: '1px dashed var(--border)',
              borderRadius: 12,
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--text-muted)',
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            + tag
          </button>
        )}
      </div>

      {/* Engagement timeline */}
      <div style={{ marginTop: 32 }}>
        <h2
          style={{
            fontFamily: 'Inter, sans-serif',
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
          Engagement
        </h2>
        {touchpoints.length === 0 ? (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--text-muted)'
            }}
          >
            No touchpoints yet
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...touchpoints]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((tp) => (
                <div
                  key={tp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>
                    {MEDIUM_ICONS[tp.medium] ?? '\u{1F4AC}'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {tp.note && (
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 13,
                          color: 'var(--text)',
                          margin: '0 0 2px 0',
                          lineHeight: 1.5
                        }}
                      >
                        {tp.note}
                      </p>
                    )}
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 11,
                        color: 'var(--text-muted)'
                      }}
                    >
                      {format(tp.createdAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Projects section */}
      {(projects.length > 0 || activeContactId) && (
        <div style={{ marginTop: 32 }}>
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
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
            Projects
          </h2>
          {projects.length === 0 ? (
            <button
              onClick={handleNewProject}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text-muted)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Plus size={13} />
              new project
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'background 100ms ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 14,
                          color: 'var(--text)'
                        }}
                      >
                        {project.name || 'Untitled project'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 12,
                          color: 'var(--text-muted)'
                        }}
                      >
                        {project.stage}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>&rarr;</span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleNewProject}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text-muted)',
                  padding: '12px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'color 150ms ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <Plus size={13} />
                new project
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Metadata row sub-component                                         */
/* ------------------------------------------------------------------ */

function MetadataRow({
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

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          minWidth: 80,
          flexShrink: 0
        }}
      >
        {label}
      </span>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: 'var(--text)',
            background: 'none',
            border: 'none',
            outline: 'none',
            padding: 0,
            flex: 1
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: value ? 'var(--text)' : 'var(--text-muted)',
            cursor: 'text',
            flex: 1
          }}
        >
          {value || 'empty'}
        </span>
      )}
    </div>
  )
}
