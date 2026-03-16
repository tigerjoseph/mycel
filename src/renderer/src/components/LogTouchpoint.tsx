import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { springGentle } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import type { Touchpoint } from '@shared/types'

const MEDIA: { id: Touchpoint['medium']; icon: string }[] = [
  { id: 'email', icon: '\u{1F4E7}' },
  { id: 'dm', icon: '\u{1F4AC}' },
  { id: 'call', icon: '\u{1F4DE}' },
  { id: 'coffee', icon: '\u{2615}' },
  { id: 'meet', icon: '\u{1F91D}' },
  { id: 'letter', icon: '\u{2709}\u{FE0F}' }
]

export function LogTouchpoint(): React.JSX.Element {
  const open = useUIStore((s) => s.logTouchpointOpen)
  const setOpen = useUIStore((s) => s.setLogTouchpointOpen)
  const activeContactId = useUIStore((s) => s.activeContactId)

  const contacts = useContactsStore((s) => s.contacts)

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactQuery, setContactQuery] = useState('')
  const [medium, setMedium] = useState<Touchpoint['medium'] | null>(null)
  const [note, setNote] = useState('')

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setSelectedContactId(activeContactId)
      setContactQuery('')
      setMedium(null)
      setNote('')
    }
  }, [open, activeContactId])

  const fuse = useMemo(
    () => new Fuse(contacts, { keys: ['name'], threshold: 0.3 }),
    [contacts]
  )

  const filteredContacts = useMemo(() => {
    if (!contactQuery.trim()) return contacts.slice(0, 6)
    return fuse.search(contactQuery).map((r) => r.item).slice(0, 6)
  }, [contacts, contactQuery, fuse])

  const selectedContact = contacts.find((c) => c.id === selectedContactId)

  const handleDone = useCallback(async () => {
    if (!selectedContactId || !medium) return
    await window.mycel.logTouchpoint({
      contactId: selectedContactId,
      medium,
      note,
      createdAt: Date.now()
    })
    setOpen(false)
  }, [selectedContactId, medium, note, setOpen])

  const handleBackdropClick = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={springGentle}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: 24,
              width: 400,
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {/* Contact picker or display */}
            {selectedContact ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'Lora, serif',
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--text)'
                  }}
                >
                  {selectedContact.name || 'Untitled'}
                </span>
                {!activeContactId && (
                  <button
                    onClick={() => setSelectedContactId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: 'var(--text-muted)',
                      transition: 'color 150ms ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    change
                  </button>
                )}
              </div>
            ) : (
              <div>
                <input
                  autoFocus
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Search contact..."
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                    color: 'var(--text)',
                    padding: '0 0 8px 0',
                    marginBottom: 8
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContactId(c.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 0',
                        textAlign: 'left',
                        fontSize: 14,
                        fontFamily: 'Inter, sans-serif',
                        color: 'var(--text)',
                        borderBottom: '1px solid var(--border)',
                        width: '100%',
                        transition: 'background 100ms ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      {c.name || 'Untitled'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Medium selector */}
            <div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Medium
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {MEDIA.map((m) => {
                  const isSelected = medium === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMedium(m.id)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        border: isSelected
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                        background: isSelected ? 'var(--bg)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 150ms ease'
                      }}
                      title={m.id}
                    >
                      {m.icon}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Note input */}
            <div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedContactId && medium) handleDone()
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text)',
                  padding: '0 0 8px 0'
                }}
              />
            </div>

            {/* Done button */}
            <button
              onClick={handleDone}
              disabled={!selectedContactId || !medium}
              style={{
                background: selectedContactId && medium ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 0',
                cursor: selectedContactId && medium ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                color: selectedContactId && medium ? 'var(--bg)' : 'var(--text-muted)',
                transition: 'background 150ms ease, color 150ms ease'
              }}
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
