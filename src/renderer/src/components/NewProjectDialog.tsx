import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { springGentle } from '../styles/animation'
import { useContactsStore } from '../store/contacts'
import type { Contact, Project } from '@shared/types'
import { contactFromQuery } from '../utils/contactFromQuery'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
}

export function NewProjectDialog({
  open,
  onClose,
  onCreated
}: NewProjectDialogProps): React.JSX.Element | null {
  const contacts = useContactsStore((s) => s.contacts)
  const fetchContacts = useContactsStore((s) => s.fetch)
  const upsertContact = useContactsStore((s) => s.upsert)

  const [contactQuery, setContactQuery] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [creatingContact, setCreatingContact] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) fetchContacts().catch(() => {})
  }, [open, fetchContacts])

  useEffect(() => {
    if (!open) return
    setContactQuery('')
    setSelectedContactId(null)
    setProjectName('')
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  const fuse = useMemo(
    () => new Fuse(contacts, { keys: ['name', 'metadata.email', 'metadata.company'], threshold: 0.35 }),
    [contacts]
  )

  const recentContact = useMemo(() => {
    if (!contacts.length) return null
    return [...contacts].sort((a, b) => {
      const aAt = Math.max(a.lastContactedAt ?? 0, a.updatedAt ?? 0)
      const bAt = Math.max(b.lastContactedAt ?? 0, b.updatedAt ?? 0)
      return bAt - aAt
    })[0]
  }, [contacts])

  const filteredContacts = useMemo(() => {
    if (!contactQuery.trim()) return recentContact ? [recentContact] : []
    return fuse.search(contactQuery).map((r) => r.item).slice(0, 6)
  }, [contacts, contactQuery, fuse, recentContact])

  const selectedContact = contacts.find((c) => c.id === selectedContactId)

  const queryTrimmed = contactQuery.trim()
  const canCreate = Boolean(selectedContactId || queryTrimmed)
  const willCreateContact = !selectedContactId && queryTrimmed.length > 0

  const buildContactFromQuery = useCallback((query: string): Contact => contactFromQuery(query), [])

  const handleCreateContact = useCallback(async (): Promise<Contact | null> => {
    if (!queryTrimmed) return null
    setCreatingContact(true)
    setError(null)
    try {
      const contact = buildContactFromQuery(queryTrimmed)
      await upsertContact(contact)
      return contact
    } catch {
      setError('Could not create contact')
      return null
    } finally {
      setCreatingContact(false)
    }
  }, [queryTrimmed, buildContactFromQuery, upsertContact])

  const handleCreate = useCallback(async () => {
    let contactId = selectedContactId
    if (!contactId && queryTrimmed) {
      const created = await handleCreateContact()
      contactId = created?.id ?? null
    }
    if (!contactId) {
      setError('Enter a contact name')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const project = await window.mycel.upsertProject({
        id: crypto.randomUUID(),
        contactId,
        name: projectName.trim(),
        stage: 'Lead',
        valueCents: null,
        closedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      onCreated(project as Project)
      onClose()
    } catch {
      setError('Could not create project')
    } finally {
      setSaving(false)
    }
  }, [selectedContactId, queryTrimmed, handleCreateContact, projectName, onCreated, onClose])

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="new-project-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: 24
        }}
      >
        <motion.div
          key="new-project-dialog"
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={springGentle}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(400px, calc(100vw - 48px))',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 20,
            boxShadow: 'var(--shadow-modal)',
          }}
        >
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600,
          margin: '0 0 16px', color: 'var(--text)'
        }}>
          New project
        </h2>

        <label style={labelStyle}>Contact</label>
        {selectedContact ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 6, marginBottom: 12, padding: '8px 10px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)'
          }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text)' }}>
              {selectedContact.name || selectedContact.metadata?.email || 'Unnamed'}
            </span>
            <button
              onClick={() => setSelectedContactId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleCreate()
                }
              }}
              placeholder="Search or type a new name…"
              autoFocus
              style={{ ...inputStyle, marginTop: 6 }}
            />
            <div
              style={{
                marginTop: 8,
                marginBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: queryTrimmed ? 168 : undefined,
                overflowY: queryTrimmed ? 'auto' : undefined
              }}
            >
              {!queryTrimmed && recentContact && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  Recent
                </span>
              )}
              {filteredContacts.map((c: Contact) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedContactId(c.id)
                    setContactQuery('')
                  }}
                  style={{
                    textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)'
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{c.name || 'Unnamed'}</div>
                  {c.metadata?.email && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.metadata.email}</div>
                  )}
                </button>
              ))}
              {willCreateContact && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', fontFamily: 'var(--font-ui)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text)' }}>{queryTrimmed}</span> will be added as a new contact for this project.
                </p>
              )}
              {!willCreateContact && filteredContacts.length === 0 && !queryTrimmed && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  Type a name to search or create
                </span>
              )}
            </div>
          </>
        )}

        <label style={labelStyle}>Project name</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canCreate) {
              e.preventDefault()
              void handleCreate()
            }
          }}
          placeholder="Optional — name it on the next screen"
          style={{ ...inputStyle, marginTop: 6 }}
        />

        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', margin: '10px 0 0', fontFamily: 'var(--font-ui)' }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button
            onClick={() => void handleCreate()}
            disabled={saving || creatingContact || !canCreate}
            style={{
              ...btnStyle,
              background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)',
              opacity: saving || creatingContact || !canCreate ? 0.5 : 1
            }}
          >
            {saving || creatingContact ? 'Creating…' : 'Create project'}
          </button>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-ui)'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box'
}

const btnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500
}
