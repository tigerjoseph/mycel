import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { Plus, ArrowLeft, Trash2, FileText, X } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import { TagPicker } from '../components/TagPicker'
import type { Contact, Touchpoint, Project, Doc, Link } from '@shared/types'

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
  const setPage = useUIStore((s) => s.setPage)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)

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

  const [contactLinks, setContactLinks] = useState<Link[]>([])
  const [linkedDocs, setLinkedDocs] = useState<Doc[]>([])
  const [linkPickerOpen, setLinkPickerOpen] = useState(false)
  const [docOptions, setDocOptions] = useState<Doc[]>([])

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

  const loadLinks = useCallback(async (): Promise<void> => {
    if (!activeContactId) return
    const links = await window.mycel.getLinks(activeContactId)
    setContactLinks(links)
    const docIds = links.map((link) => {
      if (link.sourceType === 'doc') return link.sourceId
      if (link.targetType === 'doc') return link.targetId
      return null
    }).filter((id): id is string => Boolean(id))
    const uniqueIds = [...new Set(docIds)]
    const docs = await Promise.all(uniqueIds.map((id) => window.mycel.getDoc(id)))
    setLinkedDocs(docs.filter((d): d is Doc => d !== null))
  }, [activeContactId])

  useEffect(() => {
    loadLinks().catch(() => {})
  }, [loadLinks])

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
        <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-muted)' }}>
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
          fontFamily: 'var(--font-ui)',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setLogTouchpointOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
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
              fontFamily: 'var(--font-ui)',
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
            fontFamily: 'var(--font-ui)',
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
      <div style={{ marginBottom: 16 }}>
        <TagPicker
          tags={contact.tags}
          normalize={false}
          onChange={async (tags) => {
            await upsert({ ...contact, tags, updatedAt: Date.now() })
          }}
        />
      </div>

      {/* Linked docs */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 12px 0'
          }}
        >
          Linked docs
        </h2>
        {linkedDocs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
            {linkedDocs.map((doc) => {
              const link = contactLinks.find(
                (l) =>
                  (l.sourceType === 'doc' && l.sourceId === doc.id) ||
                  (l.targetType === 'doc' && l.targetId === doc.id)
              )
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 0'
                  }}
                >
                  <button
                    onClick={() => {
                      setPage('create')
                      setActiveDocId(doc.id)
                      setDocsView('editor')
                    }}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 0,
                      textAlign: 'left',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 14,
                      color: 'var(--text)'
                    }}
                  >
                    <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    {doc.title || 'Untitled'}
                  </button>
                  {link && (
                    <button
                      onClick={async () => {
                        await window.mycel.deleteLink(link.id)
                        loadLinks().catch(() => {})
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: 'var(--text-muted)'
                      }}
                      aria-label="Unlink doc"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {linkPickerOpen ? (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 8,
              background: 'var(--surface)',
              maxHeight: 200,
              overflowY: 'auto'
            }}
          >
            {docOptions
              .filter((d) => !linkedDocs.some((ld) => ld.id === d.id))
              .slice(0, 20)
              .map((doc) => (
                <button
                  key={doc.id}
                  onClick={async () => {
                    if (!contact) return
                    await window.mycel.upsertLink({
                      sourceId: contact.id,
                      sourceType: 'contact',
                      targetId: doc.id,
                      targetType: 'doc',
                      createdAt: Date.now()
                    })
                    setLinkPickerOpen(false)
                    loadLinks().catch(() => {})
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    color: 'var(--text)',
                    borderRadius: 6,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                  {doc.title || 'Untitled'}
                </button>
              ))}
            <button
              onClick={() => setLinkPickerOpen(false)}
              style={{
                marginTop: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                color: 'var(--text-muted)',
                padding: '4px 10px'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              window.mycel.getDocs().then((docs) => {
                setDocOptions(docs as Doc[])
                setLinkPickerOpen(true)
              }).catch(() => {})
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-muted)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={13} />
            link doc
          </button>
        )}
      </div>

      {/* Engagement timeline */}
      <div style={{ marginTop: 32 }}>
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
          Engagement
        </h2>
        {touchpoints.length === 0 ? (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
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
                          fontFamily: 'var(--font-ui)',
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
                        fontFamily: 'var(--font-ui)',
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
                fontFamily: 'var(--font-ui)',
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
                          fontFamily: 'var(--font-ui)',
                          fontSize: 14,
                          color: 'var(--text)'
                        }}
                      >
                        {project.name || 'Untitled project'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-ui)',
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
                  fontFamily: 'var(--font-ui)',
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
          fontFamily: 'var(--font-ui)',
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
            fontFamily: 'var(--font-ui)',
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
            fontFamily: 'var(--font-ui)',
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
